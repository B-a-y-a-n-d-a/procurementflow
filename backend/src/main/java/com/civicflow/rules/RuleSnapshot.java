package com.civicflow.rules;

import com.civicflow.domain.enums.BudgetMode;
import com.civicflow.domain.enums.CriterionKey;
import com.civicflow.domain.enums.ScoringMethod;
import com.civicflow.domain.enums.UserRole;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Immutable view of the active BusinessRuleSet used by the pure rule engine.
 * {@link #defaults()} holds the organisational defaults from BRS v2.0 section 10 - they are configuration, not law.
 */
public record RuleSnapshot(
        String id,
        int version,
        int approvalSlaHours,
        BudgetMode budgetMode,
        BigDecimal quotationThreshold,
        int minCompetitiveOffers,
        int deviationMinChars,
        int closingSoonDays,
        int impactOnTrackPct,
        UserRole escalationRole,
        List<Band> bands,
        Map<Integer, Integer> bbbeeScores,
        LocalScores localScores,
        List<CriterionTemplate> defaultCriteria) {

    /** Amounts in [min, max] (max null = unbounded) need these approvers in order; empty list = auto-approve. */
    public record Band(BigDecimal min, BigDecimal max, List<UserRole> approverRoles) {
    }

    public record LocalScores(int sameMunicipality, int sameProvince, int elsewhere) {
    }

    public record CriterionTemplate(CriterionKey key, String name, BigDecimal weightPct, ScoringMethod scoringMethod) {
    }

    public static RuleSnapshot defaults() {
        Map<Integer, Integer> bbbee = new LinkedHashMap<>();
        bbbee.put(1, 100);
        bbbee.put(2, 90);
        bbbee.put(3, 70);
        bbbee.put(4, 60);
        bbbee.put(5, 40);
        bbbee.put(6, 30);
        bbbee.put(7, 20);
        bbbee.put(8, 10);
        bbbee.put(0, 0);
        return new RuleSnapshot(
                null, 1, 48, BudgetMode.BLOCK,
                new BigDecimal("10000"), 3, 20, 7, 50, UserRole.EXECUTIVE,
                List.of(
                        new Band(BigDecimal.ZERO, new BigDecimal("4999.99"), List.of()),
                        new Band(new BigDecimal("5000"), new BigDecimal("50000"), List.of(UserRole.DEPARTMENT_MANAGER)),
                        new Band(new BigDecimal("50000.01"), null, List.of(UserRole.DEPARTMENT_MANAGER, UserRole.FINANCE_DIRECTOR))),
                bbbee,
                new LocalScores(100, 70, 40),
                List.of(
                        new CriterionTemplate(CriterionKey.PRICE, "Price", new BigDecimal("30"), ScoringMethod.AUTO_PRICE),
                        new CriterionTemplate(CriterionKey.TECHNICAL, "Technical capability", new BigDecimal("30"), ScoringMethod.MANUAL),
                        new CriterionTemplate(CriterionKey.SUITABILITY, "Solution suitability", new BigDecimal("20"), ScoringMethod.MANUAL),
                        new CriterionTemplate(CriterionKey.LOCAL, "Local participation", new BigDecimal("10"), ScoringMethod.AUTO_LOCAL),
                        new CriterionTemplate(CriterionKey.BBBEE, "B-BBEE contribution", new BigDecimal("10"), ScoringMethod.AUTO_BBBEE)));
    }
}
