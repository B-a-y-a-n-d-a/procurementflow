package com.civicflow.service;

import com.civicflow.domain.AppUser;
import com.civicflow.domain.Evaluation;
import com.civicflow.domain.EvaluationCriterion;
import com.civicflow.domain.EvaluationScore;
import com.civicflow.domain.InnovationOpportunity;
import com.civicflow.domain.OpportunitySubmission;
import com.civicflow.domain.Provider;
import com.civicflow.domain.PublicNeed;
import com.civicflow.domain.PurchaseRequest;
import com.civicflow.domain.enums.EvaluationStatus;
import com.civicflow.domain.enums.OpportunityStatus;
import com.civicflow.domain.enums.ScoringMethod;
import com.civicflow.domain.enums.UserRole;
import com.civicflow.repository.EvaluationCriterionRepository;
import com.civicflow.repository.EvaluationRepository;
import com.civicflow.repository.EvaluationScoreRepository;
import com.civicflow.repository.OpportunitySubmissionRepository;
import com.civicflow.repository.PurchaseOrderRepository;
import com.civicflow.repository.PurchaseRequestRepository;
import com.civicflow.rules.RuleSnapshot;
import com.civicflow.rules.ScoringEngine;
import com.civicflow.rules.SelectionRules;
import com.civicflow.security.CurrentUser;
import com.civicflow.web.ApiException;
import com.civicflow.web.dto.Dto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

/** US-07: transparent weighted evaluation. The board recommends; only a human selects (see ProcurementService). */
@Service
public class EvaluationService {

    private final EvaluationCriterionRepository criteria;
    private final EvaluationRepository evaluations;
    private final EvaluationScoreRepository scores;
    private final OpportunitySubmissionRepository submissions;
    private final PurchaseRequestRepository requests;
    private final PurchaseOrderRepository orders;
    private final RuleService rules;
    private final AuditService audit;
    private final CurrentUser currentUser;
    private final Lookup lookup;
    private final DtoMapper mapper;

    public EvaluationService(EvaluationCriterionRepository criteria, EvaluationRepository evaluations,
                             EvaluationScoreRepository scores, OpportunitySubmissionRepository submissions,
                             PurchaseRequestRepository requests, PurchaseOrderRepository orders, RuleService rules,
                             AuditService audit, CurrentUser currentUser, Lookup lookup, DtoMapper mapper) {
        this.criteria = criteria;
        this.evaluations = evaluations;
        this.scores = scores;
        this.submissions = submissions;
        this.requests = requests;
        this.orders = orders;
        this.rules = rules;
        this.audit = audit;
        this.currentUser = currentUser;
        this.lookup = lookup;
        this.mapper = mapper;
    }

    /** Internal computation reused by selection (ProcurementService). */
    public record Board(Dto.EvaluationBoard dto, List<ScoringEngine.Result> results, Map<String, OpportunitySubmission> subs) {
    }

    @Transactional(readOnly = true)
    public Dto.EvaluationBoard board(String opportunityId) {
        currentUser.require(UserRole.PROCUREMENT_OFFICER, UserRole.EVALUATOR, UserRole.EXECUTIVE, UserRole.AUDITOR,
                UserRole.ADMIN);
        return compute(lookup.opportunity(opportunityId)).dto();
    }

    @Transactional(readOnly = true)
    public Board compute(InnovationOpportunity o) {
        RuleSnapshot r = rules.current();
        PublicNeed need = lookup.need(o.getNeedId());
        PurchaseRequest pr = requests.findByNeedId(need.getId()).orElseThrow();
        List<EvaluationCriterion> crit = criteria.findByOpportunityIdOrderBySortOrder(o.getId());
        List<OpportunitySubmission> subs = submissions.findByOpportunityIdOrderBySubmittedAt(o.getId());

        List<ScoringEngine.Offer> offers = new ArrayList<>();
        Map<String, EvaluationStatus> statusBySub = new HashMap<>();
        Map<String, String> evaluatorsBySub = new HashMap<>();
        Map<String, String> commentBySub = new HashMap<>();
        for (OpportunitySubmission s : subs) {
            Provider p = lookup.provider(s.getProviderId());
            List<Evaluation> evs = evaluations.findBySubmissionId(s.getId());
            Map<String, List<EvaluationScore>> byCriterion = evs.stream()
                    .flatMap(e -> scores.findByEvaluationId(e.getId()).stream())
                    .collect(Collectors.groupingBy(EvaluationScore::getCriterionId));
            Map<String, ScoringEngine.ManualScore> manual = new HashMap<>();
            byCriterion.forEach((cid, list) -> manual.put(cid, new ScoringEngine.ManualScore(
                    list.stream().mapToDouble(x -> x.getScore().doubleValue()).average().orElse(0),
                    list.stream().map(EvaluationScore::getRationale).collect(Collectors.joining(" | ")))));
            offers.add(new ScoringEngine.Offer(s.getId(), s.getProposedPrice().doubleValue(), p.getBbbeeLevel(),
                    p.getLocation().getMunicipality(), p.getLocation().getProvince(), SubmissionService.isEligible(s),
                    manual));
            statusBySub.put(s.getId(), evs.stream().anyMatch(e -> e.getStatus() == EvaluationStatus.COMPLETED)
                    ? EvaluationStatus.COMPLETED : evs.isEmpty() ? EvaluationStatus.NOT_STARTED : EvaluationStatus.DRAFT);
            evaluatorsBySub.put(s.getId(), evs.isEmpty() ? null
                    : evs.stream().map(e -> lookup.userName(e.getEvaluatorId())).distinct().collect(Collectors.joining(", ")));
            commentBySub.put(s.getId(), evs.stream().map(Evaluation::getOverallComment).filter(Objects::nonNull)
                    .collect(Collectors.joining(" | ")));
        }

        List<ScoringEngine.Criterion> engineCriteria = crit.stream().map(c -> new ScoringEngine.Criterion(c.getId(),
                c.getCriterionKey(), c.getName(), c.getWeightPct().doubleValue(), c.getScoringMethod())).toList();
        List<ScoringEngine.Result> results = ScoringEngine.evaluate(engineCriteria, offers,
                need.getLocation().getMunicipality(), need.getLocation().getProvince(), r.bbbeeScores(), r.localScores());

        Map<String, OpportunitySubmission> byId = new LinkedHashMap<>();
        subs.forEach(s -> byId.put(s.getId(), s));
        boolean allEvaluated = subs.stream().filter(SubmissionService::isEligible)
                .allMatch(s -> statusBySub.get(s.getId()) == EvaluationStatus.COMPLETED);
        long eligibleCount = subs.stream().filter(SubmissionService::isEligible).count();
        String recommended = allEvaluated ? ScoringEngine.recommendedId(results) : null;

        List<Dto.EvaluationRow> rows = results.stream().map(res -> new Dto.EvaluationRow(
                mapper.submission(byId.get(res.offerId())), res.eligible(), res.rank(), res.total(),
                res.lines().stream().map(l -> new Dto.ScoreBreakdown(l.criterionId(), l.key(), l.name(), l.weightPct(),
                        l.method(), l.score(), l.points(), l.rationale(), l.basis())).toList(),
                statusBySub.get(res.offerId()), evaluatorsBySub.get(res.offerId()),
                blankToNull(commentBySub.get(res.offerId())), Objects.equals(res.offerId(), recommended))).toList();

        var minOffers = SelectionRules.minOffers(pr.getAmount(), eligibleCount, r.quotationThreshold(),
                r.minCompetitiveOffers());
        var po = orders.findByPurchaseRequestId(pr.getId()).map(mapper::purchaseOrder).orElse(null);
        Dto.EvaluationBoard dto = new Dto.EvaluationBoard(mapper.opportunitySummary(o), mapper.criteria(o.getId()),
                rows, recommended, allEvaluated,
                new Dto.MinOffers(minOffers.applies(), minOffers.threshold(), minOffers.minimum(), minOffers.count(),
                        minOffers.satisfied()), r.deviationMinChars(), po);
        return new Board(dto, results, byId);
    }

