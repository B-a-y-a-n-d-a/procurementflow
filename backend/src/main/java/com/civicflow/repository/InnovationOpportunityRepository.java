package com.civicflow.repository;

import com.civicflow.domain.InnovationOpportunity;
import com.civicflow.domain.enums.*;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface InnovationOpportunityRepository extends JpaRepository<InnovationOpportunity, String> {
    Optional<InnovationOpportunity> findByNeedId(String needId);
    List<InnovationOpportunity> findAllByOrderByCreatedAtDesc();
}
