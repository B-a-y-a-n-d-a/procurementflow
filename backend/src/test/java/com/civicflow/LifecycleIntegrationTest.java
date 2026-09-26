package com.civicflow;

import com.civicflow.ai.CivicAiService;
import com.civicflow.domain.AppUser;
import com.civicflow.domain.EvaluationCriterion;
import com.civicflow.domain.enums.*;
import com.civicflow.repository.AppUserRepository;
import com.civicflow.repository.AuditLogEntryRepository;
import com.civicflow.repository.EvaluationCriterionRepository;
import com.civicflow.security.CurrentUser;
import com.civicflow.seed.DemoDataSeeder;
import com.civicflow.service.*;
import com.civicflow.web.ApiException;
import com.civicflow.web.dto.Dto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.function.Supplier;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** T044: the judge-demo lifecycle end to end on H2, plus key rule violations (spec 001 acceptance criteria). */
@SpringBootTest
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.BEFORE_EACH_TEST_METHOD)
class LifecycleIntegrationTest {

    @Autowired DemoDataSeeder seeder;
    @Autowired AppUserRepository users;
    @Autowired EvaluationCriterionRepository criteria;
    @Autowired AuditLogEntryRepository auditEntries;
    @Autowired NeedService needs;
    @Autowired ApprovalService approvals;
    @Autowired OpportunityService opportunities;
    @Autowired EvaluationService evaluations;
    @Autowired ProcurementService procurement;
    @Autowired ImplementationService implementations;
    @Autowired ImpactService impact;
    @Autowired DashboardService dashboards;
    @Autowired AuditService audit;
    @Autowired CivicAiService ai;

    @BeforeEach
    void seed() {
        seeder.seed();
    }

    private <T> T as(String userId, Supplier<T> call) {
        AppUser user = users.findById(userId).orElseThrow();
        List<T> out = new ArrayList<>();
        CurrentUser.runAs(user, () -> out.add(call.get()));
        return out.get(0);
    }

    private Dto.OpportunitySummary hero() {
        return as("u-johan", () -> opportunities.list()).stream()
                .filter(o -> o.title().equals("Illegal Dumping Intelligence Platform")).findFirst().orElseThrow();
    }

