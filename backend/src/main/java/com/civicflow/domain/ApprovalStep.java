package com.civicflow.domain;

import com.civicflow.domain.enums.StepStatus;
import com.civicflow.domain.enums.UserRole;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "approval_step")
@Getter
@Setter
@NoArgsConstructor
public class ApprovalStep extends BaseEntity {
    private String purchaseRequestId;
    private int sequence;
    @Enumerated(EnumType.STRING)
    private UserRole requiredRole;
    private String approverId;
    @Enumerated(EnumType.STRING)
    private StepStatus status;
    private Instant activatedAt;
    private Instant dueAt;
    private Instant decidedAt;
    private Instant escalatedAt;
    @Column(length = 4000)
    private String comment;
}
