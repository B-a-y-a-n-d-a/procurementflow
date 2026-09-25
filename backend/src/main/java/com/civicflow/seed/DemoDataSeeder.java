package com.civicflow.seed;

import com.civicflow.domain.AppUser;
import com.civicflow.domain.AuditLogEntry;
import com.civicflow.domain.Department;
import com.civicflow.domain.EvaluationCriterion;
import com.civicflow.domain.GeoLocation;
import com.civicflow.domain.InnovationSolution;
import com.civicflow.domain.Provider;
import com.civicflow.domain.Supplier;
import com.civicflow.domain.enums.*;
import com.civicflow.repository.*;
import com.civicflow.rules.RuleSnapshot;
import com.civicflow.security.CurrentUser;
import com.civicflow.service.AuditService;
import com.civicflow.service.Clock;
import com.civicflow.service.EvaluationService;
import com.civicflow.service.ImpactService;
import com.civicflow.service.ImplementationService;
import com.civicflow.service.NeedService;
import com.civicflow.service.OpportunityService;
import com.civicflow.service.ProcurementService;
import com.civicflow.service.References;
import com.civicflow.service.RuleService;
import com.civicflow.service.SubmissionService;
import com.civicflow.service.ApprovalService;
import com.civicflow.web.dto.Dto;
import jakarta.persistence.EntityManager;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

/**
 * Seeds the fictional "Mzansi Metro" demo (constitution Art. VII). History is replayed THROUGH the real services
 * with a time override, so every rule, audit entry and notification is authentic - just dated in the past.
 * Afterwards the audit log is re-chained in chronological order.
 */
