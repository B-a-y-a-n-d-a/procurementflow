package com.civicflow.repository;

import com.civicflow.domain.OpportunitySubmission;
import com.civicflow.domain.enums.*;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface OpportunitySubmissionRepository extends JpaRepository<OpportunitySubmission, String> {
    List<OpportunitySubmission> findByOpportunityIdOrderBySubmittedAt(String opportunityId);
    List<OpportunitySubmission> findByProviderIdOrderBySubmittedAtDesc(String providerId);
    Optional<OpportunitySubmission> findByOpportunityIdAndProviderId(String opportunityId, String providerId);
    long countByOpportunityIdAndStatusNot(String opportunityId, SubmissionStatus status);
    List<OpportunitySubmission> findBySolutionId(String solutionId);
}
