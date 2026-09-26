/**
 * CIVICFLOW API contract: canonical DTO shapes.
 * Mirrors backend/src/main/java/com/civicflow/web/dto. Change this file (and specs/001-civicflow-mvp/contracts/api.md) FIRST.
 * Timestamps are ISO-8601 strings (UTC); dates are YYYY-MM-DD; money is ZAR number.
 */

// ---------- Enums ----------
export type UserRole =
  | 'DEPARTMENT_OFFICER' | 'DEPARTMENT_MANAGER' | 'FINANCE_DIRECTOR' | 'PROCUREMENT_OFFICER'
  | 'EVALUATOR' | 'PROVIDER' | 'EXECUTIVE' | 'AUDITOR' | 'ADMIN' | 'SYSTEM';

export type NeedCategory =
  | 'WASTE_ENVIRONMENT' | 'COMMUNITY_SAFETY' | 'DIGITAL_SERVICES' | 'LOCAL_ECONOMIC_DEVELOPMENT'
  | 'INFRASTRUCTURE' | 'WATER_ENERGY' | 'ICT_OPERATIONS' | 'COMMUNITY_FACILITIES';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type NeedStatus = 'DRAFT' | 'OPEN' | 'CLOSED' | 'CANCELLED';
export type LifecycleStage =
  | 'NEED' | 'APPROVAL' | 'OPPORTUNITY' | 'EVALUATION' | 'PROCUREMENT' | 'IMPLEMENTATION' | 'IMPACT' | 'CLOSED' | 'REJECTED';
export type StageState = 'DONE' | 'CURRENT' | 'PENDING' | 'SKIPPED' | 'FAILED';
export type SourcingMethod = 'QUOTATION' | 'OPEN_OPPORTUNITY';
export type RequestStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'ORDERED';
export type StepStatus = 'WAITING' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'AUTO_APPROVED' | 'SKIPPED';
export type SlaState = 'ON_TIME' | 'DUE_SOON' | 'OVERDUE' | 'DONE' | 'NOT_ACTIVE';
export type OpportunityStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'EVALUATION' | 'AWARDED' | 'CANCELLED';
export type OpportunityDisplayStatus = OpportunityStatus | 'CLOSING_SOON';
export type ProviderType =
  | 'SME' | 'STARTUP' | 'LOCAL_BUSINESS' | 'COOPERATIVE' | 'INNOVATOR' | 'TECHNOLOGY_COMPANY' | 'OPEN_SOURCE_PROJECT';
export type CriterionKey = 'PRICE' | 'TECHNICAL' | 'SUITABILITY' | 'LOCAL' | 'BBBEE' | 'EXPERIENCE' | 'IMPLEMENTATION';
export type ScoringMethod = 'AUTO_PRICE' | 'AUTO_BBBEE' | 'AUTO_LOCAL' | 'MANUAL';
export type SubmissionStatus = 'SUBMITTED' | 'UNDER_REVIEW' | 'SHORTLISTED' | 'REJECTED' | 'SELECTED' | 'WITHDRAWN';
export type EvaluationStatus = 'NOT_STARTED' | 'DRAFT' | 'COMPLETED';
export type SupplierStatus = 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED';
export type POStatus = 'DRAFT' | 'ISSUED' | 'COMPLETED' | 'CANCELLED';
export type ImplementationStatus = 'NOT_STARTED' | 'PLANNED' | 'IN_PROGRESS' | 'AT_RISK' | 'COMPLETED' | 'CANCELLED';
export type UpdateType = 'PROGRESS' | 'ISSUE' | 'EVIDENCE' | 'NOTE';
export type Direction = 'INCREASE' | 'DECREASE';
export type ImpactStatus = 'NOT_MEASURED' | 'AT_RISK' | 'ON_TRACK' | 'ACHIEVED';
export type SolutionMaturity = 'IDEA' | 'PROTOTYPE' | 'PILOT' | 'PRODUCTION';
export type AiTask =
  | 'executive-briefing' | 'need-analysis' | 'opportunity-draft' | 'solution-discovery' | 'submission-summary' | 'impact-summary';

// ---------- Shared ----------
export interface GeoLocation {
  province: string;
  municipality: string;
  ward?: string | null;
  latitude: number;
  longitude: number;
}
export interface AttachmentDto { id?: string; fileName: string; url: string }
export interface ApiError { status: number; code: string; message: string; details?: Record<string, unknown> }

