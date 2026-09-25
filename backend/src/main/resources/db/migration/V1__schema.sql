-- CIVICFLOW schema v1 - mirrors docs/product/03-erd.md
-- JSON values are stored as TEXT (serialised by the application) for portability.

CREATE TABLE department (
    id               VARCHAR(36)   NOT NULL PRIMARY KEY,
    code             VARCHAR(20)   NOT NULL UNIQUE,
    name             VARCHAR(150)  NOT NULL,
    municipality     VARCHAR(150)  NOT NULL,
    province         VARCHAR(60)   NOT NULL,
    budget_allocated DECIMAL(14,2) NOT NULL,
    financial_year   VARCHAR(10)   NOT NULL,
    created_at       DATETIME(6)   NOT NULL
);

CREATE TABLE provider (
    id                  VARCHAR(36)  NOT NULL PRIMARY KEY,
    name                VARCHAR(200) NOT NULL,
    provider_type       VARCHAR(30)  NOT NULL,
    description         TEXT         NOT NULL,
    registration_number VARCHAR(40),
    bbbee_level         INT,
    bbbee_expiry        DATE,
    province            VARCHAR(60)  NOT NULL,
    municipality        VARCHAR(150) NOT NULL,
    ward                VARCHAR(40),
    latitude            DECIMAL(9,6) NOT NULL,
    longitude           DECIMAL(9,6) NOT NULL,
    contact_email       VARCHAR(200) NOT NULL,
    website             VARCHAR(300),
    employees           INT          NOT NULL DEFAULT 0,
    verification_status VARCHAR(20)  NOT NULL,
    created_at          DATETIME(6)  NOT NULL
);

CREATE TABLE app_user (
    id            VARCHAR(36)  NOT NULL PRIMARY KEY,
    full_name     VARCHAR(150) NOT NULL,
    email         VARCHAR(200) NOT NULL UNIQUE,
    title         VARCHAR(150) NOT NULL,
    role          VARCHAR(30)  NOT NULL,
    department_id VARCHAR(36),
    provider_id   VARCHAR(36),
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    DATETIME(6)  NOT NULL,
    CONSTRAINT fk_user_department FOREIGN KEY (department_id) REFERENCES department (id),
    CONSTRAINT fk_user_provider   FOREIGN KEY (provider_id)   REFERENCES provider (id)
);

CREATE TABLE business_rule_set (
    id                     VARCHAR(36)   NOT NULL PRIMARY KEY,
    version                INT           NOT NULL UNIQUE,
    effective_from         DATETIME(6)   NOT NULL,
    approval_sla_hours     INT           NOT NULL,
    budget_mode            VARCHAR(10)   NOT NULL,
    quotation_threshold    DECIMAL(14,2) NOT NULL,
    min_competitive_offers INT           NOT NULL,
    deviation_min_chars    INT           NOT NULL,
    closing_soon_days      INT           NOT NULL,
    impact_on_track_pct    INT           NOT NULL,
    escalation_role        VARCHAR(30)   NOT NULL,
    bbbee_score_table      TEXT          NOT NULL,
    local_score_table      TEXT          NOT NULL,
    default_criteria       TEXT          NOT NULL,
    updated_by             VARCHAR(36),
    created_at             DATETIME(6)   NOT NULL,
    CONSTRAINT fk_rules_user FOREIGN KEY (updated_by) REFERENCES app_user (id)
);

CREATE TABLE approval_rule (
    id             VARCHAR(36)   NOT NULL PRIMARY KEY,
    rule_set_id    VARCHAR(36)   NOT NULL,
    min_amount     DECIMAL(14,2) NOT NULL,
    max_amount     DECIMAL(14,2),
    approver_roles TEXT          NOT NULL,
    sort_order     INT           NOT NULL,
    CONSTRAINT fk_approval_rule_set FOREIGN KEY (rule_set_id) REFERENCES business_rule_set (id)
);

