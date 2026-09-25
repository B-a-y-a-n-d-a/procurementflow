package com.civicflow.web.dto;

import com.civicflow.domain.enums.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * API DTOs. Field names mirror frontend/src/api/types.ts exactly (the contract).
 * Change the contract first, then both sides.
 */
public final class Dto {

    private Dto() {
    }

    // ---------- shared ----------
    public record Geo(@NotBlank String province, @NotBlank String municipality, String ward,
                      @NotNull @DecimalMin("-90") @DecimalMax("90") BigDecimal latitude,
                      @NotNull @DecimalMin("-180") @DecimalMax("180") BigDecimal longitude) {
    }

    public record Attachment(String id, @NotBlank String fileName, @NotBlank String url) {
    }

    public record User(String id, String fullName, String email, String title, UserRole role, String departmentId,
                       String departmentName, String providerId, String providerName) {
    }

    public record Budget(BigDecimal allocated, BigDecimal committed, BigDecimal available, double utilisationPct) {
    }

    public record Department(String id, String code, String name, String municipality, String province,
                             String financialYear, Budget budget) {
    }

    // ---------- needs & requests ----------
    public record Stage(LifecycleStage stage, StageState state) {
    }

    public record NeedSummary(String id, String reference, String title, String departmentId, String departmentName,
                              NeedCategory category, Priority priority, BigDecimal estimatedBudget, NeedStatus status,
                              LifecycleStage stage, Geo location, Instant createdAt, String createdByName,
                              RequestStatus requestStatus, String opportunityId, OpportunityStatus opportunityStatus) {
    }

    public record NeedDetail(String id, String reference, String title, String departmentId, String departmentName,
                             NeedCategory category, Priority priority, BigDecimal estimatedBudget, NeedStatus status,
                             LifecycleStage stage, Geo location, Instant createdAt, String createdByName,
                             RequestStatus requestStatus, String opportunityId, OpportunityStatus opportunityStatus,
                             String problemStatement, String desiredOutcome, List<String> requiredCapabilities,
                             List<Attachment> documents, List<Stage> stages, PurchaseRequest request,
                             OpportunitySummary opportunity, PurchaseOrder purchaseOrder,
                             ImplementationSummary implementation) {
    }

    public record Sla(SlaState state, Double hoursRemaining) {
    }

    public record ApprovalStep(String id, int sequence, UserRole requiredRole, String approverId, String approverName,
                               StepStatus status, Instant activatedAt, Instant dueAt, Instant decidedAt,
                               Instant escalatedAt, String comment, Sla sla) {
    }

    public record PurchaseRequest(String id, String reference, String needId, String needReference, String needTitle,
                                  String departmentId, String departmentName, String requestedById,
                                  String requestedByName, BigDecimal amount, String justification,
                                  SourcingMethod sourcingMethod, RequestStatus status,
                                  BigDecimal budgetAvailableSnapshot, int ruleSetVersion, Instant submittedAt,
                                  Instant decidedAt, List<ApprovalStep> steps, long quoteCount,
                                  String purchaseOrderId, String actionableStepId) {
    }

    public record CreateNeedRequest(@NotBlank @Size(max = 200) String title, @NotBlank String problemStatement,
                                    @NotBlank String departmentId, @NotNull NeedCategory category,
                                    @NotNull Priority priority, @NotNull @Positive BigDecimal estimatedBudget,
                                    List<String> requiredCapabilities, @NotBlank String desiredOutcome,
                                    @NotNull @Valid Geo location, List<@Valid Attachment> documents,
                                    String justification, SourcingMethod sourcingMethod, boolean submit) {
    }

    public record SubmitNeedRequest(@NotBlank String justification, @NotNull SourcingMethod sourcingMethod,
                                    @NotNull @Positive BigDecimal amount) {
    }

    public record DecisionRequest(String comment) {
    }

    public record ReasonRequest(@NotBlank String reason) {
    }

    public record RoutingPreview(BigDecimal amount, boolean autoApproved, List<UserRole> approverRoles, Budget budget,
                                 boolean withinBudget, BudgetMode budgetMode, boolean minOffersApplies,
                                 int minCompetitiveOffers, int slaHours) {
    }

    // ---------- opportunities ----------
    public record Criterion(String id, @NotNull CriterionKey key, @NotBlank String name,
                            @NotNull @Positive BigDecimal weightPct, @NotNull ScoringMethod scoringMethod) {
    }

    public record OpportunitySummary(String id, String reference, String needId, String needReference, String title,
                                     String departmentName, NeedCategory category, BigDecimal budget,
                                     List<String> requiredCapabilities, Geo location, Instant submissionDeadline,
                                     OpportunityStatus status, String displayStatus, long daysToDeadline,
                                     long submissionCount, List<ProviderType> eligibleProviderTypes,
                                     boolean openSourcePreferred, Instant publishedAt) {
    }