export interface UserDto {
  id: string;
  fullName: string;
  email: string;
  title: string;
  role: UserRole;
  departmentId?: string | null;
  departmentName?: string | null;
  providerId?: string | null;
  providerName?: string | null;
  active: boolean;
  createdAt?: string | null;
}

export interface LoginRequest { email: string; password: string }
export interface LoginResponse { token: string; expiresAt: string; user: UserDto }

export interface BudgetDto { allocated: number; committed: number; available: number; utilisationPct: number }
export interface DepartmentDto {
  id: string; code: string; name: string; municipality: string; province: string; financialYear: string;
  budget: BudgetDto;
}

// ---------- Needs & requests ----------
export interface StageDto { stage: LifecycleStage; state: StageState }

export interface NeedSummaryDto {
  id: string;
  reference: string;
  title: string;
  departmentId: string;
  departmentName: string;
  category: NeedCategory;
  priority: Priority;
  estimatedBudget: number;
  status: NeedStatus;
  stage: LifecycleStage;
  location: GeoLocation;
  createdAt: string;
  createdByName: string;
  requestStatus?: RequestStatus | null;
  opportunityId?: string | null;
  opportunityStatus?: OpportunityStatus | null;
}

export interface SlaDto { state: SlaState; hoursRemaining?: number | null }
export interface ApprovalStepDto {
  id: string;
  sequence: number;
  requiredRole: UserRole;
  approverId?: string | null;
  approverName?: string | null;
  status: StepStatus;
  activatedAt?: string | null;
  dueAt?: string | null;
  decidedAt?: string | null;
  escalatedAt?: string | null;
  comment?: string | null;
  sla: SlaDto;
}

export interface PurchaseRequestDto {
  id: string;
  reference: string;
  needId: string;
  needReference: string;
  needTitle: string;
  departmentId: string;
  departmentName: string;
  requestedById: string;
  requestedByName: string;
  amount: number;
  justification: string;
  sourcingMethod: SourcingMethod;
  status: RequestStatus;
  budgetAvailableSnapshot?: number | null;
  ruleSetVersion: number;
  submittedAt?: string | null;
  decidedAt?: string | null;
  steps: ApprovalStepDto[];
  quoteCount: number;
  purchaseOrderId?: string | null;
  /** Step the current user may act on (inbox only). */
  actionableStepId?: string | null;
}

export interface NeedDetailDto extends NeedSummaryDto {
  problemStatement: string;
  desiredOutcome: string;
  requiredCapabilities: string[];
  documents: AttachmentDto[];
  stages: StageDto[];
  request?: PurchaseRequestDto | null;
  opportunity?: OpportunitySummaryDto | null;
  purchaseOrder?: PurchaseOrderDto | null;
  implementation?: ImplementationSummaryDto | null;
}

export interface CreateNeedRequest {
  title: string;
  problemStatement: string;
  departmentId: string;
  category: NeedCategory;
  priority: Priority;
  estimatedBudget: number;
  requiredCapabilities: string[];
  desiredOutcome: string;
  location: GeoLocation;
  documents?: AttachmentDto[];
  justification: string;
  sourcingMethod: SourcingMethod;
  /** false = save as DRAFT (no request, no budget check). */
  submit: boolean;
}
export interface SubmitNeedRequest { justification: string; sourcingMethod: SourcingMethod; amount: number }
export interface DecisionRequest { comment?: string }
export interface ReasonRequest { reason: string }

export interface RoutingPreviewDto {
  amount: number;
  autoApproved: boolean;
  approverRoles: UserRole[];
  budget: BudgetDto;
  withinBudget: boolean;
  budgetMode: 'BLOCK' | 'WARN';
  minOffersApplies: boolean;
  minCompetitiveOffers: number;
  slaHours: number;
}

// ---------- Opportunities ----------
export interface CriterionDto { id?: string; key: CriterionKey; name: string; weightPct: number; scoringMethod: ScoringMethod }

export interface OpportunitySummaryDto {
  id: string;
  reference: string;
  needId: string;
  needReference: string;
  title: string;
  departmentName: string;
  category: NeedCategory;
  budget: number;
  requiredCapabilities: string[];
  location: GeoLocation;
  submissionDeadline: string;
  status: OpportunityStatus;
  displayStatus: OpportunityDisplayStatus;
  daysToDeadline: number;
  submissionCount: number;
  eligibleProviderTypes: ProviderType[];
  openSourcePreferred: boolean;
  publishedAt?: string | null;
}

