package com.civicflow.domain;

import com.civicflow.domain.enums.Direction;
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

/** Outcome indicator. Current value = latest ImpactMeasurement (derived, never stored). */
@Entity
@Table(name = "impact_metric")
@Getter
@Setter
@NoArgsConstructor
public class ImpactMetric extends BaseEntity {
    private String implementationId;
    private String name;
    @Column(length = 4000)
    private String description;
    private String unit;
    @Enumerated(EnumType.STRING)
    private Direction direction;
    private BigDecimal baselineValue;
    private BigDecimal targetValue;
    private String createdBy;
    private Instant createdAt;
}
