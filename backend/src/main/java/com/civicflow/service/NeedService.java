package com.civicflow.service;

import com.civicflow.domain.AppUser;
import com.civicflow.domain.ApprovalStep;
import com.civicflow.domain.Attachment;
import com.civicflow.domain.PublicNeed;
import com.civicflow.domain.PurchaseRequest;
import com.civicflow.domain.enums.BudgetMode;
import com.civicflow.domain.enums.NeedStatus;
import com.civicflow.domain.enums.RequestStatus;
import com.civicflow.domain.enums.SourcingMethod;
import com.civicflow.domain.enums.StepStatus;
import com.civicflow.domain.enums.UserRole;
import com.civicflow.repository.ApprovalStepRepository;
import com.civicflow.repository.AttachmentRepository;
import com.civicflow.repository.AuditLogEntryRepository;
import com.civicflow.repository.PublicNeedRepository;
import com.civicflow.repository.PurchaseRequestRepository;
import com.civicflow.rules.BudgetCalculator;
import com.civicflow.rules.Money;
import com.civicflow.rules.RoutingRules;
import com.civicflow.rules.RuleSnapshot;
import com.civicflow.rules.SelectionRules;
import com.civicflow.rules.SlaCalculator;
import com.civicflow.security.CurrentUser;
import com.civicflow.web.ApiException;
import com.civicflow.web.dto.Dto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/** US-02: public needs, budget validation (BR-03) and approval step generation (BR-02). */
@Service
public class NeedService {

    private final PublicNeedRepository needs;
    private final PurchaseRequestRepository requests;
    private final ApprovalStepRepository steps;
    private final AttachmentRepository attachments;
    private final AuditLogEntryRepository auditEntries;
    private final RuleService rules;
    private final BudgetService budgets;
    private final AuditService audit;
    private final NotificationService notifications;
    private final CurrentUser currentUser;
    private final Lookup lookup;
    private final DtoMapper mapper;

