package com.civicflow.domain;

import com.civicflow.domain.enums.ImplementationStatus;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;

/** Delivery of a purchase order. Location is derived via PO -> request -> need. */
@Entity
@Table(name = "implementation")
@Getter
@Setter
@NoArgsConstructor
public class Implementation extends BaseEntity {
    private String purchaseOrderId;
    private String managerId;
    @Enumerated(EnumType.STRING)
    private ImplementationStatus status;
    private LocalDate startDate;
    private LocalDate expectedCompletion;
    private LocalDate actualCompletion;
    private int progressPct;
    private Instant createdAt;
}