@Component
public class DemoDataSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoDataSeeder.class);
    private static final String MUNI = "City of Tshwane";
    private static final String GP = "Gauteng";
    private static final String EVIDENCE = "https://example.org/civicflow-demo/evidence/";

    @FunctionalInterface
    interface Call<T> {
        T run();
    }

    private final boolean seedOnStartup;
    private final EntityManager em;
    private final DepartmentRepository departments;
    private final AppUserRepository users;
    private final ProviderRepository providers;
    private final InnovationSolutionRepository solutions;
    private final SupplierRepository suppliers;
    private final PurchaseRequestRepository requests;
    private final ApprovalStepRepository steps;
    private final EvaluationCriterionRepository criteria;
    private final NotificationRepository notifications;
    private final AuditLogEntryRepository auditEntries;
    private final RuleService rules;
    private final NeedService needs;
    private final ApprovalService approvals;
    private final OpportunityService opportunities;
    private final SubmissionService submissions;
    private final EvaluationService evaluations;
    private final ProcurementService procurement;
    private final ImplementationService implementations;
    private final ImpactService impact;
    private final AuditService audit;
    private final TransactionTemplate transactions;

    private LocalDate today;

    public DemoDataSeeder(@Value("${civicflow.seed-on-startup:true}") boolean seedOnStartup,
                          PlatformTransactionManager transactionManager, EntityManager em,
                          DepartmentRepository departments, AppUserRepository users, ProviderRepository providers,
                          InnovationSolutionRepository solutions, SupplierRepository suppliers,
                          PurchaseRequestRepository requests, ApprovalStepRepository steps,
                          EvaluationCriterionRepository criteria, NotificationRepository notifications,
                          AuditLogEntryRepository auditEntries, RuleService rules, NeedService needs,
                          ApprovalService approvals, OpportunityService opportunities, SubmissionService submissions,
                          EvaluationService evaluations, ProcurementService procurement,
                          ImplementationService implementations, ImpactService impact, AuditService audit) {
        this.seedOnStartup = seedOnStartup;
        this.em = em;
        this.departments = departments;
        this.users = users;
        this.providers = providers;
        this.solutions = solutions;
        this.suppliers = suppliers;
        this.requests = requests;
        this.steps = steps;
        this.criteria = criteria;
        this.notifications = notifications;
        this.auditEntries = auditEntries;
        this.rules = rules;
        this.needs = needs;
        this.approvals = approvals;
        this.opportunities = opportunities;
        this.submissions = submissions;
        this.evaluations = evaluations;
        this.procurement = procurement;
        this.implementations = implementations;
        this.impact = impact;
        this.audit = audit;
        this.transactions = new TransactionTemplate(transactionManager);
    }

    @Override
    public void run(ApplicationArguments args) {
        if (seedOnStartup && departments.count() == 0) {
            log.info("Seeding CIVICFLOW demo data (Mzansi Metro)...");
            transactions.executeWithoutResult(status -> seedInternal());
            log.info("Demo data seeded.");
        }
    }

    /** Admin reset: wipe everything (including the demo audit log) and re-seed. Recorded as DEMO_RESET. */
    @Transactional
    public synchronized void reset() {
        wipe();
        seedInternal();
        audit.record(null, "DEMO_RESET", "System", "demo", null, "Demo data reset to the seeded Mzansi Metro scenario", null);
    }

    @Transactional
    public synchronized void seed() {
        seedInternal();
    }

    private void wipe() {
        for (String table : List.of("audit_log_entry", "notification", "attachment", "impact_measurement",
                "impact_metric", "implementation_update", "milestone", "implementation", "purchase_order",
                "evaluation_score", "evaluation", "supplier_quote", "opportunity_submission", "evaluation_criterion",
                "innovation_opportunity", "approval_step", "purchase_request", "public_need", "innovation_solution",
                "supplier", "approval_rule", "business_rule_set", "app_user", "provider", "department")) {
            em.createNativeQuery("DELETE FROM " + table).executeUpdate();
        }
        em.flush();
        em.clear();
    }

    // =====================================================================================================
    private void seedInternal() {
        today = LocalDate.now(Clock.SAST);
        try {
            Clock.setOverride(at(400, 8));
            rules.save(RuleSnapshot.defaults(), 1, null);
            referenceData();
            storyWaterLeaks();        // completed, measured impact
            storyDigitalPermits();    // in progress, open-source provider
            storyStreetlights();      // quotation route, at risk
            storyIllegalDumping();    // HERO: approved -> 3 submissions -> 2 of 3 evaluated
            storyCommunitySafety();   // published, closing soon
            storyTraderPayments();    // published, street-economy friendly
            storySmallRequests();     // auto-approved, quotes awaiting selection, overdue, pending FD, rejected, draft
        } finally {
            Clock.clearOverride();
        }
        rechainAuditChronologically();
        markOldNotificationsRead();
    }

    // ---------------------------------------------------------------------------------------- helpers
    private Instant at(int daysAgo, int hour) {
        return today.minusDays(daysAgo).atTime(LocalTime.of(hour, 0)).atZone(Clock.SAST).toInstant();
    }

    private Instant future(int days, int hour) {
        return today.plusDays(days).atTime(LocalTime.of(hour, 0)).atZone(Clock.SAST).toInstant();
    }

    private LocalDate date(int daysAgo) {
        return today.minusDays(daysAgo);
    }

    private <T> T as(String userId, Instant when, Call<T> call) {
        Clock.setOverride(when);
        AppUser user = users.findById(userId).orElseThrow();
        List<T> out = new ArrayList<>(1);
        CurrentUser.runAs(user, () -> out.add(call.run()));
        return out.get(0);
    }

    private static BigDecimal r(long v) {
        return BigDecimal.valueOf(v);
    }

    private GeoLocation geo(String province, String municipality, String ward, double lat, double lng) {
        return new GeoLocation(province, municipality, ward, BigDecimal.valueOf(lat), BigDecimal.valueOf(lng));
    }

    private Dto.Geo dtoGeo(String ward, double lat, double lng) {
        return new Dto.Geo(GP, MUNI, ward, BigDecimal.valueOf(lat), BigDecimal.valueOf(lng));
    }

    private List<Dto.Criterion> defaultCriteria() {
        return RuleSnapshot.defaults().defaultCriteria().stream()
                .map(c -> new Dto.Criterion(null, c.key(), c.name(), c.weightPct(), c.scoringMethod())).toList();
    }

    private String stepId(String requestId, int sequence) {
        return steps.findByPurchaseRequestIdOrderBySequence(requestId).stream()
                .filter(s -> s.getSequence() == sequence).findFirst().orElseThrow().getId();
    }

    private void evaluate(String userId, Instant when, String opportunityId, String submissionId, double tech,
                          double suit, String techWhy, String suitWhy) {
        List<EvaluationCriterion> manual = criteria.findByOpportunityIdOrderBySortOrder(opportunityId).stream()
                .filter(c -> c.getScoringMethod() == ScoringMethod.MANUAL).toList();
        List<Dto.ManualScoreInput> scores = new ArrayList<>();
        for (EvaluationCriterion c : manual) {
            boolean isTech = c.getCriterionKey() == CriterionKey.TECHNICAL;
            scores.add(new Dto.ManualScoreInput(c.getId(), isTech ? tech : suit, isTech ? techWhy : suitWhy));
        }
        as(userId, when, () -> evaluations.save(submissionId, new Dto.SaveEvaluationRequest(scores, null, true)));
    }

    private String supplierIdOf(String providerId) {
        return suppliers.findByProviderId(providerId).orElseThrow().getId();
    }

    private Dto.CreateNeedRequest need(String title, String problem, String deptId, NeedCategory cat, Priority prio,
                                       long budget, List<String> caps, String outcome, Dto.Geo geo, String why,
                                       SourcingMethod method, boolean submit) {
        return new Dto.CreateNeedRequest(title, problem, deptId, cat, prio, r(budget), caps, outcome, geo,
                List.of(new Dto.Attachment(null, "Problem brief.pdf", EVIDENCE + "brief-" + title.hashCode() + ".pdf")),
                why, method, submit);
    }

    private Dto.CreateSubmissionRequest bid(String solutionId, long price, String tech, String plan, int weeks, int jobs) {
        return new Dto.CreateSubmissionRequest(solutionId, r(price), tech, plan, weeks, jobs, List.of());
    }

    // ---------------------------------------------------------------------------------------- reference data
    private void referenceData() {
        Instant created = at(400, 8);
        dept("dept-env", "ENV", "Environmental Services", 1_200_000, created);
        dept("dept-infra", "INF", "Infrastructure", 1_100_000, created);
        dept("dept-comm", "CDV", "Community Development", 600_000, created);
        dept("dept-ict", "ICT", "ICT", 900_000, created);
        dept("dept-econ", "EDV", "Economic Development", 480_000, created);

        provider("prov-cleansight", "CleanSight SA", ProviderType.SME, 1, "Soshanguve", -25.5250, 28.1000, MUNI, GP, 14,
                "Soshanguve-based SME building GIS and computer-vision tools for waste management.", "2016/482211/07");
        provider("prov-ecovision", "EcoVision", ProviderType.STARTUP, 2, "Mamelodi", -25.7100, 28.3600, MUNI, GP, 6,
                "Mamelodi startup focused on citizen environmental reporting apps.", "2021/118834/07");
        provider("prov-globaltech", "GlobalTech Solutions", ProviderType.TECHNOLOGY_COMPANY, 4, "Sandton", -26.1076, 28.0567,
                "City of Johannesburg", GP, 420, "National systems integrator: CCTV, IoT and smart-city platforms.", "2003/009912/07");
        provider("prov-openward", "OpenWard Collective", ProviderType.OPEN_SOURCE_PROJECT, 1, "Hatfield", -25.7480, 28.2380,
                MUNI, GP, 9, "Pretoria-based open-source civic-tech collective maintaining municipal software under open licences.",
                "2019/551203/08");
        provider("prov-ubuntu", "Ubuntu Sensors", ProviderType.INNOVATOR, 2, "Pretoria West", -25.7520, 28.1500, MUNI, GP, 5,
                "Hackathon-born innovator building low-cost acoustic leak sensors.", "2022/301177/07");
        provider("prov-kasi", "Kasi Digital Co-op", ProviderType.COOPERATIVE, 1, "Mabopane", -25.4980, 28.0960, MUNI, GP, 11,
                "Youth co-operative offering digital payments and onboarding for township traders.", "2020/774120/24");
        provider("prov-safestreets", "SafeStreets Labs", ProviderType.STARTUP, 3, "Braamfontein", -26.1929, 28.0305,
                "City of Johannesburg", GP, 7, "Community safety reporting startup.", "2023/102938/07");
        provider("prov-aquatrack", "AquaTrack Analytics", ProviderType.STARTUP, 3, "Centurion", -25.8600, 28.1890, MUNI, GP, 8,
                "Water network analytics dashboards for utilities.", "2020/662019/07");
        provider("prov-khanya", "Khanya Solar & Electrical", ProviderType.LOCAL_BUSINESS, 1, "Atteridgeville", -25.7700, 28.0700,
                MUNI, GP, 18, "Local electrical contractor and solar installer.", "2012/200145/07");
        provider("prov-soweto", "Soweto Sound & Stage", ProviderType.LOCAL_BUSINESS, 2, "Soweto", -26.2485, 27.8540,
                "City of Johannesburg", GP, 12, "Event sound and staging hire.", "2014/339812/07");
        provider("prov-tshwaneaudio", "Tshwane Audio Pro", ProviderType.SME, 1, "Pretoria CBD", -25.7461, 28.1881, MUNI, GP, 9,
                "Audio-visual installation SME.", "2017/220981/07");
        provider("prov-megaav", "Mega AV Rentals", ProviderType.TECHNOLOGY_COMPANY, 5, "Midrand", -25.9990, 28.1260,
                "City of Johannesburg", GP, 85, "AV equipment rental and installation.", "2009/145566/07");
        provider("prov-cleansafe", "Soshanguve Clean & Safe Supplies", ProviderType.LOCAL_BUSINESS, 1, "Soshanguve", -25.5300,
                28.1050, MUNI, GP, 6, "PPE and cleaning supplies.", "2018/903311/07");

        // Existing formal suppliers (already on the organisation's supplier database)
        for (String p : List.of("prov-globaltech", "prov-khanya", "prov-soweto", "prov-tshwaneaudio", "prov-megaav", "prov-cleansafe")) {
            Supplier s = new Supplier();
            s.setProviderId(p);
            s.setSupplierNumber(References.nextSupplier(suppliers.count()));
            s.setCsdNumber("MAAA0" + (1_000_000 + Math.abs(p.hashCode() % 8_999_999)));
            s.setTaxCompliant(true);
            s.setStatus(SupplierStatus.ACTIVE);
            s.setVerifiedAt(at(300, 9));
            s.setCreatedAt(at(300, 9));
            suppliers.save(s);
            Provider prov = providers.findById(p).orElseThrow();
            prov.setVerificationStatus(VerificationStatus.VERIFIED);
            providers.save(prov);
        }

        user("u-thandi", "Thandi Nkosi", "Environmental Health Officer", UserRole.DEPARTMENT_OFFICER, "dept-env", null);
        user("u-sipho", "Sipho Mokoena", "Director: Environmental Services", UserRole.DEPARTMENT_MANAGER, "dept-env", null);
        user("u-themba", "Themba Ndlovu", "Infrastructure Planner", UserRole.DEPARTMENT_OFFICER, "dept-infra", null);
        user("u-naledi", "Naledi Khumalo", "Director: Infrastructure", UserRole.DEPARTMENT_MANAGER, "dept-infra", null);
        user("u-zodwa", "Zodwa Mahlangu", "Community Development Officer", UserRole.DEPARTMENT_OFFICER, "dept-comm", null);
        user("u-zanele", "Zanele Mthembu", "Director: Community Development", UserRole.DEPARTMENT_MANAGER, "dept-comm", null);
        user("u-musa", "Musa Dube", "ICT Service Desk Lead", UserRole.DEPARTMENT_OFFICER, "dept-ict", null);
        user("u-pieter", "Pieter Botha", "Director: ICT", UserRole.DEPARTMENT_MANAGER, "dept-ict", null);
        user("u-refilwe", "Refilwe Moloi", "LED Programme Officer", UserRole.DEPARTMENT_OFFICER, "dept-econ", null);
        user("u-karabo", "Karabo Molefe", "Director: Economic Development", UserRole.DEPARTMENT_MANAGER, "dept-econ", null);
        user("u-lerato", "Lerato Dlamini", "Chief Financial Officer", UserRole.FINANCE_DIRECTOR, null, null);
        user("u-johan", "Johan van der Merwe", "Supply Chain Manager", UserRole.PROCUREMENT_OFFICER, null, null);
        user("u-ayesha", "Ayesha Patel", "City Manager", UserRole.EXECUTIVE, null, null);
        user("u-grace", "Grace Naidoo", "Chief Audit Executive", UserRole.AUDITOR, null, null);
        user("u-lindiwe", "Lindiwe Sithole", "Platform Administrator", UserRole.ADMIN, null, null);
        user("u-nomsa", "Nomsa Zulu", "Founder, CleanSight SA", UserRole.PROVIDER, null, "prov-cleansight");
        user("u-kabelo", "Kabelo Sithole", "CEO, EcoVision", UserRole.PROVIDER, null, "prov-ecovision");
        user("u-daniel", "Daniel Smith", "Public Sector Lead, GlobalTech", UserRole.PROVIDER, null, "prov-globaltech");
        user("u-ayanda", "Ayanda Khoza", "Maintainer, OpenWard Collective", UserRole.PROVIDER, null, "prov-openward");
        user("u-sibusiso", "Sibusiso Mnisi", "Founder, Ubuntu Sensors", UserRole.PROVIDER, null, "prov-ubuntu");
        user("u-precious", "Precious Mabena", "Chairperson, Kasi Digital Co-op", UserRole.PROVIDER, null, "prov-kasi");
        user("u-lebo", "Lebo Tau", "Co-founder, SafeStreets Labs", UserRole.PROVIDER, null, "prov-safestreets");
        user("u-tumelo", "Tumelo Kgosi", "CTO, AquaTrack Analytics", UserRole.PROVIDER, null, "prov-aquatrack");

        solution("sol-dumpwatch", "prov-cleansight", "DumpWatch", NeedCategory.WASTE_ENVIRONMENT,
                "Mobile + GIS platform that maps illegal dumping hotspots from citizen reports and camera feeds, with computer-vision detection.",
                List.of("GIS", "Mobile reporting", "Computer vision", "Analytics", "React Native", "PostGIS"), false, null, null,
                SolutionMaturity.PILOT, 2, List.of(GP));
        solution("sol-ecomap", "prov-ecovision", "EcoMap Reporter", NeedCategory.WASTE_ENVIRONMENT,
                "Citizen reporting app for environmental incidents with ward dashboards.",
                List.of("Mobile reporting", "Analytics", "Flutter", "Firebase"), false, null, null, SolutionMaturity.PROTOTYPE, 0, List.of(GP));
        solution("sol-cctv", "prov-globaltech", "SmartCity CCTV Suite", NeedCategory.COMMUNITY_SAFETY,
                "Enterprise CCTV, video analytics and control-room software.",
                List.of("Video analytics", "Monitoring", "Location intelligence"), false, null, null, SolutionMaturity.PRODUCTION, 14,
                List.of(GP, "Western Cape", "KwaZulu-Natal"));
        solution("sol-streetlight", "prov-globaltech", "IoT Streetlight Controller", NeedCategory.INFRASTRUCTURE,
                "Networked streetlight controllers with fault telemetry.", List.of("IoT", "Monitoring", "LoRaWAN"), false, null, null,
                SolutionMaturity.PRODUCTION, 6, List.of(GP));
        solution("sol-dumpwatch-lite", "prov-openward", "DumpWatch-Lite", NeedCategory.WASTE_ENVIRONMENT,
                "Open-source illegal dumping reporting and hotspot mapping toolkit for municipalities.",
                List.of("GIS", "Mobile reporting", "Python", "PostgreSQL", "React"), true,
                "https://example.org/openward/dumpwatch-lite", "MIT", SolutionMaturity.PILOT, 3, List.of(GP, "Western Cape"));
        solution("sol-openpermit", "prov-openward", "OpenPermit", NeedCategory.DIGITAL_SERVICES,
                "Open-source online business permit application and tracking service.",
                List.of("Digital public services", "Workflow", "Java", "PostgreSQL", "React"), true,
                "https://example.org/openward/openpermit", "AGPL-3.0", SolutionMaturity.PILOT, 2, List.of(GP, "Western Cape", "Free State"));
        solution("sol-leaksense", "prov-ubuntu", "LeakSense", NeedCategory.WATER_ENERGY,
                "Low-cost acoustic sensors that detect and locate water pipe leaks.", List.of("IoT", "Monitoring", "Analytics"), false,
                null, null, SolutionMaturity.PILOT, 1, List.of(GP));
        solution("sol-kasipay", "prov-kasi", "KasiPay Merchant", NeedCategory.LOCAL_ECONOMIC_DEVELOPMENT,
                "Digital payments and bookkeeping for informal traders, onboarded by co-op field agents.",
                List.of("Mobile payments", "Onboarding", "USSD", "Analytics"), false, null, null, SolutionMaturity.PILOT, 1, List.of(GP));
        solution("sol-safeward", "prov-safestreets", "SafeWard Reporter", NeedCategory.COMMUNITY_SAFETY,
                "Open-source community safety hotspot reporting with WhatsApp intake.",
                List.of("Mobile reporting", "Location intelligence", "WhatsApp", "Node.js"), true,
                "https://example.org/safestreets/safeward", "MIT", SolutionMaturity.PROTOTYPE, 0, List.of(GP));
        solution("sol-aquatrack", "prov-aquatrack", "AquaTrack Dashboard", NeedCategory.WATER_ENERGY,
                "Water balance and non-revenue water analytics dashboard.", List.of("Analytics", "Monitoring"), false, null, null,
                SolutionMaturity.PRODUCTION, 4, List.of(GP, "Limpopo"));
    }

    private void dept(String id, String code, String name, long budget, Instant created) {
        Department d = new Department();
        d.setId(id);
        d.setCode(code);
        d.setName(name);
        d.setMunicipality("Mzansi Metro (demo)");
        d.setProvince(GP);
        d.setBudgetAllocated(r(budget));
        d.setFinancialYear("2026/27");
        d.setCreatedAt(created);
        departments.save(d);
    }

    private void provider(String id, String name, ProviderType type, Integer level, String area, double lat, double lng,
                          String municipality, String province, int employees, String description, String regNo) {
        Provider p = new Provider();
        p.setId(id);
        p.setName(name);
        p.setProviderType(type);
        p.setDescription(description);
        p.setRegistrationNumber(regNo);
        p.setBbbeeLevel(level);
        p.setBbbeeExpiry(today.plusMonths(8));
        p.setLocation(geo(province, municipality, area, lat, lng));
        p.setContactEmail("hello@" + name.toLowerCase().replaceAll("[^a-z]", "") + ".example.org");
        p.setWebsite("https://example.org/" + id.replace("prov-", ""));
        p.setEmployees(employees);
        p.setVerificationStatus(VerificationStatus.UNVERIFIED);
        p.setCreatedAt(at(380, 9));
        providers.save(p);
    }

    private void user(String id, String name, String title, UserRole role, String deptId, String providerId) {
        AppUser u = new AppUser();
        u.setId(id);
        u.setFullName(name);
        u.setTitle(title);
        u.setEmail(id.replace("u-", "") + "@mzansimetro.example.org");
        u.setRole(role);
        u.setDepartmentId(deptId);
        u.setProviderId(providerId);
        u.setActive(true);
        u.setCreatedAt(at(380, 9));
        users.save(u);
    }

    private void solution(String id, String providerId, String name, NeedCategory cat, String description,
                          List<String> tech, boolean openSource, String repo, String license, SolutionMaturity maturity,
                          int deployments, List<String> coverage) {
        InnovationSolution s = new InnovationSolution();
        s.setId(id);
        s.setProviderId(providerId);
        s.setName(name);
        s.setDescription(description);
        s.setCategory(cat);
        s.setTechnologies(new ArrayList<>(tech));
        s.setOpenSource(openSource);
        s.setRepositoryUrl(repo);
        s.setLicense(license);
        s.setDemoUrl("https://example.org/demo/" + id.replace("sol-", ""));
        s.setCoverageProvinces(new ArrayList<>(coverage));
        s.setMaturity(maturity);
        s.setExternalDeployments(deployments);
        s.setStatus(SolutionStatus.PUBLISHED);
        s.setCreatedAt(at(370, 10));
        solutions.save(s);
    }

    // ---------------------------------------------------------------------------------------- stories
    /** Completed: water leak detection in Mamelodi (Ubuntu Sensors, an innovator) with measured impact. */
    private void storyWaterLeaks() {
        var need = as("u-themba", at(200, 9), () -> needs.create(need("Water Leak Detection - Mamelodi",
                "Non-revenue water losses in Mamelodi exceed 40% and leaks are only found when residents report them.",
                "dept-infra", NeedCategory.WATER_ENERGY, Priority.HIGH, 720_000,
                List.of("IoT", "Monitoring", "Analytics", "Mobile reporting"),
                "Detect leaks early, cut water losses by a quarter and repair leaks within 24 hours.",
                dtoGeo("Mamelodi (Wards 15-18)", -25.7120, 28.3700),
                "Reduce water losses and repair backlog in Mamelodi.", SourcingMethod.OPEN_OPPORTUNITY, true)));
        String pr = need.request().id();
        as("u-naledi", at(199, 10), () -> approvals.approve(stepId(pr, 1), "Aligned with the water-loss reduction plan."));
        as("u-lerato", at(198, 11), () -> approvals.approve(stepId(pr, 2), "Funded from the infrastructure innovation allocation."));
        var opp = as("u-johan", at(196, 9), () -> opportunities.create(need.id(), new Dto.CreateOpportunityRequest(
                "Smart Leak Detection for Mamelodi", "Looking for sensor-based leak detection with a live dashboard for the water unit.",
                at(176, 17), List.of(ProviderType.values()), false, defaultCriteria(), true)));
        var s1 = as("u-sibusiso", at(185, 14), () -> submissions.submit(opp.id(), bid("sol-leaksense", 655_000,
                "150 acoustic LeakSense nodes on trunk mains with LoRaWAN backhaul and a leak triage dashboard.",
                "Phase 1 install in 6 weeks, phase 2 in 10 weeks, control-room training in week 12.", 16, 5)));
        var s2 = as("u-tumelo", at(183, 11), () -> submissions.submit(opp.id(), bid("sol-aquatrack", 690_000,
                "Water balance analytics with third-party sensors.", "Dashboard in 8 weeks; sensors via partner.", 20, 2)));
        var s3 = as("u-daniel", at(180, 16), () -> submissions.submit(opp.id(), bid(null, 610_000,
                "Imported ultrasonic meters integrated into our IoT platform.", "Deployment by national team.", 14, 1)));
        as("u-johan", at(175, 9), () -> opportunities.startEvaluation(opp.id()));
        evaluate("u-johan", at(174, 10), opp.id(), s1.id(), 90, 88, "Purpose-built acoustic sensing with local support.", "Fits Mamelodi mains; pilot proven.");
        evaluate("u-johan", at(174, 11), opp.id(), s2.id(), 80, 75, "Strong analytics, sensors outsourced.", "Partially fits; relies on partner hardware.");
        evaluate("u-johan", at(174, 12), opp.id(), s3.id(), 70, 65, "Generic metering, not leak localisation.", "Limited fit for leak detection.");
        var po = as("u-johan", at(173, 9), () -> procurement.selectSubmission(opp.id(), new Dto.SelectRequest(s1.id(), null)));
        as("u-johan", at(172, 10), () -> procurement.verify(supplierIdOf("prov-ubuntu"),
                new Dto.VerifySupplierRequest("MAAA0781234", true)));
        var issued = as("u-johan", at(171, 9), () -> procurement.issue(po.id(),
                new Dto.IssuePoRequest("u-naledi", date(165), date(60))));
        String impl = issued.implementationId();
        var d1 = as("u-naledi", at(165, 9), () -> implementations.addMilestone(impl, new Dto.CreateMilestoneRequest("Phase 1: 70 sensors on trunk mains", date(130))));
        as("u-naledi", at(164, 9), () -> implementations.addMilestone(impl, new Dto.CreateMilestoneRequest("Phase 2: 80 sensors on distribution network", date(95))));
        var d3 = as("u-naledi", at(164, 10), () -> implementations.addMilestone(impl, new Dto.CreateMilestoneRequest("Control-room integration & training", date(70))));
        as("u-naledi", at(160, 9), () -> implementations.addUpdate(impl, new Dto.CreateUpdateRequest(UpdateType.PROGRESS, "Installation started in Ward 15.", 10, null)));
        as("u-naledi", at(131, 15), () -> implementations.completeMilestone(d1.milestones().get(0).id()));
        as("u-naledi", at(96, 15), () -> implementations.completeMilestone(d3.milestones().get(1).id()));
        as("u-naledi", at(72, 15), () -> implementations.completeMilestone(d3.milestones().get(2).id()));
        as("u-naledi", at(70, 12), () -> implementations.addUpdate(impl, new Dto.CreateUpdateRequest(UpdateType.EVIDENCE,
                "Commissioning report and sensor map signed off by the water unit.", 100, EVIDENCE + "leaksense-commissioning.pdf")));
        var withMetrics = as("u-naledi", at(160, 11), () -> impact.addMetric(impl, new Dto.CreateMetricRequest("Water lost",
                "Non-revenue water lost per month in the pilot zone", "kL/month", Direction.DECREASE, r(42_000), r(30_000))));
        as("u-naledi", at(160, 12), () -> impact.addMetric(impl, new Dto.CreateMetricRequest("Leak response time",
                "Average hours from detection to repair", "hours", Direction.DECREASE, r(72), r(24))));
        as("u-naledi", at(160, 13), () -> impact.addMetric(impl, new Dto.CreateMetricRequest("Jobs supported",
                "Local jobs created or sustained", "jobs", Direction.INCREASE, r(0), r(5))));
        var all = as("u-naledi", at(160, 14), () -> impact.addMetric(impl, new Dto.CreateMetricRequest("Local SMEs supported",
                "Local SMEs / innovators contracted", "SMEs", Direction.INCREASE, r(0), r(1))));
        Map<String, String> m = new java.util.HashMap<>();
        all.metrics().forEach(x -> m.put(x.name(), x.id()));
        measure("u-naledi", 100, m.get("Water lost"), 38_500, "Month 2 water balance");
        measure("u-naledi", 60, m.get("Water lost"), 33_200, "Month 4 water balance");
        measure("u-naledi", 20, m.get("Water lost"), 31_500, "Month 6 water balance");
        measure("u-naledi", 90, m.get("Leak response time"), 30, "Repair log Q1");
        measure("u-naledi", 30, m.get("Leak response time"), 20, "Repair log Q2");
        measure("u-naledi", 69, m.get("Jobs supported"), 5, "Payroll of local installers");
        measure("u-naledi", 69, m.get("Local SMEs supported"), 1, "Ubuntu Sensors contracted");
        as("u-naledi", at(69, 16), () -> implementations.complete(impl));
    }

    private void measure(String userId, int daysAgo, String metricId, long value, String note) {
        as(userId, at(daysAgo, 12), () -> impact.addMeasurement(metricId, new Dto.CreateMeasurementRequest(r(value),
                at(daysAgo, 12), EVIDENCE + "measurement-" + metricId.substring(0, 8) + "-" + daysAgo + ".pdf", note, null)));
    }

    /** In progress: digital business permits delivered by an open-source project (Open Source Agenda link). */
    private void storyDigitalPermits() {
        var need = as("u-refilwe", at(120, 9), () -> needs.create(need("Digital Business Permit Service",
                "Informal and small businesses wait on average 21 days for a trading permit because applications are paper-based.",
                "dept-econ", NeedCategory.DIGITAL_SERVICES, Priority.HIGH, 320_000,
                List.of("Digital public services", "Workflow", "Mobile reporting"),
                "Permits issued within 5 working days, applied for online or on a phone.",
                dtoGeo("Region 3", -25.7479, 28.2293), "Speed up trading permits for small businesses.",
                SourcingMethod.OPEN_OPPORTUNITY, true)));
        String pr = need.request().id();
        as("u-karabo", at(119, 10), () -> approvals.approve(stepId(pr, 1), "Supports the SMME support strategy."));
        as("u-lerato", at(118, 12), () -> approvals.approve(stepId(pr, 2), null));
        var opp = as("u-johan", at(116, 9), () -> opportunities.create(need.id(), new Dto.CreateOpportunityRequest(
                "Online Trading Permit Service", "Digital permit applications, tracking and approvals for small businesses.",
                at(98, 17), List.of(ProviderType.values()), true, defaultCriteria(), true)));
        var s1 = as("u-ayanda", at(105, 10), () -> submissions.submit(opp.id(), bid("sol-openpermit", 298_000,
                "Deploy OpenPermit (AGPL-3.0) on the metro's cloud, integrate with the revenue system.",
                "Process mapping, Region 3 pilot, city-wide rollout; code contributed back upstream.", 20, 4)));
        var s2 = as("u-precious", at(103, 13), () -> submissions.submit(opp.id(), bid(null, 305_000,
                "Custom build with co-op field agents assisting applicants.", "Build in 16 weeks.", 24, 6)));
        var s3 = as("u-daniel", at(101, 9), () -> submissions.submit(opp.id(), bid(null, 280_000,
                "Configure a commercial case-management product.", "Licensed SaaS, 12-week setup.", 12, 0)));
        as("u-johan", at(97, 9), () -> opportunities.startEvaluation(opp.id()));
        evaluate("u-johan", at(96, 10), opp.id(), s1.id(), 92, 90, "Mature open-source product, strong integration plan.", "Proven in two municipalities; no licence lock-in.");
        evaluate("u-johan", at(96, 11), opp.id(), s2.id(), 70, 72, "Custom build carries delivery risk.", "Good community reach.");
        evaluate("u-johan", at(96, 12), opp.id(), s3.id(), 65, 60, "Generic product, licence costs recur.", "Weak fit for informal traders.");
        var po = as("u-johan", at(95, 9), () -> procurement.selectSubmission(opp.id(), new Dto.SelectRequest(s1.id(), null)));
        as("u-johan", at(94, 10), () -> procurement.verify(supplierIdOf("prov-openward"), new Dto.VerifySupplierRequest("MAAA0993310", true)));
        var issued = as("u-johan", at(93, 9), () -> procurement.issue(po.id(), new Dto.IssuePoRequest("u-karabo", date(90), today.plusDays(35))));
        String impl = issued.implementationId();
        var d = as("u-karabo", at(90, 9), () -> implementations.addMilestone(impl, new Dto.CreateMilestoneRequest("Process mapping & configuration", date(70))));
        as("u-karabo", at(90, 10), () -> implementations.addMilestone(impl, new Dto.CreateMilestoneRequest("Region 3 pilot live", date(30))));
        var d3 = as("u-karabo", at(90, 11), () -> implementations.addMilestone(impl, new Dto.CreateMilestoneRequest("City-wide rollout", today.plusDays(25))));
        as("u-karabo", at(71, 15), () -> implementations.completeMilestone(d.milestones().get(0).id()));
        as("u-karabo", at(31, 15), () -> implementations.completeMilestone(d3.milestones().get(1).id()));
        as("u-karabo", at(30, 12), () -> implementations.addUpdate(impl, new Dto.CreateUpdateRequest(UpdateType.EVIDENCE,
                "Region 3 pilot go-live report.", 60, EVIDENCE + "openpermit-pilot.pdf")));
        as("u-karabo", at(80, 9), () -> impact.addMetric(impl, new Dto.CreateMetricRequest("Service turnaround time",
                "Average days to issue a trading permit", "days", Direction.DECREASE, r(21), r(5))));
        var all = as("u-karabo", at(80, 10), () -> impact.addMetric(impl, new Dto.CreateMetricRequest("Citizens served digitally",
                "Permit applications submitted online", "applications", Direction.INCREASE, r(0), r(2_000))));
        Map<String, String> m = new java.util.HashMap<>();
        all.metrics().forEach(x -> m.put(x.name(), x.id()));
        measure("u-karabo", 28, m.get("Service turnaround time"), 16, "Pilot month 1");
        measure("u-karabo", 5, m.get("Service turnaround time"), 12, "Pilot month 2");
        measure("u-karabo", 5, m.get("Citizens served digitally"), 1_240, "Online applications to date");
    }

    /** At risk: streetlight fault monitoring procured through the QUOTATION route. */
    private void storyStreetlights() {
        var need = as("u-themba", at(150, 9), () -> needs.create(need("Smart Streetlight Fault Monitoring",
                "Streetlight faults take two weeks to repair because outages are only found through complaints.",
                "dept-infra", NeedCategory.INFRASTRUCTURE, Priority.MEDIUM, 240_000, List.of("IoT", "Monitoring"),
                "Faults detected automatically and repaired within 3 days.", dtoGeo("Soshanguve Block L", -25.5400, 28.0900),
                "Pilot 500 connected streetlight controllers.", SourcingMethod.QUOTATION, true)));
        String pr = need.request().id();
        as("u-naledi", at(149, 10), () -> approvals.approve(stepId(pr, 1), null));
        as("u-lerato", at(148, 10), () -> approvals.approve(stepId(pr, 2), null));
        as("u-johan", at(145, 9), () -> procurement.addQuote(pr, new Dto.CreateQuoteRequest(supplierIdOf("prov-globaltech"), r(228_000), date(115), true, null)));
        as("u-johan", at(144, 9), () -> procurement.addQuote(pr, new Dto.CreateQuoteRequest(supplierIdOf("prov-khanya"), r(236_500), date(115), true, null)));
        as("u-johan", at(143, 9), () -> procurement.addQuote(pr, new Dto.CreateQuoteRequest(supplierIdOf("prov-ubuntu"), r(241_000), date(115), true, null)));
        var board = as("u-johan", at(142, 9), () -> procurement.quoteBoard(pr));
        var po = as("u-johan", at(142, 10), () -> procurement.selectQuote(pr, new Dto.SelectQuoteRequest(board.lowestCompliantQuoteId(), null)));
        var issued = as("u-johan", at(141, 9), () -> procurement.issue(po.id(), new Dto.IssuePoRequest("u-naledi", date(135), date(5))));
        String impl = issued.implementationId();
        as("u-naledi", at(135, 9), () -> implementations.addMilestone(impl, new Dto.CreateMilestoneRequest("Controller installation (500 lights)", date(10))));
        as("u-naledi", at(120, 9), () -> implementations.addUpdate(impl, new Dto.CreateUpdateRequest(UpdateType.PROGRESS, "First 120 controllers installed.", 25, null)));
        as("u-naledi", at(40, 9), () -> implementations.addUpdate(impl, new Dto.CreateUpdateRequest(UpdateType.ISSUE,
                "Hardware import delays at the port - 380 controllers outstanding.", 35, null)));
        as("u-naledi", at(40, 10), () -> implementations.update(impl, new Dto.UpdateImplementationRequest(ImplementationStatus.AT_RISK, 35, null, null)));
        var all = as("u-naledi", at(130, 9), () -> impact.addMetric(impl, new Dto.CreateMetricRequest("Fault repair time",
                "Average days from fault to repair", "days", Direction.DECREASE, r(14), r(3))));
        measure("u-naledi", 15, all.metrics().get(0).id(), 13, "Maintenance log");
    }

    /** HERO story: approved need -> published -> 3 local submissions -> closed -> 2 of 3 evaluated. */
    private void storyIllegalDumping() {
        var need = as("u-thandi", at(24, 9), () -> needs.create(need("Illegal Dumping Monitoring Solution",
                "Illegal dumping is increasing across several wards. The municipality needs a technology-enabled method for "
                        + "identifying, mapping and monitoring illegal dumping hotspots.",
                "dept-env", NeedCategory.WASTE_ENVIRONMENT, Priority.HIGH, 500_000,
                List.of("GIS", "Mobile reporting", "Analytics", "Location intelligence", "Monitoring", "Computer vision (optional)"),
                "Fewer illegal dumping hotspots across 12 wards, with a live hotspot map for enforcement teams.",
                dtoGeo("Soshanguve (Wards 20-31)", -25.5200, 28.1000),
                "Clean-up costs rose 40% year-on-year; enforcement needs data on where dumping happens.",
                SourcingMethod.OPEN_OPPORTUNITY, true)));
        String pr = need.request().id();
        as("u-sipho", at(23, 10), () -> approvals.approve(stepId(pr, 1), "Priority for the ward clean-up programme."));
        as("u-lerato", at(22, 14), () -> approvals.approve(stepId(pr, 2), "Within the Environmental Services allocation."));
        var opp = as("u-johan", at(21, 9), () -> opportunities.create(need.id(), new Dto.CreateOpportunityRequest(
                "Illegal Dumping Intelligence Platform",
                "Mzansi Metro invites local innovators to provide a platform that identifies, maps and monitors illegal dumping "
                        + "hotspots across 12 wards in Soshanguve, combining mobile citizen reporting, GIS and analytics.",
                at(6, 17), List.of(ProviderType.SME, ProviderType.STARTUP, ProviderType.INNOVATOR,
                        ProviderType.TECHNOLOGY_COMPANY, ProviderType.OPEN_SOURCE_PROJECT, ProviderType.COOPERATIVE,
                        ProviderType.LOCAL_BUSINESS), true, defaultCriteria(), true)));
        as("u-nomsa", at(12, 15), () -> submissions.submit(opp.id(), bid("sol-dumpwatch", 420_000,
                "DumpWatch: WhatsApp and app reporting, GIS hotspot map, and computer-vision detection on existing ward cameras.",
                "Week 1-3 baseline hotspot survey; week 4-8 app rollout to 12 wards; week 9-12 enforcement team training and handover.",
                12, 8)));
        var eco = as("u-kabelo", at(10, 11), () -> submissions.submit(opp.id(), bid("sol-ecomap", 390_000,
                "EcoMap Reporter adapted for dumping reports with ward dashboards.",
                "Adapt the app in 8 weeks, then pilot in 6 wards before full rollout.", 16, 5)));
        var gt = as("u-daniel", at(8, 16), () -> submissions.submit(opp.id(), bid("sol-cctv", 350_000,
                "Extend SmartCity CCTV analytics to dumping hotspots.", "Install cameras at 20 sites using our national team.", 10, 1)));
        as("u-johan", at(5, 9), () -> opportunities.startEvaluation(opp.id()));
        evaluate("u-johan", at(4, 10), opp.id(), eco.id(), 75, 80, "Solid app, limited GIS analytics.", "Good citizen reach; pilot-first reduces coverage.");
        evaluate("u-johan", at(4, 11), opp.id(), gt.id(), 70, 60, "Mature CCTV, not built for dumping.", "Camera-only approach misses citizen reports.");
    }

    /** Published and closing soon (community safety). */
    private void storyCommunitySafety() {
        var need = as("u-zodwa", at(20, 9), () -> needs.create(need("Community Safety Hotspot Reporting",
                "Residents lack a trusted channel to report safety hotspots such as broken lights, open veld and drug dens.",
                "dept-comm", NeedCategory.COMMUNITY_SAFETY, Priority.MEDIUM, 180_000,
                List.of("Mobile reporting", "Location intelligence", "Analytics"),
                "Hotspots reported and routed to the right team within 24 hours.", dtoGeo("Mabopane", -25.4970, 28.1000),
                "Community safety forums asked for a reporting tool.", SourcingMethod.OPEN_OPPORTUNITY, true)));
        String pr = need.request().id();
        as("u-zanele", at(19, 10), () -> approvals.approve(stepId(pr, 1), null));
        as("u-lerato", at(18, 11), () -> approvals.approve(stepId(pr, 2), null));
        var opp = as("u-johan", at(17, 9), () -> opportunities.create(need.id(), new Dto.CreateOpportunityRequest(
                "Community Safety Hotspot Reporting Tool", "A simple, trusted way for residents to report safety hotspots.",
                future(4, 17), List.of(ProviderType.values()), true, defaultCriteria(), true)));
        as("u-lebo", at(3, 10), () -> submissions.submit(opp.id(), bid("sol-safeward", 165_000,
                "SafeWard Reporter with WhatsApp intake and ward routing.", "Pilot in Mabopane in 6 weeks.", 10, 3)));
    }

    /** Published street-economy opportunity open to co-ops and local businesses. */
    private void storyTraderPayments() {
        var need = as("u-refilwe", at(10, 9), () -> needs.create(need("Informal Trader Digital Payments Pilot",
                "Informal traders at taxi ranks lose sales because customers increasingly pay digitally.",
                "dept-econ", NeedCategory.LOCAL_ECONOMIC_DEVELOPMENT, Priority.MEDIUM, 95_000,
                List.of("Mobile payments", "Onboarding", "Analytics"),
                "200 traders accepting digital payments, with simple bookkeeping.", dtoGeo("Mabopane Station", -25.5000, 28.0950),
                "Support township trader resilience.", SourcingMethod.OPEN_OPPORTUNITY, true)));
        String pr = need.request().id();
        as("u-karabo", at(9, 10), () -> approvals.approve(stepId(pr, 1), null));
        as("u-lerato", at(9, 15), () -> approvals.approve(stepId(pr, 2), null));
        var opp = as("u-johan", at(8, 9), () -> opportunities.create(need.id(), new Dto.CreateOpportunityRequest(
                "Digital Payments for Informal Traders", "Onboard 200 informal traders to low-cost digital payments. "
                + "Participation is open where organisational procurement rules permit.",
                future(20, 17), List.of(ProviderType.COOPERATIVE, ProviderType.LOCAL_BUSINESS, ProviderType.SME, ProviderType.STARTUP),
                false, defaultCriteria(), true)));
        as("u-precious", at(2, 11), () -> submissions.submit(opp.id(), bid("sol-kasipay", 88_000,
                "KasiPay Merchant with co-op field agents onboarding traders at the rank.", "Onboard 200 traders over 8 weeks.", 8, 6)));
    }

    /** Operational requests showing each approval outcome and the quotation comparison. */
    private void storySmallRequests() {
        // Auto-approved low-value request (< R5 000), awaiting quotes
        as("u-thandi", at(2, 10), () -> needs.create(need("Protective gloves & clean-up kits",
                "Volunteer clean-up teams in Ward 24 lack protective equipment.", "dept-env", NeedCategory.WASTE_ENVIRONMENT,
                Priority.LOW, 3_200, List.of(), "Safe volunteer clean-ups.", dtoGeo("Ward 24", -25.5300, 28.1050),
                "Monthly clean-up campaign.", SourcingMethod.QUOTATION, true)));
        // Approved quotation request with 3 quotes awaiting selection
        var hall = as("u-zodwa", at(6, 9), () -> needs.create(need("Community hall sound system",
                "The Mabopane community hall has no working PA system for public meetings.", "dept-comm",
                NeedCategory.COMMUNITY_FACILITIES, Priority.LOW, 18_000, List.of(), "Public meetings are audible to 300 people.",
                dtoGeo("Mabopane Community Hall", -25.4990, 28.1020), "Required for IDP public participation meetings.",
                SourcingMethod.QUOTATION, true)));
        String hallPr = hall.request().id();
        as("u-zanele", at(5, 10), () -> approvals.approve(stepId(hallPr, 1), null));
        as("u-johan", at(3, 9), () -> procurement.addQuote(hallPr, new Dto.CreateQuoteRequest(supplierIdOf("prov-tshwaneaudio"), r(17_200), today.plusDays(25), true, null)));
        as("u-johan", at(3, 11), () -> procurement.addQuote(hallPr, new Dto.CreateQuoteRequest(supplierIdOf("prov-soweto"), r(16_450), today.plusDays(25), false, "Tax compliance status expired")));
        as("u-johan", at(2, 9), () -> procurement.addQuote(hallPr, new Dto.CreateQuoteRequest(supplierIdOf("prov-megaav"), r(18_900), today.plusDays(25), true, null)));
        // Pending at Department Manager - OVERDUE (submitted 3 days ago)
        as("u-musa", at(3, 9), () -> needs.create(need("Laptops for ward councillor support office",
                "Ward support staff share two ageing laptops, delaying constituency case logging.", "dept-ict",
                NeedCategory.ICT_OPERATIONS, Priority.MEDIUM, 48_500, List.of(), "Each support officer has a working laptop.",
                dtoGeo("Civic Centre", -25.7470, 28.1880), "Replace end-of-life devices.", SourcingMethod.QUOTATION, true)));
        // Pending at Finance Director - within SLA
        var drone = as("u-thandi", at(2, 9), () -> needs.create(need("Drone survey of landfill sites",
                "Landfill airspace estimates are two years old.", "dept-env", NeedCategory.WASTE_ENVIRONMENT, Priority.MEDIUM,
                145_000, List.of("Drone survey", "GIS", "Analytics"), "Accurate remaining-airspace model for 3 landfills.",
                dtoGeo("Soshanguve landfill", -25.5150, 28.0800), "Required for landfill licence compliance planning.",
                SourcingMethod.OPEN_OPPORTUNITY, true)));
        as("u-sipho", at(1, 10), () -> approvals.approve(stepId(drone.request().id(), 1), null));
        // Rejected
        var gazebo = as("u-refilwe", at(7, 9), () -> needs.create(need("Branded marketing gazebos",
                "Events team wants new branded gazebos.", "dept-econ", NeedCategory.LOCAL_ECONOMIC_DEVELOPMENT, Priority.LOW,
                62_000, List.of(), "Branded presence at events.", dtoGeo("Civic Centre", -25.7470, 28.1880),
                "Replace faded gazebos.", SourcingMethod.QUOTATION, true)));
        as("u-karabo", at(6, 11), () -> approvals.reject(stepId(gazebo.request().id(), 1),
                "Duplicates existing stock in the events store - reuse before buying."));
        // Draft
        as("u-themba", at(1, 15), () -> needs.create(need("Pothole reporting and repair tracking",
                "Pothole repairs are not tracked from report to fix.", "dept-infra", NeedCategory.INFRASTRUCTURE, Priority.MEDIUM,
                250_000, List.of("Mobile reporting", "GIS"), "Potholes repaired within 7 days of a report.",
                dtoGeo("Region 1", -25.5500, 28.1200), null, null, false)));
    }

    // ---------------------------------------------------------------------------------------- post-processing
    /** Seed-time only: re-insert the audit log in chronological order so the chain reads like real history. */
    private void rechainAuditChronologically() {
        em.flush();
        List<AuditLogEntry> all = new ArrayList<>(auditEntries.findAllByOrderBySequenceAsc());
        all.sort(Comparator.comparing(AuditLogEntry::getOccurredAt).thenComparing(AuditLogEntry::getSequence));
        List<AuditLogEntry> copies = all.stream().map(e -> {
            AuditLogEntry c = new AuditLogEntry();
            c.setOccurredAt(e.getOccurredAt());
            c.setActorId(e.getActorId());
            c.setAction(e.getAction());
            c.setEntityType(e.getEntityType());
            c.setEntityId(e.getEntityId());
            c.setNeedId(e.getNeedId());
            c.setSummary(e.getSummary());
            c.setMetadata(e.getMetadata());
            return c;
        }).toList();
        em.createNativeQuery("DELETE FROM audit_log_entry").executeUpdate();
        em.flush();
        em.clear();
        for (AuditLogEntry c : copies) {
            audit.recordRaw(c.getOccurredAt(), c.getActorId(), c.getAction(), c.getEntityType(), c.getEntityId(),
                    c.getNeedId(), c.getSummary(), c.getMetadata());
        }
    }

    private void markOldNotificationsRead() {
        Instant cutoff = at(2, 0);
        notifications.findAll().forEach(n -> {
            if (n.getCreatedAt().isBefore(cutoff)) {
                n.setRead(true);
                notifications.save(n);
            }
        });
    }
}
