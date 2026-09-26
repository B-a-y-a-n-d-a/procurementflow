package com.civicflow.rules;

import com.civicflow.domain.enums.RequestStatus;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

/** BR-03: available = allocated - committed. Committed counts pending/approved/ordered requests, at PO value once a PO exists. */
public final class BudgetCalculator {

    private BudgetCalculator() {
    }

    /** One request's contribution; poAmount is null when no (non-cancelled) purchase order exists. */
    public record Line(RequestStatus status, BigDecimal requestAmount, BigDecimal poAmount) {
    }

    public record Summary(BigDecimal allocated, BigDecimal committed, BigDecimal available, double utilisationPct) {
    }

    public static BigDecimal committed(List<Line> lines) {
        return lines.stream()
                .filter(l -> l.status() == RequestStatus.PENDING_APPROVAL
                        || l.status() == RequestStatus.APPROVED
                        || l.status() == RequestStatus.ORDERED)
                .map(l -> l.poAmount() != null ? l.poAmount() : l.requestAmount())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    public static Summary summarise(BigDecimal allocated, List<Line> lines) {
        BigDecimal committed = committed(lines);
        BigDecimal available = allocated.subtract(committed);
        double utilisation = allocated.signum() == 0 ? 0
                : committed.multiply(BigDecimal.valueOf(100)).divide(allocated, 1, RoundingMode.HALF_UP).doubleValue();
        return new Summary(allocated, committed, available, utilisation);
    }

    public static boolean fits(BigDecimal amount, BigDecimal available) {
        return amount.compareTo(available) <= 0;
    }
}
