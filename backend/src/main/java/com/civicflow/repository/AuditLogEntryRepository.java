package com.civicflow.repository;

import com.civicflow.domain.AuditLogEntry;
import com.civicflow.domain.enums.*;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AuditLogEntryRepository extends JpaRepository<AuditLogEntry, String> {
    Optional<AuditLogEntry> findTopByOrderBySequenceDesc();
    List<AuditLogEntry> findByNeedIdOrderBySequenceAsc(String needId);
    List<AuditLogEntry> findAllByOrderBySequenceAsc();
    List<AuditLogEntry> findAllByOrderBySequenceDesc(Pageable pageable);
    long count();
}
