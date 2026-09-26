package com.civicflow.rules;

import com.civicflow.domain.enums.SlaState;
import com.civicflow.domain.enums.StepStatus;

import java.time.Duration;
import java.time.Instant;

/** BR-01: approval SLA state of a step. DUE_SOON = less than 12 hours left. */
public final class SlaCalculator {

    public static final long DUE_SOON_HOURS = 12;

    private SlaCalculator() {
    }

    public record Sla(SlaState state, Double hoursRemaining) {
    }

    public static Instant dueAt(Instant activatedAt, int slaHours) {
        return activatedAt.plus(Duration.ofHours(slaHours));
    }

    public static Sla evaluate(StepStatus status, Instant dueAt, Instant now) {
        return switch (status) {
            case APPROVED, REJECTED, AUTO_APPROVED, SKIPPED -> new Sla(SlaState.DONE, null);
            case WAITING -> new Sla(SlaState.NOT_ACTIVE, null);
            case PENDING -> {
                double hours = Math.round(Duration.between(now, dueAt).toMinutes() / 6.0) / 10.0;
                SlaState state = hours < 0 ? SlaState.OVERDUE : hours < DUE_SOON_HOURS ? SlaState.DUE_SOON : SlaState.ON_TIME;
                yield new Sla(state, hours);
            }
        };
    }
}
