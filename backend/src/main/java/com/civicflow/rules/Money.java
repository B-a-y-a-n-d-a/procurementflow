package com.civicflow.rules;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Locale;

/** en-ZA style money formatting: "R 420 000" (cents shown only when present). */
public final class Money {

    private Money() {
    }

    public static String format(double amount) {
        return format(BigDecimal.valueOf(amount));
    }

    public static String format(BigDecimal amount) {
        if (amount == null) {
            return "R 0";
        }
        BigDecimal scaled = amount.setScale(2, RoundingMode.HALF_UP);
        boolean hasCents = scaled.remainder(BigDecimal.ONE).signum() != 0;
        String whole = String.format(Locale.ROOT, "%,d", scaled.abs().toBigInteger()).replace(',', ' ');
        String cents = hasCents ? "," + scaled.abs().remainder(BigDecimal.ONE).movePointRight(2).setScale(0, RoundingMode.HALF_UP).toPlainString() : "";
        return (scaled.signum() < 0 ? "-R " : "R ") + whole + cents;
    }
}
