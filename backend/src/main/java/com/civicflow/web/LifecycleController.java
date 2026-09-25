package com.civicflow.web;

import com.civicflow.service.ApprovalService;
import com.civicflow.service.EvaluationService;
import com.civicflow.service.NeedService;
import com.civicflow.service.OpportunityService;
import com.civicflow.service.ProcurementService;
import com.civicflow.service.SubmissionService;
import com.civicflow.web.dto.Dto;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;

/** Need → approval → opportunity → submission → evaluation → selection → PO (contracts/api.md). */
@RestController
@RequestMapping("/api")
public class LifecycleController {

    private final NeedService needs;
    private final ApprovalService approvals;
    private final OpportunityService opportunities;
    private final SubmissionService submissions;
    private final EvaluationService evaluations;
    private final ProcurementService procurement;

    public LifecycleController(NeedService needs, ApprovalService approvals, OpportunityService opportunities,
                               SubmissionService submissions, EvaluationService evaluations,
                               ProcurementService procurement) {
        this.needs = needs;
        this.approvals = approvals;
        this.opportunities = opportunities;
        this.submissions = submissions;
        this.evaluations = evaluations;
        this.procurement = procurement;
    }

    // ---------- needs & requests ----------
    @GetMapping("/needs")
    public List<Dto.NeedSummary> needs() {
        return needs.list();
    }

    @GetMapping("/needs/{id}")
    public Dto.NeedDetail need(@PathVariable String id) {
        return needs.get(id);
    }

    @GetMapping("/needs/{id}/journey")
    public List<Dto.AuditEntry> journey(@PathVariable String id) {
        return needs.journey(id);
    }

    @PostMapping("/needs")
    public Dto.NeedDetail createNeed(@Valid @RequestBody Dto.CreateNeedRequest body) {
        return needs.create(body);
    }

    @PostMapping("/needs/{id}/submit")
    public Dto.NeedDetail submitNeed(@PathVariable String id, @Valid @RequestBody Dto.SubmitNeedRequest body) {
        return needs.submitDraft(id, body);
    }

    @GetMapping("/rules/routing-preview")
    public Dto.RoutingPreview routingPreview(@RequestParam String departmentId, @RequestParam BigDecimal amount) {
        return needs.preview(departmentId, amount);
    }

    @GetMapping("/requests")
    public List<Dto.PurchaseRequest> requests() {
        return approvals.listRequests();
    }

    @GetMapping("/approvals/inbox")
    public List<Dto.PurchaseRequest> inbox() {
        return approvals.inbox();
    }

    @PostMapping("/approvals/{stepId}/approve")
    public Dto.PurchaseRequest approve(@PathVariable String stepId, @RequestBody(required = false) Dto.DecisionRequest body) {
        return approvals.approve(stepId, body == null ? null : body.comment());
    }

    @PostMapping("/approvals/{stepId}/reject")
    public Dto.PurchaseRequest reject(@PathVariable String stepId, @RequestBody(required = false) Dto.DecisionRequest body) {
        return approvals.reject(stepId, body == null ? null : body.comment());
    }

    @PostMapping("/approvals/{stepId}/escalate")
    public Dto.PurchaseRequest escalate(@PathVariable String stepId) {
        return approvals.escalate(stepId);
    }

    // ---------- opportunities ----------
    @GetMapping("/opportunities")
    public List<Dto.OpportunitySummary> opportunities() {
        return opportunities.list();
    }

    @GetMapping("/opportunities/{id}")
    public Dto.OpportunityDetail opportunity(@PathVariable String id) {
        return opportunities.get(id);
    }

    @PostMapping("/needs/{needId}/opportunity")
    public Dto.OpportunityDetail createOpportunity(@PathVariable String needId,
                                                   @Valid @RequestBody Dto.CreateOpportunityRequest body) {
        return opportunities.create(needId, body);
    }

    @PostMapping("/opportunities/{id}/publish")
    public Dto.OpportunityDetail publish(@PathVariable String id) {
        return opportunities.publish(id);
    }

    @PostMapping("/opportunities/{id}/start-evaluation")
    public Dto.OpportunityDetail startEvaluation(@PathVariable String id) {
        return opportunities.startEvaluation(id);
    }

    @PostMapping("/opportunities/{id}/cancel")
    public Dto.OpportunityDetail cancel(@PathVariable String id, @Valid @RequestBody Dto.ReasonRequest body) {
        return opportunities.cancel(id, body.reason());
    }

    // ---------- submissions & evaluation ----------
    @PostMapping("/opportunities/{id}/submissions")
    public Dto.Submission submit(@PathVariable String id, @Valid @RequestBody Dto.CreateSubmissionRequest body) {
        return submissions.submit(id, body);
    }

    @GetMapping("/submissions/mine")
    public List<Dto.Submission> mySubmissions() {
        return submissions.mine();
    }

    @PostMapping("/submissions/{id}/withdraw")
    public Dto.Submission withdraw(@PathVariable String id, @Valid @RequestBody Dto.ReasonRequest body) {
        return submissions.withdraw(id, body.reason());
    }

    @PostMapping("/submissions/{id}/shortlist")
    public Dto.Submission shortlist(@PathVariable String id) {
        return submissions.shortlist(id);
    }

    @PostMapping("/submissions/{id}/reject")
    public Dto.Submission rejectSubmission(@PathVariable String id, @Valid @RequestBody Dto.ReasonRequest body) {
        return submissions.reject(id, body.reason());
    }

    @GetMapping("/opportunities/{id}/evaluation")
    public Dto.EvaluationBoard evaluation(@PathVariable String id) {
        return evaluations.board(id);
    }

    @PutMapping("/submissions/{id}/evaluation")
    public Dto.EvaluationBoard saveEvaluation(@PathVariable String id, @Valid @RequestBody Dto.SaveEvaluationRequest body) {
        return evaluations.save(id, body);
    }

    @PostMapping("/opportunities/{id}/select")
    public Dto.PurchaseOrder select(@PathVariable String id, @Valid @RequestBody Dto.SelectRequest body) {
        return procurement.selectSubmission(id, body);
    }

    // ---------- procurement ----------
    @GetMapping("/requests/{id}/quotes")
    public Dto.QuoteBoard quotes(@PathVariable String id) {
        return procurement.quoteBoard(id);
    }

    @PostMapping("/requests/{id}/quotes")
    public Dto.QuoteBoard addQuote(@PathVariable String id, @Valid @RequestBody Dto.CreateQuoteRequest body) {
        return procurement.addQuote(id, body);
    }

    @PostMapping("/requests/{id}/select-quote")
    public Dto.PurchaseOrder selectQuote(@PathVariable String id, @Valid @RequestBody Dto.SelectQuoteRequest body) {
        return procurement.selectQuote(id, body);
    }

    @GetMapping("/suppliers")
    public List<Dto.Supplier> suppliers() {
        return procurement.suppliers();
    }

    @PostMapping("/suppliers/{id}/verify")
    public Dto.Supplier verify(@PathVariable String id, @Valid @RequestBody Dto.VerifySupplierRequest body) {
        return procurement.verify(id, body);
    }

    @GetMapping("/purchase-orders")
    public List<Dto.PurchaseOrder> orders() {
        return procurement.orders();
    }

    @PostMapping("/purchase-orders/{id}/issue")
    public Dto.PurchaseOrder issue(@PathVariable String id, @Valid @RequestBody Dto.IssuePoRequest body) {
        return procurement.issue(id, body);
    }
}
