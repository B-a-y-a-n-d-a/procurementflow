package com.civicflow.service;

import com.civicflow.domain.ApprovalRule;
import com.civicflow.domain.BusinessRuleSet;
import com.civicflow.domain.enums.UserRole;
import com.civicflow.repository.ApprovalRuleRepository;
import com.civicflow.repository.BusinessRuleSetRepository;
import com.civicflow.rules.RuleSnapshot;
import com.civicflow.rules.ScoringEngine;
import com.civicflow.security.CurrentUser;
import com.civicflow.web.ApiException;
import com.civicflow.web.dto.Dto;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Loads/edits the versioned BusinessRuleSet (constitution Art. III, FR-140). */
@Service
public class RuleService {

    private final BusinessRuleSetRepository ruleSets;
    private final ApprovalRuleRepository approvalRules;
    private final AuditService audit;
    private final CurrentUser currentUser;
    private final Lookup lookup;
    private final ObjectMapper json = new ObjectMapper();

    public RuleService(BusinessRuleSetRepository ruleSets, ApprovalRuleRepository approvalRules, AuditService audit,
                       CurrentUser currentUser, Lookup lookup) {
        this.ruleSets = ruleSets;
        this.approvalRules = approvalRules;
        this.audit = audit;
        this.currentUser = currentUser;
        this.lookup = lookup;
    }

    @Transactional(readOnly = true)
    public RuleSnapshot current() {
        BusinessRuleSet set = ruleSets.findTopByOrderByVersionDesc()
                .orElseThrow(() -> ApiException.invalidState("No business rule set configured"));
        return toSnapshot(set);
    }

    @Transactional(readOnly = true)
    public RuleSnapshot byId(String id) {
        return ruleSets.findById(id).map(this::toSnapshot).orElseGet(this::current);
    }

    @Transactional(readOnly = true)
    public int versionOf(String ruleSetId) {
        return ruleSets.findById(ruleSetId).map(BusinessRuleSet::getVersion).orElse(0);
    }

    @Transactional(readOnly = true)
    public Dto.RuleSet currentDto() {
        BusinessRuleSet set = ruleSets.findTopByOrderByVersionDesc()
                .orElseThrow(() -> ApiException.invalidState("No business rule set configured"));
        RuleSnapshot s = toSnapshot(set);
        Map<String, Integer> bbbee = new LinkedHashMap<>();
        s.bbbeeScores().forEach((k, v) -> bbbee.put(String.valueOf(k), v));
        return new Dto.RuleSet(set.getId(), set.getVersion(), set.getEffectiveFrom(), s.approvalSlaHours(),
                s.budgetMode(), s.quotationThreshold(), s.minCompetitiveOffers(), s.deviationMinChars(),
                s.closingSoonDays(), s.impactOnTrackPct(), s.escalationRole(),
                s.bands().stream().map(b -> new Dto.ApprovalBand(b.min(), b.max(), b.approverRoles())).toList(),
                bbbee,
                new Dto.LocalScores(s.localScores().sameMunicipality(), s.localScores().sameProvince(),
                        s.localScores().elsewhere()),
                s.defaultCriteria().stream().map(c -> new Dto.Criterion(null, c.key(), c.name(), c.weightPct(),
                        c.scoringMethod())).toList(),
                set.getUpdatedBy() == null ? "System (defaults)" : lookup.userName(set.getUpdatedBy()));
    }

