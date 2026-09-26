package com.civicflow.service;

import com.civicflow.domain.AppUser;
import com.civicflow.domain.Implementation;
import com.civicflow.domain.InnovationOpportunity;
import com.civicflow.domain.OpportunitySubmission;
import com.civicflow.domain.Provider;
import com.civicflow.domain.PublicNeed;
import com.civicflow.domain.PurchaseOrder;
import com.civicflow.domain.PurchaseRequest;
import com.civicflow.domain.Supplier;
import com.civicflow.domain.SupplierQuote;
import com.civicflow.domain.enums.ImplementationStatus;
import com.civicflow.domain.enums.OpportunityStatus;
import com.civicflow.domain.enums.POStatus;
import com.civicflow.domain.enums.RequestStatus;
import com.civicflow.domain.enums.SourcingMethod;
import com.civicflow.domain.enums.SubmissionStatus;
import com.civicflow.domain.enums.SupplierStatus;
import com.civicflow.domain.enums.UserRole;
import com.civicflow.domain.enums.VerificationStatus;
import com.civicflow.repository.AppUserRepository;
import com.civicflow.repository.ImplementationRepository;
import com.civicflow.repository.InnovationOpportunityRepository;
import com.civicflow.repository.OpportunitySubmissionRepository;
import com.civicflow.repository.ProviderRepository;
import com.civicflow.repository.PurchaseOrderRepository;
import com.civicflow.repository.PurchaseRequestRepository;
import com.civicflow.repository.SupplierQuoteRepository;
import com.civicflow.repository.SupplierRepository;
import com.civicflow.rules.Money;
import com.civicflow.rules.RuleSnapshot;
import com.civicflow.rules.ScoringEngine;
import com.civicflow.rules.SelectionRules;
import com.civicflow.security.CurrentUser;
import com.civicflow.web.ApiException;
import com.civicflow.web.dto.Dto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * US-08/US-09: human selection (BR-04, BR-05, BR-10), Provider -> Supplier onboarding and verification (BR-13),
 * quotations, and purchase orders.
 */
@Service
public class ProcurementService {

    private final PurchaseRequestRepository requests;
    private final InnovationOpportunityRepository opportunities;
    private final OpportunitySubmissionRepository submissions;
    private final SupplierRepository suppliers;
    private final SupplierQuoteRepository quotes;
    private final PurchaseOrderRepository orders;
    private final ImplementationRepository implementations;
    private final ProviderRepository providers;
    private final AppUserRepository users;
    private final EvaluationService evaluation;
    private final SubmissionService submissionService;
    private final RuleService rules;
    private final AuditService audit;
    private final NotificationService notifications;
    private final CurrentUser currentUser;
    private final Lookup lookup;
    private final DtoMapper mapper;

    public ProcurementService(PurchaseRequestRepository requests, InnovationOpportunityRepository opportunities,
                              OpportunitySubmissionRepository submissions, SupplierRepository suppliers,
                              SupplierQuoteRepository quotes, PurchaseOrderRepository orders,
                              ImplementationRepository implementations, ProviderRepository providers,
                              AppUserRepository users, EvaluationService evaluation,
                              SubmissionService submissionService, RuleService rules, AuditService audit,
                              NotificationService notifications, CurrentUser currentUser, Lookup lookup,
                              DtoMapper mapper) {
        this.requests = requests;
        this.opportunities = opportunities;
        this.submissions = submissions;
        this.suppliers = suppliers;
        this.quotes = quotes;
        this.orders = orders;
        this.implementations = implementations;
        this.providers = providers;
        this.users = users;
        this.evaluation = evaluation;
        this.submissionService = submissionService;
        this.rules = rules;
        this.audit = audit;
        this.notifications = notifications;
        this.currentUser = currentUser;
        this.lookup = lookup;
        this.mapper = mapper;
    }

