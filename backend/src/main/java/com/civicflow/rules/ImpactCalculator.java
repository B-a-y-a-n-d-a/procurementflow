package com.civicflow.rules;

import com.civicflow.domain.enums.Direction;
import com.civicflow.domain.enums.ImpactStatus;

/** BR-15: derived impact values. */
public final class ImpactCalculator {

    private ImpactCalculator() {
    }

    public record Result(Double current, Double changePct, Double progressPct, ImpactStatus status) {
    }

    public static Result compute(double baseline, double target, Double current, Direction direction, int onTrackPct) {
        if (current == null) {
            return new Result(null, null, null, ImpactStatus.NOT_MEASURED);
        }
        Double change = baseline == 0 ? null : ScoringEngine.round2((current - baseline) / Math.abs(baseline) * 100);
        boolean achieved = direction == Direction.INCREASE ? current >= target : current <= target;
        double progress = target == baseline ? (achieved ? 100 : 0) : (current - baseline) / (target - baseline) * 100;
        ImpactStatus status = achieved ? ImpactStatus.ACHIEVED
                : progress >= onTrackPct ? ImpactStatus.ON_TRACK : ImpactStatus.AT_RISK;
        return new Result(current, change, ScoringEngine.round2(progress), status);
    }
}