    /** ADMIN: saves a NEW version; requests keep the version they were routed under. */
    @Transactional
    public Dto.RuleSet update(Dto.RuleSet in) {
        var admin = currentUser.require(UserRole.ADMIN);
        if (!ScoringEngine.weightsValid(in.defaultCriteria().stream().map(c -> c.weightPct().doubleValue()).toList())) {
            throw ApiException.rule("WEIGHTS_INVALID", "Default criteria weights must total 100%");
        }
        Map<Integer, Integer> bbbee = new LinkedHashMap<>();
        in.bbbeeScores().forEach((k, v) -> bbbee.put(Integer.parseInt(k), v));
        RuleSnapshot snapshot = new RuleSnapshot(null, 0, in.approvalSlaHours(), in.budgetMode(),
                in.quotationThreshold(), in.minCompetitiveOffers(), in.deviationMinChars(), in.closingSoonDays(),
                in.impactOnTrackPct(), in.escalationRole(),
                in.approvalBands().stream().map(b -> new RuleSnapshot.Band(b.minAmount(), b.maxAmount(),
                        b.approverRoles())).toList(),
                bbbee,
                new RuleSnapshot.LocalScores(in.localScores().sameMunicipality(), in.localScores().sameProvince(),
                        in.localScores().elsewhere()),
                in.defaultCriteria().stream().map(c -> new RuleSnapshot.CriterionTemplate(c.key(), c.name(),
                        c.weightPct(), c.scoringMethod())).toList());
        int previous = ruleSets.findTopByOrderByVersionDesc().map(BusinessRuleSet::getVersion).orElse(0);
        BusinessRuleSet saved = save(snapshot, previous + 1, admin.getId());
        audit.record(admin.getId(), "RULES_UPDATED", "BusinessRuleSet", saved.getId(), null,
                "Business rules updated to version " + saved.getVersion(),
                Map.of("fromVersion", previous, "toVersion", saved.getVersion()));
        return currentDto();
    }

    @Transactional
    public BusinessRuleSet save(RuleSnapshot s, int version, String updatedBy) {
        BusinessRuleSet set = new BusinessRuleSet();
        set.setVersion(version);
        set.setEffectiveFrom(Clock.now());
        set.setApprovalSlaHours(s.approvalSlaHours());
        set.setBudgetMode(s.budgetMode());
        set.setQuotationThreshold(s.quotationThreshold());
        set.setMinCompetitiveOffers(s.minCompetitiveOffers());
        set.setDeviationMinChars(s.deviationMinChars());
        set.setClosingSoonDays(s.closingSoonDays());
        set.setImpactOnTrackPct(s.impactOnTrackPct());
        set.setEscalationRole(s.escalationRole());
        set.setBbbeeScoreTable(write(s.bbbeeScores()));
        set.setLocalScoreTable(write(s.localScores()));
        set.setDefaultCriteria(write(s.defaultCriteria()));
        set.setUpdatedBy(updatedBy);
        set.setCreatedAt(Clock.now());
        BusinessRuleSet saved = ruleSets.save(set);
        int order = 0;
        for (RuleSnapshot.Band band : s.bands()) {
            ApprovalRule rule = new ApprovalRule();
            rule.setRuleSetId(saved.getId());
            rule.setMinAmount(band.min());
            rule.setMaxAmount(band.max());
            rule.setApproverRoles(new ArrayList<>(band.approverRoles()));
            rule.setSortOrder(order++);
            approvalRules.save(rule);
        }
        return saved;
    }

    private RuleSnapshot toSnapshot(BusinessRuleSet set) {
        List<RuleSnapshot.Band> bands = approvalRules.findByRuleSetIdOrderBySortOrder(set.getId()).stream()
                .map(r -> new RuleSnapshot.Band(r.getMinAmount(), r.getMaxAmount(), List.copyOf(r.getApproverRoles())))
                .toList();
        Map<Integer, Integer> bbbee = read(set.getBbbeeScoreTable(), new TypeReference<LinkedHashMap<Integer, Integer>>() {
        });
        RuleSnapshot.LocalScores local = read(set.getLocalScoreTable(), new TypeReference<RuleSnapshot.LocalScores>() {
        });
        List<RuleSnapshot.CriterionTemplate> criteria = read(set.getDefaultCriteria(),
                new TypeReference<List<RuleSnapshot.CriterionTemplate>>() {
                });
        return new RuleSnapshot(set.getId(), set.getVersion(), set.getApprovalSlaHours(), set.getBudgetMode(),
                set.getQuotationThreshold(), set.getMinCompetitiveOffers(), set.getDeviationMinChars(),
                set.getClosingSoonDays(), set.getImpactOnTrackPct(), set.getEscalationRole(), bands, bbbee, local,
                criteria);
    }

    private String write(Object value) {
        try {
            return json.writeValueAsString(value);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    private <T> T read(String text, TypeReference<T> type) {
        try {
            return json.readValue(text, type);
        } catch (Exception e) {
            throw new IllegalStateException("Corrupt rule set JSON", e);
        }
    }

    public static BigDecimal pct(double v) {
        return BigDecimal.valueOf(v);
    }
}