export interface OpportunityDetailDto extends OpportunitySummaryDto {
  description: string;
  problemStatement: string;
  desiredOutcome: string;
  criteria: CriterionDto[];
  /** Staff only. */
  submissions?: SubmissionDto[] | null;
  /** Provider only: the caller's own submission. */
  mySubmission?: SubmissionDto | null;
}

export interface CreateOpportunityRequest {
  title: string;
  description: string;
  submissionDeadline: string;
  eligibleProviderTypes: ProviderType[];
  openSourcePreferred: boolean;
  criteria: CriterionDto[];
  publish: boolean;
}

// ---------- Submissions & evaluation ----------
export interface SubmissionDto {
  id: string;
  opportunityId: string;
  opportunityReference: string;
  opportunityTitle: string;
  providerId: string;
  providerName: string;
  providerType: ProviderType;
  providerBbbeeLevel?: number | null;
  providerMunicipality: string;
  providerProvince: string;
  solutionId?: string | null;
  solutionName?: string | null;
  proposedPrice: number;
  technicalProposal: string;
  implementationPlan: string;
  durationWeeks: number;
  localJobsDeclared: number;
  status: SubmissionStatus;
  statusReason?: string | null;
  submittedAt: string;
  documents: AttachmentDto[];
}

export interface CreateSubmissionRequest {
  solutionId?: string | null;
  proposedPrice: number;
  technicalProposal: string;
  implementationPlan: string;
  durationWeeks: number;
  localJobsDeclared: number;
  documents?: AttachmentDto[];
}

export interface ScoreBreakdownDto {
  criterionId: string;
  key: CriterionKey;
  name: string;
  weightPct: number;
  scoringMethod: ScoringMethod;
  /** 0–100, null if a manual criterion is not yet scored. */
  score?: number | null;
  /** score × weight / 100 */
  points?: number | null;
  rationale?: string | null;
  /** Human-readable explanation, e.g. "R 350 000 ÷ R 420 000 × 100". */
  basis: string;
}

export interface EvaluationRowDto {
  submission: SubmissionDto;
  eligible: boolean;
  rank?: number | null;
  totalScore?: number | null;
  breakdown: ScoreBreakdownDto[];
  evaluationStatus: EvaluationStatus;
  evaluatorName?: string | null;
  overallComment?: string | null;
  isRecommended: boolean;
}

export interface MinOffersDto { applies: boolean; threshold: number; minimum: number; count: number; satisfied: boolean }

export interface EvaluationBoardDto {
  opportunity: OpportunitySummaryDto;
  criteria: CriterionDto[];
  rows: EvaluationRowDto[];
  recommendedSubmissionId?: string | null;
  allEvaluated: boolean;
  minOffers: MinOffersDto;
  deviationMinChars: number;
  purchaseOrder?: PurchaseOrderDto | null;
}

export interface SaveEvaluationRequest {
  scores: { criterionId: string; score: number; rationale: string }[];
  overallComment?: string;
  complete: boolean;
}
export interface SelectRequest { submissionId: string; justification?: string }

// ---------- Procurement ----------
export interface QuoteDto {
  id: string;
  supplierId: string;
  supplierName: string;
  supplierNumber: string;
  providerType: ProviderType;
  bbbeeLevel?: number | null;
  municipality: string;
  amount: number;
  validUntil: string;
  isCompliant: boolean;
  nonComplianceReason?: string | null;
  receivedAt: string;
  isLowestCompliant: boolean;
}
export interface QuoteBoardDto {
  request: PurchaseRequestDto;
  quotes: QuoteDto[];
  lowestCompliantQuoteId?: string | null;
  minOffers: MinOffersDto;
  deviationMinChars: number;
  purchaseOrder?: PurchaseOrderDto | null;
}
export interface CreateQuoteRequest {
  supplierId: string; amount: number; validUntil: string; isCompliant: boolean; nonComplianceReason?: string;
}
export interface SelectQuoteRequest { quoteId: string; justification?: string }

export interface SupplierDto {
  id: string;
  providerId: string;
  providerName: string;
  providerType: ProviderType;
  supplierNumber: string;
  csdNumber?: string | null;
  taxCompliant: boolean;
  status: SupplierStatus;
  bbbeeLevel?: number | null;
  verifiedAt?: string | null;
  verifiedByName?: string | null;
}
export interface VerifySupplierRequest { csdNumber: string; taxCompliant: boolean }

