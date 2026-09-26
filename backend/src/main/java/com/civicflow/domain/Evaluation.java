package com.civicflow.domain;

import com.civicflow.domain.enums.EvaluationStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "evaluation")
@Getter
@Setter
@NoArgsConstructor
public class Evaluation extends BaseEntity {
    private String submissionId;
    private String evaluatorId;
    @Enumerated(EnumType.STRING)
    private EvaluationStatus status;
    @Column(length = 4000)
    private String overallComment;
    private Instant completedAt;
    private Instant createdAt;
}
