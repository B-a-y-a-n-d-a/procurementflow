package com.civicflow.rules;

import com.civicflow.domain.enums.UserRole;

import java.math.BigDecimal;
import java.util.List;

/** BR-02: approval thresholds. */
public final class RoutingRules {

    private RoutingRules() {
    }

    public static List<UserRole> approversFor(BigDecimal amount, List<RuleSnapshot.Band> bands) {
        if (amount == null || amount.signum() < 0) {
            throw new IllegalArgumentException("Amount must be zero or positive");
        }
        return bands.stream()
                .filter(b -> amount.compareTo(b.min()) >= 0 && (b.max() == null || amount.compareTo(b.max()) <= 0))
                .findFirst()
                .map(RuleSnapshot.Band::approverRoles)
                .orElseThrow(() -> new IllegalStateException("No approval band covers amount " + amount));
    }

    public static boolean isAutoApproved(BigDecimal amount, List<RuleSnapshot.Band> bands) {
        return approversFor(amount, bands).isEmpty();
    }
}
