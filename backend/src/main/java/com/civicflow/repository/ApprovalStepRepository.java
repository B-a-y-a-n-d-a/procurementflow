package com.civicflow.repository;

import com.civicflow.domain.ApprovalStep;
import com.civicflow.domain.enums.*;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ApprovalStepRepository extends JpaRepository<ApprovalStep, String> {
    List<ApprovalStep> findByPurchaseRequestIdOrderBySequence(String purchaseRequestId);
    List<ApprovalStep> findByStatus(StepStatus status);
}
