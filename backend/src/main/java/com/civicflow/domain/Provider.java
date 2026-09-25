package com.civicflow.domain;

import com.civicflow.domain.enums.ProviderType;
import com.civicflow.domain.enums.VerificationStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;

/** Any organisation offering solutions (SME, startup, co-op, innovator, open-source project, ...). Not yet a Supplier. */
@Entity
@Table(name = "provider")
@Getter
@Setter
@NoArgsConstructor
public class Provider extends BaseEntity {
    private String name;
    @Enumerated(EnumType.STRING)
    private ProviderType providerType;
    @Column(length = 10000)
    private String description;
    private String registrationNumber;
    /** 1..8; null = non-compliant / not declared. */
    private Integer bbbeeLevel;
    private LocalDate bbbeeExpiry;
    @Embedded
    private GeoLocation location;
    private String contactEmail;
    private String website;
    private int employees;
    @Enumerated(EnumType.STRING)
    private VerificationStatus verificationStatus;
    private Instant createdAt;
}
