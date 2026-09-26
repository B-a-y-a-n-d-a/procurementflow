package com.civicflow.service;

import com.civicflow.domain.AppUser;
import com.civicflow.repository.AppUserRepository;
import com.civicflow.security.TokenService;
import com.civicflow.web.ApiException;
import com.civicflow.web.dto.Dto;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/** Email + password sign-in (T122). Passwords are stored as BCrypt hashes in {@code app_user.password_hash}. */
@Service
public class AuthService {

    public static final PasswordEncoder PASSWORDS = new BCryptPasswordEncoder();

    // Compared against when the email is unknown, so a miss costs the same time as a wrong password.
    private static final String DUMMY_HASH = PASSWORDS.encode("civicflow-timing-equaliser");

    private final AppUserRepository users;
    private final TokenService tokens;
    private final DtoMapper mapper;

    public AuthService(AppUserRepository users, TokenService tokens, DtoMapper mapper) {
        this.users = users;
        this.tokens = tokens;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public Dto.LoginResponse login(Dto.LoginRequest in) {
        Optional<AppUser> found = users.findByEmailIgnoreCase(in.email().trim());
        String hash = found.map(AppUser::getPasswordHash).orElse(null);
        boolean matches = PASSWORDS.matches(in.password(), hash != null ? hash : DUMMY_HASH);
        AppUser user = found.filter(u -> hash != null && matches && u.isActive())
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS",
                        "Email or password is incorrect"));
        TokenService.Issued issued = tokens.issue(user.getId());
        return new Dto.LoginResponse(issued.token(), issued.expiresAt(), mapper.user(user));
    }
}
