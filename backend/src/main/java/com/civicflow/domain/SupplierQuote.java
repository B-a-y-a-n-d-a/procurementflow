package com.civicflow.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "supplier_quote")
@Getter
@Setter
@NoArgsConstructor
public class SupplierQuote extends BaseEntity {
    private String purchaseRequestId;
    private String supplierId;
    private BigDecimal amount;
    private LocalDate validUntil;
    @Column(name = "is_compliant")
    private boolean compliant;
    @Column(length = 4000)
    private String nonComplianceReason;
    private Instant receivedAt;
    private String recordedBy;
}
