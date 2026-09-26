package com.civicflow.service;

import com.civicflow.domain.AppUser;
import com.civicflow.domain.Implementation;
import com.civicflow.domain.ImplementationUpdate;
import com.civicflow.domain.Milestone;
import com.civicflow.domain.PublicNeed;
import com.civicflow.domain.PurchaseOrder;
import com.civicflow.domain.enums.ImplementationStatus;
import com.civicflow.domain.enums.POStatus;
import com.civicflow.domain.enums.UpdateType;
import com.civicflow.domain.enums.UserRole;
import com.civicflow.repository.ImplementationRepository;
import com.civicflow.repository.ImplementationUpdateRepository;
import com.civicflow.repository.MilestoneRepository;
import com.civicflow.repository.PurchaseOrderRepository;
import com.civicflow.security.CurrentUser;
import com.civicflow.web.ApiException;
import com.civicflow.web.dto.Dto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;

/** US-10: delivery tracking. A PO is the midpoint of the lifecycle, not the end. */
@Service
public class ImplementationService {

    private final ImplementationRepository implementations;
    private final MilestoneRepository milestones;
    private final ImplementationUpdateRepository updates;
    private final PurchaseOrderRepository orders;
    private final AuditService audit;
    private final NotificationService notifications;
    private final CurrentUser currentUser;
    private final Lookup lookup;
    private final DtoMapper mapper;

