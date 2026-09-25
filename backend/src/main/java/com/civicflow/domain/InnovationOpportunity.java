package com.civicflow.domain;

import com.civicflow.domain.enums.OpportunityStatus;
import com.civicflow.domain.enums.ProviderType;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/** Public-facing call for solutions. Problem, budget, capabilities and location are read through the need. */
@Entity
@Table(name = "innovation_opportunity")
@Getter
@Setter
@NoArgsConstructor
public class InnovationOpportunity extends BaseEntity {
    private String reference;
    private String needId;
    private String createdBy;
    private String title;
    @Column(length = 10000)
    private String description;
    private Instant submissionDeadline;
    @Convert(converter = JsonListConverters.ProviderTypeList.class)
    @Column(length = 1000)
    private List<ProviderType> eligibleProviderTypes = new ArrayList<>();
    private boolean openSourcePreferred;
    @Enumerated(EnumType.STRING)
    private OpportunityStatus status;
    private Instant publishedAt;
    private Instant closedAt;
    @Column(length = 4000)
    private String cancelReason;
    private Instant createdAt;
}
