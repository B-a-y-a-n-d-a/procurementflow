package com.civicflow.repository;

import com.civicflow.domain.Provider;
import com.civicflow.domain.enums.*;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProviderRepository extends JpaRepository<Provider, String> {
    List<Provider> findAllByOrderByName();
}
