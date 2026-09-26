package com.civicflow.security;

import com.civicflow.repository.AppUserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * DEMO authentication: resolves the persona from the {@code X-Demo-User} header.
 * Clearly labelled as a demo in the UI. Replace with OIDC/JWT for production (tasks T100).
 */
@Component
public class DemoAuthFilter extends OncePerRequestFilter {

    public static final String HEADER = "X-Demo-User";

    private final AppUserRepository users;

    public DemoAuthFilter(AppUserRepository users) {
        this.users = users;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String userId = request.getHeader(HEADER);
        try {
            if (userId != null && !userId.isBlank()) {
                users.findById(userId.trim()).filter(u -> u.isActive()).ifPresent(CurrentUser::set);
            }
            chain.doFilter(request, response);
        } finally {
            CurrentUser.clear();
        }
    }
}