    // ---------- opportunity route ----------
    @Transactional
    public Dto.PurchaseOrder selectSubmission(String opportunityId, Dto.SelectRequest in) {
        AppUser user = currentUser.require(UserRole.PROCUREMENT_OFFICER);
        InnovationOpportunity o = lookup.opportunity(opportunityId);
        if (o.getStatus() != OpportunityStatus.EVALUATION) {
            throw ApiException.invalidState("Selection is only possible during EVALUATION");
        }
        PublicNeed need = lookup.need(o.getNeedId());
        PurchaseRequest pr = requests.findByNeedId(need.getId()).orElseThrow();
        assertNoOrder(pr);
        RuleSnapshot r = rules.current();
        EvaluationService.Board board = evaluation.compute(o);
        if (!board.dto().allEvaluated()) {
            throw ApiException.rule("EVALUATION_INCOMPLETE",
                    "Every eligible submission needs a completed evaluation before selection");
        }
        if (!board.dto().minOffers().satisfied()) {
            throw ApiException.rule("MIN_OFFERS_NOT_MET", "At least " + r.minCompetitiveOffers()
                    + " eligible offers are required above " + Money.format(r.quotationThreshold()),
                    Map.of("count", board.dto().minOffers().count(), "minimum", r.minCompetitiveOffers()));
        }
        OpportunitySubmission selected = board.subs().get(in.submissionId());
        if (selected == null || !SubmissionService.isEligible(selected)) {
            throw ApiException.rule("NOT_ELIGIBLE", "Selected submission is not eligible");
        }
        String recommended = board.dto().recommendedSubmissionId();
        boolean deviation = SelectionRules.isDeviation(selected.getId(), recommended);
        requireJustification(deviation, in.justification(), r);

        Supplier supplier = ensureSupplier(selected.getProviderId(), user, need.getId());
        PurchaseOrder po = newOrder(pr, supplier, selected.getProposedPrice(), recommended, deviation,
                in.justification(), user);
        po.setSubmissionId(selected.getId());
        po = orders.save(po);

        for (OpportunitySubmission s : board.subs().values()) {
            if (s.getId().equals(selected.getId())) {
                s.setStatus(SubmissionStatus.SELECTED);
                s.setStatusReason(null);
                submissions.save(s);
                submissionService.notifyProvider(s.getProviderId(), "SUBMISSION_SELECTED", "Selected: " + o.getTitle(),
                        "Congratulations - your submission was selected. Supplier onboarding follows.", s);
            } else if (SubmissionService.isEligible(s)) {
                s.setStatus(SubmissionStatus.REJECTED);
                s.setStatusReason(SubmissionService.NOT_SELECTED);
                submissions.save(s);
                submissionService.notifyProvider(s.getProviderId(), "SUBMISSION_NOT_SELECTED",
                        "Outcome: " + o.getTitle(), "Your submission was not selected this time.", s);
            }
        }
        o.setStatus(OpportunityStatus.AWARDED);
        opportunities.save(o);

        Map<String, Object> meta = new LinkedHashMap<>();
        meta.put("selectedSubmissionId", selected.getId());
        meta.put("recommendedSubmissionId", recommended);
        meta.put("deviation", deviation);
        meta.put("justification", in.justification() == null ? "" : in.justification());
        meta.put("ranking", board.results().stream().map(res -> Map.of(
                "provider", lookup.provider(board.subs().get(res.offerId()).getProviderId()).getName(),
                "total", res.total() == null ? "n/a" : res.total(),
                "rank", res.rank() == null ? "n/a" : res.rank())).toList());
        audit.record(user.getId(), "SUPPLIER_SELECTED", "PurchaseOrder", po.getId(), need.getId(),
                lookup.provider(selected.getProviderId()).getName() + " selected for " + o.getReference() + " at "
                        + Money.format(selected.getProposedPrice())
                        + (deviation ? " - DEVIATION from recommendation, justified" : " - recommended option"), meta);
        return mapper.purchaseOrder(po);
    }

    // ---------- quotation route ----------
    @Transactional(readOnly = true)
    public Dto.QuoteBoard quoteBoard(String requestId) {
        currentUser.requireStaff();
        return quoteBoardFor(lookup.request(requestId));
    }

