package com.civicflow.service;

import com.civicflow.domain.AppUser;
import com.civicflow.domain.Attachment;
import com.civicflow.domain.InnovationOpportunity;
import com.civicflow.domain.InnovationSolution;
import com.civicflow.domain.OpportunitySubmission;
import com.civicflow.domain.Provider;
import com.civicflow.domain.enums.OpportunityStatus;
import com.civicflow.domain.enums.SubmissionStatus;
import com.civicflow.domain.enums.UserRole;
import com.civicflow.repository.AppUserRepository;
import com.civicflow.repository.AttachmentRepository;
import com.civicflow.repository.InnovationSolutionRepository;
import com.civicflow.repository.OpportunitySubmissionRepository;
import com.civicflow.rules.Money;
import com.civicflow.security.CurrentUser;
import com.civicflow.web.ApiException;
import com.civicflow.web.dto.Dto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumSet;
import java.util.List;
import java.util.Map;

/** US-06: provider submissions (BR-07), withdraw, shortlist, reject. */
@Service
public class SubmissionService {

    /** Reason set on eligible submissions that simply were not selected (they stay eligible for the ranking). */
    public static final String NOT_SELECTED = "Not selected";

    private final OpportunitySubmissionRepository submissions;
    private final InnovationSolutionRepository solutions;
    private final AttachmentRepository attachments;
    private final AppUserRepository users;
    private final AuditService audit;
    private final NotificationService notifications;
    private final CurrentUser currentUser;
    private final Lookup lookup;
    private final DtoMapper mapper;

    public SubmissionService(OpportunitySubmissionRepository submissions, InnovationSolutionRepository solutions,
                             AttachmentRepository attachments, AppUserRepository users, AuditService audit,
                             NotificationService notifications, CurrentUser currentUser, Lookup lookup,
                             DtoMapper mapper) {
        this.submissions = submissions;
        this.solutions = solutions;
        this.attachments = attachments;
        this.users = users;
        this.audit = audit;
        this.notifications = notifications;
        this.currentUser = currentUser;
        this.lookup = lookup;
        this.mapper = mapper;
    }

    public static boolean isEligible(OpportunitySubmission s) {
        if (s.getStatus() == SubmissionStatus.WITHDRAWN) {
            return false;
        }
        return s.getStatus() != SubmissionStatus.REJECTED || NOT_SELECTED.equals(s.getStatusReason());
    }

    void notifyProvider(String providerId, String type, String title, String message, OpportunitySubmission s) {
        notifications.notifyUsers(users.findByProviderId(providerId).stream().map(AppUser::getId).toList(), type,
                title, message, "InnovationOpportunity", s.getOpportunityId(), "/opportunities/" + s.getOpportunityId());
    }

    @Transactional
    public Dto.Submission submit(String opportunityId, Dto.CreateSubmissionRequest in) {
        AppUser user = currentUser.require(UserRole.PROVIDER);
        InnovationOpportunity o = lookup.opportunity(opportunityId);
        Provider provider = lookup.provider(user.getProviderId());
        if (o.getStatus() != OpportunityStatus.PUBLISHED) {
            throw ApiException.invalidState("This opportunity is not open for submissions");
        }
        if (!o.getSubmissionDeadline().isAfter(Clock.now())) {
            throw ApiException.rule("DEADLINE_PASSED", "The submission deadline has passed");
        }
        if (!o.getEligibleProviderTypes().contains(provider.getProviderType())) {
            throw ApiException.rule("NOT_ELIGIBLE", "Provider type " + provider.getProviderType()
                    + " is not eligible for this opportunity");
        }
        if (in.solutionId() != null && !in.solutionId().isBlank()) {
            InnovationSolution sol = solutions.findById(in.solutionId())
                    .orElseThrow(() -> ApiException.notFound("Solution", in.solutionId()));
            if (!sol.getProviderId().equals(provider.getId())) {
                throw ApiException.rule("NOT_ELIGIBLE", "You can only propose your own registered solutions");
            }
        }
        OpportunitySubmission s = submissions.findByOpportunityIdAndProviderId(opportunityId, provider.getId())
                .orElse(null);
        if (s != null && s.getStatus() != SubmissionStatus.WITHDRAWN) {
            throw ApiException.rule("DUPLICATE_SUBMISSION", "You have already submitted to this opportunity");
        }
        if (s == null) {
            s = new OpportunitySubmission();
            s.setOpportunityId(opportunityId);
            s.setProviderId(provider.getId());
        }
        s.setSolutionId(in.solutionId() == null || in.solutionId().isBlank() ? null : in.solutionId());
        s.setSubmittedBy(user.getId());
        s.setProposedPrice(in.proposedPrice());
        s.setTechnicalProposal(in.technicalProposal().trim());
        s.setImplementationPlan(in.implementationPlan().trim());
        s.setDurationWeeks(in.durationWeeks());
        s.setLocalJobsDeclared(in.localJobsDeclared());
        s.setStatus(SubmissionStatus.SUBMITTED);
        s.setStatusReason(null);
        s.setSubmittedAt(Clock.now());
        s = submissions.save(s);
        if (in.documents() != null) {
            for (Dto.Attachment doc : in.documents()) {
                Attachment a = new Attachment();
                a.setEntityType("OpportunitySubmission");
                a.setEntityId(s.getId());
                a.setFileName(doc.fileName());
                a.setUrl(doc.url());
                a.setUploadedBy(user.getId());
                a.setUploadedAt(Clock.now());
                attachments.save(a);
            }
        }
        audit.record(user.getId(), "SUBMISSION_CREATED", "OpportunitySubmission", s.getId(), o.getNeedId(),
                provider.getName() + " submitted to " + o.getReference() + " at " + Money.format(in.proposedPrice()),
                Map.of("provider", provider.getName(), "price", in.proposedPrice(),
                        "solutionId", s.getSolutionId() == null ? "" : s.getSolutionId()));
        notifications.notifyRole(UserRole.PROCUREMENT_OFFICER, null, "SUBMISSION_RECEIVED",
                "Submission received: " + o.getReference(), provider.getName() + " - " + Money.format(in.proposedPrice()),
                "InnovationOpportunity", o.getId(), "/opportunities/" + o.getId());
        return mapper.submission(s);
    }

