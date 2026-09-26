package com.civicflow.security;

import com.civicflow.service.Clock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Optional;

/**
 * Stateless session tokens: {@code base64url(userId|expiryEpochSeconds).base64url(HMAC-SHA256)}.
 * The signing key comes from {@code AUTH_TOKEN_SECRET}; without one, a random key is generated per start
 * (fine for development, but every restart signs everyone out).
 */
@Component
public class TokenService {

    private static final Logger log = LoggerFactory.getLogger(TokenService.class);
    private static final Base64.Encoder ENC = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder DEC = Base64.getUrlDecoder();

    private final byte[] key;
    private final Duration ttl;

    public TokenService(@Value("${civicflow.auth.token-secret:}") String secret,
                        @Value("${civicflow.auth.token-ttl:PT12H}") Duration ttl) {
        if (secret == null || secret.isBlank()) {
            this.key = new byte[32];
            new SecureRandom().nextBytes(this.key);
            log.warn("AUTH_TOKEN_SECRET is not set: using a random signing key, so sign-ins won't survive a restart");
        } else if (secret.length() < 32) {
            throw new IllegalStateException("AUTH_TOKEN_SECRET must be at least 32 characters");
        } else {
            this.key = secret.getBytes(StandardCharsets.UTF_8);
        }
        this.ttl = ttl;
    }

    public record Issued(String token, Instant expiresAt) {
    }

    public Issued issue(String userId) {
        Instant expiresAt = Clock.now().plus(ttl);
        String payload = ENC.encodeToString((userId + "|" + expiresAt.getEpochSecond()).getBytes(StandardCharsets.UTF_8));
        return new Issued(payload + "." + ENC.encodeToString(sign(payload)), expiresAt);
    }

    /** The user id, if the token is well-formed, correctly signed and not expired. */
    public Optional<String> verify(String token) {
        try {
            int dot = token.indexOf('.');
            if (dot <= 0) {
                return Optional.empty();
            }
            String payload = token.substring(0, dot);
            if (!MessageDigest.isEqual(sign(payload), DEC.decode(token.substring(dot + 1)))) {
                return Optional.empty();
            }
            String[] parts = new String(DEC.decode(payload), StandardCharsets.UTF_8).split("\\|");
            if (parts.length != 2 || Instant.ofEpochSecond(Long.parseLong(parts[1])).isBefore(Clock.now())) {
                return Optional.empty();
            }
            return Optional.of(parts[0]);
        } catch (IllegalArgumentException e) {
            return Optional.empty();
        }
    }

    private byte[] sign(String payload) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(key, "HmacSHA256"));
            return mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("HMAC-SHA256 unavailable", e);
        }
    }
}
