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
import com.civicflow.service.AdminUserService;
import com.civicflow.service.AuditService;
import com.civicflow.service.AuthService;
import com.civicflow.service.DtoMapper;
import com.civicflow.service.RuleService;
import com.civicflow.web.dto.Dto;
import jakarta.validation.Valid;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/** Auth, reference data, notifications, audit, rules, CIVIC AI, admin, health. */
@RestController
@RequestMapping("/api")
public class SystemController {

    private final AppUserRepository users;
    private final DepartmentRepository departments;
    private final NotificationRepository notifications;
    private final AuditLogEntryRepository auditEntries;
    private final AuditService audit;
    private final RuleService rules;
    private final CivicAiService ai;
    private final AuthService auth;
    private final CurrentUser currentUser;
    private final DtoMapper mapper;
    private final AdminUserService adminUsers;

    public SystemController(AppUserRepository users, DepartmentRepository departments,
                            NotificationRepository notifications, AuditLogEntryRepository auditEntries,
                            AuditService audit, RuleService rules, CivicAiService ai, AuthService auth,
                            CurrentUser currentUser, DtoMapper mapper, AdminUserService adminUsers) {
        this.users = users;
        this.departments = departments;
        this.notifications = notifications;
        this.auditEntries = auditEntries;
        this.audit = audit;
        this.rules = rules;
        this.ai = ai;
        this.auth = auth;
        this.currentUser = currentUser;
        this.mapper = mapper;
        this.adminUsers = adminUsers;
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "UP");
    }

    // ---------- auth ----------
    @PostMapping("/auth/login")
    public Dto.LoginResponse login(@Valid @RequestBody Dto.LoginRequest body) {
        return auth.login(body);
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

    // ---------- admin users ----------
    @GetMapping("/admin/users")
    @Transactional(readOnly = true)
    public List<Dto.User> adminUsers(@RequestParam(required = false) String search,
                                     @RequestParam(required = false) UserRole role,
                                     @RequestParam(required = false) Boolean active) {
        return adminUsers.listUsers(search, role, active);
    }

    @GetMapping("/admin/users/{id}")
    @Transactional(readOnly = true)
    public Dto.User adminUser(@PathVariable String id) {
        return adminUsers.getUser(id);
    }

    @PostMapping("/admin/users")
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public Dto.User createAdminUser(@Valid @RequestBody Dto.CreateUserRequest body) {
        return adminUsers.createUser(body);
    }

    @PutMapping("/admin/users/{id}")
    @Transactional
    public Dto.User updateAdminUser(@PathVariable String id, @Valid @RequestBody Dto.UpdateUserRequest body) {
        return adminUsers.updateUser(id, body);
    }

    @PatchMapping("/admin/users/{id}/role")
    @Transactional
    public Dto.User updateAdminUserRole(@PathVariable String id, @Valid @RequestBody Dto.ChangeRoleRequest body) {
        return adminUsers.changeRole(id, body);
    }

    @PatchMapping("/admin/users/{id}/status")
    @Transactional
    public Dto.User updateAdminUserStatus(@PathVariable String id, @Valid @RequestBody Dto.ChangeStatusRequest body) {
        return adminUsers.changeStatus(id, body);
    }

    @DeleteMapping("/admin/users/{id}")
    @Transactional
    public void deleteAdminUser(@PathVariable String id) {
        adminUsers.deleteUser(id);
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
}
