package com.civicflow.ai;

import com.civicflow.domain.InnovationOpportunity;
import com.civicflow.domain.InnovationSolution;
import com.civicflow.domain.OpportunitySubmission;
import com.civicflow.domain.Provider;
import com.civicflow.domain.PublicNeed;
import com.civicflow.domain.enums.SolutionMaturity;
import com.civicflow.domain.enums.SolutionStatus;
import com.civicflow.repository.InnovationSolutionRepository;
import com.civicflow.repository.OpportunitySubmissionRepository;
import com.civicflow.rules.Money;
import com.civicflow.security.CurrentUser;
import com.civicflow.service.Clock;
import com.civicflow.service.DashboardService;
import com.civicflow.service.DtoMapper;
import com.civicflow.service.ImpactService;
import com.civicflow.service.Lookup;
import com.civicflow.service.SubmissionService;
import com.civicflow.web.ApiException;
import com.civicflow.web.dto.Dto;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * CIVIC AI (AI-01..AI-06). Read-only by construction: it only reads records and returns drafts.
 * It never approves, selects, scores or writes (constitution Art. IV). Every output is grounded in a context
 * built from platform records and cites their references.
 */
@Service
public class CivicAiService {

    public static final String DISCLAIMER =
            "Draft - AI-generated from CIVICFLOW records. Verify before use. AI assists; authorised humans decide.";

    private static final String SYSTEM = """
            You are CIVIC AI, an assistant inside CIVICFLOW, a South African public innovation, procurement and \
            impact management platform. Rules you must follow:
            1. Use ONLY the facts in the CONTEXT JSON. If something is not in the context, say "not recorded".
            2. Never invent suppliers, prices, scores, dates or impact results.
            3. You do not approve, reject, select or score anything. Humans decide. Do not recommend a winner.
            4. Cite record references in square brackets, e.g. [NEED-2026-014], [OPP-2026-007].
            5. Be concise and practical. Use South African English and ZAR formatting like R 420 000.
            6. Present rules as organisational rules, never as statements of law.
            """;

    private final DashboardService dashboards;
    private final ImpactService impact;
    private final Lookup lookup;
    private final DtoMapper mapper;
    private final InnovationSolutionRepository solutions;
    private final OpportunitySubmissionRepository submissions;
    private final GeminiClient gemini;
    private final CurrentUser currentUser;
    private final ObjectMapper json = new ObjectMapper().findAndRegisterModules();

    public CivicAiService(DashboardService dashboards, ImpactService impact, Lookup lookup, DtoMapper mapper,
                          InnovationSolutionRepository solutions, OpportunitySubmissionRepository submissions,
                          GeminiClient gemini, CurrentUser currentUser) {
        this.dashboards = dashboards;
        this.impact = impact;
        this.lookup = lookup;
        this.mapper = mapper;
        this.solutions = solutions;
        this.submissions = submissions;
        this.gemini = gemini;
        this.currentUser = currentUser;
    }

    /** Grounded context + deterministic draft; Gemini (if configured) rewrites the draft from the same context. */
    record Draft(String title, String content, List<Dto.AiCitation> citations, Map<String, Object> context,
                 Map<String, Object> structured, boolean jsonTask) {
    }

    @Transactional(readOnly = true)
    public Dto.AiResult run(String task, Dto.AiRequest req) {
        currentUser.requireStaff();
        Draft d = switch (task) {
            case "executive-briefing" -> executiveBriefing();
            case "need-analysis" -> needAnalysis(need(req));
            case "opportunity-draft" -> opportunityDraft(need(req));
            case "solution-discovery" -> solutionDiscovery(need(req));
            case "submission-summary" -> submissionSummary(req);
            case "impact-summary" -> impactSummary(req);
            default -> throw ApiException.notFound("AI task", task);
        };
        String mode = "DETERMINISTIC";
        String content = d.content();
        Map<String, Object> structured = d.structured();
        if (gemini.enabled()) {
            String prompt = "TASK: " + d.title() + "\nCONTEXT (JSON):\n" + toJson(d.context())
                    + (d.jsonTask()
                    ? "\nReturn JSON only: {\"title\": string, \"description\": string (markdown)}."
                    : "\nWrite the answer in Markdown (short headings and bullets).");
            Optional<String> out = gemini.generate(SYSTEM, prompt, d.jsonTask());
            if (out.isPresent()) {
                if (d.jsonTask()) {
                    try {
                        Map<String, Object> parsed = json.readValue(out.get(), new TypeReference<Map<String, Object>>() {
                        });
                        if (parsed.get("title") != null && parsed.get("description") != null) {
                            structured = new LinkedHashMap<>(parsed);
                            content = "**" + parsed.get("title") + "**\n\n" + parsed.get("description");
                            mode = "GEMINI";
                        }
                    } catch (Exception ignored) {
                        // keep deterministic draft
                    }
                } else {
                    content = out.get();
                    mode = "GEMINI";
                }
            }
        }
        return new Dto.AiResult(task, mode, d.title(), content, d.citations(), DISCLAIMER, Clock.now(), structured);
    }

