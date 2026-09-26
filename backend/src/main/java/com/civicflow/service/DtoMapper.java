package com.civicflow.service;

import com.civicflow.domain.AppUser;
import com.civicflow.domain.ApprovalStep;
import com.civicflow.domain.AuditLogEntry;
import com.civicflow.domain.Department;
import com.civicflow.domain.GeoLocation;
import com.civicflow.domain.ImpactMeasurement;
import com.civicflow.domain.ImpactMetric;
import com.civicflow.domain.Implementation;
import com.civicflow.domain.InnovationOpportunity;
import com.civicflow.domain.InnovationSolution;
import com.civicflow.domain.Notification;
import com.civicflow.domain.OpportunitySubmission;
import com.civicflow.domain.Provider;
import com.civicflow.domain.PublicNeed;
import com.civicflow.domain.PurchaseOrder;
import com.civicflow.domain.PurchaseRequest;
import com.civicflow.domain.Supplier;
import com.civicflow.domain.enums.ImplementationStatus;
import com.civicflow.domain.enums.OpportunityStatus;
import com.civicflow.domain.enums.POStatus;
import com.civicflow.domain.enums.SubmissionStatus;
import com.civicflow.domain.enums.UpdateType;
import com.civicflow.repository.*;
import com.civicflow.rules.BudgetCalculator;
import com.civicflow.rules.ImpactCalculator;
import com.civicflow.rules.LifecycleStageResolver;
import com.civicflow.rules.RuleSnapshot;
import com.civicflow.rules.SlaCalculator;
import com.civicflow.web.dto.Dto;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Entity -> DTO mapping. ALL derived values (stage, SLA, budget, closing soon, scores, impact status) are computed
 * here or in the rule engine - the frontend never recalculates them (constitution Art. VIII.2).
 */
@Component
public class DtoMapper {

    private final Lookup lookup;
    private final BudgetService budgets;
    private final RuleService rules;
    private final PurchaseRequestRepository requests;
    private final ApprovalStepRepository steps;
    private final InnovationOpportunityRepository opportunities;
    private final EvaluationCriterionRepository criteria;
    private final OpportunitySubmissionRepository submissions;
    private final InnovationSolutionRepository solutions;
    private final SupplierRepository suppliers;
    private final SupplierQuoteRepository quotes;
    private final PurchaseOrderRepository orders;
    private final ImplementationRepository implementations;
    private final MilestoneRepository milestones;
    private final ImplementationUpdateRepository updates;
    private final ImpactMetricRepository metrics;
    private final ImpactMeasurementRepository measurements;
    private final AttachmentRepository attachments;
    private final ProviderRepository providers;
    private final ObjectMapper json = new ObjectMapper();

    public DtoMapper(Lookup lookup, BudgetService budgets, RuleService rules, PurchaseRequestRepository requests,
                     ApprovalStepRepository steps, InnovationOpportunityRepository opportunities,
                     EvaluationCriterionRepository criteria, OpportunitySubmissionRepository submissions,
                     InnovationSolutionRepository solutions, SupplierRepository suppliers,
                     SupplierQuoteRepository quotes, PurchaseOrderRepository orders,
                     ImplementationRepository implementations, MilestoneRepository milestones,
                     ImplementationUpdateRepository updates, ImpactMetricRepository metrics,
                     ImpactMeasurementRepository measurements, AttachmentRepository attachments,
                     ProviderRepository providers) {
        this.lookup = lookup;
        this.budgets = budgets;
        this.rules = rules;
        this.requests = requests;
        this.steps = steps;
        this.opportunities = opportunities;
        this.criteria = criteria;
        this.submissions = submissions;
        this.solutions = solutions;
        this.suppliers = suppliers;
        this.quotes = quotes;
        this.orders = orders;
        this.implementations = implementations;
        this.milestones = milestones;
        this.updates = updates;
        this.metrics = metrics;
        this.measurements = measurements;
        this.attachments = attachments;
        this.providers = providers;
    }

    // ---------- shared ----------
    public Dto.Geo geo(GeoLocation g) {
        return g == null ? null : new Dto.Geo(g.getProvince(), g.getMunicipality(), g.getWard(), g.getLatitude(),
                g.getLongitude());
    }

