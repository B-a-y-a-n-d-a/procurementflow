# API Contract: CIVICFLOW v1

- **Base URL:** `/api` (Docker: via nginx on `:3000`; dev: Spring Boot on `:8080`, proxied by Vite)
- **Format:** JSON, camelCase, ISO-8601 timestamps (UTC, `Instant`), dates `YYYY-MM-DD`, money as numbers (ZAR).
- **Auth (T122):** `POST /api/auth/login` with email + password returns a signed token; send it as `Authorization: Bearer <token>`. Missing, invalid or expired token → `401 UNAUTHENTICATED`. Public routes: `POST /api/auth/login`, `GET /api/health`.
- **DTO shapes:** the canonical TypeScript definitions are in [`frontend/src/api/types.ts`](../../../frontend/src/api/types.ts). The Java records in `backend/.../web/dto` mirror them exactly. **Change this file and `types.ts` first**, then the code.

## Errors

```json
{ "status": 422, "code": "BUDGET_EXCEEDED", "message": "Requested R 600 000 exceeds available budget R 512 000", "details": { "available": 512000, "requested": 600000 } }
```

| HTTP | Codes |
| --- | --- |
| 400 | `VALIDATION_FAILED` (details: field → message) |
| 401 | `UNAUTHENTICATED` |
| 403 | `FORBIDDEN`, `SEGREGATION_OF_DUTIES` |
| 404 | `NOT_FOUND` |
| 409 | `INVALID_STATE` |
| 422 | `BUDGET_EXCEEDED`, `WEIGHTS_INVALID`, `NOT_ELIGIBLE`, `DEADLINE_PASSED`, `DUPLICATE_SUBMISSION`, `EVALUATION_INCOMPLETE`, `MIN_OFFERS_NOT_MET`, `JUSTIFICATION_REQUIRED`, `SUPPLIER_NOT_ACTIVE`, `EVIDENCE_REQUIRED`, `COMMENT_REQUIRED`, `NOT_OVERDUE` |

## Endpoints

Roles: **ALL** = any authenticated user · **STAFF** = every role except PROVIDER · **PO** = PROCUREMENT_OFFICER · **DM** = DEPARTMENT_MANAGER · **FD** = FINANCE_DIRECTOR · **ADM** = ADMIN.

### Auth & reference
| Method | Path | Role | Returns |
| --- | --- | --- | --- |
| POST | `/auth/login` | public | `LoginRequest { email, password }` → `LoginResponse { token, expiresAt, user: UserDto }`; wrong email/password → `401 INVALID_CREDENTIALS` (same error for both) |
| GET | `/auth/me` | ALL | `UserDto` |
| GET | `/users` | STAFF | `UserDto[]` |
| GET | `/departments` | STAFF | `DepartmentDto[]` (with `budget`) |

### Needs & requests
| Method | Path | Role | Body → Returns |
| --- | --- | --- | --- |
| GET | `/needs` | STAFF | `NeedSummaryDto[]` |
| GET | `/needs/{id}` | STAFF | `NeedDetailDto` |
| GET | `/needs/{id}/journey` | STAFF | `AuditEntryDto[]` (ascending) |
| POST | `/needs` | DEPARTMENT_OFFICER, DM | `CreateNeedRequest` → `NeedDetailDto` |
| POST | `/needs/{id}/submit` | owner | `SubmitNeedRequest` → `NeedDetailDto` (draft → submitted) |
| GET | `/rules/routing-preview?departmentId=&amount=` | STAFF | `RoutingPreviewDto` |
| GET | `/requests` | STAFF | `PurchaseRequestDto[]` |
| GET | `/approvals/inbox` | DM, FD, EXECUTIVE | `PurchaseRequestDto[]` (with `actionableStepId`) |
| POST | `/approvals/{stepId}/approve` | step role | `DecisionRequest` → `PurchaseRequestDto` |
| POST | `/approvals/{stepId}/reject` | step role | `DecisionRequest` (comment required) → `PurchaseRequestDto` |
| POST | `/approvals/{stepId}/escalate` | STAFF | → `PurchaseRequestDto` |

