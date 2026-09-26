package com.civicflow.repository;

import com.civicflow.domain.PurchaseRequest;
import com.civicflow.domain.enums.*;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PurchaseRequestRepository extends JpaRepository<PurchaseRequest, String> {
    Optional<PurchaseRequest> findByNeedId(String needId);
    List<PurchaseRequest> findAllByOrderBySubmittedAtDesc();
}
