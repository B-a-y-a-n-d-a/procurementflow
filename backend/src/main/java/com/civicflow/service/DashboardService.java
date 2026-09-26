package com.civicflow.service;

import com.civicflow.domain.AppUser;
import com.civicflow.domain.ApprovalStep;
import com.civicflow.domain.Implementation;
import com.civicflow.domain.InnovationOpportunity;
import com.civicflow.domain.OpportunitySubmission;
import com.civicflow.domain.PublicNeed;
import com.civicflow.domain.PurchaseOrder;
import com.civicflow.domain.PurchaseRequest;
import com.civicflow.domain.enums.ImplementationStatus;
import com.civicflow.domain.enums.LifecycleStage;
import com.civicflow.domain.enums.OpportunityStatus;
import com.civicflow.domain.enums.POStatus;
import com.civicflow.domain.enums.RequestStatus;
import com.civicflow.domain.enums.SlaState;
import com.civicflow.domain.enums.SourcingMethod;
import com.civicflow.domain.enums.StepStatus;
import com.civicflow.domain.enums.SubmissionStatus;
import com.civicflow.domain.enums.SupplierStatus;
import com.civicflow.domain.enums.UserRole;
import com.civicflow.repository.*;
import com.civicflow.rules.SlaCalculator;
import com.civicflow.security.CurrentUser;
import com.civicflow.web.dto.Dto;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.EnumSet;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/** FR-110: role dashboards. Executive view is framed as investment -> outcome. */
@Service
public class DashboardService {

    private final DepartmentRepository departments;
    private final PublicNeedRepository needs;
    private final PurchaseRequestRepository requests;
    private final ApprovalStepRepository steps;
    private final InnovationOpportunityRepository opportunities;
    private final OpportunitySubmissionRepository submissions;
    private final PurchaseOrderRepository orders;
    private final ImplementationRepository implementations;
    private final ImpactMetricRepository metrics;
    private final SupplierRepository suppliers;
    private final InnovationSolutionRepository solutions;
    private final ProviderRepository providers;
    private final BudgetService budgets;
    private final CurrentUser currentUser;
    private final Lookup lookup;
    private final DtoMapper mapper;
    private final String organisationProvince;

    public DashboardService(DepartmentRepository departments, PublicNeedRepository needs,
                            PurchaseRequestRepository requests, ApprovalStepRepository steps,
                            InnovationOpportunityRepository opportunities, OpportunitySubmissionRepository submissions,
                            PurchaseOrderRepository orders, ImplementationRepository implementations,
                            ImpactMetricRepository metrics, SupplierRepository suppliers,
                            InnovationSolutionRepository solutions, ProviderRepository providers,
                            BudgetService budgets, CurrentUser currentUser, Lookup lookup, DtoMapper mapper,
                            @Value("${civicflow.organisation.province}") String organisationProvince) {
        this.departments = departments;
        this.needs = needs;
        this.requests = requests;
        this.steps = steps;
        this.opportunities = opportunities;
        this.submissions = submissions;
        this.orders = orders;
        this.implementations = implementations;
        this.metrics = metrics;
        this.suppliers = suppliers;
        this.solutions = solutions;
        this.providers = providers;
        this.budgets = budgets;
        this.currentUser = currentUser;
        this.lookup = lookup;
        this.mapper = mapper;
        this.organisationProvince = organisationProvince;
    }

    private static final Set<ImplementationStatus> ACTIVE_IMPL = EnumSet.of(ImplementationStatus.NOT_STARTED,
            ImplementationStatus.PLANNED, ImplementationStatus.IN_PROGRESS, ImplementationStatus.AT_RISK);

    private boolean overdue(ApprovalStep st) {
        return st.getStatus() == StepStatus.PENDING && st.getDueAt() != null
                && SlaCalculator.evaluate(st.getStatus(), st.getDueAt(), Clock.now()).state() == SlaState.OVERDUE;
    }

