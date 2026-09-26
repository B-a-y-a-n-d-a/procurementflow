package com.civicflow.domain;

import com.civicflow.domain.enums.CriterionKey;
import com.civicflow.domain.enums.ScoringMethod;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(name = "evaluation_criterion")
@Getter
@Setter
@NoArgsConstructor
public class EvaluationCriterion extends BaseEntity {
    private String opportunityId;
    @Enumerated(EnumType.STRING)
    private CriterionKey criterionKey;
    private String name;
    private BigDecimal weightPct;
    @Enumerated(EnumType.STRING)
    private ScoringMethod scoringMethod;
    private int sortOrder;
}
