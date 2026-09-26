package com.civicflow.service;

import com.civicflow.domain.AppUser;
import com.civicflow.domain.ApprovalStep;
import com.civicflow.domain.InnovationOpportunity;
import com.civicflow.domain.Notification;
import com.civicflow.domain.OpportunitySubmission;
import com.civicflow.domain.PurchaseOrder;
import com.civicflow.domain.PurchaseRequest;
import com.civicflow.domain.Supplier;
import com.civicflow.domain.enums.UserRole;
import com.civicflow.repository.*;
import com.civicflow.security.CurrentUser;
import com.civicflow.web.ApiException;
import com.civicflow.web.dto.Dto;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
public class AdminUserService {

    private final AppUserRepository users;
    private final AuditService audit;
    private final CurrentUser currentUser;
    private final DtoMapper mapper;
    private final PublicNeedRepository needs;
    private final PurchaseRequestRepository requests;
    private final ApprovalStepRepository approvalSteps;
    private final InnovationOpportunityRepository opportunities;
    private final OpportunitySubmissionRepository submissions;
    private final SupplierRepository suppliers;
    private final PurchaseOrderRepository orders;
    private final ImplementationRepository implementations;
    private final AuditLogEntryRepository auditEntries;
    private final NotificationRepository notifications;

    public AdminUserService(AppUserRepository users, AuditService audit, CurrentUser currentUser, DtoMapper mapper,
                            PublicNeedRepository needs, PurchaseRequestRepository requests,
                            ApprovalStepRepository approvalSteps, InnovationOpportunityRepository opportunities,
                            OpportunitySubmissionRepository submissions, SupplierRepository suppliers,
                            PurchaseOrderRepository orders, ImplementationRepository implementations,
                            AuditLogEntryRepository auditEntries, NotificationRepository notifications) {
        this.users = users;
        this.audit = audit;
        this.currentUser = currentUser;
        this.mapper = mapper;
        this.needs = needs;
        this.requests = requests;
        this.approvalSteps = approvalSteps;
        this.opportunities = opportunities;
        this.submissions = submissions;
        this.suppliers = suppliers;
        this.orders = orders;
        this.implementations = implementations;
        this.auditEntries = auditEntries;
        this.notifications = notifications;
    }

    @Transactional(readOnly = true)
    public List<Dto.User> listUsers(String search, UserRole role, Boolean active) {
        currentUser.require(UserRole.ADMIN);
        String term = search == null ? "" : search.trim();
        return users.findAll().stream()
                .filter(u -> u.getRole() != UserRole.SYSTEM)
                .filter(u -> role == null || u.getRole() == role)
                .filter(u -> active == null || u.isActive() == active)
                .filter(u -> term.isEmpty() || u.getFullName().toLowerCase().contains(term.toLowerCase())
                        || u.getEmail().toLowerCase().contains(term.toLowerCase()))
                .sorted(Comparator.comparing(AppUser::getCreatedAt, Comparator.nullsLast(Instant::compareTo)).reversed())
                .map(mapper::user)
                .toList();
    }

    @Transactional(readOnly = true)
    public Dto.User getUser(String id) {
        currentUser.require(UserRole.ADMIN);
        return mapper.user(users.findById(id).orElseThrow(() -> ApiException.notFound("User", id)));
    }

    @Transactional
    public Dto.User createUser(Dto.CreateUserRequest in) {
        currentUser.require(UserRole.ADMIN);
        validateRole(in.role());
        String email = trim(in.email());
        if (users.findByEmailIgnoreCase(email).isPresent()) {
            throw ApiException.invalidState("A user with that email already exists");
        }
        String password = in.password() == null ? "" : in.password();
        if (!isStrongPassword(password)) {
            throw ApiException.rule("PASSWORD_WEAK", "Password must be at least 8 characters and include letters, numbers and a symbol");
        }
        AppUser created = new AppUser();
        created.setFullName(trim(in.fullName()));
        created.setEmail(email);
        created.setTitle(trim(in.title()));
        created.setRole(in.role());
        created.setDepartmentId(in.departmentId());
        created.setProviderId(in.providerId());
        created.setActive(in.active());
        created.setCreatedAt(Clock.now());
        created.setPasswordHash(AuthService.PASSWORDS.encode(password));
        AppUser saved = users.save(created);
        audit.record(currentUser.id(), "USER_CREATED", "AppUser", saved.getId(), null,
                "Created account for " + saved.getFullName(), Map.of(
                        "email", saved.getEmail(),
                        "role", saved.getRole().name(),
                        "active", saved.isActive()));
        return mapper.user(saved);
    }

