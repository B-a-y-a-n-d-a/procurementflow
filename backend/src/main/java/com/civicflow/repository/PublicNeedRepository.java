package com.civicflow.repository;

import com.civicflow.domain.PublicNeed;
import com.civicflow.domain.enums.*;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PublicNeedRepository extends JpaRepository<PublicNeed, String> {
    List<PublicNeed> findAllByOrderByCreatedAtDesc();
    List<PublicNeed> findByDepartmentId(String departmentId);
}
