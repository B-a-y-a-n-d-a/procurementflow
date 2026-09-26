package com.civicflow.repository;

import com.civicflow.domain.ImpactMetric;
import com.civicflow.domain.enums.*;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ImpactMetricRepository extends JpaRepository<ImpactMetric, String> {
    List<ImpactMetric> findByImplementationIdOrderByCreatedAt(String implementationId);
}