    public GeoLocation geo(Dto.Geo g) {
        return new GeoLocation(g.province(), g.municipality(), g.ward(), g.latitude(), g.longitude());
    }

    public Dto.User user(AppUser u) {
        String providerName = u.getProviderId() == null ? null
                : providers.findById(u.getProviderId()).map(Provider::getName).orElse(null);
        return new Dto.User(u.getId(), u.getFullName(), u.getEmail(), u.getTitle(), u.getRole(), u.getDepartmentId(),
                lookup.departmentName(u.getDepartmentId()), u.getProviderId(), providerName, u.isActive(), u.getCreatedAt());
    }

    public Dto.Budget budget(BudgetCalculator.Summary s) {
        return new Dto.Budget(s.allocated(), s.committed(), s.available(), s.utilisationPct());
    }

    public Dto.Department department(Department d) {
        return new Dto.Department(d.getId(), d.getCode(), d.getName(), d.getMunicipality(), d.getProvince(),
                d.getFinancialYear(), budget(budgets.summary(d.getId())));
    }

    public List<Dto.Attachment> attachments(String entityType, String entityId) {
        return attachments.findByEntityTypeAndEntityId(entityType, entityId).stream()
                .map(a -> new Dto.Attachment(a.getId(), a.getFileName(), a.getUrl())).toList();
    }

    // ---------- needs ----------
    public LifecycleStageResolver.Input stageInput(PublicNeed n) {
        PurchaseRequest pr = requests.findByNeedId(n.getId()).orElse(null);
        InnovationOpportunity opp = opportunities.findByNeedId(n.getId()).orElse(null);
        PurchaseOrder po = pr == null ? null : orders.findByPurchaseRequestId(pr.getId()).orElse(null);
        Implementation impl = po == null ? null : implementations.findByPurchaseOrderId(po.getId()).orElse(null);
        return new LifecycleStageResolver.Input(n.getStatus(), pr == null ? null : pr.getStatus(),
                pr == null ? null : pr.getSourcingMethod(), opp == null ? null : opp.getStatus(),
                po == null ? null : po.getStatus(), impl == null ? null : impl.getStatus());
    }

    public Dto.NeedSummary needSummary(PublicNeed n) {
        PurchaseRequest pr = requests.findByNeedId(n.getId()).orElse(null);
        InnovationOpportunity opp = opportunities.findByNeedId(n.getId()).orElse(null);
        return new Dto.NeedSummary(n.getId(), n.getReference(), n.getTitle(), n.getDepartmentId(),
                lookup.departmentName(n.getDepartmentId()), n.getCategory(), n.getPriority(), n.getEstimatedBudget(),
                n.getStatus(), LifecycleStageResolver.resolve(stageInput(n)), geo(n.getLocation()), n.getCreatedAt(),
                lookup.userName(n.getCreatedBy()), pr == null ? null : pr.getStatus(),
                opp == null ? null : opp.getId(), opp == null ? null : opp.getStatus());
    }

    public Dto.NeedDetail needDetail(PublicNeed n) {
        Dto.NeedSummary s = needSummary(n);
        PurchaseRequest pr = requests.findByNeedId(n.getId()).orElse(null);
        InnovationOpportunity opp = opportunities.findByNeedId(n.getId()).orElse(null);
        PurchaseOrder po = pr == null ? null : orders.findByPurchaseRequestId(pr.getId()).orElse(null);
        Implementation impl = po == null ? null : implementations.findByPurchaseOrderId(po.getId()).orElse(null);
        List<Dto.Stage> stages = LifecycleStageResolver.track(stageInput(n)).stream()
                .map(st -> new Dto.Stage(st.stage(), st.state())).toList();
        return new Dto.NeedDetail(s.id(), s.reference(), s.title(), s.departmentId(), s.departmentName(),
                s.category(), s.priority(), s.estimatedBudget(), s.status(), s.stage(), s.location(), s.createdAt(),
                s.createdByName(), s.requestStatus(), s.opportunityId(), s.opportunityStatus(),
                n.getProblemStatement(), n.getDesiredOutcome(), List.copyOf(n.getRequiredCapabilities()),
                attachments("PublicNeed", n.getId()), stages, pr == null ? null : request(pr, null),
                opp == null ? null : opportunitySummary(opp), po == null ? null : purchaseOrder(po),
                impl == null ? null : implementationSummary(impl));
    }