    private PublicNeed need(Dto.AiRequest req) {
        if (req == null || req.needId() == null) {
            throw new IllegalArgumentException("needId is required for this task");
        }
        return lookup.need(req.needId());
    }

    // ---------- AI-01 ----------
    private Draft executiveBriefing() {
        Dto.ExecutiveDashboard d = dashboards.executive();
        var k = d.kpis();
        List<Dto.AiCitation> cites = new ArrayList<>();
        StringBuilder md = new StringBuilder("### Executive briefing\n\n");
        md.append("- **").append(Money.format(k.totalProcurementValue())).append("** committed through issued purchase orders; ")
                .append("budget utilisation across departments is **").append(k.budgetUtilisationPct()).append("%**.\n");
        md.append("- **").append(k.activeOpportunities()).append("** opportunities are open or in evaluation; **")
                .append(k.localProvidersEngaged()).append("** local providers are engaged.\n");
        md.append("- **").append(k.activeImplementations()).append("** implementations are active, **")
                .append(k.projectsAtRisk()).append("** flagged at risk.\n");
        md.append("- **").append(k.pendingApprovals()).append("** approvals pending, **").append(k.slaBreaches())
                .append("** past the approval SLA.\n");
        if (!d.atRisk().isEmpty()) {
            md.append("\n**Needs attention**\n");
            d.atRisk().forEach(i -> {
                md.append("- ").append(i.needTitle()).append(" - ").append(i.status()).append(", ")
                        .append(i.progressPct()).append("% complete [").append(i.poNumber()).append("]\n");
                cites.add(new Dto.AiCitation("Implementation", i.id(), i.poNumber(), i.needTitle()));
            });
        }
        if (!d.overdueApprovals().isEmpty()) {
            md.append("\n**Overdue approvals**\n");
            d.overdueApprovals().forEach(r -> {
                md.append("- ").append(r.needTitle()).append(" - ").append(Money.format(r.amount())).append(" [")
                        .append(r.reference()).append("]\n");
                cites.add(new Dto.AiCitation("PurchaseRequest", r.id(), r.reference(), r.needTitle()));
            });
        }
        List<Dto.ImpactHighlight> measured = d.impactHighlights().stream()
                .filter(h -> h.metrics().stream().anyMatch(m -> m.current() != null)).toList();
        if (!measured.isEmpty()) {
            md.append("\n**Measured impact**\n");
            measured.forEach(h -> {
                md.append("- ").append(h.needTitle()).append(" (").append(Money.format(h.invested())).append(", ")
                        .append(h.supplierName()).append("): ");
                md.append(h.metrics().stream().filter(m -> m.current() != null)
                        .map(m -> m.name() + " " + fmt(m.current()) + " " + m.unit()
                                + (m.changePct() == null ? "" : String.format(" (%+.1f%%)", m.changePct())))
                        .collect(Collectors.joining("; ")));
                md.append("\n");
                cites.add(new Dto.AiCitation("Implementation", h.implementationId(), h.needTitle(), "Impact"));
            });
        }
        Dto.Department top = d.departments().stream().max(Comparator.comparing(x -> x.budget().utilisationPct())).orElse(null);
        if (top != null) {
            md.append("\n").append(top.name()).append(" has the highest budget utilisation at **")
                    .append(top.budget().utilisationPct()).append("%**.\n");
        }
        return new Draft("Executive briefing", md.toString(), cites, Map.of("dashboard", d), null, false);
    }

