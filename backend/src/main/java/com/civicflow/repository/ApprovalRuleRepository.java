package com.civicflow.repository;

import com.civicflow.domain.ApprovalRule;
import com.civicflow.domain.enums.*;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ApprovalRuleRepository extends JpaRepository<ApprovalRule, String> {
    List<ApprovalRule> findByRuleSetIdOrderBySortOrder(String ruleSetId);
}
