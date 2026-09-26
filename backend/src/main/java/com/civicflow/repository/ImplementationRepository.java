package com.civicflow.repository;

import com.civicflow.domain.Implementation;
import com.civicflow.domain.enums.*;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ImplementationRepository extends JpaRepository<Implementation, String> {
    Optional<Implementation> findByPurchaseOrderId(String purchaseOrderId);
}