    // ---------- AI-02 ----------
    private Draft needAnalysis(PublicNeed n) {
        var templates = impact.templates(n.getCategory());
        List<Scored> matches = rankSolutions(n);
        StringBuilder md = new StringBuilder("### Need analysis - " + n.getReference() + "\n\n");
        md.append("**Problem in one line:** ").append(firstSentence(n.getProblemStatement())).append("\n\n");
        md.append("**Desired outcome:** ").append(firstSentence(n.getDesiredOutcome())).append("\n\n");
        md.append("**Recorded capabilities:** ").append(n.getRequiredCapabilities().isEmpty() ? "not recorded"
                : String.join(", ", n.getRequiredCapabilities())).append("\n\n");
        md.append("**Suggested impact metrics** (templates for ").append(n.getCategory()).append("):\n");
        templates.forEach(t -> md.append("- ").append(t.name()).append(" (").append(t.unit()).append(", ")
                .append(t.direction() == com.civicflow.domain.enums.Direction.DECREASE ? "lower is better" : "higher is better")
                .append(")\n"));
        md.append("\n**Registry signal:** ").append(matches.size()).append(" published solution(s) in the registry match this need's category or capabilities.\n");
        md.append("\n**Budget:** estimated ").append(Money.format(n.getEstimatedBudget())).append(" - routing and budget checks are applied by the rule engine, not by CIVIC AI.\n");
        Map<String, Object> structured = new LinkedHashMap<>();
        structured.put("suggestedMetrics", templates);
        structured.put("matchingSolutions", matches.size());
        return new Draft("Need analysis", md.toString(),
                List.of(new Dto.AiCitation("PublicNeed", n.getId(), n.getReference(), n.getTitle())),
                Map.of("need", mapper.needDetail(n), "metricTemplates", templates), structured, false);
    }

    // ---------- AI-03 ----------
    private Draft opportunityDraft(PublicNeed n) {
        String title = n.getTitle().replaceAll("(?i)\\bsolution\\b", "Platform").trim();
        if (!title.toLowerCase(Locale.ROOT).contains("platform") && !title.toLowerCase(Locale.ROOT).contains("service")) {
            title = title + " - Call for Local Solutions";
        }
        StringBuilder desc = new StringBuilder();
        desc.append("**The challenge.** ").append(n.getProblemStatement().trim()).append("\n\n");
        desc.append("**What success looks like.** ").append(n.getDesiredOutcome().trim()).append("\n\n");
        if (!n.getRequiredCapabilities().isEmpty()) {
            desc.append("**Capabilities we are looking for:** ").append(String.join(", ", n.getRequiredCapabilities())).append(".\n\n");
        }
        desc.append("**Where:** ").append(Optional.ofNullable(n.getLocation().getWard()).map(w -> w + ", ").orElse(""))
                .append(n.getLocation().getMunicipality()).append(", ").append(n.getLocation().getProvince()).append(".\n\n");
        desc.append("**Indicative budget:** ").append(Money.format(n.getEstimatedBudget())).append(".\n\n");
        desc.append("Local SMEs, startups, co-operatives, innovators and open-source projects are encouraged to respond. ")
                .append("Submissions are evaluated against the published, weighted criteria, and successful providers are ")
                .append("expected to report delivery evidence and impact against agreed metrics.");
        Map<String, Object> structured = new LinkedHashMap<>();
        structured.put("title", title);
        structured.put("description", desc.toString());
        return new Draft("Opportunity draft", "**" + title + "**\n\n" + desc,
                List.of(new Dto.AiCitation("PublicNeed", n.getId(), n.getReference(), n.getTitle())),
                Map.of("need", mapper.needDetail(n)), structured, true);
    }

    // ---------- AI-04 ----------
    record Scored(InnovationSolution solution, int score, List<String> reasons) {
    }

