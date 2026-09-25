package com.civicflow.service;

import com.civicflow.domain.AppUser;
import com.civicflow.domain.ApprovalStep;
import com.civicflow.domain.PublicNeed;
import com.civicflow.domain.PurchaseRequest;
import com.civicflow.domain.enums.RequestStatus;
import com.civicflow.domain.enums.SlaState;
import com.civicflow.domain.enums.StepStatus;
import com.civicflow.domain.enums.UserRole;
import com.civicflow.repository.ApprovalStepRepository;
import com.civicflow.repository.PurchaseRequestRepository;
import com.civicflow.rules.Money;
import com.civicflow.rules.RuleSnapshot;
import com.civicflow.rules.SlaCalculator;
import com.civicflow.security.CurrentUser;
import com.civicflow.web.ApiException;
import com.civicflow.web.dto.Dto;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

/** US-03: approval inbox, decisions, segregation of duties (BR-09), SLA and escalation (BR-01, BR-16). */
@Service
public class ApprovalService {

    private final ApprovalStepRepository steps;
    private final PurchaseRequestRepository requests;
    private final RuleService rules;
    private final AuditService audit;
    private final NotificationService notifications;
    private final CurrentUser currentUser;
    private final Lookup lookup;
    private final DtoMapper mapper;

    public ApprovalService(ApprovalStepRepository steps, PurchaseRequestRepository requests, RuleService rules,
                           AuditService audit, NotificationService notifications, CurrentUser currentUser,
                           Lookup lookup, DtoMapper mapper) {
        this.steps = steps;
        this.requests = requests;
        this.rules = rules;
        this.audit = audit;
        this.notifications = notifications;
        this.currentUser = currentUser;
        this.lookup = lookup;
        this.mapper = mapper;
    }

    static String roleLabel(UserRole role) {
        return switch (role) {
            case DEPARTMENT_MANAGER -> "Department Manager";
            case FINANCE_DIRECTOR -> "Finance Director";
            case PROCUREMENT_OFFICER -> "Procurement Officer";
            case EXECUTIVE -> "Executive";
            default -> role.name();
        };
    }

    static void notifyStep(NotificationService notifications, UserRole role, PublicNeed need, PurchaseRequest pr) {
        String dept = role == UserRole.DEPARTMENT_MANAGER ? need.getDepartmentId() : null;
        notifications.notifyRole(role, dept, "APPROVAL_REQUIRED", "Approval required: " + pr.getReference(),
                need.getTitle() + " - " + Money.format(pr.getAmount()), "PurchaseRequest", pr.getId(), "/approvals");
    }

    static void notifyApproved(NotificationService notifications, PurchaseRequest pr, PublicNeed need) {
        notifications.notifyUsers(List.of(pr.getRequestedBy()), "REQUEST_APPROVED", pr.getReference() + " approved",
                need.getTitle() + " is approved and moves to sourcing.", "PublicNeed", need.getId(),
                "/needs/" + need.getId());
        notifications.notifyRole(UserRole.PROCUREMENT_OFFICER, null, "READY_FOR_SOURCING",
                "Ready for sourcing: " + need.getReference(), need.getTitle() + " - " + Money.format(pr.getAmount()),
                "PublicNeed", need.getId(), "/needs/" + need.getId());
    }

    @Transactional(readOnly = true)
    public List<Dto.PurchaseRequest> listRequests() {
        currentUser.requireStaff();
        return requests.findAllByOrderBySubmittedAtDesc().stream().map(pr -> mapper.request(pr, null)).toList();
    }

    @Transactional(readOnly = true)
    public List<Dto.PurchaseRequest> inbox() {
        AppUser user = currentUser.require(UserRole.DEPARTMENT_MANAGER, UserRole.FINANCE_DIRECTOR, UserRole.EXECUTIVE,
                UserRole.ADMIN);
        List<Dto.PurchaseRequest> result = new ArrayList<>();
        for (ApprovalStep st : steps.findByStatus(StepStatus.PENDING)) {
            PurchaseRequest pr = lookup.request(st.getPurchaseRequestId());
            PublicNeed need = lookup.need(pr.getNeedId());
            if (user.getRole() == UserRole.EXECUTIVE || user.getRole() == UserRole.ADMIN) {
                if (st.getEscalatedAt() != null) {
                    result.add(mapper.request(pr, null));
                }
            } else if (canAct(user, st, pr, need)) {
                result.add(mapper.request(pr, st.getId()));
            }
        }
        result.sort(Comparator.comparing(Dto.PurchaseRequest::submittedAt, Comparator.nullsLast(Comparator.naturalOrder())));
        return result;
    }

    private boolean canAct(AppUser user, ApprovalStep st, PurchaseRequest pr, PublicNeed need) {
        if (st.getRequiredRole() != user.getRole()) {
            return false;
        }
        if (user.getRole() == UserRole.DEPARTMENT_MANAGER && !need.getDepartmentId().equals(user.getDepartmentId())) {
            return false;
        }
        return !pr.getRequestedBy().equals(user.getId());
    }

    private void assertCanAct(AppUser user, ApprovalStep st, PurchaseRequest pr, PublicNeed need) {
        if (st.getStatus() != StepStatus.PENDING) {
            throw ApiException.invalidState("This approval step is not awaiting a decision");
        }
        if (pr.getRequestedBy().equals(user.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "SEGREGATION_OF_DUTIES",
                    "You cannot approve a request you raised");
        }
        if (st.getRequiredRole() != user.getRole()) {
            throw ApiException.forbidden("This step requires a " + roleLabel(st.getRequiredRole()));
        }
        if (user.getRole() == UserRole.DEPARTMENT_MANAGER && !need.getDepartmentId().equals(user.getDepartmentId())) {
            throw ApiException.forbidden("Only the manager of " + lookup.departmentName(need.getDepartmentId())
                    + " can approve this step");
        }
    }

