package com.civicflow.domain;

import com.civicflow.domain.enums.NeedCategory;
import com.civicflow.domain.enums.NeedStatus;
import com.civicflow.domain.enums.Priority;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/** The problem the organisation wants solved - root of the lifecycle. */
@Entity
@Table(name = "public_need")
@Getter
@Setter
@NoArgsConstructor
public class PublicNeed extends BaseEntity {
    private String reference;
    private String departmentId;
    private String createdBy;
    private String title;
    @Column(length = 10000)
    private String problemStatement;
    @Column(length = 10000)
    private String desiredOutcome;
    @Enumerated(EnumType.STRING)
    private NeedCategory category;
    @Enumerated(EnumType.STRING)
    private Priority priority;
    private BigDecimal estimatedBudget;
    @Convert(converter = JsonListConverters.StringList.class)
    @Column(length = 4000)
    private List<String> requiredCapabilities = new ArrayList<>();
    @Embedded
    private GeoLocation location;
    @Enumerated(EnumType.STRING)
    private NeedStatus status;
    private Instant createdAt;
}
