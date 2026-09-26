package com.civicflow.domain;

import com.civicflow.domain.enums.UpdateType;
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
@Table(name = "implementation_update")
@Getter
@Setter
@NoArgsConstructor
public class ImplementationUpdate extends BaseEntity {
    private String implementationId;
    private String authorId;
    @Enumerated(EnumType.STRING)
    private UpdateType updateType;
    @Column(length = 4000)
    private String description;
    private Integer progressPct;
    private String evidenceUrl;
    private Instant createdAt;
}
