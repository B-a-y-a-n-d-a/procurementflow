package com.civicflow.service;

/** Human-readable references: NEED-2026-014, PR-2026-031, OPP-2026-007, PO-2026-0042, SUP-00012. */
public final class References {

    private References() {
    }

    public static String next(String prefix, long existingCount) {
        return String.format("%s-%d-%03d", prefix, Clock.today().getYear(), existingCount + 1);
    }

    public static String nextPo(long existingCount) {
        return String.format("PO-%d-%04d", Clock.today().getYear(), existingCount + 1);
    }

    public static String nextSupplier(long existingCount) {
        return String.format("SUP-%05d", existingCount + 1);
    }
}