    public record OpportunityDetail(String id, String reference, String needId, String needReference, String title,
                                    String departmentName, NeedCategory category, BigDecimal budget,
                                    List<String> requiredCapabilities, Geo location, Instant submissionDeadline,
                                    OpportunityStatus status, String displayStatus, long daysToDeadline,
                                    long submissionCount, List<ProviderType> eligibleProviderTypes,
                                    boolean openSourcePreferred, Instant publishedAt, String description,
                                    String problemStatement, String desiredOutcome, List<Criterion> criteria,
                                    List<Submission> submissions, Submission mySubmission) {
    }

    public record CreateOpportunityRequest(@NotBlank @Size(max = 200) String title, @NotBlank String description,
                                           @NotNull Instant submissionDeadline,
                                           @NotEmpty List<ProviderType> eligibleProviderTypes,
                                           boolean openSourcePreferred, @NotEmpty List<@Valid Criterion> criteria,
                                           boolean publish) {
    }

    // ---------- submissions & evaluation ----------
    public record Submission(String id, String opportunityId, String opportunityReference, String opportunityTitle,
                             String providerId, String providerName, ProviderType providerType,
                             Integer providerBbbeeLevel, String providerMunicipality, String providerProvince,
                             String solutionId, String solutionName, BigDecimal proposedPrice,
                             String technicalProposal, String implementationPlan, int durationWeeks,
                             int localJobsDeclared, SubmissionStatus status, String statusReason, Instant submittedAt,
                             List<Attachment> documents) {
    }

    public record CreateSubmissionRequest(String solutionId, @NotNull @Positive BigDecimal proposedPrice,
                                          @NotBlank String technicalProposal, @NotBlank String implementationPlan,
                                          @Min(1) int durationWeeks, @PositiveOrZero int localJobsDeclared,
                                          List<@Valid Attachment> documents) {
    }

    public record ScoreBreakdown(String criterionId, CriterionKey key, String name, double weightPct,
                                 ScoringMethod scoringMethod, Double score, Double points, String rationale,
                                 String basis) {
    }

    public record EvaluationRow(Submission submission, boolean eligible, Integer rank, Double totalScore,
                                List<ScoreBreakdown> breakdown, EvaluationStatus evaluationStatus,
                                String evaluatorName, String overallComment, boolean isRecommended) {
    }

    public record MinOffers(boolean applies, BigDecimal threshold, int minimum, long count, boolean satisfied) {
    }

    public record EvaluationBoard(OpportunitySummary opportunity, List<Criterion> criteria, List<EvaluationRow> rows,
                                  String recommendedSubmissionId, boolean allEvaluated, MinOffers minOffers,
                                  int deviationMinChars, PurchaseOrder purchaseOrder) {
    }

    public record ManualScoreInput(@NotBlank String criterionId, @Min(0) @Max(100) double score,
                                   @NotBlank String rationale) {
    }

    public record SaveEvaluationRequest(@NotNull List<@Valid ManualScoreInput> scores, String overallComment,
                                        boolean complete) {
    }

    public record SelectRequest(@NotBlank String submissionId, String justification) {
    }

    // ---------- procurement ----------
    public record Quote(String id, String supplierId, String supplierName, String supplierNumber,
                        ProviderType providerType, Integer bbbeeLevel, String municipality, BigDecimal amount,
                        LocalDate validUntil, boolean isCompliant, String nonComplianceReason, Instant receivedAt,
                        boolean isLowestCompliant) {
    }

    public record QuoteBoard(PurchaseRequest request, List<Quote> quotes, String lowestCompliantQuoteId,
                             MinOffers minOffers, int deviationMinChars, PurchaseOrder purchaseOrder) {
    }

    public record CreateQuoteRequest(@NotBlank String supplierId, @NotNull @Positive BigDecimal amount,
                                     @NotNull LocalDate validUntil, boolean isCompliant, String nonComplianceReason) {
    }

    public record SelectQuoteRequest(@NotBlank String quoteId, String justification) {
    }

    public record Supplier(String id, String providerId, String providerName, ProviderType providerType,
                           String supplierNumber, String csdNumber, boolean taxCompliant, SupplierStatus status,
                           Integer bbbeeLevel, Instant verifiedAt, String verifiedByName) {
    }

    public record VerifySupplierRequest(@NotBlank String csdNumber, boolean taxCompliant) {
    }