    public NeedService(PublicNeedRepository needs, PurchaseRequestRepository requests, ApprovalStepRepository steps,
                       AttachmentRepository attachments, AuditLogEntryRepository auditEntries, RuleService rules,
                       BudgetService budgets, AuditService audit, NotificationService notifications,
                       CurrentUser currentUser, Lookup lookup, DtoMapper mapper) {
        this.needs = needs;
        this.requests = requests;
        this.steps = steps;
        this.attachments = attachments;
        this.auditEntries = auditEntries;
        this.rules = rules;
        this.budgets = budgets;
        this.audit = audit;
        this.notifications = notifications;
        this.currentUser = currentUser;
        this.lookup = lookup;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public List<Dto.NeedSummary> list() {
        currentUser.requireStaff();
        return needs.findAllByOrderByCreatedAtDesc().stream().map(mapper::needSummary).toList();
    }

    @Transactional(readOnly = true)
    public Dto.NeedDetail get(String id) {
        currentUser.requireStaff();
        return mapper.needDetail(lookup.need(id));
    }

    @Transactional(readOnly = true)
    public List<Dto.AuditEntry> journey(String id) {
        currentUser.requireStaff();
        lookup.need(id);
        var entries = auditEntries.findByNeedIdOrderBySequenceAsc(id);
        Map<String, AppUser> actors = new java.util.HashMap<>();
        entries.forEach(e -> {
            if (e.getActorId() != null) {
                actors.computeIfAbsent(e.getActorId(), lookup::user);
            }
        });
        return entries.stream().map(e -> mapper.audit(e, actors)).toList();
    }

    @Transactional(readOnly = true)
    public Dto.RoutingPreview preview(String departmentId, BigDecimal amount) {
        currentUser.requireStaff();
        RuleSnapshot r = rules.current();
        BudgetCalculator.Summary budget = budgets.summary(departmentId);
        List<UserRole> approvers = RoutingRules.approversFor(amount, r.bands());
        var minOffers = SelectionRules.minOffers(amount, 0, r.quotationThreshold(), r.minCompetitiveOffers());
        return new Dto.RoutingPreview(amount, approvers.isEmpty(), approvers, mapper.budget(budget),
                BudgetCalculator.fits(amount, budget.available()), r.budgetMode(), minOffers.applies(),
                r.minCompetitiveOffers(), r.approvalSlaHours());
    }

    @Transactional
    public Dto.NeedDetail create(Dto.CreateNeedRequest in) {
        AppUser user = currentUser.require(UserRole.DEPARTMENT_OFFICER, UserRole.DEPARTMENT_MANAGER);
        if (!in.departmentId().equals(user.getDepartmentId())) {
            throw ApiException.forbidden("You can only raise needs for your own department");
        }
        lookup.department(in.departmentId());

        PublicNeed need = new PublicNeed();
        need.setReference(References.next("NEED", needs.count()));
        need.setDepartmentId(in.departmentId());
        need.setCreatedBy(user.getId());
        need.setTitle(in.title().trim());
        need.setProblemStatement(in.problemStatement().trim());
        need.setDesiredOutcome(in.desiredOutcome().trim());
        need.setCategory(in.category());
        need.setPriority(in.priority());
        need.setEstimatedBudget(in.estimatedBudget());
        need.setRequiredCapabilities(in.requiredCapabilities() == null ? new ArrayList<>()
                : new ArrayList<>(in.requiredCapabilities().stream().map(String::trim).filter(s -> !s.isEmpty()).toList()));
        need.setLocation(mapper.geo(in.location()));
        need.setStatus(in.submit() ? NeedStatus.OPEN : NeedStatus.DRAFT);
        need.setCreatedAt(Clock.now());
        need = needs.save(need);

        if (in.documents() != null) {
            for (Dto.Attachment doc : in.documents()) {
                Attachment a = new Attachment();
                a.setEntityType("PublicNeed");
                a.setEntityId(need.getId());
                a.setFileName(doc.fileName());
                a.setUrl(doc.url());
                a.setUploadedBy(user.getId());
                a.setUploadedAt(Clock.now());
                attachments.save(a);
            }
        }
        audit.record(user.getId(), "NEED_CREATED", "PublicNeed", need.getId(), need.getId(),
                user.getFullName() + " recorded need " + need.getReference() + ": " + need.getTitle(),
                Map.of("category", need.getCategory().name(), "estimatedBudget", need.getEstimatedBudget(),
                        "status", need.getStatus().name()));

        if (in.submit()) {
            if (in.sourcingMethod() == null || in.justification() == null || in.justification().isBlank()) {
                throw new ApiException(org.springframework.http.HttpStatus.BAD_REQUEST, "VALIDATION_FAILED",
                        "Justification and sourcing method are required to submit",
                        Map.of("justification", "required", "sourcingMethod", "required"));
            }
            submitRequest(need, user, in.estimatedBudget(), in.justification().trim(), in.sourcingMethod());
        }
        return mapper.needDetail(need);
    }

    @Transactional
    public Dto.NeedDetail submitDraft(String needId, Dto.SubmitNeedRequest in) {
        AppUser user = currentUser.require(UserRole.DEPARTMENT_OFFICER, UserRole.DEPARTMENT_MANAGER);
        PublicNeed need = lookup.need(needId);
        if (!need.getCreatedBy().equals(user.getId())) {
            throw ApiException.forbidden("Only the creator can submit this draft");
        }
        if (need.getStatus() != NeedStatus.DRAFT || requests.findByNeedId(needId).isPresent()) {
            throw ApiException.invalidState("Need is not a draft");
        }
        need.setStatus(NeedStatus.OPEN);
        need.setEstimatedBudget(in.amount());
        needs.save(need);
        submitRequest(need, user, in.amount(), in.justification().trim(), in.sourcingMethod());
        return mapper.needDetail(need);
    }

    /** Budget check (BR-03), request creation and approval routing (BR-02). Throws -> whole transaction rolls back. */
    private void submitRequest(PublicNeed need, AppUser user, BigDecimal amount, String justification,
                               SourcingMethod sourcing) {
        RuleSnapshot r = rules.current();
        BudgetCalculator.Summary budget = budgets.summary(need.getDepartmentId());
        boolean fits = BudgetCalculator.fits(amount, budget.available());
        if (!fits && r.budgetMode() == BudgetMode.BLOCK) {
            throw ApiException.rule("BUDGET_EXCEEDED",
                    "Requested " + Money.format(amount) + " exceeds available budget " + Money.format(budget.available()),
                    Map.of("available", budget.available(), "requested", amount));
        }
        Instant now = Clock.now();
        PurchaseRequest pr = new PurchaseRequest();
        pr.setReference(References.next("PR", requests.count()));
        pr.setNeedId(need.getId());
        pr.setRequestedBy(user.getId());
        pr.setRuleSetId(r.id());
        pr.setAmount(amount);
        pr.setJustification(justification);
        pr.setSourcingMethod(sourcing);
        pr.setStatus(RequestStatus.PENDING_APPROVAL);
        pr.setBudgetAvailableSnapshot(budget.available());
        pr.setSubmittedAt(now);
        pr.setCreatedAt(now);
        pr = requests.save(pr);

        audit.record(null, "BUDGET_VALIDATED", "PurchaseRequest", pr.getId(), need.getId(),
                "Budget check " + (fits ? "passed" : "WARNING") + ": " + Money.format(amount) + " against "
                        + Money.format(budget.available()) + " available in " + lookup.departmentName(need.getDepartmentId()),
                Map.of("requested", amount, "available", budget.available(), "allocated", budget.allocated(),
                        "committed", budget.committed(), "withinBudget", fits, "ruleSetVersion", r.version()));
        audit.record(user.getId(), "REQUEST_SUBMITTED", "PurchaseRequest", pr.getId(), need.getId(),
                pr.getReference() + " submitted for " + Money.format(amount) + " (" + sourcing + ")",
                Map.of("amount", amount, "sourcingMethod", sourcing.name()));

        List<UserRole> approvers = RoutingRules.approversFor(amount, r.bands());
        if (approvers.isEmpty()) {
            ApprovalStep auto = new ApprovalStep();
            auto.setPurchaseRequestId(pr.getId());
            auto.setSequence(1);
            auto.setRequiredRole(UserRole.SYSTEM);
            auto.setStatus(StepStatus.AUTO_APPROVED);
            auto.setActivatedAt(now);
            auto.setDecidedAt(now);
            auto.setComment("Auto-approved: below the configured approval threshold");
            steps.save(auto);
            pr.setStatus(RequestStatus.APPROVED);
            pr.setDecidedAt(now);
            requests.save(pr);
            audit.record(null, "REQUEST_APPROVED", "PurchaseRequest", pr.getId(), need.getId(),
                    pr.getReference() + " auto-approved (below approval threshold)", Map.of("auto", true));
            ApprovalService.notifyApproved(notifications, pr, need);
        } else {
            for (int i = 0; i < approvers.size(); i++) {
                ApprovalStep st = new ApprovalStep();
                st.setPurchaseRequestId(pr.getId());
                st.setSequence(i + 1);
                st.setRequiredRole(approvers.get(i));
                if (i == 0) {
                    st.setStatus(StepStatus.PENDING);
                    st.setActivatedAt(now);
                    st.setDueAt(SlaCalculator.dueAt(now, r.approvalSlaHours()));
                } else {
                    st.setStatus(StepStatus.WAITING);
                }
                steps.save(st);
            }
            ApprovalService.notifyStep(notifications, approvers.get(0), need, pr);
        }
    }
}
