package com.civicflow.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "notification")
@Getter
@Setter
@NoArgsConstructor
public class Notification extends BaseEntity {
    private String recipientId;
    private String type;
    private String title;
    @Column(length = 4000)
    private String message;
    private String entityType;
    private String entityId;
    private String link;
    @Column(name = "is_read")
    private boolean read;
    private Instant createdAt;
}
