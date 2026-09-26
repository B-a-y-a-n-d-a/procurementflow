package com.civicflow.domain;

import com.civicflow.domain.enums.UserRole;
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
@Table(name = "app_user")
@Getter
@Setter
@NoArgsConstructor
public class AppUser extends BaseEntity {
    private String fullName;
    private String email;
    private String title;
    @Enumerated(EnumType.STRING)
    private UserRole role;
    private String departmentId;
    private String providerId;
    @Column(name = "is_active")
    private boolean active = true;
    private Instant createdAt;
    /** BCrypt hash; never serialised (DTOs map users explicitly). NULL = can't sign in. */
    private String passwordHash;
}
