package com.civicflow.domain;

import com.civicflow.domain.enums.SubmissionStatus;
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

@Entity
@Table(name = "opportunity_submission")
@Getter
@Setter
@NoArgsConstructor
public class OpportunitySubmission extends BaseEntity {
    private String opportunityId;
    private String providerId;
    private String solutionId;
    private String submittedBy;
    private BigDecimal proposedPrice;
    @Column(length = 10000)
    private String technicalProposal;
    @Column(length = 10000)
    private String implementationPlan;
    private int durationWeeks;
    private int localJobsDeclared;
    @Enumerated(EnumType.STRING)
    private SubmissionStatus status;
    @Column(length = 4000)
    private String statusReason;
    private Instant submittedAt;
}