    @Test
    void heroLifecycleFromEvaluationToMeasuredImpact() {
        var opp = hero();
        assertThat(opp.status()).isEqualTo(OpportunityStatus.EVALUATION);
        var board = as("u-johan", () -> evaluations.board(opp.id()));
        assertThat(board.rows()).hasSize(3);
        assertThat(board.allEvaluated()).isFalse();
        var cleanSight = board.rows().stream().filter(r -> r.submission().providerName().equals("CleanSight SA"))
                .findFirst().orElseThrow().submission();

        // Evaluate CleanSight live (90 / 90)
        List<Dto.ManualScoreInput> scores = new ArrayList<>();
        for (EvaluationCriterion c : criteria.findByOpportunityIdOrderBySortOrder(opp.id())) {
            if (c.getScoringMethod() == ScoringMethod.MANUAL) {
                scores.add(new Dto.ManualScoreInput(c.getId(), 90, "Purpose-built and local"));
            }
        }
        var scored = as("u-johan", () -> evaluations.save(cleanSight.id(), new Dto.SaveEvaluationRequest(scores, null, true)));
        assertThat(scored.allEvaluated()).isTrue();
        assertThat(scored.rows()).extracting(Dto.EvaluationRow::totalScore).containsExactly(90.0, 84.42, 76.0);
        assertThat(scored.recommendedSubmissionId()).isEqualTo(cleanSight.id());

        // Deviation without justification is refused (BR-05)
        String globalTech = scored.rows().get(2).submission().id();
        assertThatThrownBy(() -> as("u-johan", () -> procurement.selectSubmission(opp.id(), new Dto.SelectRequest(globalTech, null))))
                .isInstanceOf(ApiException.class).hasFieldOrPropertyWithValue("code", "JUSTIFICATION_REQUIRED");

        // Select recommended -> provider onboarded as supplier (pending) -> PO blocked until verified (BR-13)
        var po = as("u-johan", () -> procurement.selectSubmission(opp.id(), new Dto.SelectRequest(cleanSight.id(), null)));
        assertThat(po.status()).isEqualTo(POStatus.DRAFT);
        assertThat(po.supplierStatus()).isEqualTo(SupplierStatus.PENDING_VERIFICATION);
        assertThat(po.isDeviation()).isFalse();
        var issueReq = new Dto.IssuePoRequest("u-sipho", LocalDate.now().minusDays(90), LocalDate.now());
        assertThatThrownBy(() -> as("u-johan", () -> procurement.issue(po.id(), issueReq)))
                .isInstanceOf(ApiException.class).hasFieldOrPropertyWithValue("code", "SUPPLIER_NOT_ACTIVE");
        as("u-johan", () -> procurement.verify(po.supplierId(), new Dto.VerifySupplierRequest("MAAA0123456", true)));
        var issued = as("u-johan", () -> procurement.issue(po.id(), issueReq));
        assertThat(issued.status()).isEqualTo(POStatus.ISSUED);
        String impl = issued.implementationId();

        // Completion requires evidence (BR-14)
        assertThatThrownBy(() -> as("u-sipho", () -> implementations.complete(impl)))
                .isInstanceOf(ApiException.class).hasFieldOrPropertyWithValue("code", "EVIDENCE_REQUIRED");
        as("u-sipho", () -> implementations.addUpdate(impl, new Dto.CreateUpdateRequest(UpdateType.EVIDENCE,
                "Hotspot map handed over", 100, "https://example.org/evidence.pdf")));
        assertThat(as("u-sipho", () -> implementations.get(impl)).status()).isEqualTo(ImplementationStatus.IN_PROGRESS);

        // Impact: 147 -> 96 hotspots = -34.69% ACHIEVED (US-11)
        var detail = as("u-sipho", () -> impact.addMetric(impl, new Dto.CreateMetricRequest("Illegal dumping hotspots",
                "Tracked hotspots", "hotspots", Direction.DECREASE, BigDecimal.valueOf(147), BigDecimal.valueOf(100))));
        String metricId = detail.metrics().get(0).id();
        // Measurements are evidence: not in the future, not before delivery started (T119)
        assertThatThrownBy(() -> as("u-sipho", () -> impact.addMeasurement(metricId, new Dto.CreateMeasurementRequest(
                BigDecimal.valueOf(96), Instant.now().plus(Duration.ofDays(1)), null, null, null))))
                .isInstanceOf(ApiException.class).hasFieldOrPropertyWithValue("code", "MEASUREMENT_IN_FUTURE");
        assertThatThrownBy(() -> as("u-sipho", () -> impact.addMeasurement(metricId, new Dto.CreateMeasurementRequest(
                BigDecimal.valueOf(96), Instant.now().minus(Duration.ofDays(120)), null, null, null))))
                .isInstanceOf(ApiException.class).hasFieldOrPropertyWithValue("code", "MEASUREMENT_BEFORE_START");
        var measured = as("u-sipho", () -> impact.addMeasurement(metricId, new Dto.CreateMeasurementRequest(
                BigDecimal.valueOf(96), Instant.now(), "https://example.org/survey.pdf", "Quarter survey", null)));
        var metric = measured.metrics().get(0);
        assertThat(metric.changePct()).isEqualTo(-34.69);
        assertThat(metric.status()).isEqualTo(ImpactStatus.ACHIEVED);
        var done = as("u-sipho", () -> implementations.complete(impl));
        assertThat(done.status()).isEqualTo(ImplementationStatus.COMPLETED);

        // Executive dashboard shows the investment -> outcome; audit chain intact (US-12)
        var exec = as("u-ayesha", () -> dashboards.executive());
        assertThat(exec.impactHighlights()).anyMatch(h -> h.needTitle().equals("Illegal Dumping Monitoring Solution")
                && h.invested().compareTo(BigDecimal.valueOf(420_000)) == 0);
        assertThat(audit.verify().valid()).isTrue();

        // Journey contains the full lifecycle
        String needId = opp.needId();
        var journey = as("u-grace", () -> needs.journey(needId));
        assertThat(journey).extracting(Dto.AuditEntry::action).contains("NEED_CREATED", "BUDGET_VALIDATED",
                "REQUEST_APPROVED", "OPPORTUNITY_PUBLISHED", "SUBMISSION_CREATED", "EVALUATION_COMPLETED",
                "SUPPLIER_SELECTED", "SUPPLIER_ONBOARDED", "SUPPLIER_VERIFIED", "PO_ISSUED", "IMPACT_UPDATED",
                "IMPLEMENTATION_COMPLETED");
    }

