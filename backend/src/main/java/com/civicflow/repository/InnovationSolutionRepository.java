package com.civicflow.repository;

import com.civicflow.domain.InnovationSolution;
import com.civicflow.domain.enums.*;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface InnovationSolutionRepository extends JpaRepository<InnovationSolution, String> {
    List<InnovationSolution> findByProviderId(String providerId);
    List<InnovationSolution> findAllByOrderByName();
}
