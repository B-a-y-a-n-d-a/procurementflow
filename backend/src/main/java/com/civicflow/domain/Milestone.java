package com.civicflow.domain;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "milestone")
@Getter
@Setter
@NoArgsConstructor
public class Milestone extends BaseEntity {
    private String implementationId;
    private String title;
    private LocalDate dueDate;
    private Instant completedAt;
    private int sortOrder;
}
