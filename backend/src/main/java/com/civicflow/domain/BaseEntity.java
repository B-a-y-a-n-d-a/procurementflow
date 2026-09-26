package com.civicflow.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Id;
import jakarta.persistence.MappedSuperclass;
import jakarta.persistence.PrePersist;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

/** String UUID primary key assigned on first persist (or explicitly, e.g. by the demo seeder). */
@MappedSuperclass
@Getter
@Setter
public abstract class BaseEntity {

    @Id
    @Column(length = 36)
    private String id;

    @PrePersist
    void assignId() {
        if (id == null) {
            id = UUID.randomUUID().toString();
        }
    }

    public String ensureId() {
        assignId();
        return id;
    }
}
