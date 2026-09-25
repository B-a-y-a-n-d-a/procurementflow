package com.civicflow.repository;

import com.civicflow.domain.SupplierQuote;
import com.civicflow.domain.enums.*;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SupplierQuoteRepository extends JpaRepository<SupplierQuote, String> {
    List<SupplierQuote> findByPurchaseRequestIdOrderByAmount(String purchaseRequestId);
    long countByPurchaseRequestId(String purchaseRequestId);
}
