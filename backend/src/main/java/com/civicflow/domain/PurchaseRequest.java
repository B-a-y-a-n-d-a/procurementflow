package com.civicflow.domain;

import com.civicflow.domain.enums.RequestStatus;
import com.civicflow.domain.enums.SourcingMethod;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;

/** Internal financial & approval instrument for exactly one need. */
@Entity
@Table(name = "purchase_request")
@Getter
@Setter
@NoArgsConstructor
public class PurchaseRequest extends BaseEntity {
    private String reference;
    private String needId;
    private String requestedBy;
    private String ruleSetId;
    private BigDecimal amount;
    @Column(length = 10000)
    private String justification;
    @Enumerated(EnumType.STRING)
    private SourcingMethod sourcingMethod;
    @Enumerated(EnumType.STRING)
    private RequestStatus status;
    /** Snapshot for audit: available budget at submission time. */
    private BigDecimal budgetAvailableSnapshot;
    private Instant submittedAt;
    private Instant decidedAt;
    private Instant createdAt;
}