    private Dto.QuoteBoard quoteBoardFor(PurchaseRequest pr) {
        RuleSnapshot r = rules.current();
        List<SupplierQuote> list = quotes.findByPurchaseRequestIdOrderByAmount(pr.getId());
        String lowest = list.stream().filter(SupplierQuote::isCompliant).min(Comparator.comparing(SupplierQuote::getAmount))
                .map(SupplierQuote::getId).orElse(null);
        long compliant = list.stream().filter(SupplierQuote::isCompliant).count();
        var min = SelectionRules.minOffers(pr.getAmount(), compliant, r.quotationThreshold(), r.minCompetitiveOffers());
        List<Dto.Quote> dtos = list.stream().map(q -> {
            Supplier s = lookup.supplier(q.getSupplierId());
            Provider p = lookup.provider(s.getProviderId());
            return new Dto.Quote(q.getId(), s.getId(), p.getName(), s.getSupplierNumber(), p.getProviderType(),
                    p.getBbbeeLevel(), p.getLocation().getMunicipality(), q.getAmount(), q.getValidUntil(),
                    q.isCompliant(), q.getNonComplianceReason(), q.getReceivedAt(), Objects.equals(q.getId(), lowest));
        }).toList();
        var po = orders.findByPurchaseRequestId(pr.getId()).map(mapper::purchaseOrder).orElse(null);
        return new Dto.QuoteBoard(mapper.request(pr, null), dtos, lowest,
                new Dto.MinOffers(min.applies(), min.threshold(), min.minimum(), min.count(), min.satisfied()),
                r.deviationMinChars(), po);
    }

    @Transactional
    public Dto.QuoteBoard addQuote(String requestId, Dto.CreateQuoteRequest in) {
        AppUser user = currentUser.require(UserRole.PROCUREMENT_OFFICER);
        PurchaseRequest pr = lookup.request(requestId);
        if (pr.getSourcingMethod() != SourcingMethod.QUOTATION || pr.getStatus() != RequestStatus.APPROVED) {
            throw ApiException.invalidState("Quotes can only be recorded on APPROVED quotation requests");
        }
        assertNoOrder(pr);
        Supplier s = lookup.supplier(in.supplierId());
        if (s.getStatus() != SupplierStatus.ACTIVE) {
            throw ApiException.rule("SUPPLIER_NOT_ACTIVE", "Quotes can only be recorded from ACTIVE suppliers");
        }
        if (quotes.findByPurchaseRequestIdOrderByAmount(requestId).stream()
                .anyMatch(q -> q.getSupplierId().equals(s.getId()))) {
            throw ApiException.invalidState("This supplier already quoted on the request");
        }
        if (!in.isCompliant() && (in.nonComplianceReason() == null || in.nonComplianceReason().isBlank())) {
            throw ApiException.rule("COMMENT_REQUIRED", "State why the quote is non-compliant");
        }
        SupplierQuote q = new SupplierQuote();
        q.setPurchaseRequestId(requestId);
        q.setSupplierId(s.getId());
        q.setAmount(in.amount());
        q.setValidUntil(in.validUntil());
        q.setCompliant(in.isCompliant());
        q.setNonComplianceReason(in.isCompliant() ? null : in.nonComplianceReason());
        q.setReceivedAt(Clock.now());
        q.setRecordedBy(user.getId());
        quotes.save(q);
        String name = lookup.provider(s.getProviderId()).getName();
        audit.record(user.getId(), "QUOTE_RECORDED", "SupplierQuote", q.getId(), pr.getNeedId(),
                "Quote from " + name + " recorded on " + pr.getReference() + ": " + Money.format(in.amount())
                        + (in.isCompliant() ? "" : " (non-compliant)"),
                Map.of("supplier", name, "amount", in.amount(), "compliant", in.isCompliant()));
        return quoteBoardFor(pr);
    }

    @Transactional
    public Dto.PurchaseOrder selectQuote(String requestId, Dto.SelectQuoteRequest in) {
        AppUser user = currentUser.require(UserRole.PROCUREMENT_OFFICER);
        PurchaseRequest pr = lookup.request(requestId);
        if (pr.getSourcingMethod() != SourcingMethod.QUOTATION || pr.getStatus() != RequestStatus.APPROVED) {
            throw ApiException.invalidState("Only APPROVED quotation requests can be awarded");
        }
        assertNoOrder(pr);
        RuleSnapshot r = rules.current();
        Dto.QuoteBoard board = quoteBoardFor(pr);
        if (!board.minOffers().satisfied()) {
            throw ApiException.rule("MIN_OFFERS_NOT_MET", "At least " + r.minCompetitiveOffers()
                    + " compliant quotations are required above " + Money.format(r.quotationThreshold()),
                    Map.of("count", board.minOffers().count(), "minimum", r.minCompetitiveOffers()));
        }
        SupplierQuote q = quotes.findById(in.quoteId()).orElseThrow(() -> ApiException.notFound("Quote", in.quoteId()));
        if (!q.getPurchaseRequestId().equals(requestId) || !q.isCompliant()) {
            throw ApiException.rule("NOT_ELIGIBLE", "Only compliant quotes on this request can be selected");
        }
        boolean deviation = SelectionRules.isDeviation(q.getId(), board.lowestCompliantQuoteId());
        requireJustification(deviation, in.justification(), r);
        Supplier s = lookup.supplier(q.getSupplierId());
        PurchaseOrder po = newOrder(pr, s, q.getAmount(), board.lowestCompliantQuoteId(), deviation, in.justification(), user);
        po.setQuoteId(q.getId());
        po = orders.save(po);
        String name = lookup.provider(s.getProviderId()).getName();
        audit.record(user.getId(), "SUPPLIER_SELECTED", "PurchaseOrder", po.getId(), pr.getNeedId(),
                name + " selected on " + pr.getReference() + " at " + Money.format(q.getAmount())
                        + (deviation ? " - DEVIATION from lowest compliant quote, justified" : " - lowest compliant quote"),
                Map.of("quoteId", q.getId(), "deviation", deviation,
                        "justification", in.justification() == null ? "" : in.justification(),
                        "quotes", board.quotes().stream().map(x -> x.supplierName() + " " + Money.format(x.amount())
                                + (x.isCompliant() ? "" : " (non-compliant)")).toList()));
        return mapper.purchaseOrder(po);
    }

