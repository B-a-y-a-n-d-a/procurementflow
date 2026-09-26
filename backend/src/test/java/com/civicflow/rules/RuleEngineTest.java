package com.civicflow.rules;

import com.civicflow.domain.enums.CriterionKey;
import com.civicflow.domain.enums.Direction;
import com.civicflow.domain.enums.ImpactStatus;
import com.civicflow.domain.enums.LifecycleStage;
import com.civicflow.domain.enums.NeedStatus;
import com.civicflow.domain.enums.OpportunityStatus;
import com.civicflow.domain.enums.POStatus;
import com.civicflow.domain.enums.RequestStatus;
import com.civicflow.domain.enums.ScoringMethod;
import com.civicflow.domain.enums.SlaState;
import com.civicflow.domain.enums.SourcingMethod;
import com.civicflow.domain.enums.StageState;
import com.civicflow.domain.enums.StepStatus;
import com.civicflow.domain.enums.UserRole;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

/** Pure rule-engine tests (constitution Art. III.3). Worked examples come from spec 001. */
class RuleEngineTest {

    private final RuleSnapshot rules = RuleSnapshot.defaults();

    @Nested
    class Routing { // BR-02
        @Test
        void belowFiveThousandIsAutoApproved() {
            assertThat(RoutingRules.approversFor(new BigDecimal("4999"), rules.bands())).isEmpty();
            assertThat(RoutingRules.approversFor(new BigDecimal("4999.99"), rules.bands())).isEmpty();
        }

        @Test
        void fiveToFiftyThousandNeedsManagerOnly() {
            assertThat(RoutingRules.approversFor(new BigDecimal("5000"), rules.bands()))
                    .containsExactly(UserRole.DEPARTMENT_MANAGER);
            assertThat(RoutingRules.approversFor(new BigDecimal("50000"), rules.bands()))
                    .containsExactly(UserRole.DEPARTMENT_MANAGER);
        }

        @Test
        void aboveFiftyThousandNeedsManagerThenFinance() {
            assertThat(RoutingRules.approversFor(new BigDecimal("50000.01"), rules.bands()))
                    .containsExactly(UserRole.DEPARTMENT_MANAGER, UserRole.FINANCE_DIRECTOR);
        }
    }

    @Nested
    class Budget { // BR-03
        @Test
        void committedUsesPoAmountOnceOrderedAndIgnoresRejected() {
            var lines = List.of(
                    new BudgetCalculator.Line(RequestStatus.PENDING_APPROVAL, new BigDecimal("100000"), null),
                    new BudgetCalculator.Line(RequestStatus.ORDERED, new BigDecimal("500000"), new BigDecimal("420000")),
                    new BudgetCalculator.Line(RequestStatus.REJECTED, new BigDecimal("62000"), null));
            var summary = BudgetCalculator.summarise(new BigDecimal("1000000"), lines);
            assertThat(summary.committed()).isEqualByComparingTo("520000");
            assertThat(summary.available()).isEqualByComparingTo("480000");
            assertThat(summary.utilisationPct()).isEqualTo(52.0);
            assertThat(BudgetCalculator.fits(new BigDecimal("480000"), summary.available())).isTrue();
            assertThat(BudgetCalculator.fits(new BigDecimal("480000.01"), summary.available())).isFalse();
        }
    }

    @Nested
    class Sla { // BR-01
        @Test
        void pendingStepStates() {
            Instant now = Instant.parse("2026-09-25T10:00:00Z");
            Instant activated = now.minus(Duration.ofHours(10));
            Instant due = SlaCalculator.dueAt(activated, 48);
            assertThat(SlaCalculator.evaluate(StepStatus.PENDING, due, now).state()).isEqualTo(SlaState.ON_TIME);
            assertThat(SlaCalculator.evaluate(StepStatus.PENDING, due, now.plus(Duration.ofHours(30))).state())
                    .isEqualTo(SlaState.DUE_SOON);
            var overdue = SlaCalculator.evaluate(StepStatus.PENDING, due, now.plus(Duration.ofHours(40)));
            assertThat(overdue.state()).isEqualTo(SlaState.OVERDUE);
            assertThat(overdue.hoursRemaining()).isEqualTo(-2.0);
            assertThat(SlaCalculator.evaluate(StepStatus.APPROVED, due, now).state()).isEqualTo(SlaState.DONE);
            assertThat(SlaCalculator.evaluate(StepStatus.WAITING, due, now).state()).isEqualTo(SlaState.NOT_ACTIVE);
        }
    }

