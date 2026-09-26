package com.civicflow.service;

import com.civicflow.domain.AppUser;
import com.civicflow.domain.Notification;
import com.civicflow.domain.enums.UserRole;
import com.civicflow.repository.AppUserRepository;
import com.civicflow.repository.NotificationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

/** In-app lifecycle notifications (BRS section 19). */
@Service
public class NotificationService {

    private final NotificationRepository notifications;
    private final AppUserRepository users;

    public NotificationService(NotificationRepository notifications, AppUserRepository users) {
        this.notifications = notifications;
        this.users = users;
    }

    @Transactional
    public void notifyUsers(Collection<String> userIds, String type, String title, String message,
                            String entityType, String entityId, String link) {
        Set<String> unique = new LinkedHashSet<>(userIds);
        unique.remove(null);
        for (String userId : unique) {
            Notification n = new Notification();
            n.setRecipientId(userId);
            n.setType(type);
            n.setTitle(title);
            n.setMessage(message);
            n.setEntityType(entityType);
            n.setEntityId(entityId);
            n.setLink(link);
            n.setRead(false);
            n.setCreatedAt(Clock.now());
            notifications.save(n);
        }
    }

    @Transactional
    public void notifyRole(UserRole role, String departmentId, String type, String title, String message,
                           String entityType, String entityId, String link) {
        List<AppUser> recipients = departmentId == null ? users.findByRole(role)
                : users.findByRoleAndDepartmentId(role, departmentId);
        notifyUsers(recipients.stream().map(AppUser::getId).filter(Objects::nonNull).toList(),
                type, title, message, entityType, entityId, link);
    }
}
