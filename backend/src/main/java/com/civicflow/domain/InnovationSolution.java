package com.civicflow.domain;

import com.civicflow.domain.enums.NeedCategory;
import com.civicflow.domain.enums.SolutionMaturity;
import com.civicflow.domain.enums.SolutionStatus;
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

@Entity
@Table(name = "innovation_solution")
@Getter
@Setter
@NoArgsConstructor
public class InnovationSolution extends BaseEntity {
    private String providerId;
    private String name;
    @Column(length = 10000)
    private String description;
    @Enumerated(EnumType.STRING)
    private NeedCategory category;
    @Convert(converter = JsonListConverters.StringList.class)
    @Column(length = 2000)
    private List<String> technologies = new ArrayList<>();
    @Column(name = "is_open_source")
    private boolean openSource;
    private String repositoryUrl;
    private String license;
    private String demoUrl;
    @Convert(converter = JsonListConverters.StringList.class)
    @Column(length = 2000)
    private List<String> coverageProvinces = new ArrayList<>();
    @Enumerated(EnumType.STRING)
    private SolutionMaturity maturity;
    private int externalDeployments;
    @Enumerated(EnumType.STRING)
    private SolutionStatus status;
    private Instant createdAt;
}