    // ---------- requests ----------
    public Dto.ApprovalStep step(ApprovalStep st, Instant now) {
        SlaCalculator.Sla sla = st.getDueAt() == null
                ? SlaCalculator.evaluate(st.getStatus(), now, now)
                : SlaCalculator.evaluate(st.getStatus(), st.getDueAt(), now);
        return new Dto.ApprovalStep(st.getId(), st.getSequence(), st.getRequiredRole(), st.getApproverId(),
                st.getApproverId() == null ? null : lookup.userName(st.getApproverId()), st.getStatus(),
                st.getActivatedAt(), st.getDueAt(), st.getDecidedAt(), st.getEscalatedAt(), st.getComment(),
                new Dto.Sla(sla.state(), sla.hoursRemaining()));
    }

    public Dto.PurchaseRequest request(PurchaseRequest pr, String actionableStepId) {
        PublicNeed need = lookup.need(pr.getNeedId());
        Instant now = Clock.now();
        List<Dto.ApprovalStep> stepDtos = steps.findByPurchaseRequestIdOrderBySequence(pr.getId()).stream()
                .map(st -> step(st, now)).toList();
        String poId = orders.findByPurchaseRequestId(pr.getId()).map(PurchaseOrder::getId).orElse(null);
        return new Dto.PurchaseRequest(pr.getId(), pr.getReference(), need.getId(), need.getReference(),
                need.getTitle(), need.getDepartmentId(), lookup.departmentName(need.getDepartmentId()),
                pr.getRequestedBy(), lookup.userName(pr.getRequestedBy()), pr.getAmount(), pr.getJustification(),
                pr.getSourcingMethod(), pr.getStatus(), pr.getBudgetAvailableSnapshot(),
                rules.versionOf(pr.getRuleSetId()), pr.getSubmittedAt(), pr.getDecidedAt(), stepDtos,
                quotes.countByPurchaseRequestId(pr.getId()), poId, actionableStepId);
    }

    // ---------- opportunities ----------
    public String displayStatus(InnovationOpportunity o, RuleSnapshot r) {
        if (o.getStatus() == OpportunityStatus.PUBLISHED) {
            Instant now = Clock.now();
            if (o.getSubmissionDeadline().isAfter(now)
                    && Duration.between(now, o.getSubmissionDeadline()).toDays() < r.closingSoonDays()) {
                return "CLOSING_SOON";
            }
        }
        return o.getStatus().name();
    }

    public long daysToDeadline(InnovationOpportunity o) {
        return Math.floorDiv(Duration.between(Clock.now(), o.getSubmissionDeadline()).toHours(), 24);
    }

    public Dto.OpportunitySummary opportunitySummary(InnovationOpportunity o) {
        PublicNeed n = lookup.need(o.getNeedId());
        RuleSnapshot r = rules.current();
        return new Dto.OpportunitySummary(o.getId(), o.getReference(), n.getId(), n.getReference(), o.getTitle(),
                lookup.departmentName(n.getDepartmentId()), n.getCategory(), n.getEstimatedBudget(),
                List.copyOf(n.getRequiredCapabilities()), geo(n.getLocation()), o.getSubmissionDeadline(),
                o.getStatus(), displayStatus(o, r), daysToDeadline(o),
                submissions.countByOpportunityIdAndStatusNot(o.getId(), SubmissionStatus.WITHDRAWN),
                List.copyOf(o.getEligibleProviderTypes()), o.isOpenSourcePreferred(), o.getPublishedAt());
    }

    public List<Dto.Criterion> criteria(String opportunityId) {
        return criteria.findByOpportunityIdOrderBySortOrder(opportunityId).stream()
                .map(c -> new Dto.Criterion(c.getId(), c.getCriterionKey(), c.getName(), c.getWeightPct(),
                        c.getScoringMethod())).toList();
    }

