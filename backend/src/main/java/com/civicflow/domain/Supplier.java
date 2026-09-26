package com.civicflow.domain;

import com.civicflow.domain.enums.SupplierStatus;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/** A provider's formal procurement registration (0..1 per provider). */
@Entity
@Table(name = "supplier")
@Getter
@Setter
@NoArgsConstructor
public class Supplier extends BaseEntity {
    private String providerId;
    private String supplierNumber;
    private String csdNumber;
    private boolean taxCompliant;
    @Enumerated(EnumType.STRING)
    private SupplierStatus status;
    private String verifiedBy;
    private Instant verifiedAt;
    private Instant createdAt;
}
