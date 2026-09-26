package com.civicflow.service;

import com.civicflow.domain.AuditLogEntry;
import com.civicflow.repository.AuditLogEntryRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/**
 * Append-only, SHA-256 hash-chained audit log (constitution Art. V, BR-11).
 * This class only ever INSERTS; there is no update or delete path anywhere in the application.
 */
@Service
public class AuditService {

    public static final String GENESIS = "0".repeat(64);

    private final AuditLogEntryRepository repository;
    private final ObjectMapper canonical = new ObjectMapper()
            .findAndRegisterModules()
            .configure(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS, true)
            .configure(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS, false);

    public AuditService(AuditLogEntryRepository repository) {
        this.repository = repository;
    }

    /** Record a lifecycle event now. actorId null = SYSTEM. needId = correlation id (may be null). */
    @Transactional
    public AuditLogEntry record(String actorId, String action, String entityType, String entityId, String needId,
                                String summary, Map<String, ?> metadata) {
        return recordAt(Clock.now(), actorId, action, entityType, entityId, needId, summary, metadata);
    }

    @Transactional
    public synchronized AuditLogEntry recordAt(Instant at, String actorId, String action, String entityType,
                                               String entityId, String needId, String summary,
                                               Map<String, ?> metadata) {
        AuditLogEntry last = repository.findTopByOrderBySequenceDesc().orElse(null);
        AuditLogEntry e = new AuditLogEntry();
        e.setSequence(last == null ? 1 : last.getSequence() + 1);
        e.setOccurredAt(at);
        e.setActorId(actorId);
        e.setAction(action);
        e.setEntityType(entityType);
        e.setEntityId(entityId);
        e.setNeedId(needId);
        e.setSummary(summary);
        e.setMetadata(metadata == null || metadata.isEmpty() ? null : toJson(metadata));
        e.setPrevHash(last == null ? GENESIS : last.getHash());
        e.setHash(hash(e));
        return repository.save(e);
    }

    /** Seeder only: append an entry whose metadata is already canonical JSON (used to re-chain seeded history). */
    @Transactional
    public synchronized AuditLogEntry recordRaw(Instant at, String actorId, String action, String entityType,
                                                String entityId, String needId, String summary, String metadataJson) {
        AuditLogEntry last = repository.findTopByOrderBySequenceDesc().orElse(null);
        AuditLogEntry e = new AuditLogEntry();
        e.setSequence(last == null ? 1 : last.getSequence() + 1);
        e.setOccurredAt(at);
        e.setActorId(actorId);
        e.setAction(action);
        e.setEntityType(entityType);
        e.setEntityId(entityId);
        e.setNeedId(needId);
        e.setSummary(summary);
        e.setMetadata(metadataJson);
        e.setPrevHash(last == null ? GENESIS : last.getHash());
        e.setHash(hash(e));
        return repository.save(e);
    }

    public record Verification(boolean valid, int checked, Long brokenAtSequence, String headHash) {
    }

    @Transactional(readOnly = true)
    public Verification verify() {
        List<AuditLogEntry> all = repository.findAllByOrderBySequenceAsc();
        String prev = GENESIS;
        for (AuditLogEntry e : all) {
            if (!prev.equals(e.getPrevHash()) || !hash(e).equals(e.getHash())) {
                return new Verification(false, all.size(), e.getSequence(), null);
            }
            prev = e.getHash();
        }
        return new Verification(true, all.size(), null, all.isEmpty() ? null : prev);
    }

    String hash(AuditLogEntry e) {
        String material = String.join("|",
                e.getPrevHash(),
                Long.toString(e.getSequence()),
                e.getOccurredAt().toString(),
                String.valueOf(e.getActorId()),
                e.getAction(),
                e.getEntityType(),
                e.getEntityId(),
                String.valueOf(e.getNeedId()),
                e.getSummary(),
                String.valueOf(e.getMetadata()));
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(material.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException(ex);
        }
    }

    private String toJson(Map<String, ?> metadata) {
        try {
            return canonical.writeValueAsString(new TreeMap<>(metadata));
        } catch (Exception ex) {
            throw new IllegalStateException("Cannot serialise audit metadata", ex);
        }
    }
}