    public Dto.OpportunityDetail opportunityDetail(InnovationOpportunity o, AppUser viewer) {
        Dto.OpportunitySummary s = opportunitySummary(o);
        PublicNeed n = lookup.need(o.getNeedId());
        boolean provider = viewer.getProviderId() != null;
        List<Dto.Submission> subs = provider ? null
                : submissions.findByOpportunityIdOrderBySubmittedAt(o.getId()).stream().map(this::submission).toList();
        Dto.Submission mine = provider ? submissions.findByOpportunityIdAndProviderId(o.getId(), viewer.getProviderId())
                .map(this::submission).orElse(null) : null;
        return new Dto.OpportunityDetail(s.id(), s.reference(), s.needId(), s.needReference(), s.title(),
                s.departmentName(), s.category(), s.budget(), s.requiredCapabilities(), s.location(),
                s.submissionDeadline(), s.status(), s.displayStatus(), s.daysToDeadline(), s.submissionCount(),
                s.eligibleProviderTypes(), s.openSourcePreferred(), s.publishedAt(), o.getDescription(),
                n.getProblemStatement(), n.getDesiredOutcome(), criteria(o.getId()), subs, mine);
    }

    // ---------- submissions ----------
    public Dto.Submission submission(OpportunitySubmission s) {
        InnovationOpportunity o = lookup.opportunity(s.getOpportunityId());
        Provider p = lookup.provider(s.getProviderId());
        String solutionName = s.getSolutionId() == null ? null
                : solutions.findById(s.getSolutionId()).map(InnovationSolution::getName).orElse(null);
        return new Dto.Submission(s.getId(), o.getId(), o.getReference(), o.getTitle(), p.getId(), p.getName(),
                p.getProviderType(), p.getBbbeeLevel(), p.getLocation().getMunicipality(),
                p.getLocation().getProvince(), s.getSolutionId(), solutionName, s.getProposedPrice(),
                s.getTechnicalProposal(), s.getImplementationPlan(), s.getDurationWeeks(), s.getLocalJobsDeclared(),
                s.getStatus(), s.getStatusReason(), s.getSubmittedAt(), attachments("OpportunitySubmission", s.getId()));
    }

    // ---------- procurement ----------
    public Dto.Supplier supplier(Supplier s) {
        Provider p = lookup.provider(s.getProviderId());
        return new Dto.Supplier(s.getId(), p.getId(), p.getName(), p.getProviderType(), s.getSupplierNumber(),
                s.getCsdNumber(), s.isTaxCompliant(), s.getStatus(), p.getBbbeeLevel(), s.getVerifiedAt(),
                s.getVerifiedBy() == null ? null : lookup.userName(s.getVerifiedBy()));
    }

    public Dto.PurchaseOrder purchaseOrder(PurchaseOrder po) {
        PurchaseRequest pr = lookup.request(po.getPurchaseRequestId());
        PublicNeed n = lookup.need(pr.getNeedId());
        Supplier s = lookup.supplier(po.getSupplierId());
        Provider p = lookup.provider(s.getProviderId());
        String implId = implementations.findByPurchaseOrderId(po.getId()).map(Implementation::getId).orElse(null);
        return new Dto.PurchaseOrder(po.getId(), po.getPoNumber(), pr.getId(), pr.getReference(), n.getId(),
                n.getTitle(), lookup.departmentName(n.getDepartmentId()), s.getId(), p.getName(), s.getStatus(),
                po.getSubmissionId(), po.getQuoteId(), po.getAmount(), po.getStatus(), po.isDeviation(),
                po.getDeviationJustification(), po.getRecommendedRef(), lookup.userName(po.getSelectedBy()),
                po.getSelectedAt(), po.getIssuedBy() == null ? null : lookup.userName(po.getIssuedBy()),
                po.getIssuedAt(), po.getCompletedAt(), implId);
    }

