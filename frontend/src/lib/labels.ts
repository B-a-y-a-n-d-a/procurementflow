import type {
  CriterionKey, Direction, ImpactStatus, ImplementationStatus, LifecycleStage, NeedCategory, OpportunityDisplayStatus,
  POStatus, Priority, ProviderType, RequestStatus, ScoringMethod, SlaState, SolutionMaturity, SourcingMethod,
  StepStatus, SubmissionStatus, SupplierStatus, UpdateType, UserRole, NeedStatus, EvaluationStatus,
} from '../api/types';

export type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'gold';

export const ROLE_LABEL: Record<UserRole, string> = {
  DEPARTMENT_OFFICER: 'Department Officer',
  DEPARTMENT_MANAGER: 'Department Manager',
  FINANCE_DIRECTOR: 'Finance Director',
  PROCUREMENT_OFFICER: 'Procurement Officer',
  EVALUATOR: 'Evaluator',
  PROVIDER: 'Provider',
  EXECUTIVE: 'Executive',
  AUDITOR: 'Auditor',
  ADMIN: 'Administrator',
  SYSTEM: 'System (auto)',
};

export const CATEGORY_LABEL: Record<NeedCategory, string> = {
  WASTE_ENVIRONMENT: 'Waste & environment',
  COMMUNITY_SAFETY: 'Community safety',
  DIGITAL_SERVICES: 'Digital public services',
  LOCAL_ECONOMIC_DEVELOPMENT: 'Local economic development',
  INFRASTRUCTURE: 'Infrastructure',
  WATER_ENERGY: 'Water & energy',
  ICT_OPERATIONS: 'ICT operations',
  COMMUNITY_FACILITIES: 'Community facilities',
};

export const PRIORITY_LABEL: Record<Priority, string> = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', CRITICAL: 'Critical' };

export const PROVIDER_TYPE_LABEL: Record<ProviderType, string> = {
  SME: 'SME',
  STARTUP: 'Startup',
  LOCAL_BUSINESS: 'Local business',
  COOPERATIVE: 'Co-operative',
  INNOVATOR: 'Innovator',
  TECHNOLOGY_COMPANY: 'Technology company',
  OPEN_SOURCE_PROJECT: 'Open-source project',
};

export const SOURCING_LABEL: Record<SourcingMethod, string> = {
  OPEN_OPPORTUNITY: 'Open innovation opportunity',
  QUOTATION: 'Quotations from suppliers',
};

export const STAGE_LABEL: Record<LifecycleStage, string> = {
  NEED: 'Need',
  APPROVAL: 'Approval',
  OPPORTUNITY: 'Opportunity',
  EVALUATION: 'Evaluation',
  PROCUREMENT: 'Procurement',
  IMPLEMENTATION: 'Implementation',
  IMPACT: 'Impact',
  CLOSED: 'Closed',
  REJECTED: 'Rejected',
};

export const CRITERION_LABEL: Record<CriterionKey, string> = {
  PRICE: 'Price',
  TECHNICAL: 'Technical capability',
  SUITABILITY: 'Solution suitability',
  LOCAL: 'Local participation',
  BBBEE: 'B-BBEE contribution',
  EXPERIENCE: 'Experience',
  IMPLEMENTATION: 'Implementation capability',
};

export const SCORING_LABEL: Record<ScoringMethod, string> = {
  AUTO_PRICE: 'Auto · price formula',
  AUTO_BBBEE: 'Auto · B-BBEE table',
  AUTO_LOCAL: 'Auto · location',
  MANUAL: 'Evaluator score',
};

export const MATURITY_LABEL: Record<SolutionMaturity, string> = {
  IDEA: 'Idea', PROTOTYPE: 'Prototype', PILOT: 'Pilot', PRODUCTION: 'Production',
};

export const UPDATE_TYPE_LABEL: Record<UpdateType, string> = {
  PROGRESS: 'Progress', ISSUE: 'Issue', EVIDENCE: 'Delivery evidence', NOTE: 'Note',
};

