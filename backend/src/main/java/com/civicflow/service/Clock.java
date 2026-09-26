package com.civicflow.service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;

/**
 * Single time source. Millisecond precision so values round-trip through DATETIME(6) and the audit hash chain.
 * The override exists ONLY for the demo seeder, which replays realistic history through the real services.
 */
public final class Clock {

    public static final ZoneId SAST = ZoneId.of("Africa/Johannesburg");

    private static volatile Instant override;

    private Clock() {
    }

    public static Instant now() {
        Instant o = override;
        return (o != null ? o : Instant.now()).truncatedTo(ChronoUnit.MILLIS);
    }

    public static LocalDate today() {
        return now().atZone(SAST).toLocalDate();
    }

    /** Seeder only. */
    public static void setOverride(Instant instant) {
        override = instant;
    }

    /** Seeder only. */
    public static void clearOverride() {
        override = null;
    }
}