    @Transactional
    public Dto.User updateUser(String id, Dto.UpdateUserRequest in) {
        currentUser.require(UserRole.ADMIN);
        AppUser target = users.findById(id).orElseThrow(() -> ApiException.notFound("User", id));
        validateRole(in.role());
        String email = trim(in.email());
        users.findByEmailIgnoreCase(email)
                .filter(existing -> !existing.getId().equals(target.getId()))
                .ifPresent(existing -> {
                    throw ApiException.invalidState("A user with that email already exists");
                });

        UserRole previousRole = target.getRole();
        boolean previousActive = target.isActive();
        target.setFullName(trim(in.fullName()));
        target.setEmail(email);
        target.setTitle(trim(in.title()));
        target.setRole(in.role());
        target.setDepartmentId(in.departmentId());
        target.setProviderId(in.providerId());
        target.setActive(in.active());

        ensureAdminSafety(target, previousRole, previousActive, in.role(), in.active());

        AppUser saved = users.save(target);
        if (previousRole != in.role()) {
            audit.record(currentUser.id(), "USER_ROLE_CHANGED", "AppUser", saved.getId(), null,
                    "Changed " + saved.getFullName() + " role from " + previousRole + " to " + in.role(),
                    Map.of("previousRole", previousRole.name(), "newRole", in.role().name()));
        }
        if (previousActive != in.active()) {
            audit.record(currentUser.id(), in.active() ? "USER_ACTIVATED" : "USER_DEACTIVATED", "AppUser", saved.getId(), null,
                    (in.active() ? "Activated" : "Deactivated") + " account for " + saved.getFullName(),
                    Map.of("previousActive", previousActive, "newActive", in.active()));
        }
        if (previousRole != in.role() || previousActive != in.active()) {
            audit.record(currentUser.id(), "USER_UPDATED", "AppUser", saved.getId(), null,
                    "Updated account details for " + saved.getFullName(), Map.of(
                            "previousRole", previousRole.name(),
                            "newRole", in.role().name(),
                            "previousActive", previousActive,
                            "newActive", in.active()));
        }
        return mapper.user(saved);
    }

    @Transactional
    public Dto.User changeRole(String id, Dto.ChangeRoleRequest in) {
        currentUser.require(UserRole.ADMIN);
        AppUser target = users.findById(id).orElseThrow(() -> ApiException.notFound("User", id));
        validateRole(in.role());
        UserRole previous = target.getRole();
        ensureAdminSafety(target, previous, target.isActive(), in.role(), target.isActive());
        target.setRole(in.role());
        AppUser saved = users.save(target);
        audit.record(currentUser.id(), "USER_ROLE_CHANGED", "AppUser", saved.getId(), null,
                "Changed " + saved.getFullName() + " role from " + previous + " to " + in.role(),
                Map.of("previousRole", previous.name(), "newRole", in.role().name()));
        return mapper.user(saved);
    }

    @Transactional
    public Dto.User changeStatus(String id, Dto.ChangeStatusRequest in) {
        currentUser.require(UserRole.ADMIN);
        AppUser target = users.findById(id).orElseThrow(() -> ApiException.notFound("User", id));
        boolean previous = target.isActive();
        if (currentUser.id().equals(target.getId()) && !in.active()) {
            throw ApiException.invalidState("You cannot deactivate your own account");
        }
        if (target.getRole() == UserRole.ADMIN && !in.active() && activeAdminCount() <= 1) {
            throw ApiException.invalidState("You cannot deactivate the last active administrator");
        }
        target.setActive(in.active());
        AppUser saved = users.save(target);
        audit.record(currentUser.id(), in.active() ? "USER_ACTIVATED" : "USER_DEACTIVATED", "AppUser", saved.getId(), null,
                (in.active() ? "Activated" : "Deactivated") + " account for " + saved.getFullName(),
                Map.of("previousActive", previous, "newActive", in.active()));
        return mapper.user(saved);
    }

