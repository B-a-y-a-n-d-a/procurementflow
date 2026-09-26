package com.civicflow.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Minimal Gemini REST client (generateContent). The API key lives only in the backend environment
 * (GEMINI_API_KEY) - never in the browser (constitution Art. IV.4). Any failure returns empty so the caller
 * falls back to the deterministic engine.
 */
@Component
public class GeminiClient {

    private static final Logger log = LoggerFactory.getLogger(GeminiClient.class);

    private final String apiKey;
    private final String model;
    private final RestClient http;
    private final ObjectMapper json = new ObjectMapper();

    public GeminiClient(@Value("${civicflow.ai.gemini-api-key:}") String apiKey,
                        @Value("${civicflow.ai.gemini-model}") String model,
                        @Value("${civicflow.ai.gemini-base-url}") String baseUrl) {
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.model = model;
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5_000);
        factory.setReadTimeout(25_000);
        this.http = RestClient.builder().baseUrl(baseUrl).requestFactory(factory).build();
    }

    public boolean enabled() {
        return !apiKey.isEmpty();
    }

    public Optional<String> generate(String systemInstruction, String prompt, boolean jsonOutput) {
        if (!enabled()) {
            return Optional.empty();
        }
        try {
            Map<String, Object> generationConfig = jsonOutput
                    ? Map.of("temperature", 0.2, "responseMimeType", "application/json")
                    : Map.of("temperature", 0.2);
            Map<String, Object> body = Map.of(
                    "systemInstruction", Map.of("parts", List.of(Map.of("text", systemInstruction))),
                    "contents", List.of(Map.of("role", "user", "parts", List.of(Map.of("text", prompt)))),
                    "generationConfig", generationConfig);
            String response = http.post()
                    .uri("/models/{model}:generateContent", model)
                    .header("x-goog-api-key", apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(String.class);
            JsonNode parts = json.readTree(response).path("candidates").path(0).path("content").path("parts");
            StringBuilder text = new StringBuilder();
            parts.forEach(p -> text.append(p.path("text").asText("")));
            return text.isEmpty() ? Optional.empty() : Optional.of(text.toString().trim());
        } catch (Exception e) {
            log.warn("Gemini call failed, using deterministic fallback: {}", e.getMessage());
            return Optional.empty();
        }
    }
}
