package com.civicflow.rules;

import com.civicflow.domain.enums.ImplementationStatus;
import com.civicflow.domain.enums.LifecycleStage;
import com.civicflow.domain.enums.NeedStatus;
import com.civicflow.domain.enums.OpportunityStatus;
import com.civicflow.domain.enums.POStatus;
import com.civicflow.domain.enums.RequestStatus;
import com.civicflow.domain.enums.SourcingMethod;
import com.civicflow.domain.enums.StageState;

import java.util.ArrayList;
import java.util.List;

/** FR-011: derives a need's lifecycle stage from its linked records (never stored). */
public final class LifecycleStageResolver {

    public static final List<LifecycleStage> TRACK = List.of(
            LifecycleStage.NEED, LifecycleStage.APPROVAL, LifecycleStage.OPPORTUNITY, LifecycleStage.EVALUATION,
            LifecycleStage.PROCUREMENT, LifecycleStage.IMPLEMENTATION, LifecycleStage.IMPACT);

    private LifecycleStageResolver() {
    }

    public record Input(NeedStatus needStatus, RequestStatus requestStatus, SourcingMethod sourcingMethod,
                        OpportunityStatus opportunityStatus, POStatus poStatus, ImplementationStatus implementationStatus) {
    }

    public record Stage(LifecycleStage stage, StageState state) {
    }

    public static LifecycleStage resolve(Input in) {
        if (in.needStatus() == NeedStatus.CANCELLED || in.requestStatus() == RequestStatus.CANCELLED) {
            return LifecycleStage.CLOSED;
        }
        if (in.needStatus() == NeedStatus.DRAFT || in.requestStatus() == null) {
            return LifecycleStage.NEED;
        }
        if (in.requestStatus() == RequestStatus.REJECTED) {
            return LifecycleStage.REJECTED;
        }
        if (in.requestStatus() == RequestStatus.PENDING_APPROVAL) {
            return LifecycleStage.APPROVAL;
        }
        if (in.implementationStatus() == ImplementationStatus.COMPLETED) {
            return in.needStatus() == NeedStatus.CLOSED ? LifecycleStage.CLOSED : LifecycleStage.IMPACT;
        }
        if (in.implementationStatus() != null && in.implementationStatus() != ImplementationStatus.CANCELLED) {
            return LifecycleStage.IMPLEMENTATION;
        }
        if (in.poStatus() != null && in.poStatus() != POStatus.CANCELLED) {
            return LifecycleStage.PROCUREMENT;
        }
        if (in.sourcingMethod() == SourcingMethod.QUOTATION) {
            return LifecycleStage.PROCUREMENT;
        }
        if (in.opportunityStatus() == null) {
            return LifecycleStage.OPPORTUNITY;
        }
        return switch (in.opportunityStatus()) {
            case CLOSED, EVALUATION -> LifecycleStage.EVALUATION;
            case AWARDED -> LifecycleStage.PROCUREMENT;
            default -> LifecycleStage.OPPORTUNITY;
        };
    }

    public static List<Stage> track(Input in) {
        LifecycleStage current = resolve(in);
        boolean quotation = in.sourcingMethod() == SourcingMethod.QUOTATION;
        List<Stage> stages = new ArrayList<>();
        int currentIdx = switch (current) {
            case REJECTED -> TRACK.indexOf(LifecycleStage.APPROVAL);
            case CLOSED -> TRACK.size();
            default -> TRACK.indexOf(current);
        };
        for (int i = 0; i < TRACK.size(); i++) {
            LifecycleStage s = TRACK.get(i);
            StageState state;
            if (quotation && (s == LifecycleStage.OPPORTUNITY || s == LifecycleStage.EVALUATION)) {
                state = StageState.SKIPPED;
            } else if (current == LifecycleStage.REJECTED && i == currentIdx) {
                state = StageState.FAILED;
            } else if (i < currentIdx) {
                state = StageState.DONE;
            } else if (i == currentIdx) {
                state = StageState.CURRENT;
            } else {
                state = StageState.PENDING;
            }
            stages.add(new Stage(s, state));
        }
        return stages;
    }
}