CREATE TABLE public_need (
    id                    VARCHAR(36)   NOT NULL PRIMARY KEY,
    reference             VARCHAR(30)   NOT NULL UNIQUE,
    department_id         VARCHAR(36)   NOT NULL,
    created_by            VARCHAR(36)   NOT NULL,
    title                 VARCHAR(200)  NOT NULL,
    problem_statement     TEXT          NOT NULL,
    desired_outcome       TEXT          NOT NULL,
    category              VARCHAR(40)   NOT NULL,
    priority              VARCHAR(10)   NOT NULL,
    estimated_budget      DECIMAL(14,2) NOT NULL,
    required_capabilities TEXT          NOT NULL,
    province              VARCHAR(60)   NOT NULL,
    municipality          VARCHAR(150)  NOT NULL,
    ward                  VARCHAR(40),
    latitude              DECIMAL(9,6)  NOT NULL,
    longitude             DECIMAL(9,6)  NOT NULL,
    status                VARCHAR(20)   NOT NULL,
    created_at            DATETIME(6)   NOT NULL,
    CONSTRAINT fk_need_department FOREIGN KEY (department_id) REFERENCES department (id),
    CONSTRAINT fk_need_creator    FOREIGN KEY (created_by)    REFERENCES app_user (id)
);

CREATE TABLE purchase_request (
    id                        VARCHAR(36)   NOT NULL PRIMARY KEY,
    reference                 VARCHAR(30)   NOT NULL UNIQUE,
    need_id                   VARCHAR(36)   NOT NULL UNIQUE,
    requested_by              VARCHAR(36)   NOT NULL,
    rule_set_id               VARCHAR(36)   NOT NULL,
    amount                    DECIMAL(14,2) NOT NULL,
    justification             TEXT          NOT NULL,
    sourcing_method           VARCHAR(20)   NOT NULL,
    status                    VARCHAR(20)   NOT NULL,
    budget_available_snapshot DECIMAL(14,2),
    submitted_at              DATETIME(6),
    decided_at                DATETIME(6),
    created_at                DATETIME(6)   NOT NULL,
    CONSTRAINT fk_request_need   FOREIGN KEY (need_id)      REFERENCES public_need (id),
    CONSTRAINT fk_request_user   FOREIGN KEY (requested_by) REFERENCES app_user (id),
    CONSTRAINT fk_request_rules  FOREIGN KEY (rule_set_id)  REFERENCES business_rule_set (id)
);

CREATE TABLE approval_step (
    id                  VARCHAR(36) NOT NULL PRIMARY KEY,
    purchase_request_id VARCHAR(36) NOT NULL,
    sequence            INT         NOT NULL,
    required_role       VARCHAR(30) NOT NULL,
    approver_id         VARCHAR(36),
    status              VARCHAR(20) NOT NULL,
    activated_at        DATETIME(6),
    due_at              DATETIME(6),
    decided_at          DATETIME(6),
    escalated_at        DATETIME(6),
    comment             TEXT,
    CONSTRAINT fk_step_request  FOREIGN KEY (purchase_request_id) REFERENCES purchase_request (id),
    CONSTRAINT fk_step_approver FOREIGN KEY (approver_id)         REFERENCES app_user (id),
    CONSTRAINT uq_step_sequence UNIQUE (purchase_request_id, sequence)
);

CREATE TABLE innovation_opportunity (
    id                      VARCHAR(36)  NOT NULL PRIMARY KEY,
    reference               VARCHAR(30)  NOT NULL UNIQUE,
    need_id                 VARCHAR(36)  NOT NULL UNIQUE,
    created_by              VARCHAR(36)  NOT NULL,
    title                   VARCHAR(200) NOT NULL,
    description             TEXT         NOT NULL,
    submission_deadline     DATETIME(6)  NOT NULL,
    eligible_provider_types TEXT         NOT NULL,
    open_source_preferred   BOOLEAN      NOT NULL DEFAULT FALSE,
    status                  VARCHAR(20)  NOT NULL,
    published_at            DATETIME(6),
    closed_at               DATETIME(6),
    cancel_reason           TEXT,
    created_at              DATETIME(6)  NOT NULL,
    CONSTRAINT fk_opp_need    FOREIGN KEY (need_id)    REFERENCES public_need (id),
    CONSTRAINT fk_opp_creator FOREIGN KEY (created_by) REFERENCES app_user (id)
);

CREATE TABLE evaluation_criterion (
    id             VARCHAR(36)  NOT NULL PRIMARY KEY,
    opportunity_id VARCHAR(36)  NOT NULL,
    criterion_key  VARCHAR(20)  NOT NULL,
    name           VARCHAR(100) NOT NULL,
    weight_pct     DECIMAL(5,2) NOT NULL,
    scoring_method VARCHAR(20)  NOT NULL,
    sort_order     INT          NOT NULL,
    CONSTRAINT fk_criterion_opp FOREIGN KEY (opportunity_id) REFERENCES innovation_opportunity (id)
);

