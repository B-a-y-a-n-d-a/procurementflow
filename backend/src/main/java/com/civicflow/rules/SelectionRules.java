package com.civicflow.rules;

import java.math.BigDecimal;
import java.util.Objects;

/** BR-04 (minimum competitive offers) and BR-05 (deviation justification). */
public final class SelectionRules {

    private SelectionRules() {
    }

    public record MinOffers(boolean applies, BigDecimal threshold, int minimum, long count, boolean satisfied) {
    }

    public static MinOffers minOffers(BigDecimal amount, long eligibleOffers, BigDecimal threshold, int minimum) {
        boolean applies = amount.compareTo(threshold) > 0;
        return new MinOffers(applies, threshold, minimum, eligibleOffers, !applies || eligibleOffers >= minimum);
    }

    public static boolean isDeviation(String selectedId, String recommendedId) {
        return recommendedId != null && !Objects.equals(selectedId, recommendedId);
    }

    public static boolean justificationValid(String justification, int minChars) {
        return justification != null && justification.trim().length() >= minChars;
    }
}
