package com.civicflow.repository;

import com.civicflow.domain.ImpactMeasurement;
import com.civicflow.domain.enums.*;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ImpactMeasurementRepository extends JpaRepository<ImpactMeasurement, String> {
    List<ImpactMeasurement> findByMetricIdOrderByMeasuredAtAsc(String metricId);
}