    @Transactional
    public Dto.PurchaseRequest approve(String stepId, String comment) {
        AppUser user = currentUser.get();
        ApprovalStep st = steps.findById(stepId).orElseThrow(() -> ApiException.notFound("Approval step", stepId));
        PurchaseRequest pr = lookup.request(st.getPurchaseRequestId());
        PublicNeed need = lookup.need(pr.getNeedId());
        assertCanAct(user, st, pr, need);

        Instant now = Clock.now();
        st.setStatus(StepStatus.APPROVED);
        st.setApproverId(user.getId());
        st.setDecidedAt(now);
        st.setComment(comment);
        steps.save(st);

        List<ApprovalStep> all = steps.findByPurchaseRequestIdOrderBySequence(pr.getId());
        ApprovalStep next = all.stream().filter(s -> s.getStatus() == StepStatus.WAITING).findFirst().orElse(null);
        boolean last = next == null;
        audit.record(user.getId(), "REQUEST_APPROVED", "PurchaseRequest", pr.getId(), need.getId(),
                pr.getReference() + " approved by " + user.getFullName() + " (" + roleLabel(user.getRole()) + ")"
                        + (last ? " - final approval" : " - routed to " + roleLabel(next.getRequiredRole())),
                Map.of("step", st.getSequence(), "final", last, "comment", comment == null ? "" : comment));
        if (last) {
            pr.setStatus(RequestStatus.APPROVED);
            pr.setDecidedAt(now);
            requests.save(pr);
            notifyApproved(notifications, pr, need);
        } else {
            RuleSnapshot r = rules.current();
            next.setStatus(StepStatus.PENDING);
            next.setActivatedAt(now);
            next.setDueAt(SlaCalculator.dueAt(now, r.approvalSlaHours()));
            steps.save(next);
            notifyStep(notifications, next.getRequiredRole(), need, pr);
        }
        return mapper.request(pr, null);
    }

    @Transactional
    public Dto.PurchaseRequest reject(String stepId, String comment) {
        AppUser user = currentUser.get();
        if (comment == null || comment.isBlank()) {
            throw ApiException.rule("COMMENT_REQUIRED", "A reason is required when rejecting");
        }
        ApprovalStep st = steps.findById(stepId).orElseThrow(() -> ApiException.notFound("Approval step", stepId));
        PurchaseRequest pr = lookup.request(st.getPurchaseRequestId());
        PublicNeed need = lookup.need(pr.getNeedId());
        assertCanAct(user, st, pr, need);

        Instant now = Clock.now();
        st.setStatus(StepStatus.REJECTED);
        st.setApproverId(user.getId());
        st.setDecidedAt(now);
        st.setComment(comment.trim());
        steps.save(st);
        steps.findByPurchaseRequestIdOrderBySequence(pr.getId()).stream()
                .filter(s -> s.getStatus() == StepStatus.WAITING)
                .forEach(s -> {
                    s.setStatus(StepStatus.SKIPPED);
                    steps.save(s);
                });
        pr.setStatus(RequestStatus.REJECTED);
        pr.setDecidedAt(now);
        requests.save(pr);
        audit.record(user.getId(), "REQUEST_REJECTED", "PurchaseRequest", pr.getId(), need.getId(),
                pr.getReference() + " rejected by " + user.getFullName() + ": " + comment.trim(),
                Map.of("step", st.getSequence(), "comment", comment.trim()));
        notifications.notifyUsers(List.of(pr.getRequestedBy()), "REQUEST_REJECTED", pr.getReference() + " rejected",
                comment.trim(), "PublicNeed", need.getId(), "/needs/" + need.getId());
        return mapper.request(pr, null);
    }

    @Transactional
    public Dto.PurchaseRequest escalate(String stepId) {
        AppUser user = currentUser.requireStaff();
        ApprovalStep st = steps.findById(stepId).orElseThrow(() -> ApiException.notFound("Approval step", stepId));
        PurchaseRequest pr = lookup.request(st.getPurchaseRequestId());
        PublicNeed need = lookup.need(pr.getNeedId());
        var sla = SlaCalculator.evaluate(st.getStatus(), st.getDueAt() == null ? Clock.now() : st.getDueAt(), Clock.now());
        if (sla.state() != SlaState.OVERDUE) {
            throw ApiException.rule("NOT_OVERDUE", "Only overdue approval steps can be escalated");
        }
        if (st.getEscalatedAt() != null) {
            throw ApiException.invalidState("Already escalated");
        }
        st.setEscalatedAt(Clock.now());
        steps.save(st);
        RuleSnapshot r = rules.current();
        audit.record(user.getId(), "REQUEST_ESCALATED", "PurchaseRequest", pr.getId(), need.getId(),
                pr.getReference() + " escalated to " + roleLabel(r.escalationRole()) + " - "
                        + roleLabel(st.getRequiredRole()) + " step overdue by " + Math.abs(sla.hoursRemaining()) + " h",
                Map.of("step", st.getSequence(), "hoursOverdue", Math.abs(sla.hoursRemaining())));
        notifications.notifyRole(r.escalationRole(), null, "APPROVAL_ESCALATED", "Escalated: " + pr.getReference(),
                roleLabel(st.getRequiredRole()) + " approval is overdue for " + need.getTitle(), "PurchaseRequest",
                pr.getId(), "/approvals");
        return mapper.request(pr, null);
    }
}