    // ---------- suppliers ----------
    @Transactional(readOnly = true)
    public List<Dto.Supplier> suppliers() {
        currentUser.requireStaff();
        return suppliers.findAll().stream().map(mapper::supplier)
                .sorted(Comparator.comparing(Dto.Supplier::providerName)).toList();
    }

    @Transactional
    public Dto.Supplier verify(String supplierId, Dto.VerifySupplierRequest in) {
        AppUser user = currentUser.require(UserRole.PROCUREMENT_OFFICER);
        Supplier s = lookup.supplier(supplierId);
        if (!in.taxCompliant()) {
            throw ApiException.rule("NOT_ELIGIBLE", "A supplier must be tax compliant to be activated");
        }
        s.setCsdNumber(in.csdNumber().trim());
        s.setTaxCompliant(true);
        s.setStatus(SupplierStatus.ACTIVE);
        s.setVerifiedBy(user.getId());
        s.setVerifiedAt(Clock.now());
        suppliers.save(s);
        Provider p = lookup.provider(s.getProviderId());
        p.setVerificationStatus(VerificationStatus.VERIFIED);
        providers.save(p);
        String needId = orders.findAll().stream()
                .filter(o -> o.getSupplierId().equals(s.getId()) && o.getStatus() == POStatus.DRAFT)
                .findFirst().map(o -> lookup.request(o.getPurchaseRequestId()).getNeedId()).orElse(null);
        audit.record(user.getId(), "SUPPLIER_VERIFIED", "Supplier", s.getId(), needId,
                p.getName() + " verified (CSD " + s.getCsdNumber() + ", tax compliant) - supplier ACTIVE",
                Map.of("csdNumber", s.getCsdNumber()));
        return mapper.supplier(s);
    }

    // ---------- purchase orders ----------
    @Transactional(readOnly = true)
    public List<Dto.PurchaseOrder> orders() {
        currentUser.requireStaff();
        return orders.findAllByOrderBySelectedAtDesc().stream().map(mapper::purchaseOrder).toList();
    }