    @Transactional(readOnly = true)
    public List<Dto.Submission> mine() {
        AppUser user = currentUser.require(UserRole.PROVIDER);
        return submissions.findByProviderIdOrderBySubmittedAtDesc(user.getProviderId()).stream()
                .map(mapper::submission).toList();
    }

    @Transactional
    public Dto.Submission withdraw(String id, String reason) {
        AppUser user = currentUser.require(UserRole.PROVIDER);
        OpportunitySubmission s = lookup.submission(id);
        if (!s.getProviderId().equals(user.getProviderId())) {
            throw ApiException.forbidden("You can only withdraw your own submission");
        }
        InnovationOpportunity o = lookup.opportunity(s.getOpportunityId());
        if (o.getStatus() != OpportunityStatus.PUBLISHED || !o.getSubmissionDeadline().isAfter(Clock.now())) {
            throw ApiException.rule("DEADLINE_PASSED", "Submissions can only be withdrawn before the deadline");
        }
        if (!EnumSet.of(SubmissionStatus.SUBMITTED, SubmissionStatus.UNDER_REVIEW, SubmissionStatus.SHORTLISTED)
                .contains(s.getStatus())) {
            throw ApiException.invalidState("Submission cannot be withdrawn in status " + s.getStatus());
        }
        s.setStatus(SubmissionStatus.WITHDRAWN);
        s.setStatusReason(reason);
        submissions.save(s);
        audit.record(user.getId(), "SUBMISSION_WITHDRAWN", "OpportunitySubmission", s.getId(), o.getNeedId(),
                lookup.provider(s.getProviderId()).getName() + " withdrew from " + o.getReference() + ": " + reason,
                Map.of("reason", reason));
        return mapper.submission(s);
    }

    @Transactional
    public Dto.Submission shortlist(String id) {
        AppUser user = currentUser.require(UserRole.PROCUREMENT_OFFICER, UserRole.EVALUATOR);
        OpportunitySubmission s = lookup.submission(id);
        if (!EnumSet.of(SubmissionStatus.SUBMITTED, SubmissionStatus.UNDER_REVIEW).contains(s.getStatus())) {
            throw ApiException.invalidState("Only submitted or under-review submissions can be shortlisted");
        }
        s.setStatus(SubmissionStatus.SHORTLISTED);
        submissions.save(s);
        InnovationOpportunity o = lookup.opportunity(s.getOpportunityId());
        String providerName = lookup.provider(s.getProviderId()).getName();
        audit.record(user.getId(), "SUBMISSION_SHORTLISTED", "OpportunitySubmission", s.getId(), o.getNeedId(),
                providerName + " shortlisted for " + o.getReference(), null);
        notifyProvider(s.getProviderId(), "SUBMISSION_SHORTLISTED", "Shortlisted: " + o.getTitle(),
                "Your submission has been shortlisted.", s);
        return mapper.submission(s);
    }

    @Transactional
    public Dto.Submission reject(String id, String reason) {
        AppUser user = currentUser.require(UserRole.PROCUREMENT_OFFICER, UserRole.EVALUATOR);
        OpportunitySubmission s = lookup.submission(id);
        if (EnumSet.of(SubmissionStatus.WITHDRAWN, SubmissionStatus.SELECTED, SubmissionStatus.REJECTED)
                .contains(s.getStatus())) {
            throw ApiException.invalidState("Submission cannot be rejected in status " + s.getStatus());
        }
        s.setStatus(SubmissionStatus.REJECTED);
        s.setStatusReason(reason);
        submissions.save(s);
        InnovationOpportunity o = lookup.opportunity(s.getOpportunityId());
        String providerName = lookup.provider(s.getProviderId()).getName();
        audit.record(user.getId(), "SUBMISSION_REJECTED", "OpportunitySubmission", s.getId(), o.getNeedId(),
                providerName + " rejected for " + o.getReference() + ": " + reason, Map.of("reason", reason));
        notifyProvider(s.getProviderId(), "SUBMISSION_REJECTED", "Submission not accepted: " + o.getTitle(), reason, s);
        return mapper.submission(s);
    }
}
