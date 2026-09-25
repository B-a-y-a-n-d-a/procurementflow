package com.civicflow.domain;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/** Polymorphic document link (MVP stores URLs only). */
@Entity
@Table(name = "attachment")
@Getter
@Setter
@NoArgsConstructor
public class Attachment extends BaseEntity {
    private String entityType;
    private String entityId;
    private String fileName;
    private String url;
    private String uploadedBy;
    private Instant uploadedAt;
}