    public ImplementationService(ImplementationRepository implementations, MilestoneRepository milestones,
                                 ImplementationUpdateRepository updates, PurchaseOrderRepository orders,
                                 AuditService audit, NotificationService notifications, CurrentUser currentUser,
                                 Lookup lookup, DtoMapper mapper) {
        this.implementations = implementations;
        this.milestones = milestones;
        this.updates = updates;
        this.orders = orders;
        this.audit = audit;
        this.notifications = notifications;
        this.currentUser = currentUser;
        this.lookup = lookup;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public List<Dto.ImplementationSummary> list() {
        currentUser.requireStaff();
        return implementations.findAll().stream().map(mapper::implementationSummary)
                .sorted(Comparator.comparing(Dto.ImplementationSummary::status)).toList();
    }

    @Transactional(readOnly = true)
    public Dto.ImplementationDetail get(String id) {
        currentUser.requireStaff();
        return mapper.implementationDetail(lookup.implementation(id));
    }

    /** Manager of the implementation, a manager of the owning department, or an admin. */
    AppUser requireManager(Implementation impl) {
        AppUser user = currentUser.get();
        PublicNeed need = lookup.needOfImplementation(impl);
        boolean allowed = user.getId().equals(impl.getManagerId())
                || (user.getRole() == UserRole.DEPARTMENT_MANAGER && need.getDepartmentId().equals(user.getDepartmentId()))
                || user.getRole() == UserRole.ADMIN;
        if (!allowed) {
            throw ApiException.forbidden("Only the implementation manager or the department manager can do this");
        }
        return user;
    }

    private void assertOpen(Implementation impl) {
        if (impl.getStatus() == ImplementationStatus.COMPLETED || impl.getStatus() == ImplementationStatus.CANCELLED) {
            throw ApiException.invalidState("Implementation is " + impl.getStatus());
        }
    }

    @Transactional
    public Dto.ImplementationDetail update(String id, Dto.UpdateImplementationRequest in) {
        Implementation impl = lookup.implementation(id);
        AppUser user = requireManager(impl);
        assertOpen(impl);
        String needId = lookup.needOfImplementation(impl).getId();
        ImplementationStatus before = impl.getStatus();
        if (in.status() != null && in.status() != before) {
            if (in.status() == ImplementationStatus.COMPLETED) {
                throw ApiException.invalidState("Use the complete action (evidence is required)");
            }
            impl.setStatus(in.status());
            if (in.status() == ImplementationStatus.IN_PROGRESS && impl.getStartDate() == null) {
                impl.setStartDate(Clock.today());
            }
        }
        if (in.progressPct() != null) {
            impl.setProgressPct(in.progressPct());
        }
        if (in.startDate() != null) {
            impl.setStartDate(in.startDate());
        }
        if (in.expectedCompletion() != null) {
            impl.setExpectedCompletion(in.expectedCompletion());
        }
        implementations.save(impl);
        String title = lookup.needOfImplementation(impl).getTitle();
        if (impl.getStatus() != before) {
            String action = switch (impl.getStatus()) {
                case IN_PROGRESS -> EnumSet.of(ImplementationStatus.NOT_STARTED, ImplementationStatus.PLANNED)
                        .contains(before) ? "IMPLEMENTATION_STARTED" : "IMPLEMENTATION_UPDATED";
                case AT_RISK -> "IMPLEMENTATION_AT_RISK";
                case CANCELLED -> "IMPLEMENTATION_CANCELLED";
                default -> "IMPLEMENTATION_UPDATED";
            };
            audit.record(user.getId(), action, "Implementation", impl.getId(), needId,
                    title + ": status " + before + " → " + impl.getStatus(),
                    Map.of("from", before.name(), "to", impl.getStatus().name(), "progressPct", impl.getProgressPct()));
            if (impl.getStatus() == ImplementationStatus.AT_RISK) {
                notifications.notifyRole(UserRole.EXECUTIVE, null, "IMPLEMENTATION_AT_RISK", "At risk: " + title,
                        "Flagged by " + user.getFullName(), "Implementation", impl.getId(),
                        "/implementations/" + impl.getId());
            }
        } else {
            audit.record(user.getId(), "IMPLEMENTATION_UPDATED", "Implementation", impl.getId(), needId,
                    title + ": progress " + impl.getProgressPct() + "%", Map.of("progressPct", impl.getProgressPct()));
        }
        return mapper.implementationDetail(impl);
    }

    @Transactional
    public Dto.ImplementationDetail addMilestone(String id, Dto.CreateMilestoneRequest in) {
        Implementation impl = lookup.implementation(id);
        AppUser user = requireManager(impl);
        assertOpen(impl);
        Milestone m = new Milestone();
        m.setImplementationId(id);
        m.setTitle(in.title().trim());
        m.setDueDate(in.dueDate());
        m.setSortOrder(milestones.findByImplementationIdOrderBySortOrder(id).size());
        milestones.save(m);
        audit.record(user.getId(), "IMPLEMENTATION_UPDATED", "Milestone", m.getId(),
                lookup.needOfImplementation(impl).getId(), "Milestone planned: " + m.getTitle() + " (due " + m.getDueDate() + ")",
                null);
        if (impl.getStatus() == ImplementationStatus.NOT_STARTED) {
            impl.setStatus(ImplementationStatus.PLANNED);
            implementations.save(impl);
        }
        return mapper.implementationDetail(impl);
    }

    @Transactional
    public Dto.ImplementationDetail completeMilestone(String milestoneId) {
        Milestone m = milestones.findById(milestoneId).orElseThrow(() -> ApiException.notFound("Milestone", milestoneId));
        Implementation impl = lookup.implementation(m.getImplementationId());
        AppUser user = requireManager(impl);
        assertOpen(impl);
        if (m.getCompletedAt() != null) {
            throw ApiException.invalidState("Milestone already completed");
        }
        m.setCompletedAt(Clock.now());
        milestones.save(m);
        audit.record(user.getId(), "IMPLEMENTATION_UPDATED", "Milestone", m.getId(),
                lookup.needOfImplementation(impl).getId(), "Milestone completed: " + m.getTitle(), null);
        return mapper.implementationDetail(impl);
    }

    @Transactional
    public Dto.ImplementationDetail addUpdate(String id, Dto.CreateUpdateRequest in) {
        Implementation impl = lookup.implementation(id);
        AppUser user = requireManager(impl);
        assertOpen(impl);
        if (in.type() == UpdateType.EVIDENCE && (in.evidenceUrl() == null || in.evidenceUrl().isBlank())) {
            throw new IllegalArgumentException("Evidence updates need an evidence link");
        }
        ImplementationUpdate u = new ImplementationUpdate();
        u.setImplementationId(id);
        u.setAuthorId(user.getId());
        u.setUpdateType(in.type());
        u.setDescription(in.description().trim());
        u.setProgressPct(in.progressPct());
        u.setEvidenceUrl(in.evidenceUrl() == null || in.evidenceUrl().isBlank() ? null : in.evidenceUrl().trim());
        u.setCreatedAt(Clock.now());
        updates.save(u);
        if (in.progressPct() != null) {
            impl.setProgressPct(in.progressPct());
        }
        if (EnumSet.of(ImplementationStatus.NOT_STARTED, ImplementationStatus.PLANNED).contains(impl.getStatus())
                && (in.type() == UpdateType.PROGRESS || in.type() == UpdateType.EVIDENCE)) {
            impl.setStatus(ImplementationStatus.IN_PROGRESS);
        }
        implementations.save(impl);
        audit.record(user.getId(), "IMPLEMENTATION_UPDATED", "ImplementationUpdate", u.getId(),
                lookup.needOfImplementation(impl).getId(), in.type() + ": " + u.getDescription(),
                Map.of("type", in.type().name(), "progressPct", impl.getProgressPct(),
                        "evidenceUrl", u.getEvidenceUrl() == null ? "" : u.getEvidenceUrl()));
        return mapper.implementationDetail(impl);
    }

    @Transactional
    public Dto.ImplementationDetail complete(String id) {
        Implementation impl = lookup.implementation(id);
        AppUser user = requireManager(impl);
        assertOpen(impl);
        if (!updates.existsByImplementationIdAndUpdateType(id, UpdateType.EVIDENCE)) {
            throw ApiException.rule("EVIDENCE_REQUIRED", "Add at least one delivery evidence update before completing");
        }
        impl.setStatus(ImplementationStatus.COMPLETED);
        impl.setProgressPct(100);
        impl.setActualCompletion(Clock.today());
        implementations.save(impl);
        PurchaseOrder po = lookup.order(impl.getPurchaseOrderId());
        po.setStatus(POStatus.COMPLETED);
        po.setCompletedAt(Clock.now());
        orders.save(po);
        PublicNeed need = lookup.needOfImplementation(impl);
        audit.record(user.getId(), "IMPLEMENTATION_COMPLETED", "Implementation", impl.getId(), need.getId(),
                need.getTitle() + " delivered - " + po.getPoNumber() + " completed", null);
        notifications.notifyRole(UserRole.EXECUTIVE, null, "IMPLEMENTATION_COMPLETED", "Delivered: " + need.getTitle(),
                "Implementation completed by " + user.getFullName(), "Implementation", impl.getId(),
                "/implementations/" + impl.getId());
        return mapper.implementationDetail(impl);
    }
}