    @Transactional
    public Dto.EvaluationBoard save(String submissionId, Dto.SaveEvaluationRequest in) {
        AppUser user = currentUser.require(UserRole.PROCUREMENT_OFFICER, UserRole.EVALUATOR);
        OpportunitySubmission s = lookup.submission(submissionId);
        InnovationOpportunity o = lookup.opportunity(s.getOpportunityId());
        if (o.getStatus() != OpportunityStatus.EVALUATION) {
            throw ApiException.invalidState("Scores can only be captured while the opportunity is in EVALUATION");
        }
        if (!SubmissionService.isEligible(s)) {
            throw ApiException.invalidState("Withdrawn or rejected submissions are not evaluated");
        }
        Map<String, EvaluationCriterion> manualCriteria = criteria.findByOpportunityIdOrderBySortOrder(o.getId())
                .stream().filter(c -> c.getScoringMethod() == ScoringMethod.MANUAL)
                .collect(Collectors.toMap(EvaluationCriterion::getId, c -> c, (a, b) -> a, LinkedHashMap::new));

        Evaluation ev = evaluations.findBySubmissionIdAndEvaluatorId(submissionId, user.getId()).orElseGet(() -> {
            Evaluation e = new Evaluation();
            e.setSubmissionId(submissionId);
            e.setEvaluatorId(user.getId());
            e.setStatus(EvaluationStatus.DRAFT);
            e.setCreatedAt(Clock.now());
            return evaluations.save(e);
        });
        if (ev.getStatus() == EvaluationStatus.COMPLETED) {
            throw ApiException.invalidState("Your evaluation of this submission is already completed");
        }
        Map<String, EvaluationScore> existing = new HashMap<>();
        scores.findByEvaluationId(ev.getId()).forEach(sc -> existing.put(sc.getCriterionId(), sc));
        for (Dto.ManualScoreInput input : in.scores()) {
            if (!manualCriteria.containsKey(input.criterionId())) {
                throw ApiException.rule("NOT_ELIGIBLE", "Criterion " + input.criterionId()
                        + " is not a manual criterion of this opportunity");
            }
            EvaluationScore sc = existing.getOrDefault(input.criterionId(), new EvaluationScore());
            sc.setEvaluationId(ev.getId());
            sc.setCriterionId(input.criterionId());
            sc.setScore(BigDecimal.valueOf(input.score()));
            sc.setRationale(input.rationale().trim());
            existing.put(input.criterionId(), scores.save(sc));
        }
        ev.setOverallComment(in.overallComment());
        if (in.complete()) {
            if (!existing.keySet().containsAll(manualCriteria.keySet())) {
                throw ApiException.rule("EVALUATION_INCOMPLETE", "Score every manual criterion before completing");
            }
            ev.setStatus(EvaluationStatus.COMPLETED);
            ev.setCompletedAt(Clock.now());
            Map<String, Object> meta = new LinkedHashMap<>();
            manualCriteria.values().forEach(c -> meta.put(c.getName(), existing.get(c.getId()).getScore()));
            audit.record(user.getId(), "EVALUATION_COMPLETED", "Evaluation", ev.getId(), o.getNeedId(),
                    user.getFullName() + " completed evaluation of " + lookup.provider(s.getProviderId()).getName()
                            + " for " + o.getReference(), meta);
        }
        evaluations.save(ev);
        return compute(o).dto();
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s;
    }
}
