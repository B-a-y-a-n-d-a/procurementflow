package com.civicflow.repository;

import com.civicflow.domain.EvaluationScore;
import com.civicflow.domain.enums.*;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EvaluationScoreRepository extends JpaRepository<EvaluationScore, String> {
    List<EvaluationScore> findByEvaluationId(String evaluationId);
}
