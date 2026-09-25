package com.civicflow.service;

import com.civicflow.domain.AppUser;
import com.civicflow.domain.EvaluationCriterion;
import com.civicflow.domain.InnovationOpportunity;
import com.civicflow.domain.OpportunitySubmission;
import com.civicflow.domain.Provider;
import com.civicflow.domain.PublicNeed;
import com.civicflow.domain.PurchaseRequest;
import com.civicflow.domain.enums.OpportunityStatus;
import com.civicflow.domain.enums.RequestStatus;
import com.civicflow.domain.enums.SourcingMethod;
import com.civicflow.domain.enums.SubmissionStatus;
import com.civicflow.domain.enums.UserRole;
import com.civicflow.repository.AppUserRepository;
import com.civicflow.repository.EvaluationCriterionRepository;
import com.civicflow.repository.InnovationOpportunityRepository;
import com.civicflow.repository.OpportunitySubmissionRepository;
import com.civicflow.repository.ProviderRepository;
import com.civicflow.repository.PurchaseRequestRepository;
import com.civicflow.rules.ScoringEngine;
import com.civicflow.security.CurrentUser;
import com.civicflow.web.ApiException;
import com.civicflow.web.dto.Dto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/** US-05: opportunities created from approved needs (BR-08), weighted criteria (BR-06), publish/close/cancel. */
@Service
public class OpportunityService {

    private final InnovationOpportunityRepository opportunities;
    private final EvaluationCriterionRepository criteria;
    private final OpportunitySubmissionRepository submissions;
    private final PurchaseRequestRepository requests;
    private final ProviderRepository providers;
    private final AppUserRepository users;
    private final AuditService audit;
    private final NotificationService notifications;
    private final CurrentUser currentUser;
    private final Lookup lookup;
    private final DtoMapper mapper;

