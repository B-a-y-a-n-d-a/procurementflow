package com.civicflow.domain;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "department")
@Getter
@Setter
@NoArgsConstructor
public class Department extends BaseEntity {
    private String code;
    private String name;
    private String municipality;
    private String province;
    private BigDecimal budgetAllocated;
    private String financialYear;
    private Instant createdAt;
}
