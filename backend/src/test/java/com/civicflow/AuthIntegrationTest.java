package com.civicflow;

import com.civicflow.domain.AppUser;
import com.civicflow.repository.AppUserRepository;
import com.civicflow.seed.DemoDataSeeder;
import com.civicflow.service.AuthService;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** T122: email + password sign-in and bearer-token authentication through the real HTTP filter. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.BEFORE_EACH_TEST_METHOD)
class AuthIntegrationTest {

    private static final String PASSWORD = "test-only-Passw0rd!";

    @Autowired MockMvc mvc;
    @Autowired DemoDataSeeder seeder;
    @Autowired AppUserRepository users;

    @BeforeEach
    void seed() {
        seeder.seed();
        AppUser thandi = users.findById("u-thandi").orElseThrow();
        thandi.setPasswordHash(AuthService.PASSWORDS.encode(PASSWORD));
        users.save(thandi);
    }

    private String login(String email, String password) {
        return "{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}";
    }

    @Test
    void signInReturnsATokenThatAuthenticatesRequests() throws Exception {
        String body = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(login("THANDI@mzansimetro.example.org", PASSWORD)))   // email is case-insensitive
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.id").value("u-thandi"))
                .andExpect(jsonPath("$.user.passwordHash").doesNotExist())
                .andReturn().getResponse().getContentAsString();
        String token = JsonPath.read(body, "$.token");

        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fullName").value("Thandi Nkosi"));
    }

    @Test
    void wrongPasswordUnknownEmailAndUnsetPasswordAllGetTheSameError() throws Exception {
        for (String req : new String[]{
                login("thandi@mzansimetro.example.org", "wrong-password"),
                login("nobody@example.org", PASSWORD),
                login("sipho@mzansimetro.example.org", PASSWORD)}) {   // seeded without a password
            mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(req))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
        }
    }

    @Test
    void missingTamperedOrLegacyCredentialsAreRejected() throws Exception {
        mvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer not-a-token")).andExpect(status().isUnauthorized());
        // The old demo header no longer authenticates anyone
        mvc.perform(get("/api/needs").header("X-Demo-User", "u-thandi")).andExpect(status().isUnauthorized());

        String body = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content(login("thandi@mzansimetro.example.org", PASSWORD))).andReturn().getResponse().getContentAsString();
        String token = JsonPath.read(body, "$.token");
        String forged = "dS1saW5kaXdlfDk5OTk5OTk5OTk" + token.substring(token.indexOf('.'));   // u-lindiwe|9999999999, Thandi's signature
        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + forged)).andExpect(status().isUnauthorized());
    }

    @Test
    void personaListingAndDemoResetAreGone() throws Exception {
        mvc.perform(get("/api/auth/personas")).andExpect(status().isNotFound());
        mvc.perform(post("/api/admin/reset-demo")).andExpect(status().isNotFound());
    }
}