    // ---------- implementation & impact ----------
    public Dto.ImplementationSummary implementationSummary(Implementation i) {
        PurchaseOrder po = lookup.order(i.getPurchaseOrderId());
        PublicNeed n = lookup.needOfOrder(po);
        Supplier s = lookup.supplier(po.getSupplierId());
        boolean late = i.getStatus() != ImplementationStatus.COMPLETED && i.getStatus() != ImplementationStatus.CANCELLED
                && i.getExpectedCompletion() != null && i.getExpectedCompletion().isBefore(Clock.today());
        return new Dto.ImplementationSummary(i.getId(), po.getId(), po.getPoNumber(), n.getId(), n.getTitle(),
                n.getCategory(), lookup.departmentName(n.getDepartmentId()), lookup.provider(s.getProviderId()).getName(),
                i.getManagerId(), lookup.userName(i.getManagerId()), i.getStatus(), i.getStartDate(),
                i.getExpectedCompletion(), i.getActualCompletion(), i.getProgressPct(), geo(n.getLocation()),
                po.getAmount(), late, metrics.findByImplementationIdOrderByCreatedAt(i.getId()).size());
    }

    public Dto.ImplementationDetail implementationDetail(Implementation i) {
        Dto.ImplementationSummary s = implementationSummary(i);
        LocalDate today = Clock.today();
        List<Dto.Milestone> ms = milestones.findByImplementationIdOrderBySortOrder(i.getId()).stream()
                .map(m -> new Dto.Milestone(m.getId(), m.getTitle(), m.getDueDate(), m.getCompletedAt(),
                        m.getCompletedAt() == null && m.getDueDate().isBefore(today))).toList();
        List<Dto.ImplementationUpdate> ups = updates.findByImplementationIdOrderByCreatedAtDesc(i.getId()).stream()
                .map(u -> new Dto.ImplementationUpdate(u.getId(), u.getUpdateType(), u.getDescription(),
                        u.getProgressPct(), u.getEvidenceUrl(), lookup.userName(u.getAuthorId()), u.getCreatedAt()))
                .toList();
        List<Dto.ImpactMetric> ms2 = metrics.findByImplementationIdOrderByCreatedAt(i.getId()).stream()
                .map(this::metric).toList();
        boolean evidence = updates.existsByImplementationIdAndUpdateType(i.getId(), UpdateType.EVIDENCE);
        return new Dto.ImplementationDetail(s.id(), s.purchaseOrderId(), s.poNumber(), s.needId(), s.needTitle(),
                s.needCategory(), s.departmentName(), s.supplierName(), s.managerId(), s.managerName(), s.status(),
                s.startDate(), s.expectedCompletion(), s.actualCompletion(), s.progressPct(), s.location(),
                s.amount(), s.isLate(), s.metricCount(), ms, ups, ms2, evidence);
    }

    public Dto.ImpactMetric metric(ImpactMetric m) {
        Implementation impl = lookup.implementation(m.getImplementationId());
        PublicNeed n = lookup.needOfImplementation(impl);
        List<ImpactMeasurement> history = measurements.findByMetricIdOrderByMeasuredAtAsc(m.getId());
        ImpactMeasurement latest = history.isEmpty() ? null : history.get(history.size() - 1);
        ImpactCalculator.Result r = ImpactCalculator.compute(m.getBaselineValue().doubleValue(),
                m.getTargetValue().doubleValue(), latest == null ? null : latest.getMeasuredValue().doubleValue(),
                m.getDirection(), rules.current().impactOnTrackPct());
        return new Dto.ImpactMetric(m.getId(), impl.getId(), n.getId(), n.getTitle(),
                lookup.departmentName(n.getDepartmentId()), m.getName(), m.getDescription(), m.getUnit(),
                m.getDirection(), m.getBaselineValue(), m.getTargetValue(), r.current(), r.changePct(),
                r.progressPct(), r.status(), latest == null ? null : latest.getMeasuredAt(),
                history.stream().map(h -> new Dto.Measurement(h.getId(), h.getMeasuredValue(), h.getMeasuredAt(),
                        h.getEvidenceUrl(), h.getNote(), h.getWard(), lookup.userName(h.getRecordedBy()))).toList());
    }