    @Transactional
    public Dto.PurchaseOrder issue(String poId, Dto.IssuePoRequest in) {
        AppUser user = currentUser.require(UserRole.PROCUREMENT_OFFICER);
        PurchaseOrder po = lookup.order(poId);
        if (po.getStatus() != POStatus.DRAFT) {
            throw ApiException.invalidState("Only DRAFT purchase orders can be issued");
        }
        Supplier s = lookup.supplier(po.getSupplierId());
        if (s.getStatus() != SupplierStatus.ACTIVE) {
            throw ApiException.rule("SUPPLIER_NOT_ACTIVE", "Verify the supplier before issuing the purchase order");
        }
        AppUser manager = lookup.user(in.managerId());
        if (manager.getRole() == UserRole.PROVIDER) {
            throw ApiException.rule("NOT_ELIGIBLE", "Implementation manager must be a staff member");
        }
        if (in.expectedCompletion().isBefore(in.startDate())) {
            throw new IllegalArgumentException("Expected completion must be after the start date");
        }
        po.setStatus(POStatus.ISSUED);
        po.setIssuedBy(user.getId());
        po.setIssuedAt(Clock.now());
        orders.save(po);
        PurchaseRequest pr = lookup.request(po.getPurchaseRequestId());
        pr.setStatus(RequestStatus.ORDERED);
        requests.save(pr);

        Implementation impl = new Implementation();
        impl.setPurchaseOrderId(po.getId());
        impl.setManagerId(manager.getId());
        impl.setStatus(ImplementationStatus.NOT_STARTED);
        impl.setStartDate(in.startDate());
        impl.setExpectedCompletion(in.expectedCompletion());
        impl.setProgressPct(0);
        impl.setCreatedAt(Clock.now());
        impl = implementations.save(impl);

        String supplierName = lookup.provider(s.getProviderId()).getName();
        audit.record(user.getId(), "PO_ISSUED", "PurchaseOrder", po.getId(), pr.getNeedId(),
                po.getPoNumber() + " issued to " + supplierName + " for " + Money.format(po.getAmount())
                        + "; implementation assigned to " + manager.getFullName(),
                Map.of("amount", po.getAmount(), "implementationId", impl.getId(), "manager", manager.getFullName()));
        notifications.notifyUsers(List.of(manager.getId(), pr.getRequestedBy()), "PO_ISSUED",
                po.getPoNumber() + " issued", supplierName + " - implementation assigned to " + manager.getFullName(),
                "Implementation", impl.getId(), "/implementations/" + impl.getId());
        notifications.notifyUsers(users.findByProviderId(s.getProviderId()).stream().map(AppUser::getId).toList(),
                "PO_ISSUED", "Purchase order " + po.getPoNumber(), "You have been issued a purchase order for "
                        + Money.format(po.getAmount()), "PurchaseOrder", po.getId(), "/");
        return mapper.purchaseOrder(po);
    }

    // ---------- helpers ----------
    private void assertNoOrder(PurchaseRequest pr) {
        if (orders.findByPurchaseRequestId(pr.getId()).isPresent()) {
            throw ApiException.invalidState("A purchase order already exists for " + pr.getReference());
        }
    }

    private void requireJustification(boolean deviation, String justification, RuleSnapshot r) {
        if (deviation && !SelectionRules.justificationValid(justification, r.deviationMinChars())) {
            throw ApiException.rule("JUSTIFICATION_REQUIRED",
                    "The selected option is not the recommended one - a justification of at least "
                            + r.deviationMinChars() + " characters is required",
                    Map.of("minChars", r.deviationMinChars()));
        }
    }

    private PurchaseOrder newOrder(PurchaseRequest pr, Supplier supplier, java.math.BigDecimal amount,
                                   String recommended, boolean deviation, String justification, AppUser user) {
        PurchaseOrder po = new PurchaseOrder();
        po.setPoNumber(References.nextPo(orders.count()));
        po.setPurchaseRequestId(pr.getId());
        po.setSupplierId(supplier.getId());
        po.setAmount(amount);
        po.setStatus(POStatus.DRAFT);
        po.setRecommendedRef(recommended);
        po.setDeviation(deviation);
        po.setDeviationJustification(deviation ? justification.trim() : null);
        po.setSelectedBy(user.getId());
        po.setSelectedAt(Clock.now());
        return po;
    }

    /** Provider -> Supplier: create the formal registration on first selection (PENDING_VERIFICATION). */
    private Supplier ensureSupplier(String providerId, AppUser user, String needId) {
        return suppliers.findByProviderId(providerId).orElseGet(() -> {
            Supplier s = new Supplier();
            s.setProviderId(providerId);
            s.setSupplierNumber(References.nextSupplier(suppliers.count()));
            s.setStatus(SupplierStatus.PENDING_VERIFICATION);
            s.setTaxCompliant(false);
            s.setCreatedAt(Clock.now());
            s = suppliers.save(s);
            String name = lookup.provider(providerId).getName();
            audit.record(user.getId(), "SUPPLIER_ONBOARDED", "Supplier", s.getId(), needId,
                    name + " onboarded as supplier " + s.getSupplierNumber() + " (pending verification)", null);
            notifications.notifyRole(UserRole.PROCUREMENT_OFFICER, null, "SUPPLIER_VERIFICATION_REQUIRED",
                    "Verify supplier: " + name, "CSD number and tax compliance required before the PO can be issued",
                    "Supplier", s.getId(), "/procurement");
            return s;
        });
    }

    public static boolean ranked(ScoringEngine.Result r) {
        return r.rank() != null;
    }
}