### Opportunities, submissions, evaluation
| Method | Path | Role | Body → Returns |
| --- | --- | --- | --- |
| GET | `/opportunities` | ALL (providers: non-draft) | `OpportunitySummaryDto[]` |
| GET | `/opportunities/{id}` | ALL | `OpportunityDetailDto` (`submissions` for staff, `mySubmission` for providers) |
| POST | `/needs/{needId}/opportunity` | PO | `CreateOpportunityRequest` → `OpportunityDetailDto` |
| POST | `/opportunities/{id}/publish` | PO | → `OpportunityDetailDto` |
| POST | `/opportunities/{id}/start-evaluation` | PO | → `OpportunityDetailDto` |
| POST | `/opportunities/{id}/cancel` | PO | `ReasonRequest` → `OpportunityDetailDto` |
| POST | `/opportunities/{id}/submissions` | PROVIDER | `CreateSubmissionRequest` → `SubmissionDto` |
| GET | `/submissions/mine` | PROVIDER | `SubmissionDto[]` |
| POST | `/submissions/{id}/withdraw` | PROVIDER (own) | `ReasonRequest` → `SubmissionDto` |
| POST | `/submissions/{id}/shortlist` | PO, EVALUATOR | → `SubmissionDto` |
| POST | `/submissions/{id}/reject` | PO, EVALUATOR | `ReasonRequest` → `SubmissionDto` |
| GET | `/opportunities/{id}/evaluation` | PO, EVALUATOR, EXECUTIVE, AUDITOR | `EvaluationBoardDto` |
| PUT | `/submissions/{id}/evaluation` | PO, EVALUATOR | `SaveEvaluationRequest` → `EvaluationBoardDto` |
| POST | `/opportunities/{id}/select` | PO | `SelectRequest {submissionId, justification?}` → `PurchaseOrderDto` |

### Procurement
| Method | Path | Role | Body → Returns |
| --- | --- | --- | --- |
| GET | `/requests/{id}/quotes` | STAFF | `QuoteBoardDto` |
| POST | `/requests/{id}/quotes` | PO | `CreateQuoteRequest` → `QuoteBoardDto` |
| POST | `/requests/{id}/select-quote` | PO | `SelectQuoteRequest {quoteId, justification?}` → `PurchaseOrderDto` |
| GET | `/suppliers` | STAFF | `SupplierDto[]` |
| POST | `/suppliers/{id}/verify` | PO | `VerifySupplierRequest` → `SupplierDto` |
| GET | `/purchase-orders` | STAFF | `PurchaseOrderDto[]` |
| POST | `/purchase-orders/{id}/issue` | PO | `IssuePoRequest` → `PurchaseOrderDto` |

### Delivery & impact
| Method | Path | Role | Body → Returns |
| --- | --- | --- | --- |
| GET | `/implementations` | STAFF | `ImplementationSummaryDto[]` |
| GET | `/implementations/{id}` | STAFF | `ImplementationDetailDto` |
| PATCH | `/implementations/{id}` | manager, DM | `UpdateImplementationRequest` → `ImplementationDetailDto` |
| POST | `/implementations/{id}/milestones` | manager, DM | `CreateMilestoneRequest` → `ImplementationDetailDto` |
| POST | `/milestones/{id}/complete` | manager, DM | → `ImplementationDetailDto` |
| POST | `/implementations/{id}/updates` | manager, DM | `CreateUpdateRequest` → `ImplementationDetailDto` |
| POST | `/implementations/{id}/complete` | manager, DM | → `ImplementationDetailDto` |
| POST | `/implementations/{id}/metrics` | manager, DM | `CreateMetricRequest` → `ImplementationDetailDto` |
| POST | `/metrics/{id}/measurements` | manager, DM | `CreateMeasurementRequest` → `ImplementationDetailDto` |
| GET | `/impact` | STAFF | `ImpactMetricDto[]` |
| GET | `/impact/templates?category=` | STAFF | `MetricTemplateDto[]` |

### Ecosystem, map, dashboards
| Method | Path | Role | Returns |
| --- | --- | --- | --- |
| GET | `/providers` · `/providers/{id}` | ALL | `ProviderDto[]` · `ProviderDetailDto` |
| GET | `/solutions?q=&category=&openSource=&province=` | ALL | `SolutionDto[]` |
| POST | `/solutions` · PUT `/solutions/{id}` | PROVIDER (own) | `SaveSolutionRequest` → `SolutionDto` |
| GET | `/map` | ALL | `MapDto` |
| GET | `/dashboard/executive` | STAFF | `ExecutiveDashboardDto` |
| GET | `/dashboard/department/{id}` | STAFF | `DepartmentDashboardDto` |
| GET | `/dashboard/procurement` | STAFF | `ProcurementDashboardDto` |
| GET | `/dashboard/provider` | PROVIDER | `ProviderDashboardDto` |

### Cross-cutting
| Method | Path | Role | Returns |
| --- | --- | --- | --- |
| GET | `/notifications` | ALL | `NotificationListDto` |
| POST | `/notifications/{id}/read` · `/notifications/read-all` | ALL | `NotificationListDto` |
| GET | `/audit?needId=&entityType=&action=&limit=` | STAFF | `AuditEntryDto[]` (descending) |
| GET | `/audit/verify` | STAFF | `AuditVerifyDto` |
| GET | `/rules` | ALL | `RuleSetDto` |
| PUT | `/rules` | ADM | `RuleSetDto` → `RuleSetDto` (new version) |
| POST | `/ai/{task}` | STAFF (provider: none) | `AiRequest` → `AiResultDto`; task ∈ `executive-briefing`, `need-analysis`, `opportunity-draft`, `solution-discovery`, `submission-summary`, `impact-summary` |
| GET | `/health` | public | `{ status: "UP" }` |
