package com.civicflow.repository;

import com.civicflow.domain.Attachment;
import com.civicflow.domain.enums.*;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AttachmentRepository extends JpaRepository<Attachment, String> {
    List<Attachment> findByEntityTypeAndEntityId(String entityType, String entityId);
}