export const DIRECTION_LABEL: Record<Direction, string> = { INCREASE: 'Higher is better', DECREASE: 'Lower is better' };

/** Status text + tone for badges (status is never shown by colour alone - NFR-02). */
export function statusTone(status: string): { label: string; tone: Tone } {
  const map: Record<string, [string, Tone]> = {
    // need / request / step
    DRAFT: ['Draft', 'neutral'],
    OPEN: ['Open', 'brand'],
    CLOSED: ['Closed', 'neutral'],
    CANCELLED: ['Cancelled', 'neutral'],
    PENDING_APPROVAL: ['Pending approval', 'warning'],
    APPROVED: ['Approved', 'success'],
    REJECTED: ['Rejected', 'danger'],
    ORDERED: ['PO issued', 'brand'],
    WAITING: ['Waiting', 'neutral'],
    PENDING: ['Pending', 'warning'],
    AUTO_APPROVED: ['Auto-approved', 'success'],
    SKIPPED: ['Skipped', 'neutral'],
    // SLA
    ON_TIME: ['On time', 'success'],
    DUE_SOON: ['Due soon', 'warning'],
    OVERDUE: ['Overdue', 'danger'],
    DONE: ['Done', 'neutral'],
    NOT_ACTIVE: ['Not active', 'neutral'],
    // opportunity
    PUBLISHED: ['Published', 'brand'],
    CLOSING_SOON: ['Closing soon', 'gold'],
    EVALUATION: ['In evaluation', 'info'],
    AWARDED: ['Awarded', 'success'],
    // submission
    SUBMITTED: ['Submitted', 'info'],
    UNDER_REVIEW: ['Under review', 'info'],
    SHORTLISTED: ['Shortlisted', 'gold'],
    SELECTED: ['Selected', 'success'],
    WITHDRAWN: ['Withdrawn', 'neutral'],
    // evaluation
    NOT_STARTED: ['Not started', 'neutral'],
    COMPLETED: ['Completed', 'success'],
    // supplier / PO
    PENDING_VERIFICATION: ['Pending verification', 'warning'],
    ACTIVE: ['Active', 'success'],
    SUSPENDED: ['Suspended', 'danger'],
    ISSUED: ['Issued', 'brand'],
    // implementation
    PLANNED: ['Planned', 'info'],
    IN_PROGRESS: ['In progress', 'brand'],
    AT_RISK: ['At risk', 'danger'],
    // impact
    NOT_MEASURED: ['Not measured', 'neutral'],
    ON_TRACK: ['On track', 'brand'],
    ACHIEVED: ['Achieved', 'success'],
    // stages
    NEED: ['Need', 'neutral'],
    APPROVAL: ['Approval', 'warning'],
    OPPORTUNITY: ['Opportunity', 'brand'],
    PROCUREMENT: ['Procurement', 'info'],
    IMPLEMENTATION: ['Implementation', 'brand'],
    IMPACT: ['Impact tracking', 'success'],
    // verification
    VERIFIED: ['Verified', 'success'],
    UNVERIFIED: ['Unverified', 'neutral'],
  };
  const hit = map[status];
  return hit ? { label: hit[0], tone: hit[1] } : { label: status.replaceAll('_', ' ').toLowerCase(), tone: 'neutral' };
}

export type AnyStatus =
  | NeedStatus | RequestStatus | StepStatus | SlaState | OpportunityDisplayStatus | SubmissionStatus | EvaluationStatus
  | SupplierStatus | POStatus | ImplementationStatus | ImpactStatus | LifecycleStage;

export function bbbee(level?: number | null): string {
  return level ? `Level ${level}` : 'Non-compliant / not declared';
}

export const PROVINCES = [
  'Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal', 'Limpopo', 'Mpumalanga', 'North West', 'Northern Cape', 'Western Cape',
];
