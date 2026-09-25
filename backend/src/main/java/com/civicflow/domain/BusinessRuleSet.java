package com.civicflow.domain;

import com.civicflow.domain.enums.BudgetMode;
import com.civicflow.domain.enums.UserRole;
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

/** Versioned organisational rules (BR-01..BR-20). Tables stored as JSON text. */
@Entity
@Table(name = "business_rule_set")
@Getter
@Setter
@NoArgsConstructor
public class BusinessRuleSet extends BaseEntity {
    private int version;
    private Instant effectiveFrom;
    private int approvalSlaHours;
    @Enumerated(EnumType.STRING)
    private BudgetMode budgetMode;
    private BigDecimal quotationThreshold;
    private int minCompetitiveOffers;
    private int deviationMinChars;
    private int closingSoonDays;
    private int impactOnTrackPct;
    @Enumerated(EnumType.STRING)
    private UserRole escalationRole;
    @Column(length = 4000)
    private String bbbeeScoreTable;
    @Column(length = 4000)
    private String localScoreTable;
    @Column(length = 4000)
    private String defaultCriteria;
    private String updatedBy;
    private Instant createdAt;
}