    @Nested
    class Scoring { // BR-06, BR-17..BR-19, US-07 worked example
        private final List<ScoringEngine.Criterion> criteria = List.of(
                new ScoringEngine.Criterion("c-price", CriterionKey.PRICE, "Price", 30, ScoringMethod.AUTO_PRICE),
                new ScoringEngine.Criterion("c-tech", CriterionKey.TECHNICAL, "Technical", 30, ScoringMethod.MANUAL),
                new ScoringEngine.Criterion("c-suit", CriterionKey.SUITABILITY, "Suitability", 20, ScoringMethod.MANUAL),
                new ScoringEngine.Criterion("c-local", CriterionKey.LOCAL, "Local", 10, ScoringMethod.AUTO_LOCAL),
                new ScoringEngine.Criterion("c-bee", CriterionKey.BBBEE, "B-BBEE", 10, ScoringMethod.AUTO_BBBEE));

        private ScoringEngine.Offer offer(String id, double price, int level, String muni, String prov,
                                          Double tech, Double suit) {
            Map<String, ScoringEngine.ManualScore> manual = tech == null ? Map.of() : Map.of(
                    "c-tech", new ScoringEngine.ManualScore(tech, "tech"),
                    "c-suit", new ScoringEngine.ManualScore(suit, "suit"));
            return new ScoringEngine.Offer(id, price, level, muni, prov, true, manual);
        }

        @Test
        void heroOpportunityRanksCleanSightFirst() {
            var results = ScoringEngine.evaluate(criteria, List.of(
                            offer("cleansight", 420_000, 1, "City of Tshwane", "Gauteng", 90.0, 90.0),
                            offer("ecovision", 390_000, 2, "City of Tshwane", "Gauteng", 75.0, 80.0),
                            offer("globaltech", 350_000, 4, "City of Johannesburg", "Gauteng", 70.0, 60.0)),
                    "City of Tshwane", "Gauteng", rules.bbbeeScores(), rules.localScores());

            assertThat(results).extracting(ScoringEngine.Result::offerId)
                    .containsExactly("cleansight", "ecovision", "globaltech");
            assertThat(results).extracting(ScoringEngine.Result::total).containsExactly(90.0, 84.42, 76.0);
            assertThat(ScoringEngine.recommendedId(results)).isEqualTo("cleansight");
            var gtPrice = results.get(2).lines().get(0);
            assertThat(gtPrice.score()).isEqualTo(100.0);
            assertThat(gtPrice.basis()).contains("R 350 000");
        }

        @Test
        void noRecommendationUntilAllEligibleScored() {
            var results = ScoringEngine.evaluate(criteria, List.of(
                            offer("a", 100, 1, "X", "Gauteng", 80.0, 80.0),
                            offer("b", 120, 1, "X", "Gauteng", null, null)),
                    "X", "Gauteng", rules.bbbeeScores(), rules.localScores());
            assertThat(ScoringEngine.recommendedId(results)).isNull();
            assertThat(results.get(1).total()).isNull();
        }

        @Test
        void weightsMustTotalHundred() {
            assertThat(ScoringEngine.weightsValid(List.of(30.0, 30.0, 20.0, 10.0, 10.0))).isTrue();
            assertThat(ScoringEngine.weightsValid(List.of(30.0, 30.0, 20.0, 10.0))).isFalse();
            assertThat(ScoringEngine.weightsValid(List.of())).isFalse();
        }
    }

    @Nested
    class Selection { // BR-04, BR-05
        @Test
        void minimumOffers() {
            assertThat(SelectionRules.minOffers(new BigDecimal("420000"), 2, new BigDecimal("10000"), 3).satisfied()).isFalse();
            assertThat(SelectionRules.minOffers(new BigDecimal("420000"), 3, new BigDecimal("10000"), 3).satisfied()).isTrue();
            assertThat(SelectionRules.minOffers(new BigDecimal("10000"), 1, new BigDecimal("10000"), 3).applies()).isFalse();
        }