    @Transactional
    public void deleteUser(String id) {
        currentUser.require(UserRole.ADMIN);
        AppUser target = users.findById(id).orElseThrow(() -> ApiException.notFound("User", id));
        if (currentUser.id().equals(target.getId())) {
            throw ApiException.invalidState("You cannot delete your own account");
        }
        if (target.getRole() == UserRole.ADMIN && activeAdminCount() <= 1) {
            throw ApiException.invalidState("You cannot delete the last active administrator");
        }
        if (hasHistoricalReferences(id)) {
            throw ApiException.invalidState("This user has historical records and should be deactivated instead");
        }
        users.delete(target);
        audit.record(currentUser.id(), "USER_DELETED", "AppUser", target.getId(), null,
                "Deleted user account for " + target.getFullName(),
                Map.of("email", target.getEmail(), "role", target.getRole().name()));
    }

    private boolean hasHistoricalReferences(String userId) {
        return needs.findAll().stream().anyMatch(n -> userId.equals(n.getCreatedBy()))
                || requests.findAll().stream().anyMatch(r -> userId.equals(r.getRequestedBy()))
                || approvalSteps.findAll().stream().anyMatch(s -> userId.equals(s.getApproverId()))
                || opportunities.findAll().stream().anyMatch(o -> userId.equals(o.getCreatedBy()))
                || submissions.findAll().stream().anyMatch(s -> userId.equals(s.getSubmittedBy()))
                || suppliers.findAll().stream().anyMatch(s -> userId.equals(s.getVerifiedBy()))
                || orders.findAll().stream().anyMatch(o -> userId.equals(o.getSelectedBy()) || userId.equals(o.getIssuedBy()))
                || implementations.findAll().stream().anyMatch(i -> userId.equals(i.getManagerId()))
                || auditEntries.findAll().stream().anyMatch(e -> userId.equals(e.getActorId()))
                || notifications.findAll().stream().anyMatch(n -> userId.equals(n.getRecipientId()));
    }

    private void ensureAdminSafety(AppUser target, UserRole previousRole, boolean previousActive,
                                  UserRole newRole, boolean newActive) {
        if (currentUser.id().equals(target.getId()) && previousRole == UserRole.ADMIN && newRole != UserRole.ADMIN) {
            if (activeAdminCount() <= 1) {
                throw ApiException.invalidState("You cannot remove your own ADMIN role while you are the last active administrator");
            }
        }
        if (target.getId() != null && previousRole == UserRole.ADMIN && newRole != UserRole.ADMIN && activeAdminCount() <= 1) {
            throw ApiException.invalidState("This change would leave the system without an active administrator");
        }
        if (currentUser.id().equals(target.getId()) && previousActive && !newActive) {
            throw ApiException.invalidState("You cannot deactivate your own account");
        }
        if (target.getRole() == UserRole.ADMIN && !newActive && activeAdminCount() <= 1) {
            throw ApiException.invalidState("You cannot deactivate the last active administrator");
        }
    }

    private long activeAdminCount() {
        return users.findAll().stream()
                .filter(u -> u.getRole() == UserRole.ADMIN)
                .filter(AppUser::isActive)
                .count();
    }

    private void validateRole(UserRole role) {
        if (role == null || role == UserRole.SYSTEM) {
            throw ApiException.rule("INVALID_ROLE", "Role is required and cannot be SYSTEM");
        }
        boolean valid = List.of(UserRole.values()).stream().anyMatch(r -> r == role && r != UserRole.SYSTEM);
        if (!valid) {
            throw ApiException.rule("INVALID_ROLE", "Unknown role: " + role);
        }
    }

    private String trim(String value) {
        return value == null ? null : value.trim();
    }

    private boolean isStrongPassword(String password) {
        if (password == null || password.length() < 8) {
            return false;
        }
        return password.matches(".*[A-Za-z].*")
                && password.matches(".*\\d.*")
                && password.matches(".*[^A-Za-z0-9].*");
    }
}
