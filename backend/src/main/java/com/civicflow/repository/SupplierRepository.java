package com.civicflow.repository;

import com.civicflow.domain.Supplier;
import com.civicflow.domain.enums.*;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SupplierRepository extends JpaRepository<Supplier, String> {
    Optional<Supplier> findByProviderId(String providerId);
    List<Supplier> findByStatus(SupplierStatus status);
}