    @Test
    void budgetRoutingAndSegregationOfDuties() {
        // BR-03 budget exceeded -> 422 and nothing created
        long before = as("u-thandi", () -> needs.list()).size();
        var tooBig = new Dto.CreateNeedRequest("Huge", "Problem", "dept-env", NeedCategory.WASTE_ENVIRONMENT, Priority.LOW,
                BigDecimal.valueOf(5_000_000), List.of(), "Outcome", new Dto.Geo("Gauteng", "City of Tshwane", null,
                BigDecimal.valueOf(-25.5), BigDecimal.valueOf(28.1)), null, "Why", SourcingMethod.QUOTATION, true);
        assertThatThrownBy(() -> as("u-thandi", () -> needs.create(tooBig)))
                .isInstanceOf(ApiException.class).hasFieldOrPropertyWithValue("code", "BUDGET_EXCEEDED");

        // BR-02: R5 000 -> manager only; requester cannot approve own (BR-09)
        var ok = new Dto.CreateNeedRequest("Bins", "Problem", "dept-env", NeedCategory.WASTE_ENVIRONMENT, Priority.LOW,
                BigDecimal.valueOf(5_000), List.of(), "Outcome", tooBig.location(), null, "Why", SourcingMethod.QUOTATION, true);
        var created = as("u-thandi", () -> needs.create(ok));
        assertThat(created.request().steps()).extracting(Dto.ApprovalStep::requiredRole)
                .containsExactly(UserRole.DEPARTMENT_MANAGER);
        assertThat(as("u-thandi", () -> needs.list())).hasSize((int) before + 1);
        String step = created.request().steps().get(0).id();
        assertThatThrownBy(() -> as("u-naledi", () -> approvals.approve(step, null)))
                .isInstanceOf(ApiException.class).hasFieldOrPropertyWithValue("code", "FORBIDDEN");
        var approved = as("u-sipho", () -> approvals.approve(step, "ok"));
        assertThat(approved.status()).isEqualTo(RequestStatus.APPROVED);

        // Seeded overdue approval is visible as an SLA breach
        assertThat(as("u-ayesha", () -> dashboards.executive()).kpis().slaBreaches()).isGreaterThanOrEqualTo(1);
    }

    @Test
    void aiIsReadOnlyAndGrounded() {
        long before = auditEntries.count();
        var result = as("u-ayesha", () -> ai.run("executive-briefing", new Dto.AiRequest(null, null, null, null)));
        assertThat(result.mode()).isEqualTo("DETERMINISTIC");
        assertThat(result.disclaimer()).contains("humans decide");
        var draft = as("u-johan", () -> ai.run("opportunity-draft", new Dto.AiRequest(hero().needId(), null, null, null)));
        assertThat(draft.structured()).containsKeys("title", "description");
        assertThat(auditEntries.count()).isEqualTo(before);
    }
}
