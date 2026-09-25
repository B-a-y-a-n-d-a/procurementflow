package com.civicflow.rules;

import com.civicflow.domain.enums.CriterionKey;
import com.civicflow.domain.enums.ScoringMethod;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Transparent weighted evaluation (FR-060..FR-064, BR-06, BR-17..BR-19).
 * Every score carries a human-readable basis. The engine recommends; it never selects.
 */
public final class ScoringEngine {

    private ScoringEngine() {
    }

    public record Criterion(String id, CriterionKey key, String name, double weightPct, ScoringMethod method) {
    }

    public record ManualScore(double score, String rationale) {
    }

    /** A submission (or quote) being scored. manualScores: criterionId -> (averaged) manual score. */
    public record Offer(String id, double price, Integer bbbeeLevel, String municipality, String province,
                        boolean eligible, Map<String, ManualScore> manualScores) {
    }

    public record Line(String criterionId, CriterionKey key, String name, double weightPct, ScoringMethod method,
                       Double score, Double points, String rationale, String basis) {
    }

    public record Result(String offerId, boolean eligible, List<Line> lines, Double total, Integer rank,
                         boolean recommended) {
    }

    public static boolean weightsValid(List<Double> weights) {
        double sum = weights.stream().mapToDouble(Double::doubleValue).sum();
        return !weights.isEmpty() && weights.stream().allMatch(w -> w > 0) && Math.abs(sum - 100.0) < 0.01;
    }

    public static List<Result> evaluate(List<Criterion> criteria, List<Offer> offers, String needMunicipality,
                                        String needProvince, Map<Integer, Integer> bbbeeScores,
                                        RuleSnapshot.LocalScores localScores) {
        double minPrice = offers.stream().filter(Offer::eligible).mapToDouble(Offer::price).filter(p -> p > 0)
                .min().orElse(0);

        List<Result> unranked = new ArrayList<>();
        for (Offer offer : offers) {
            List<Line> lines = new ArrayList<>();
            boolean complete = true;
            double total = 0;
            for (Criterion c : criteria) {
                Double score;
                String rationale = null;
                String basis;
                switch (c.method()) {
                    case AUTO_PRICE -> {
                        score = offer.price() > 0 && minPrice > 0 ? minPrice / offer.price() * 100 : 0.0;
                        basis = "Lowest eligible " + Money.format(minPrice) + " ÷ " + Money.format(offer.price()) + " × 100";
                    }
                    case AUTO_BBBEE -> {
                        int level = offer.bbbeeLevel() == null ? 0 : offer.bbbeeLevel();
                        score = (double) bbbeeScores.getOrDefault(level, 0);
                        basis = level == 0 ? "Non-compliant / not declared → 0" : "B-BBEE Level " + level + " → " + score.intValue();
                    }
                    case AUTO_LOCAL -> {
                        if (eq(offer.municipality(), needMunicipality)) {
                            score = (double) localScores.sameMunicipality();
                            basis = "Same municipality (" + offer.municipality() + ")";
                        } else if (eq(offer.province(), needProvince)) {
                            score = (double) localScores.sameProvince();
                            basis = "Same province (" + offer.province() + ")";
                        } else {
                            score = (double) localScores.elsewhere();
                            basis = "Elsewhere in South Africa (" + offer.province() + ")";
                        }
                    }
                    default -> {
                        ManualScore manual = offer.manualScores() == null ? null : offer.manualScores().get(c.id());
                        score = manual == null ? null : manual.score();
                        rationale = manual == null ? null : manual.rationale();
                        basis = manual == null ? "Awaiting evaluator score" : "Evaluator score";
                    }
                }
                Double points = null;
                if (score == null) {
                    complete = false;
                } else {
                    double p = score * c.weightPct() / 100.0;
                    total += p;
                    points = round2(p);
                    score = round2(score);
                }
                lines.add(new Line(c.id(), c.key(), c.name(), c.weightPct(), c.method(), score, points, rationale, basis));
            }
            unranked.add(new Result(offer.id(), offer.eligible(), lines, complete ? round2(total) : null, null, false));
        }

        List<Result> rankable = unranked.stream().filter(r -> r.eligible() && r.total() != null)
                .sorted(Comparator.comparing(Result::total).reversed()).toList();
        boolean allEligibleScored = unranked.stream().filter(Result::eligible).allMatch(r -> r.total() != null);
        String recommendedId = allEligibleScored && !rankable.isEmpty() ? rankable.get(0).offerId() : null;

        List<Result> results = new ArrayList<>();
        for (Result r : unranked) {
            int idx = rankable.indexOf(r);
            results.add(new Result(r.offerId(), r.eligible(), r.lines(), r.total(), idx >= 0 ? idx + 1 : null,
                    Objects.equals(r.offerId(), recommendedId)));
        }
        results.sort(Comparator.comparing((Result r) -> r.rank() == null ? Integer.MAX_VALUE : r.rank()));
        return results;
    }

    public static String recommendedId(List<Result> results) {
        return results.stream().filter(Result::recommended).map(Result::offerId).findFirst().orElse(null);
    }

    static double round2(double v) {
        return Math.round(v * 100.0) / 100.0;
    }

    private static boolean eq(String a, String b) {
        return a != null && b != null && a.trim().equalsIgnoreCase(b.trim());
    }
}
