package com.civicflow.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "impact_measurement")
@Getter
@Setter
@NoArgsConstructor
public class ImpactMeasurement extends BaseEntity {
    private String metricId;
    private BigDecimal measuredValue;
    private Instant measuredAt;
    private String evidenceUrl;
    @Column(length = 4000)
    private String note;
    private String ward;
    private String recordedBy;
    private Instant createdAt;
}