    public record PurchaseOrder(String id, String poNumber, String purchaseRequestId, String requestReference,
                                String needId, String needTitle, String departmentName, String supplierId,
                                String supplierName, SupplierStatus supplierStatus, String submissionId,
                                String quoteId, BigDecimal amount, POStatus status, boolean isDeviation,
                                String deviationJustification, String recommendedRef, String selectedByName,
                                Instant selectedAt, String issuedByName, Instant issuedAt, Instant completedAt,
                                String implementationId) {
    }

    public record IssuePoRequest(@NotBlank String managerId, @NotNull LocalDate startDate,
                                 @NotNull LocalDate expectedCompletion) {
    }

    // ---------- implementation & impact ----------
    public record ImplementationSummary(String id, String purchaseOrderId, String poNumber, String needId,
                                        String needTitle, NeedCategory needCategory, String departmentName,
                                        String supplierName, String managerId, String managerName,
                                        ImplementationStatus status, LocalDate startDate,
                                        LocalDate expectedCompletion, LocalDate actualCompletion, int progressPct,
                                        Geo location, BigDecimal amount, boolean isLate, long metricCount) {
    }

    public record Milestone(String id, String title, LocalDate dueDate, Instant completedAt, boolean isLate) {
    }

    public record ImplementationUpdate(String id, UpdateType type, String description, Integer progressPct,
                                       String evidenceUrl, String authorName, Instant createdAt) {
    }

    public record Measurement(String id, BigDecimal value, Instant measuredAt, String evidenceUrl, String note,
                              String ward, String recordedByName) {
    }

    public record ImpactMetric(String id, String implementationId, String needId, String needTitle,
                               String departmentName, String name, String description, String unit,
                               Direction direction, BigDecimal baseline, BigDecimal target, Double current,
                               Double changePct, Double progressPct, ImpactStatus status, Instant lastMeasuredAt,
                               List<Measurement> measurements) {
    }

    public record ImplementationDetail(String id, String purchaseOrderId, String poNumber, String needId,
                                       String needTitle, NeedCategory needCategory, String departmentName,
                                       String supplierName, String managerId, String managerName,
                                       ImplementationStatus status, LocalDate startDate,
                                       LocalDate expectedCompletion, LocalDate actualCompletion, int progressPct,
                                       Geo location, BigDecimal amount, boolean isLate, long metricCount,
                                       List<Milestone> milestones, List<ImplementationUpdate> updates,
                                       List<ImpactMetric> metrics, boolean hasEvidence) {
    }

    public record UpdateImplementationRequest(ImplementationStatus status, @Min(0) @Max(100) Integer progressPct,
                                              LocalDate startDate, LocalDate expectedCompletion) {
    }

    public record CreateMilestoneRequest(@NotBlank String title, @NotNull LocalDate dueDate) {
    }

    public record CreateUpdateRequest(@NotNull UpdateType type, @NotBlank String description,
                                      @Min(0) @Max(100) Integer progressPct, String evidenceUrl) {
    }

    public record CreateMetricRequest(@NotBlank String name, @NotBlank String description, @NotBlank String unit,
                                      @NotNull Direction direction, @NotNull BigDecimal baseline,
                                      @NotNull BigDecimal target) {
    }

    public record CreateMeasurementRequest(@NotNull BigDecimal value, @NotNull Instant measuredAt,
                                           String evidenceUrl, String note, String ward) {
    }

    public record MetricTemplate(String name, String description, String unit, Direction direction) {
    }

    // ---------- ecosystem ----------
    public record Provider(String id, String name, ProviderType providerType, String description,
                           String registrationNumber, Integer bbbeeLevel, LocalDate bbbeeExpiry,
                           boolean bbbeeExpired, Geo location, String contactEmail, String website, int employees,
                           VerificationStatus verificationStatus, SupplierStatus supplierStatus, long solutionCount,
                           long submissionCount, long awardCount) {
    }

    public record ProviderDetail(String id, String name, ProviderType providerType, String description,
                                 String registrationNumber, Integer bbbeeLevel, LocalDate bbbeeExpiry,
                                 boolean bbbeeExpired, Geo location, String contactEmail, String website,
                                 int employees, VerificationStatus verificationStatus, SupplierStatus supplierStatus,
                                 long solutionCount, long submissionCount, long awardCount,
                                 List<Solution> solutions) {
    }

    public record Solution(String id, String providerId, String providerName, ProviderType providerType, String name,
                           String description, NeedCategory category, List<String> technologies,
                           boolean isOpenSource, String repositoryUrl, String license, String demoUrl,
                           List<String> coverageProvinces, SolutionMaturity maturity, int externalDeployments,
                           long platformDeployments, SolutionStatus status) {
    }