        @Test
        void deviationNeedsJustification() {
            assertThat(SelectionRules.isDeviation("globaltech", "cleansight")).isTrue();
            assertThat(SelectionRules.isDeviation("cleansight", "cleansight")).isFalse();
            assertThat(SelectionRules.justificationValid("too short", 20)).isFalse();
            assertThat(SelectionRules.justificationValid("Local maintenance team is required on site.", 20)).isTrue();
        }
    }

    @Nested
    class Impact { // BR-15, US-11 worked example
        @Test
        void illegalDumpingHotspotsAchieved() {
            var r = ImpactCalculator.compute(147, 100, 96.0, Direction.DECREASE, 50);
            assertThat(r.changePct()).isCloseTo(-34.69, within(0.001));
            assertThat(r.progressPct()).isCloseTo(108.51, within(0.01));
            assertThat(r.status()).isEqualTo(ImpactStatus.ACHIEVED);
        }

        @Test
        void statuses() {
            assertThat(ImpactCalculator.compute(21, 5, null, Direction.DECREASE, 50).status())
                    .isEqualTo(ImpactStatus.NOT_MEASURED);
            assertThat(ImpactCalculator.compute(21, 5, 12.0, Direction.DECREASE, 50).status())
                    .isEqualTo(ImpactStatus.ON_TRACK);
            assertThat(ImpactCalculator.compute(14, 3, 13.0, Direction.DECREASE, 50).status())
                    .isEqualTo(ImpactStatus.AT_RISK);
            var wards = ImpactCalculator.compute(0, 12, 12.0, Direction.INCREASE, 50);
            assertThat(wards.status()).isEqualTo(ImpactStatus.ACHIEVED);
            assertThat(wards.changePct()).isNull();
        }
    }

    @Nested
    class Lifecycle { // FR-011
        private LifecycleStageResolver.Input in(RequestStatus rs, SourcingMethod sm, OpportunityStatus os, POStatus po) {
            return new LifecycleStageResolver.Input(NeedStatus.OPEN, rs, sm, os, po, null);
        }

        @Test
        void resolvesStages() {
            assertThat(LifecycleStageResolver.resolve(new LifecycleStageResolver.Input(NeedStatus.DRAFT, null, null, null, null, null)))
                    .isEqualTo(LifecycleStage.NEED);
            assertThat(LifecycleStageResolver.resolve(in(RequestStatus.PENDING_APPROVAL, SourcingMethod.OPEN_OPPORTUNITY, null, null)))
                    .isEqualTo(LifecycleStage.APPROVAL);
            assertThat(LifecycleStageResolver.resolve(in(RequestStatus.APPROVED, SourcingMethod.OPEN_OPPORTUNITY, OpportunityStatus.EVALUATION, null)))
                    .isEqualTo(LifecycleStage.EVALUATION);
            assertThat(LifecycleStageResolver.resolve(in(RequestStatus.APPROVED, SourcingMethod.QUOTATION, null, null)))
                    .isEqualTo(LifecycleStage.PROCUREMENT);
            assertThat(LifecycleStageResolver.resolve(in(RequestStatus.REJECTED, SourcingMethod.QUOTATION, null, null)))
                    .isEqualTo(LifecycleStage.REJECTED);
        }

        @Test
        void quotationSkipsOpportunityStages() {
            var track = LifecycleStageResolver.track(in(RequestStatus.APPROVED, SourcingMethod.QUOTATION, null, null));
            assertThat(track).extracting(LifecycleStageResolver.Stage::state).containsExactly(
                    StageState.DONE, StageState.DONE, StageState.SKIPPED, StageState.SKIPPED,
                    StageState.CURRENT, StageState.PENDING, StageState.PENDING);
        }
    }

    @Test
    void moneyFormatting() {
        assertThat(Money.format(new BigDecimal("420000"))).isEqualTo("R 420 000");
        assertThat(Money.format(new BigDecimal("4999.99"))).isEqualTo("R 4 999,99");
    }
}
