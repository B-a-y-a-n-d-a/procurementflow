package com.civicflow.repository;

import com.civicflow.domain.PurchaseOrder;
import com.civicflow.domain.enums.*;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, String> {
    Optional<PurchaseOrder> findByPurchaseRequestId(String purchaseRequestId);
    Optional<PurchaseOrder> findBySubmissionId(String submissionId);
    List<PurchaseOrder> findAllByOrderBySelectedAtDesc();
}