CREATE TABLE innovation_solution (
    id                   VARCHAR(36)  NOT NULL PRIMARY KEY,
    provider_id          VARCHAR(36)  NOT NULL,
    name                 VARCHAR(200) NOT NULL,
    description          TEXT         NOT NULL,
    category             VARCHAR(40)  NOT NULL,
    technologies         TEXT         NOT NULL,
    is_open_source       BOOLEAN      NOT NULL DEFAULT FALSE,
    repository_url       VARCHAR(300),
    license              VARCHAR(60),
    demo_url             VARCHAR(300),
    coverage_provinces   TEXT         NOT NULL,
    maturity             VARCHAR(20)  NOT NULL,
    external_deployments INT          NOT NULL DEFAULT 0,
    status               VARCHAR(20)  NOT NULL,
    created_at           DATETIME(6)  NOT NULL,
    CONSTRAINT fk_solution_provider FOREIGN KEY (provider_id) REFERENCES provider (id)
);

CREATE TABLE opportunity_submission (
    id                  VARCHAR(36)   NOT NULL PRIMARY KEY,
    opportunity_id      VARCHAR(36)   NOT NULL,
    provider_id         VARCHAR(36)   NOT NULL,
    solution_id         VARCHAR(36),
    submitted_by        VARCHAR(36)   NOT NULL,
    proposed_price      DECIMAL(14,2) NOT NULL,
    technical_proposal  TEXT          NOT NULL,
    implementation_plan TEXT          NOT NULL,
    duration_weeks      INT           NOT NULL,
    local_jobs_declared INT           NOT NULL DEFAULT 0,
    status              VARCHAR(20)   NOT NULL,
    status_reason       TEXT,
    submitted_at        DATETIME(6)   NOT NULL,
    CONSTRAINT fk_sub_opp      FOREIGN KEY (opportunity_id) REFERENCES innovation_opportunity (id),
    CONSTRAINT fk_sub_provider FOREIGN KEY (provider_id)    REFERENCES provider (id),
    CONSTRAINT fk_sub_solution FOREIGN KEY (solution_id)    REFERENCES innovation_solution (id),
    CONSTRAINT fk_sub_user     FOREIGN KEY (submitted_by)   REFERENCES app_user (id),
    CONSTRAINT uq_sub_opp_provider UNIQUE (opportunity_id, provider_id)
);

CREATE TABLE supplier (
    id              VARCHAR(36) NOT NULL PRIMARY KEY,
    provider_id     VARCHAR(36) NOT NULL UNIQUE,
    supplier_number VARCHAR(20) NOT NULL UNIQUE,
    csd_number      VARCHAR(30),
    tax_compliant   BOOLEAN     NOT NULL DEFAULT FALSE,
    status          VARCHAR(30) NOT NULL,
    verified_by     VARCHAR(36),
    verified_at     DATETIME(6),
    created_at      DATETIME(6) NOT NULL,
    CONSTRAINT fk_supplier_provider FOREIGN KEY (provider_id) REFERENCES provider (id),
    CONSTRAINT fk_supplier_verifier FOREIGN KEY (verified_by) REFERENCES app_user (id)
);

CREATE TABLE supplier_quote (
    id                    VARCHAR(36)   NOT NULL PRIMARY KEY,
    purchase_request_id   VARCHAR(36)   NOT NULL,
    supplier_id           VARCHAR(36)   NOT NULL,
    amount                DECIMAL(14,2) NOT NULL,
    valid_until           DATE          NOT NULL,
    is_compliant          BOOLEAN       NOT NULL,
    non_compliance_reason TEXT,
    received_at           DATETIME(6)   NOT NULL,
    recorded_by           VARCHAR(36)   NOT NULL,
    CONSTRAINT fk_quote_request  FOREIGN KEY (purchase_request_id) REFERENCES purchase_request (id),
    CONSTRAINT fk_quote_supplier FOREIGN KEY (supplier_id)         REFERENCES supplier (id),
    CONSTRAINT fk_quote_user     FOREIGN KEY (recorded_by)         REFERENCES app_user (id),
    CONSTRAINT uq_quote_supplier UNIQUE (purchase_request_id, supplier_id)
);

