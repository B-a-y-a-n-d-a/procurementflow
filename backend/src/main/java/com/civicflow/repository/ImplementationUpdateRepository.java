package com.civicflow.repository;

import com.civicflow.domain.ImplementationUpdate;
import com.civicflow.domain.enums.*;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ImplementationUpdateRepository extends JpaRepository<ImplementationUpdate, String> {
    List<ImplementationUpdate> findByImplementationIdOrderByCreatedAtDesc(String implementationId);
    boolean existsByImplementationIdAndUpdateType(String implementationId, UpdateType updateType);
}
