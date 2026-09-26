package com.civicflow.security;

import com.civicflow.repository.AppUserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Resolves the signed-in user from {@code Authorization: Bearer <token>} (issued by {@code POST /api/auth/login}).
 * Requests without a valid token run anonymously; services reject them via {@link CurrentUser#get()} (SEC-01).
 * Real SSO/OIDC is tracked as T100.
 */
@Component
public class AuthFilter extends OncePerRequestFilter {

    private static final String BEARER = "Bearer ";

    private final AppUserRepository users;
    private final TokenService tokens;

    public AuthFilter(AppUserRepository users, TokenService tokens) {
        this.users = users;
        this.tokens = tokens;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        try {
            if (header != null && header.startsWith(BEARER)) {
                tokens.verify(header.substring(BEARER.length()).trim())
                        .flatMap(users::findById)
                        .filter(u -> u.isActive())
                        .ifPresent(CurrentUser::set);
            }
            chain.doFilter(request, response);
        } finally {
            CurrentUser.clear();
        }
    }
}