CREATE TABLE evaluation (
    id              VARCHAR(36) NOT NULL PRIMARY KEY,
    submission_id   VARCHAR(36) NOT NULL,
    evaluator_id    VARCHAR(36) NOT NULL,
    status          VARCHAR(20) NOT NULL,
    overall_comment TEXT,
    completed_at    DATETIME(6),
    created_at      DATETIME(6) NOT NULL,
    CONSTRAINT fk_eval_submission FOREIGN KEY (submission_id) REFERENCES opportunity_submission (id),
    CONSTRAINT fk_eval_user       FOREIGN KEY (evaluator_id)  REFERENCES app_user (id),
    CONSTRAINT uq_eval_submission_evaluator UNIQUE (submission_id, evaluator_id)
);

CREATE TABLE evaluation_score (
    id            VARCHAR(36)  NOT NULL PRIMARY KEY,
    evaluation_id VARCHAR(36)  NOT NULL,
    criterion_id  VARCHAR(36)  NOT NULL,
    score         DECIMAL(5,2) NOT NULL,
    rationale     TEXT         NOT NULL,
    CONSTRAINT fk_score_eval      FOREIGN KEY (evaluation_id) REFERENCES evaluation (id),
    CONSTRAINT fk_score_criterion FOREIGN KEY (criterion_id)  REFERENCES evaluation_criterion (id),
    CONSTRAINT uq_score UNIQUE (evaluation_id, criterion_id)
);

CREATE TABLE purchase_order (
    id                      VARCHAR(36)   NOT NULL PRIMARY KEY,
    po_number               VARCHAR(30)   NOT NULL UNIQUE,
    purchase_request_id     VARCHAR(36)   NOT NULL UNIQUE,
    supplier_id             VARCHAR(36)   NOT NULL,
    submission_id           VARCHAR(36)   UNIQUE,
    quote_id                VARCHAR(36)   UNIQUE,
    amount                  DECIMAL(14,2) NOT NULL,
    status                  VARCHAR(20)   NOT NULL,
    recommended_ref         VARCHAR(36),
    is_deviation            BOOLEAN       NOT NULL DEFAULT FALSE,
    deviation_justification TEXT,
    selected_by             VARCHAR(36)   NOT NULL,
    selected_at             DATETIME(6)   NOT NULL,
    issued_by               VARCHAR(36),
    issued_at               DATETIME(6),
    completed_at            DATETIME(6),
    CONSTRAINT fk_po_request    FOREIGN KEY (purchase_request_id) REFERENCES purchase_request (id),
    CONSTRAINT fk_po_supplier   FOREIGN KEY (supplier_id)         REFERENCES supplier (id),
    CONSTRAINT fk_po_submission FOREIGN KEY (submission_id)       REFERENCES opportunity_submission (id),
    CONSTRAINT fk_po_quote      FOREIGN KEY (quote_id)            REFERENCES supplier_quote (id),
    CONSTRAINT fk_po_selected   FOREIGN KEY (selected_by)         REFERENCES app_user (id),
    CONSTRAINT fk_po_issued     FOREIGN KEY (issued_by)           REFERENCES app_user (id),
    CONSTRAINT ck_po_source CHECK ((submission_id IS NULL) <> (quote_id IS NULL))
);

CREATE TABLE implementation (
    id                  VARCHAR(36) NOT NULL PRIMARY KEY,
    purchase_order_id   VARCHAR(36) NOT NULL UNIQUE,
    manager_id          VARCHAR(36) NOT NULL,
    status              VARCHAR(20) NOT NULL,
    start_date          DATE,
    expected_completion DATE,
    actual_completion   DATE,
    progress_pct        INT         NOT NULL DEFAULT 0,
    created_at          DATETIME(6) NOT NULL,
    CONSTRAINT fk_impl_po      FOREIGN KEY (purchase_order_id) REFERENCES purchase_order (id),
    CONSTRAINT fk_impl_manager FOREIGN KEY (manager_id)        REFERENCES app_user (id)
);

CREATE TABLE milestone (
    id                VARCHAR(36)  NOT NULL PRIMARY KEY,
    implementation_id VARCHAR(36)  NOT NULL,
    title             VARCHAR(200) NOT NULL,
    due_date          DATE         NOT NULL,
    completed_at      DATETIME(6),
    sort_order        INT          NOT NULL,
    CONSTRAINT fk_milestone_impl FOREIGN KEY (implementation_id) REFERENCES implementation (id)
);

