package com.civicflow.repository;

import com.civicflow.domain.BusinessRuleSet;
import com.civicflow.domain.enums.*;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BusinessRuleSetRepository extends JpaRepository<BusinessRuleSet, String> {
    Optional<BusinessRuleSet> findTopByOrderByVersionDesc();
}