    private List<Scored> rankSolutions(PublicNeed n) {
        List<String> caps = n.getRequiredCapabilities().stream().map(c -> c.toLowerCase(Locale.ROOT)).toList();
        List<Scored> out = new ArrayList<>();
        for (InnovationSolution s : solutions.findAllByOrderByName()) {
            if (s.getStatus() != SolutionStatus.PUBLISHED) {
                continue;
            }
            int score = 0;
            List<String> reasons = new ArrayList<>();
            if (s.getCategory() == n.getCategory()) {
                score += 50;
                reasons.add("same category");
            }
            String hay = (s.getName() + " " + s.getDescription() + " " + String.join(" ", s.getTechnologies()))
                    .toLowerCase(Locale.ROOT);
            List<String> hits = caps.stream().filter(c -> hay.contains(c) || c.split(" ").length > 0
                    && java.util.Arrays.stream(c.split("[ /]")).filter(w -> w.length() > 3).anyMatch(hay::contains)).toList();
            if (!hits.isEmpty()) {
                score += Math.min(30, hits.size() * 10);
                reasons.add("matches " + String.join(", ", hits));
            }
            if (s.getCoverageProvinces().contains(n.getLocation().getProvince())) {
                score += 10;
                reasons.add("covers " + n.getLocation().getProvince());
            }
            if (s.isOpenSource()) {
                score += 5;
                reasons.add("open source (" + s.getLicense() + ")");
            }
            score += s.getMaturity() == SolutionMaturity.PRODUCTION ? 5 : s.getMaturity() == SolutionMaturity.PILOT ? 3 : 0;
            if (score >= 40) {
                out.add(new Scored(s, score, reasons));
            }
        }
        out.sort(Comparator.comparingInt(Scored::score).reversed());
        return out;
    }

    private Draft solutionDiscovery(PublicNeed n) {
        List<Scored> ranked = rankSolutions(n).stream().limit(5).toList();
        List<Dto.AiCitation> cites = new ArrayList<>();
        cites.add(new Dto.AiCitation("PublicNeed", n.getId(), n.getReference(), n.getTitle()));
        StringBuilder md = new StringBuilder("### Relevant solutions in the registry for " + n.getReference() + "\n\n");
        if (ranked.isEmpty()) {
            md.append("No published registry solution matches this need's category or capabilities. Publishing an opportunity may attract new providers.\n");
        }
        List<Map<String, Object>> structured = new ArrayList<>();
        for (Scored sc : ranked) {
            Provider p = lookup.provider(sc.solution().getProviderId());
            md.append("- **").append(sc.solution().getName()).append("** by ").append(p.getName()).append(" (")
                    .append(p.getProviderType()).append(", ").append(p.getLocation().getMunicipality()).append(") - ")
                    .append(String.join("; ", sc.reasons())).append(". Maturity: ").append(sc.solution().getMaturity())
                    .append(", platform deployments: ").append(mapper.platformDeployments(sc.solution().getId())).append(".\n");
            cites.add(new Dto.AiCitation("InnovationSolution", sc.solution().getId(), sc.solution().getName(), p.getName()));
            structured.add(Map.of("solutionId", sc.solution().getId(), "relevance", sc.score(), "reasons", sc.reasons()));
        }
        md.append("\n_Relevance is a keyword/category heuristic to aid discovery - it is not an evaluation score._\n");
        return new Draft("Solution discovery", md.toString(), cites,
                Map.of("need", mapper.needSummary(n), "candidates", structured), Map.of("candidates", structured), false);
    }