CREATE TABLE implementation_update (
    id                VARCHAR(36)  NOT NULL PRIMARY KEY,
    implementation_id VARCHAR(36)  NOT NULL,
    author_id         VARCHAR(36)  NOT NULL,
    update_type       VARCHAR(20)  NOT NULL,
    description       TEXT         NOT NULL,
    progress_pct      INT,
    evidence_url      VARCHAR(500),
    created_at        DATETIME(6)  NOT NULL,
    CONSTRAINT fk_update_impl   FOREIGN KEY (implementation_id) REFERENCES implementation (id),
    CONSTRAINT fk_update_author FOREIGN KEY (author_id)         REFERENCES app_user (id)
);

CREATE TABLE impact_metric (
    id                VARCHAR(36)   NOT NULL PRIMARY KEY,
    implementation_id VARCHAR(36)   NOT NULL,
    name              VARCHAR(150)  NOT NULL,
    description       TEXT          NOT NULL,
    unit              VARCHAR(40)   NOT NULL,
    direction         VARCHAR(10)   NOT NULL,
    baseline_value    DECIMAL(16,2) NOT NULL,
    target_value      DECIMAL(16,2) NOT NULL,
    created_by        VARCHAR(36)   NOT NULL,
    created_at        DATETIME(6)   NOT NULL,
    CONSTRAINT fk_metric_impl FOREIGN KEY (implementation_id) REFERENCES implementation (id),
    CONSTRAINT fk_metric_user FOREIGN KEY (created_by)        REFERENCES app_user (id)
);

CREATE TABLE impact_measurement (
    id           VARCHAR(36)   NOT NULL PRIMARY KEY,
    metric_id    VARCHAR(36)   NOT NULL,
    measured_value DECIMAL(16,2) NOT NULL,
    measured_at  DATETIME(6)   NOT NULL,
    evidence_url VARCHAR(500),
    note         TEXT,
    ward         VARCHAR(40),
    recorded_by  VARCHAR(36)   NOT NULL,
    created_at   DATETIME(6)   NOT NULL,
    CONSTRAINT fk_measure_metric FOREIGN KEY (metric_id)   REFERENCES impact_metric (id),
    CONSTRAINT fk_measure_user   FOREIGN KEY (recorded_by) REFERENCES app_user (id)
);

CREATE TABLE notification (
    id           VARCHAR(36)  NOT NULL PRIMARY KEY,
    recipient_id VARCHAR(36)  NOT NULL,
    type         VARCHAR(50)  NOT NULL,
    title        VARCHAR(200) NOT NULL,
    message      TEXT         NOT NULL,
    entity_type  VARCHAR(50),
    entity_id    VARCHAR(36),
    link         VARCHAR(200),
    is_read      BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at   DATETIME(6)  NOT NULL,
    CONSTRAINT fk_notification_user FOREIGN KEY (recipient_id) REFERENCES app_user (id)
);
CREATE INDEX ix_notification_recipient ON notification (recipient_id, is_read);

CREATE TABLE audit_log_entry (
    id          VARCHAR(36) NOT NULL PRIMARY KEY,
    sequence    BIGINT      NOT NULL UNIQUE,
    occurred_at DATETIME(6) NOT NULL,
    actor_id    VARCHAR(36),
    action      VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id   VARCHAR(36) NOT NULL,
    need_id     VARCHAR(36),
    summary     TEXT        NOT NULL,
    metadata    TEXT,
    prev_hash   VARCHAR(64) NOT NULL,
    hash        VARCHAR(64) NOT NULL,
    CONSTRAINT fk_audit_actor FOREIGN KEY (actor_id) REFERENCES app_user (id),
    CONSTRAINT fk_audit_need  FOREIGN KEY (need_id)  REFERENCES public_need (id)
);
CREATE INDEX ix_audit_need   ON audit_log_entry (need_id, sequence);
CREATE INDEX ix_audit_entity ON audit_log_entry (entity_type, entity_id);

CREATE TABLE attachment (
    id          VARCHAR(36)  NOT NULL PRIMARY KEY,
    entity_type VARCHAR(50)  NOT NULL,
    entity_id   VARCHAR(36)  NOT NULL,
    file_name   VARCHAR(200) NOT NULL,
    url         VARCHAR(500) NOT NULL,
    uploaded_by VARCHAR(36)  NOT NULL,
    uploaded_at DATETIME(6)  NOT NULL,
    CONSTRAINT fk_attachment_user FOREIGN KEY (uploaded_by) REFERENCES app_user (id)
);
CREATE INDEX ix_attachment_entity ON attachment (entity_type, entity_id);