    @Transactional(readOnly = true)
    public Dto.ExecutiveDashboard executive() {
        currentUser.requireStaff();
        List<PurchaseOrder> allOrders = orders.findAll();
        BigDecimal totalValue = allOrders.stream()
                .filter(o -> o.getStatus() == POStatus.ISSUED || o.getStatus() == POStatus.COMPLETED)
                .map(PurchaseOrder::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        List<InnovationOpportunity> opps = opportunities.findAll();
        long activeOpps = opps.stream().filter(o -> EnumSet.of(OpportunityStatus.PUBLISHED, OpportunityStatus.CLOSED,
                OpportunityStatus.EVALUATION).contains(o.getStatus())).count();
        List<Implementation> impls = implementations.findAll();
        long activeImpl = impls.stream().filter(i -> ACTIVE_IMPL.contains(i.getStatus())).count();
        long atRisk = impls.stream().filter(i -> i.getStatus() == ImplementationStatus.AT_RISK).count();

        List<Dto.Department> deptDtos = departments.findAll().stream().map(mapper::department).toList();
        BigDecimal allocated = deptDtos.stream().map(d -> d.budget().allocated()).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal committed = deptDtos.stream().map(d -> d.budget().committed()).reduce(BigDecimal.ZERO, BigDecimal::add);
        double utilisation = allocated.signum() == 0 ? 0
                : committed.multiply(BigDecimal.valueOf(100)).divide(allocated, 1, RoundingMode.HALF_UP).doubleValue();

        List<ApprovalStep> pending = steps.findByStatus(StepStatus.PENDING);
        long slaBreaches = pending.stream().filter(this::overdue).count();

        Set<String> engaged = new HashSet<>();
        submissions.findAll().forEach(s -> engaged.add(s.getProviderId()));
        suppliers.findAll().stream().filter(s -> allOrders.stream().anyMatch(o -> o.getSupplierId().equals(s.getId())))
                .forEach(s -> engaged.add(s.getProviderId()));
        long localEngaged = engaged.stream().map(lookup::provider)
                .filter(p -> EcosystemService.isLocal(p, organisationProvince)).count();

        Map<LifecycleStage, Long> funnel = new LinkedHashMap<>();
        for (LifecycleStage s : List.of(LifecycleStage.NEED, LifecycleStage.APPROVAL, LifecycleStage.OPPORTUNITY,
                LifecycleStage.EVALUATION, LifecycleStage.PROCUREMENT, LifecycleStage.IMPLEMENTATION,
                LifecycleStage.IMPACT)) {
            funnel.put(s, 0L);
        }
        for (PublicNeed n : needs.findAll()) {
            LifecycleStage st = mapper.needSummary(n).stage();
            funnel.computeIfPresent(st, (k, v) -> v + 1);
        }

        List<Dto.ImpactHighlight> highlights = impls.stream()
                .filter(i -> !metrics.findByImplementationIdOrderByCreatedAt(i.getId()).isEmpty())
                .sorted((a, b) -> Boolean.compare(b.getStatus() == ImplementationStatus.COMPLETED,
                        a.getStatus() == ImplementationStatus.COMPLETED))
                .map(this::highlight).toList();

        List<Dto.PurchaseRequest> overdueRequests = pending.stream().filter(this::overdue)
                .map(st -> mapper.request(lookup.request(st.getPurchaseRequestId()), null)).toList();

        return new Dto.ExecutiveDashboard(
                new Dto.ExecutiveKpis(totalValue, activeOpps, activeImpl, utilisation, localEngaged, pending.size(),
                        slaBreaches, atRisk),
                funnel.entrySet().stream().map(e -> new Dto.FunnelItem(e.getKey(), e.getValue())).toList(),
                deptDtos, highlights,
                impls.stream().filter(i -> i.getStatus() == ImplementationStatus.AT_RISK || (ACTIVE_IMPL.contains(i.getStatus())
                                && mapper.implementationSummary(i).isLate()))
                        .map(mapper::implementationSummary).toList(),
                overdueRequests);
    }

    private Dto.ImpactHighlight highlight(Implementation i) {
        Dto.ImplementationSummary s = mapper.implementationSummary(i);
        List<Dto.HighlightMetric> ms = metrics.findByImplementationIdOrderByCreatedAt(i.getId()).stream()
                .map(mapper::metric)
                .map(m -> new Dto.HighlightMetric(m.name(), m.unit(), m.baseline(), m.current(), m.target(),
                        m.changePct(), m.status())).toList();
        return new Dto.ImpactHighlight(i.getId(), s.needId(), s.needTitle(), s.supplierName(), s.amount(), s.status(), ms);
    }

    @Transactional(readOnly = true)
    public Dto.DepartmentDashboard department(String departmentId) {
        currentUser.requireStaff();
        var dept = lookup.department(departmentId);
        List<PublicNeed> deptNeeds = needs.findByDepartmentId(departmentId);
        Set<String> needIds = new HashSet<>();
        deptNeeds.forEach(n -> needIds.add(n.getId()));
        List<PurchaseRequest> reqs = deptNeeds.stream().map(n -> requests.findByNeedId(n.getId()).orElse(null))
                .filter(Objects::nonNull).toList();
        long pendingApprovals = reqs.stream().filter(r -> r.getStatus() == RequestStatus.PENDING_APPROVAL).count();
        List<Dto.OpportunitySummary> opps = opportunities.findAll().stream().filter(o -> needIds.contains(o.getNeedId()))
                .map(mapper::opportunitySummary).toList();
        List<Implementation> impls = implementations.findAll().stream()
                .filter(i -> needIds.contains(lookup.needOfImplementation(i).getId())).toList();
        return new Dto.DepartmentDashboard(mapper.department(dept), pendingApprovals,
                reqs.stream().map(r -> mapper.request(r, null)).toList(), opps,
                impls.stream().map(mapper::implementationSummary).toList(),
                impls.stream().flatMap(i -> metrics.findByImplementationIdOrderByCreatedAt(i.getId()).stream())
                        .map(mapper::metric).toList());
    }

    @Transactional(readOnly = true)
    public Dto.ProcurementDashboard procurement() {
        currentUser.requireStaff();
        List<PurchaseRequest> approved = requests.findAll().stream()
                .filter(r -> r.getStatus() == RequestStatus.APPROVED)
                .filter(r -> orders.findByPurchaseRequestId(r.getId()).isEmpty()).toList();
        List<Dto.PurchaseRequest> awaiting = approved.stream()
                .filter(r -> r.getSourcingMethod() == SourcingMethod.OPEN_OPPORTUNITY
                        && opportunities.findByNeedId(r.getNeedId()).isEmpty())
                .map(r -> mapper.request(r, null)).toList();
        List<Dto.PurchaseRequest> quoteReqs = approved.stream()
                .filter(r -> r.getSourcingMethod() == SourcingMethod.QUOTATION)
                .map(r -> mapper.request(r, null)).toList();
        List<InnovationOpportunity> opps = opportunities.findAllByOrderByCreatedAtDesc();
        return new Dto.ProcurementDashboard(awaiting,
                opps.stream().filter(o -> o.getStatus() == OpportunityStatus.PUBLISHED || o.getStatus() == OpportunityStatus.DRAFT)
                        .map(mapper::opportunitySummary).toList(),
                opps.stream().filter(o -> o.getStatus() == OpportunityStatus.EVALUATION || o.getStatus() == OpportunityStatus.CLOSED)
                        .map(mapper::opportunitySummary).toList(),
                quoteReqs,
                orders.findAllByOrderBySelectedAtDesc().stream().filter(o -> o.getStatus() == POStatus.DRAFT)
                        .map(mapper::purchaseOrder).toList(),
                suppliers.findByStatus(SupplierStatus.PENDING_VERIFICATION).stream().map(mapper::supplier).toList());
    }

    @Transactional(readOnly = true)
    public Dto.ProviderDashboard provider() {
        AppUser user = currentUser.require(UserRole.PROVIDER);
        var provider = lookup.provider(user.getProviderId());
        List<Dto.OpportunitySummary> open = opportunities.findAllByOrderByCreatedAtDesc().stream()
                .filter(o -> o.getStatus() == OpportunityStatus.PUBLISHED && o.getSubmissionDeadline().isAfter(Clock.now()))
                .map(mapper::opportunitySummary).toList();
        List<Dto.OpportunitySummary> eligible = open.stream()
                .filter(o -> o.eligibleProviderTypes().contains(provider.getProviderType())).toList();
        List<OpportunitySubmission> mine = submissions.findByProviderIdOrderBySubmittedAtDesc(provider.getId());
        return new Dto.ProviderDashboard(mapper.provider(provider), eligible,
                eligible.stream().filter(o -> "CLOSING_SOON".equals(o.displayStatus())).toList(),
                mine.stream().map(mapper::submission).toList(),
                new Dto.ProviderCounts(mine.stream().filter(s -> s.getStatus() != SubmissionStatus.WITHDRAWN).count(),
                        mine.stream().filter(s -> s.getStatus() == SubmissionStatus.SHORTLISTED).count(),
                        mine.stream().filter(s -> s.getStatus() == SubmissionStatus.SELECTED).count()),
                solutions.findByProviderId(provider.getId()).stream().map(mapper::solution).toList());
    }

    public long providerCount() {
        return providers.count();
    }
}
