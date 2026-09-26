package com.civicflow.repository;

import com.civicflow.domain.AppUser;
import com.civicflow.domain.enums.*;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AppUserRepository extends JpaRepository<AppUser, String> {
    List<AppUser> findByRole(UserRole role);
    List<AppUser> findByRoleAndDepartmentId(UserRole role, String departmentId);
    List<AppUser> findByProviderId(String providerId);
}