export interface PurchaseOrderDto {
  id: string;
  poNumber: string;
  purchaseRequestId: string;
  requestReference: string;
  needId: string;
  needTitle: string;
  departmentName: string;
  supplierId: string;
  supplierName: string;
  supplierStatus: SupplierStatus;
  submissionId?: string | null;
  quoteId?: string | null;
  amount: number;
  status: POStatus;
  isDeviation: boolean;
  deviationJustification?: string | null;
  recommendedRef?: string | null;
  selectedByName?: string | null;
  selectedAt?: string | null;
  issuedByName?: string | null;
  issuedAt?: string | null;
  completedAt?: string | null;
  implementationId?: string | null;
}
export interface IssuePoRequest { managerId: string; startDate: string; expectedCompletion: string }

// ---------- Implementation & impact ----------
export interface ImplementationSummaryDto {
  id: string;
  purchaseOrderId: string;
  poNumber: string;
  needId: string;
  needTitle: string;
  needCategory: NeedCategory;
  departmentName: string;
  supplierName: string;
  managerId: string;
  managerName: string;
  status: ImplementationStatus;
  startDate?: string | null;
  expectedCompletion?: string | null;
  actualCompletion?: string | null;
  progressPct: number;
  location: GeoLocation;
  amount: number;
  isLate: boolean;
  metricCount: number;
}
export interface MilestoneDto { id: string; title: string; dueDate: string; completedAt?: string | null; isLate: boolean }
export interface ImplementationUpdateDto {
  id: string; type: UpdateType; description: string; progressPct?: number | null; evidenceUrl?: string | null;
  authorName: string; createdAt: string;
}
export interface MeasurementDto {
  id: string; value: number; measuredAt: string; evidenceUrl?: string | null; note?: string | null;
  ward?: string | null; recordedByName: string;
}
export interface ImpactMetricDto {
  id: string;
  implementationId: string;
  needId: string;
  needTitle: string;
  departmentName: string;
  name: string;
  description: string;
  unit: string;
  direction: Direction;
  baseline: number;
  target: number;
  current?: number | null;
  /** (current − baseline) / baseline × 100 */
  changePct?: number | null;
  /** share of the baseline→target distance covered, × 100 */
  progressPct?: number | null;
  status: ImpactStatus;
  lastMeasuredAt?: string | null;
  measurements: MeasurementDto[];
}
export interface ImplementationDetailDto extends ImplementationSummaryDto {
  milestones: MilestoneDto[];
  updates: ImplementationUpdateDto[];
  metrics: ImpactMetricDto[];
  hasEvidence: boolean;
}
export interface UpdateImplementationRequest {
  status?: ImplementationStatus; progressPct?: number; startDate?: string; expectedCompletion?: string;
}
export interface CreateMilestoneRequest { title: string; dueDate: string }
export interface CreateUpdateRequest { type: UpdateType; description: string; progressPct?: number; evidenceUrl?: string }
export interface CreateMetricRequest {
  name: string; description: string; unit: string; direction: Direction; baseline: number; target: number;
}
export interface CreateMeasurementRequest {
  value: number; measuredAt: string; evidenceUrl?: string; note?: string; ward?: string;
}
export interface MetricTemplateDto { name: string; description: string; unit: string; direction: Direction }

// ---------- Ecosystem ----------
export interface ProviderDto {
  id: string;
  name: string;
  providerType: ProviderType;
  description: string;
  registrationNumber?: string | null;
  bbbeeLevel?: number | null;
  bbbeeExpiry?: string | null;
  bbbeeExpired: boolean;
  location: GeoLocation;
  contactEmail: string;
  website?: string | null;
  employees: number;
  verificationStatus: 'UNVERIFIED' | 'VERIFIED';
  supplierStatus?: SupplierStatus | null;
  solutionCount: number;
  submissionCount: number;
  awardCount: number;
}
export interface SolutionDto {
  id: string;
  providerId: string;
  providerName: string;
  providerType: ProviderType;
  name: string;
  description: string;
  category: NeedCategory;
  technologies: string[];
  isOpenSource: boolean;
  repositoryUrl?: string | null;
  license?: string | null;
  demoUrl?: string | null;
  coverageProvinces: string[];
  maturity: SolutionMaturity;
  externalDeployments: number;
  platformDeployments: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
}
export interface ProviderDetailDto extends ProviderDto { solutions: SolutionDto[] }
export interface SaveSolutionRequest {
  name: string; description: string; category: NeedCategory; technologies: string[]; isOpenSource: boolean;
  repositoryUrl?: string; license?: string; demoUrl?: string; coverageProvinces: string[];
  maturity: SolutionMaturity; externalDeployments: number;
}

