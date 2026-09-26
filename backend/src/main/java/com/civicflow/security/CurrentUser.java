package com.civicflow.security;

import com.civicflow.domain.AppUser;
import com.civicflow.domain.enums.UserRole;
import com.civicflow.web.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.util.Arrays;

/**
 * The signed-in user for the current request, set by {@link AuthFilter}.
 * Services use {@link #require(UserRole...)} so authorisation is enforced server-side (SEC-01).
 */
@Component
public class CurrentUser {

    private static final ThreadLocal<AppUser> HOLDER = new ThreadLocal<>();

    static void set(AppUser user) {
        HOLDER.set(user);
    }

    static void clear() {
        HOLDER.remove();
    }

    /** For internal/system flows (seeding, tests). */
    public static void runAs(AppUser user, Runnable action) {
        AppUser previous = HOLDER.get();
        HOLDER.set(user);
        try {
            action.run();
        } finally {
            if (previous == null) {
                HOLDER.remove();
            } else {
                HOLDER.set(previous);
            }
        }
    }

    public AppUser get() {
        AppUser user = HOLDER.get();
        if (user == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", "Sign in to continue");
        }
        return user;
    }

    public String id() {
        return get().getId();
    }

    public UserRole role() {
        return get().getRole();
    }

    public boolean is(UserRole... roles) {
        UserRole role = role();
        return Arrays.asList(roles).contains(role);
    }

    public boolean isStaff() {
        return role() != UserRole.PROVIDER;
    }

    public AppUser require(UserRole... roles) {
        AppUser user = get();
        if (!Arrays.asList(roles).contains(user.getRole())) {
            throw ApiException.forbidden("This action requires role: " + Arrays.toString(roles));
        }
        return user;
    }

    public AppUser requireStaff() {
        AppUser user = get();
        if (user.getRole() == UserRole.PROVIDER) {
            throw ApiException.forbidden("Staff only");
        }
        return user;
    }
}
