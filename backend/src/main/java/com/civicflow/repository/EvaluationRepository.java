package com.civicflow.repository;

import com.civicflow.domain.Evaluation;
import com.civicflow.domain.enums.*;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EvaluationRepository extends JpaRepository<Evaluation, String> {
    List<Evaluation> findBySubmissionId(String submissionId);
    Optional<Evaluation> findBySubmissionIdAndEvaluatorId(String submissionId, String evaluatorId);
}