    // ---------- AI-05 ----------
    private Draft submissionSummary(Dto.AiRequest req) {
        if (req == null || req.submissionId() == null) {
            throw new IllegalArgumentException("submissionId is required for this task");
        }
        OpportunitySubmission s = lookup.submission(req.submissionId());
        InnovationOpportunity o = lookup.opportunity(s.getOpportunityId());
        PublicNeed n = lookup.need(o.getNeedId());
        Provider p = lookup.provider(s.getProviderId());
        List<OpportunitySubmission> peers = submissions.findByOpportunityIdOrderBySubmittedAt(o.getId()).stream()
                .filter(SubmissionService::isEligible).toList();
        double min = peers.stream().mapToDouble(x -> x.getProposedPrice().doubleValue()).min().orElse(0);
        double max = peers.stream().mapToDouble(x -> x.getProposedPrice().doubleValue()).max().orElse(0);
        StringBuilder md = new StringBuilder("### Submission summary - " + p.getName() + " [" + o.getReference() + "]\n\n");
        md.append("- **Price:** ").append(Money.format(s.getProposedPrice())).append(" against an indicative budget of ")
                .append(Money.format(n.getEstimatedBudget())).append(" (range across ").append(peers.size())
                .append(" eligible submissions: ").append(Money.format(min)).append(" - ").append(Money.format(max)).append(").\n");
        md.append("- **Provider:** ").append(p.getProviderType()).append(", ").append(p.getLocation().getMunicipality())
                .append(", ").append(p.getBbbeeLevel() == null ? "B-BBEE not declared" : "declared B-BBEE Level " + p.getBbbeeLevel())
                .append(".\n");
        md.append("- **Delivery:** ").append(s.getDurationWeeks()).append(" weeks; ").append(s.getLocalJobsDeclared())
                .append(" local jobs declared.\n");
        md.append("- **Technical proposal (key points):** ").append(firstSentence(s.getTechnicalProposal())).append("\n");
        md.append("- **Implementation plan (key points):** ").append(firstSentence(s.getImplementationPlan())).append("\n");
        if (s.getSolutionId() != null) {
            solutions.findById(s.getSolutionId()).ifPresent(sol -> md.append("- **Linked solution:** ").append(sol.getName())
                    .append(" (").append(sol.getMaturity()).append(sol.isOpenSource() ? ", open source " + sol.getLicense() : "")
                    .append(").\n"));
        }
        md.append("\n**Evidence to check against the criteria:** ");
        md.append(mapper.criteria(o.getId()).stream().map(c -> c.name() + " (" + c.weightPct().stripTrailingZeros().toPlainString() + "%)")
                .collect(Collectors.joining(", "))).append(".\n\n_CIVIC AI does not score submissions; evaluators do._\n");
        return new Draft("Submission summary", md.toString(),
                List.of(new Dto.AiCitation("OpportunitySubmission", s.getId(), o.getReference(), p.getName()),
                        new Dto.AiCitation("PublicNeed", n.getId(), n.getReference(), n.getTitle())),
                Map.of("submission", mapper.submission(s), "opportunity", mapper.opportunitySummary(o),
                        "criteria", mapper.criteria(o.getId())), null, false);
    }

    // ---------- AI-06 ----------
    private Draft impactSummary(Dto.AiRequest req) {
        List<Dto.ImpactMetric> ms = req != null && req.implementationId() != null
                ? mapper.implementationDetail(lookup.implementation(req.implementationId())).metrics()
                : impact.all();
        StringBuilder md = new StringBuilder("### Impact summary\n\n");
        List<Dto.AiCitation> cites = new ArrayList<>();
        if (ms.isEmpty()) {
            md.append("No impact metrics are recorded yet.\n");
        }
        Map<String, List<Dto.ImpactMetric>> byNeed = ms.stream().collect(Collectors.groupingBy(Dto.ImpactMetric::needTitle,
                LinkedHashMap::new, Collectors.toList()));
        byNeed.forEach((title, list) -> {
            md.append("**").append(title).append("**\n");
            list.forEach(m -> {
                md.append("- ").append(m.name()).append(": ");
                if (m.current() == null) {
                    md.append("not measured yet (baseline ").append(fmt(m.baseline().doubleValue())).append(", target ")
                            .append(fmt(m.target().doubleValue())).append(" ").append(m.unit()).append(")");
                } else {
                    md.append(fmt(m.baseline().doubleValue())).append(" → ").append(fmt(m.current())).append(" ").append(m.unit());
                    if (m.changePct() != null) {
                        md.append(String.format(" (%+.1f%%)", m.changePct()));
                    }
                    md.append(", target ").append(fmt(m.target().doubleValue())).append(" - **").append(m.status()).append("**");
                }
                md.append("\n");
            });
            cites.add(new Dto.AiCitation("Implementation", list.get(0).implementationId(), title, "Impact metrics"));
        });
        return new Draft("Impact summary", md.toString(), cites, Map.of("metrics", ms), null, false);
    }

    // ---------- helpers ----------
    private static String firstSentence(String text) {
        if (text == null || text.isBlank()) {
            return "not recorded";
        }
        String t = text.trim();
        int idx = t.indexOf(". ");
        return idx > 0 && idx < 280 ? t.substring(0, idx + 1) : (t.length() > 280 ? t.substring(0, 277) + "..." : t);
    }

    private static String fmt(double v) {
        return v == Math.rint(v) ? String.format(Locale.ROOT, "%,.0f", v).replace(',', ' ') : String.format(Locale.ROOT, "%,.1f", v).replace(',', ' ');
    }

    private String toJson(Object o) {
        try {
            return json.writeValueAsString(o);
        } catch (Exception e) {
            return "{}";
        }
    }
}