    // ---------- ecosystem ----------
    public Dto.Provider provider(Provider p) {
        var supplier = suppliers.findByProviderId(p.getId()).orElse(null);
        var subs = submissions.findByProviderIdOrderBySubmittedAtDesc(p.getId());
        long awards = subs.stream().filter(s -> s.getStatus() == SubmissionStatus.SELECTED).count();
        if (supplier != null) {
            awards = Math.max(awards, orders.findAll().stream()
                    .filter(o -> Objects.equals(o.getSupplierId(), supplier.getId()) && o.getStatus() != POStatus.CANCELLED)
                    .count());
        }
        boolean expired = p.getBbbeeExpiry() != null && p.getBbbeeExpiry().isBefore(Clock.today());
        return new Dto.Provider(p.getId(), p.getName(), p.getProviderType(), p.getDescription(),
                p.getRegistrationNumber(), p.getBbbeeLevel(), p.getBbbeeExpiry(), expired, geo(p.getLocation()),
                p.getContactEmail(), p.getWebsite(), p.getEmployees(), p.getVerificationStatus(),
                supplier == null ? null : supplier.getStatus(), solutions.findByProviderId(p.getId()).size(),
                subs.size(), awards);
    }

    public Dto.ProviderDetail providerDetail(Provider p) {
        Dto.Provider d = provider(p);
        return new Dto.ProviderDetail(d.id(), d.name(), d.providerType(), d.description(), d.registrationNumber(),
                d.bbbeeLevel(), d.bbbeeExpiry(), d.bbbeeExpired(), d.location(), d.contactEmail(), d.website(),
                d.employees(), d.verificationStatus(), d.supplierStatus(), d.solutionCount(), d.submissionCount(),
                d.awardCount(), solutions.findByProviderId(p.getId()).stream().map(this::solution).toList());
    }

    /** Platform deployments are counted from real implementations (not self-declared). */
    public long platformDeployments(String solutionId) {
        return submissions.findBySolutionId(solutionId).stream()
                .map(s -> orders.findBySubmissionId(s.getId()).orElse(null))
                .filter(Objects::nonNull)
                .filter(po -> implementations.findByPurchaseOrderId(po.getId()).isPresent())
                .count();
    }

    public Dto.Solution solution(InnovationSolution s) {
        Provider p = lookup.provider(s.getProviderId());
        return new Dto.Solution(s.getId(), p.getId(), p.getName(), p.getProviderType(), s.getName(),
                s.getDescription(), s.getCategory(), List.copyOf(s.getTechnologies()), s.isOpenSource(),
                s.getRepositoryUrl(), s.getLicense(), s.getDemoUrl(), List.copyOf(s.getCoverageProvinces()),
                s.getMaturity(), s.getExternalDeployments(), platformDeployments(s.getId()), s.getStatus());
    }

    // ---------- cross-cutting ----------
    public Dto.NotificationItem notification(Notification n) {
        return new Dto.NotificationItem(n.getId(), n.getType(), n.getTitle(), n.getMessage(), n.getEntityType(),
                n.getEntityId(), n.getLink(), n.isRead(), n.getCreatedAt());
    }

    public Dto.AuditEntry audit(AuditLogEntry e, Map<String, AppUser> actors) {
        AppUser actor = e.getActorId() == null ? null : actors.get(e.getActorId());
        Map<String, Object> meta = null;
        if (e.getMetadata() != null) {
            try {
                meta = json.readValue(e.getMetadata(), new TypeReference<Map<String, Object>>() {
                });
            } catch (Exception ignored) {
                meta = Map.of("raw", e.getMetadata());
            }
        }
        return new Dto.AuditEntry(e.getId(), e.getSequence(), e.getOccurredAt(), e.getActorId(),
                actor == null ? "System" : actor.getFullName(), actor == null ? null : actor.getRole(), e.getAction(),
                e.getEntityType(), e.getEntityId(), e.getNeedId(), e.getSummary(), meta, e.getPrevHash(), e.getHash());
    }

    public static BigDecimal nz(BigDecimal v) {
        return v == null ? BigDecimal.ZERO : v;
    }
}
