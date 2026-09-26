package com.civicflow.domain;

import com.civicflow.domain.enums.POStatus;
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

/** Formal procurement transaction; also records the selection decision (DRAFT = selected, awaiting supplier verification). */
@Entity
@Table(name = "purchase_order")
@Getter
@Setter
@NoArgsConstructor
public class PurchaseOrder extends BaseEntity {
    private String poNumber;
    private String purchaseRequestId;
    private String supplierId;
    private String submissionId;
    private String quoteId;
    private BigDecimal amount;
    @Enumerated(EnumType.STRING)
    private POStatus status;
    private String recommendedRef;
    @Column(name = "is_deviation")
    private boolean deviation;
    @Column(length = 4000)
    private String deviationJustification;
    private String selectedBy;
    private Instant selectedAt;
    private String issuedBy;
    private Instant issuedAt;
    private Instant completedAt;
}
