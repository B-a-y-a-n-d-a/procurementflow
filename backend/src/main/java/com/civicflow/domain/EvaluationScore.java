package com.civicflow.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

/** Manual score (0-100) for one MANUAL criterion, with mandatory rationale. */
@Entity
@Table(name = "evaluation_score")
@Getter
@Setter
@NoArgsConstructor
public class EvaluationScore extends BaseEntity {
    private String evaluationId;
    private String criterionId;
    private BigDecimal score;
    @Column(length = 4000)
    private String rationale;
}
