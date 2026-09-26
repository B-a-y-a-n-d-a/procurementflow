package com.civicflow.web;

import com.civicflow.ai.CivicAiService;
import com.civicflow.domain.AppUser;
import com.civicflow.domain.AuditLogEntry;
import com.civicflow.domain.Notification;
import com.civicflow.domain.enums.UserRole;
import com.civicflow.repository.AppUserRepository;
import com.civicflow.repository.AuditLogEntryRepository;
import com.civicflow.repository.DepartmentRepository;
import com.civicflow.repository.NotificationRepository;
import com.civicflow.security.CurrentUser;
import com.civicflow.seed.DemoDataSeeder;
import com.civicflow.service.AuditService;
import com.civicflow.service.DtoMapper;
import com.civicflow.service.RuleService;
import com.civicflow.web.dto.Dto;
import jakarta.validation.Valid;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/** Auth (demo), reference data, notifications, audit, rules, CIVIC AI, admin, health. */
@RestController
@RequestMapping("/api")
public class SystemController {

    private static final List<UserRole> PERSONA_ORDER = List.of(UserRole.DEPARTMENT_OFFICER,
            UserRole.DEPARTMENT_MANAGER, UserRole.FINANCE_DIRECTOR, UserRole.PROCUREMENT_OFFICER, UserRole.PROVIDER,
            UserRole.EXECUTIVE, UserRole.AUDITOR, UserRole.ADMIN, UserRole.EVALUATOR);

    private final AppUserRepository users;
    private final DepartmentRepository departments;
    private final NotificationRepository notifications;
    private final AuditLogEntryRepository auditEntries;
    private final AuditService audit;
    private final RuleService rules;
    private final CivicAiService ai;
    private final DemoDataSeeder seeder;
    private final CurrentUser currentUser;
    private final DtoMapper mapper;

    public SystemController(AppUserRepository users, DepartmentRepository departments,
                            NotificationRepository notifications, AuditLogEntryRepository auditEntries,
                            AuditService audit, RuleService rules, CivicAiService ai, DemoDataSeeder seeder,
                            CurrentUser currentUser, DtoMapper mapper) {
        this.users = users;
        this.departments = departments;
        this.notifications = notifications;
        this.auditEntries = auditEntries;
        this.audit = audit;
        this.rules = rules;
        this.ai = ai;
        this.seeder = seeder;
        this.currentUser = currentUser;
        this.mapper = mapper;
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "UP");
    }

    // ---------- auth (demo) ----------
    @GetMapping("/auth/personas")
    @Transactional(readOnly = true)
    public List<Dto.User> personas() {
        return users.findAll().stream().filter(AppUser::isActive)
                .sorted(Comparator.comparing((AppUser u) -> PERSONA_ORDER.indexOf(u.getRole()))
                        .thenComparing(AppUser::getFullName))
                .map(mapper::user).toList();
    }

    @GetMapping("/auth/me")
    @Transactional(readOnly = true)
    public Dto.User me() {
        return mapper.user(currentUser.get());
    }

    @GetMapping("/users")
    @Transactional(readOnly = true)
    public List<Dto.User> users() {
        currentUser.requireStaff();
        return users.findAll().stream().filter(u -> u.getRole() != UserRole.PROVIDER).map(mapper::user).toList();
    }

    @GetMapping("/departments")
    @Transactional(readOnly = true)
    public List<Dto.Department> departments() {
        currentUser.requireStaff();
        return departments.findAll().stream().map(mapper::department)
                .sorted(Comparator.comparing(Dto.Department::name)).toList();
    }

    // ---------- notifications ----------
    private Dto.NotificationList notificationList(String userId) {
        return new Dto.NotificationList(notifications.countByRecipientIdAndReadFalse(userId),
                notifications.findTop50ByRecipientIdOrderByCreatedAtDesc(userId).stream().map(mapper::notification).toList());
    }

    @GetMapping("/notifications")
    @Transactional(readOnly = true)
    public Dto.NotificationList notifications() {
        return notificationList(currentUser.id());
    }

    @PostMapping("/notifications/{id}/read")
    @Transactional
    public Dto.NotificationList read(@PathVariable String id) {
        String userId = currentUser.id();
        Notification n = notifications.findById(id).orElseThrow(() -> ApiException.notFound("Notification", id));
        if (!n.getRecipientId().equals(userId)) {
            throw ApiException.forbidden("Not your notification");
        }
        n.setRead(true);
        notifications.save(n);
        return notificationList(userId);
    }

    @PostMapping("/notifications/read-all")
    @Transactional
    public Dto.NotificationList readAll() {
        String userId = currentUser.id();
        notifications.findByRecipientIdAndReadFalse(userId).forEach(n -> {
            n.setRead(true);
            notifications.save(n);
        });
        return notificationList(userId);
    }

    // ---------- audit ----------
    @GetMapping("/audit")
    @Transactional(readOnly = true)
    public List<Dto.AuditEntry> audit(@RequestParam(required = false) String needId,
                                      @RequestParam(required = false) String entityType,
                                      @RequestParam(required = false) String action,
                                      @RequestParam(defaultValue = "200") int limit) {
        currentUser.requireStaff();
        List<AuditLogEntry> entries = auditEntries.findAllByOrderBySequenceDesc(PageRequest.of(0, Math.min(limit, 1000)))
                .stream()
                .filter(e -> needId == null || needId.equals(e.getNeedId()))
                .filter(e -> entityType == null || entityType.equals(e.getEntityType()))
                .filter(e -> action == null || action.equals(e.getAction()))
                .toList();
        Map<String, AppUser> actors = new HashMap<>();
        entries.stream().map(AuditLogEntry::getActorId).filter(Objects::nonNull).distinct()
                .forEach(id -> users.findById(id).ifPresent(u -> actors.put(id, u)));
        return entries.stream().map(e -> mapper.audit(e, actors)).toList();
    }

    @GetMapping("/audit/verify")
    public Dto.AuditVerify verify() {
        currentUser.requireStaff();
        AuditService.Verification v = audit.verify();
        return new Dto.AuditVerify(v.valid(), v.checked(), v.brokenAtSequence(), v.headHash());
    }

    // ---------- rules ----------
    @GetMapping("/rules")
    public Dto.RuleSet rules() {
        currentUser.get();
        return rules.currentDto();
    }

    @PutMapping("/rules")
    public Dto.RuleSet updateRules(@Valid @RequestBody Dto.RuleSet body) {
        return rules.update(body);
    }

    // ---------- CIVIC AI ----------
    @PostMapping("/ai/{task}")
    public Dto.AiResult ai(@PathVariable String task, @RequestBody(required = false) Dto.AiRequest body) {
        return ai.run(task, body == null ? new Dto.AiRequest(null, null, null, null) : body);
    }

    // ---------- admin ----------
    @PostMapping("/admin/reset-demo")
    public Map<String, Object> reset() {
        currentUser.require(UserRole.ADMIN);
        seeder.reset();
        return Map.of("ok", true);
    }
}