    public record SaveSolutionRequest(@NotBlank String name, @NotBlank String description,
                                      @NotNull NeedCategory category, List<String> technologies,
                                      boolean isOpenSource, String repositoryUrl, String license, String demoUrl,
                                      List<String> coverageProvinces, @NotNull SolutionMaturity maturity,
                                      @PositiveOrZero int externalDeployments) {
    }

    public record MapNeed(String id, String reference, String title, NeedCategory category, LifecycleStage stage,
                          String opportunityId, Geo location) {
    }

    public record MapProvider(String id, String name, ProviderType providerType, Geo location) {
    }

    public record MapImplementation(String id, String needTitle, ImplementationStatus status, int progressPct,
                                    Geo location) {
    }

    public record MapData(List<MapNeed> needs, List<MapProvider> providers, List<MapImplementation> implementations) {
    }

    // ---------- dashboards ----------
    public record ExecutiveKpis(BigDecimal totalProcurementValue, long activeOpportunities, long activeImplementations,
                                double budgetUtilisationPct, long localProvidersEngaged, long pendingApprovals,
                                long slaBreaches, long projectsAtRisk) {
    }

    public record FunnelItem(LifecycleStage stage, long count) {
    }

    public record HighlightMetric(String name, String unit, BigDecimal baseline, Double current, BigDecimal target,
                                  Double changePct, ImpactStatus status) {
    }

    public record ImpactHighlight(String implementationId, String needId, String needTitle, String supplierName,
                                  BigDecimal invested, ImplementationStatus status, List<HighlightMetric> metrics) {
    }

    public record ExecutiveDashboard(ExecutiveKpis kpis, List<FunnelItem> funnel, List<Department> departments,
                                     List<ImpactHighlight> impactHighlights, List<ImplementationSummary> atRisk,
                                     List<PurchaseRequest> overdueApprovals) {
    }

    public record DepartmentDashboard(Department department, long pendingApprovals, List<PurchaseRequest> requests,
                                      List<OpportunitySummary> opportunities,
                                      List<ImplementationSummary> implementations, List<ImpactMetric> impact) {
    }

    public record ProcurementDashboard(List<PurchaseRequest> awaitingSourcing,
                                       List<OpportunitySummary> activeOpportunities,
                                       List<OpportunitySummary> evaluationQueue, List<PurchaseRequest> quoteRequests,
                                       List<PurchaseOrder> pendingPurchaseOrders,
                                       List<Supplier> suppliersPendingVerification) {
    }

    public record ProviderCounts(long submitted, long shortlisted, long selected) {
    }

    public record ProviderDashboard(Provider provider, List<OpportunitySummary> available,
                                    List<OpportunitySummary> closingSoon, List<Submission> submissions,
                                    ProviderCounts counts, List<Solution> solutions) {
    }

    // ---------- cross-cutting ----------
    public record NotificationItem(String id, String type, String title, String message, String entityType,
                                   String entityId, String link, boolean isRead, Instant createdAt) {
    }

    public record NotificationList(long unread, List<NotificationItem> items) {
    }

    public record AuditEntry(String id, long sequence, Instant occurredAt, String actorId, String actorName,
                             UserRole actorRole, String action, String entityType, String entityId, String needId,
                             String summary, Map<String, Object> metadata, String prevHash, String hash) {
    }

    public record AuditVerify(boolean valid, int checked, Long brokenAtSequence, String headHash) {
    }

    public record ApprovalBand(@NotNull @PositiveOrZero BigDecimal minAmount, BigDecimal maxAmount,
                               @NotNull List<UserRole> approverRoles) {
    }

    public record LocalScores(@Min(0) @Max(100) int sameMunicipality, @Min(0) @Max(100) int sameProvince,
                              @Min(0) @Max(100) int elsewhere) {
    }

    public record RuleSet(String id, Integer version, Instant effectiveFrom, @Min(1) int approvalSlaHours,
                          @NotNull BudgetMode budgetMode, @NotNull @PositiveOrZero BigDecimal quotationThreshold,
                          @Min(1) int minCompetitiveOffers, @Min(0) int deviationMinChars,
                          @Min(1) int closingSoonDays, @Min(0) @Max(100) int impactOnTrackPct,
                          @NotNull UserRole escalationRole, @NotEmpty List<@Valid ApprovalBand> approvalBands,
                          @NotNull Map<String, Integer> bbbeeScores, @NotNull @Valid LocalScores localScores,
                          @NotEmpty List<@Valid Criterion> defaultCriteria, String updatedByName) {
    }

    public record AiRequest(String needId, String opportunityId, String submissionId, String implementationId) {
    }

    public record AiCitation(String type, String id, String reference, String label) {
    }

    public record AiResult(String task, String mode, String title, String content, List<AiCitation> citations,
                           String disclaimer, Instant generatedAt, Map<String, Object> structured) {
    }
}
