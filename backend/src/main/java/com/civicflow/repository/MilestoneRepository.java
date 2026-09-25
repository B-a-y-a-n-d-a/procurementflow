package com.civicflow.repository;

import com.civicflow.domain.Milestone;
import com.civicflow.domain.enums.*;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MilestoneRepository extends JpaRepository<Milestone, String> {
    List<Milestone> findByImplementationIdOrderBySortOrder(String implementationId);
}