    public OpportunityService(InnovationOpportunityRepository opportunities, EvaluationCriterionRepository criteria,
                              OpportunitySubmissionRepository submissions, PurchaseRequestRepository requests,
                              ProviderRepository providers, AppUserRepository users, AuditService audit,
                              NotificationService notifications, CurrentUser currentUser, Lookup lookup,
                              DtoMapper mapper) {
        this.opportunities = opportunities;
        this.criteria = criteria;
        this.submissions = submissions;
        this.requests = requests;
        this.providers = providers;
        this.users = users;
        this.audit = audit;
        this.notifications = notifications;
        this.currentUser = currentUser;
        this.lookup = lookup;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public List<Dto.OpportunitySummary> list() {
        AppUser user = currentUser.get();
        return opportunities.findAllByOrderByCreatedAtDesc().stream()
                .filter(o -> user.getRole() != UserRole.PROVIDER || o.getStatus() != OpportunityStatus.DRAFT)
                .map(mapper::opportunitySummary).toList();
    }

    @Transactional(readOnly = true)
    public Dto.OpportunityDetail get(String id) {
        AppUser user = currentUser.get();
        InnovationOpportunity o = lookup.opportunity(id);
        if (user.getRole() == UserRole.PROVIDER && o.getStatus() == OpportunityStatus.DRAFT) {
            throw ApiException.notFound("Opportunity", id);
        }
        return mapper.opportunityDetail(o, user);
    }

    @Transactional
    public Dto.OpportunityDetail create(String needId, Dto.CreateOpportunityRequest in) {
        AppUser user = currentUser.require(UserRole.PROCUREMENT_OFFICER);
        PublicNeed need = lookup.need(needId);
        PurchaseRequest pr = requests.findByNeedId(needId)
                .orElseThrow(() -> ApiException.rule("NOT_ELIGIBLE", "This need has no approved purchase request"));
        if (pr.getStatus() != RequestStatus.APPROVED || pr.getSourcingMethod() != SourcingMethod.OPEN_OPPORTUNITY) {
            throw ApiException.rule("NOT_ELIGIBLE",
                    "Only APPROVED needs with sourcing method OPEN_OPPORTUNITY can become opportunities");
        }
        if (opportunities.findByNeedId(needId).isPresent()) {
            throw ApiException.invalidState("This need already has an opportunity");
        }
        if (!ScoringEngine.weightsValid(in.criteria().stream().map(c -> c.weightPct().doubleValue()).toList())) {
            throw ApiException.rule("WEIGHTS_INVALID", "Evaluation criteria weights must total exactly 100%");
        }
        if (!in.submissionDeadline().isAfter(Clock.now())) {
            throw ApiException.rule("DEADLINE_PASSED", "Submission deadline must be in the future");
        }
        InnovationOpportunity o = new InnovationOpportunity();
        o.setReference(References.next("OPP", opportunities.count()));
        o.setNeedId(needId);
        o.setCreatedBy(user.getId());
        o.setTitle(in.title().trim());
        o.setDescription(in.description().trim());
        o.setSubmissionDeadline(in.submissionDeadline());
        o.setEligibleProviderTypes(new ArrayList<>(in.eligibleProviderTypes()));
        o.setOpenSourcePreferred(in.openSourcePreferred());
        o.setStatus(OpportunityStatus.DRAFT);
        o.setCreatedAt(Clock.now());
        o = opportunities.save(o);
        int order = 0;
        for (Dto.Criterion c : in.criteria()) {
            EvaluationCriterion ec = new EvaluationCriterion();
            ec.setOpportunityId(o.getId());
            ec.setCriterionKey(c.key());
            ec.setName(c.name());
            ec.setWeightPct(c.weightPct());
            ec.setScoringMethod(c.scoringMethod());
            ec.setSortOrder(order++);
            criteria.save(ec);
        }
        audit.record(user.getId(), "OPPORTUNITY_CREATED", "InnovationOpportunity", o.getId(), need.getId(),
                o.getReference() + " drafted from " + need.getReference() + ": " + o.getTitle(),
                Map.of("criteria", in.criteria().stream().map(c -> c.name() + " " + c.weightPct() + "%").toList(),
                        "deadline", o.getSubmissionDeadline().toString()));
        if (in.publish()) {
            publishInternal(o, user);
        }
        return mapper.opportunityDetail(o, user);
    }

    @Transactional
    public Dto.OpportunityDetail publish(String id) {
        AppUser user = currentUser.require(UserRole.PROCUREMENT_OFFICER);
        InnovationOpportunity o = lookup.opportunity(id);
        publishInternal(o, user);
        return mapper.opportunityDetail(o, user);
    }

    private void publishInternal(InnovationOpportunity o, AppUser user) {
        if (o.getStatus() != OpportunityStatus.DRAFT) {
            throw ApiException.invalidState("Only draft opportunities can be published");
        }
        if (!o.getSubmissionDeadline().isAfter(Clock.now())) {
            throw ApiException.rule("DEADLINE_PASSED", "Submission deadline must be in the future");
        }
        o.setStatus(OpportunityStatus.PUBLISHED);
        o.setPublishedAt(Clock.now());
        opportunities.save(o);
        audit.record(user.getId(), "OPPORTUNITY_PUBLISHED", "InnovationOpportunity", o.getId(), o.getNeedId(),
                o.getReference() + " published to the marketplace (" + o.getEligibleProviderTypes().size()
                        + " eligible provider types)", Map.of("eligibleProviderTypes", o.getEligibleProviderTypes()));
        List<String> providerIds = providers.findAll().stream()
                .filter(p -> o.getEligibleProviderTypes().contains(p.getProviderType())).map(Provider::getId).toList();
        List<String> recipients = users.findByRole(UserRole.PROVIDER).stream()
                .filter(u -> providerIds.contains(u.getProviderId())).map(AppUser::getId).toList();
        notifications.notifyUsers(recipients, "OPPORTUNITY_PUBLISHED", "New opportunity: " + o.getTitle(),
                "Submissions close " + o.getSubmissionDeadline().atZone(Clock.SAST).toLocalDate(),
                "InnovationOpportunity", o.getId(), "/opportunities/" + o.getId());
    }

    @Transactional
    public Dto.OpportunityDetail startEvaluation(String id) {
        AppUser user = currentUser.require(UserRole.PROCUREMENT_OFFICER);
        InnovationOpportunity o = lookup.opportunity(id);
        if (o.getStatus() != OpportunityStatus.PUBLISHED && o.getStatus() != OpportunityStatus.CLOSED) {
            throw ApiException.invalidState("Only published or closed opportunities can move to evaluation");
        }
        boolean early = o.getSubmissionDeadline().isAfter(Clock.now());
        o.setStatus(OpportunityStatus.EVALUATION);
        o.setClosedAt(Clock.now());
        opportunities.save(o);
        int moved = 0;
        for (OpportunitySubmission s : submissions.findByOpportunityIdOrderBySubmittedAt(id)) {
            if (s.getStatus() == SubmissionStatus.SUBMITTED) {
                s.setStatus(SubmissionStatus.UNDER_REVIEW);
                submissions.save(s);
                moved++;
            }
        }
        audit.record(user.getId(), "OPPORTUNITY_CLOSED", "InnovationOpportunity", o.getId(), o.getNeedId(),
                o.getReference() + " closed for submissions" + (early ? " (before deadline)" : "")
                        + " - evaluation started with " + moved + " submission(s) under review",
                Map.of("closedEarly", early, "underReview", moved));
        return mapper.opportunityDetail(o, user);
    }

    @Transactional
    public Dto.OpportunityDetail cancel(String id, String reason) {
        AppUser user = currentUser.require(UserRole.PROCUREMENT_OFFICER);
        InnovationOpportunity o = lookup.opportunity(id);
        if (o.getStatus() == OpportunityStatus.AWARDED || o.getStatus() == OpportunityStatus.CANCELLED) {
            throw ApiException.invalidState("Opportunity can no longer be cancelled");
        }
        o.setStatus(OpportunityStatus.CANCELLED);
        o.setCancelReason(reason);
        opportunities.save(o);
        audit.record(user.getId(), "OPPORTUNITY_CANCELLED", "InnovationOpportunity", o.getId(), o.getNeedId(),
                o.getReference() + " cancelled: " + reason, Map.of("reason", reason));
        return mapper.opportunityDetail(o, user);
    }
}