export interface MapDto {
  needs: { id: string; reference: string; title: string; category: NeedCategory; stage: LifecycleStage; opportunityId?: string | null; location: GeoLocation }[];
  providers: { id: string; name: string; providerType: ProviderType; location: GeoLocation }[];
  implementations: { id: string; needTitle: string; status: ImplementationStatus; progressPct: number; location: GeoLocation }[];
}

// ---------- Dashboards ----------
export interface ExecutiveKpisDto {
  totalProcurementValue: number;
  activeOpportunities: number;
  activeImplementations: number;
  budgetUtilisationPct: number;
  localProvidersEngaged: number;
  pendingApprovals: number;
  slaBreaches: number;
  projectsAtRisk: number;
}
export interface ImpactHighlightDto {
  implementationId: string;
  needId: string;
  needTitle: string;
  supplierName: string;
  invested: number;
  status: ImplementationStatus;
  metrics: { name: string; unit: string; baseline: number; current?: number | null; target: number; changePct?: number | null; status: ImpactStatus }[];
}
export interface ExecutiveDashboardDto {
  kpis: ExecutiveKpisDto;
  funnel: { stage: LifecycleStage; count: number }[];
  departments: DepartmentDto[];
  impactHighlights: ImpactHighlightDto[];
  atRisk: ImplementationSummaryDto[];
  overdueApprovals: PurchaseRequestDto[];
}
export interface DepartmentDashboardDto {
  department: DepartmentDto;
  pendingApprovals: number;
  requests: PurchaseRequestDto[];
  opportunities: OpportunitySummaryDto[];
  implementations: ImplementationSummaryDto[];
  impact: ImpactMetricDto[];
}
export interface ProcurementDashboardDto {
  awaitingSourcing: PurchaseRequestDto[];
  activeOpportunities: OpportunitySummaryDto[];
  evaluationQueue: OpportunitySummaryDto[];
  quoteRequests: PurchaseRequestDto[];
  pendingPurchaseOrders: PurchaseOrderDto[];
  suppliersPendingVerification: SupplierDto[];
}
export interface ProviderDashboardDto {
  provider: ProviderDto;
  available: OpportunitySummaryDto[];
  closingSoon: OpportunitySummaryDto[];
  submissions: SubmissionDto[];
  counts: { submitted: number; shortlisted: number; selected: number };
  solutions: SolutionDto[];
}

// ---------- Cross-cutting ----------
export interface NotificationDto {
  id: string; type: string; title: string; message: string; entityType?: string | null; entityId?: string | null;
  link?: string | null; isRead: boolean; createdAt: string;
}
export interface NotificationListDto { unread: number; items: NotificationDto[] }

export interface AuditEntryDto {
  id: string;
  sequence: number;
  occurredAt: string;
  actorId?: string | null;
  actorName: string;
  actorRole?: UserRole | null;
  action: string;
  entityType: string;
  entityId: string;
  needId?: string | null;
  summary: string;
  metadata?: Record<string, unknown> | null;
  prevHash: string;
  hash: string;
}
export interface AuditVerifyDto { valid: boolean; checked: number; brokenAtSequence?: number | null; headHash?: string | null }

export interface ApprovalBandDto { minAmount: number; maxAmount?: number | null; approverRoles: UserRole[] }
export interface RuleSetDto {
  id?: string;
  version?: number;
  effectiveFrom?: string;
  approvalSlaHours: number;
  budgetMode: 'BLOCK' | 'WARN';
  quotationThreshold: number;
  minCompetitiveOffers: number;
  deviationMinChars: number;
  closingSoonDays: number;
  impactOnTrackPct: number;
  escalationRole: UserRole;
  approvalBands: ApprovalBandDto[];
  /** Keys "1".."8" = B-BBEE level, "0" = non-compliant/unknown → score 0–100 */
  bbbeeScores: Record<string, number>;
  localScores: { sameMunicipality: number; sameProvince: number; elsewhere: number };
  defaultCriteria: CriterionDto[];
  updatedByName?: string | null;
}

export interface AiRequest { needId?: string; opportunityId?: string; submissionId?: string; implementationId?: string }
export interface AiCitationDto { type: string; id: string; reference: string; label: string }
export interface AiResultDto {
  task: AiTask;
  mode: 'GEMINI' | 'DETERMINISTIC';
  title: string;
  /** Markdown */
  content: string;
  citations: AiCitationDto[];
  disclaimer: string;
  generatedAt: string;
  /** Task-specific structured output, e.g. opportunity-draft → { title, description }. */
  structured?: Record<string, unknown> | null;
}
