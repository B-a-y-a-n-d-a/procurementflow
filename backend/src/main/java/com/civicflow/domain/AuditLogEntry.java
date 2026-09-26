package com.civicflow.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/**
 * Append-only, SHA-256 hash-chained audit record. There is deliberately no update/delete path in the
 * application (constitution Art. V); only AuditService creates these.
 */
@Entity
@Table(name = "audit_log_entry")
@Getter
@Setter
@NoArgsConstructor
public class AuditLogEntry extends BaseEntity {
    private long sequence;
    private Instant occurredAt;
    private String actorId;
    private String action;
    private String entityType;
    private String entityId;
    /** Correlation id: root need of the lifecycle event (powers the Journey view). */
    private String needId;
    @Column(length = 4000)
    private String summary;
    @Column(length = 20000)
    private String metadata;
    private String prevHash;
    private String hash;
}
