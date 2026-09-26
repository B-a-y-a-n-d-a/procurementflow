package com.civicflow;

import com.civicflow.domain.AppUser;
import com.civicflow.repository.AppUserRepository;
import com.civicflow.seed.DemoDataSeeder;
import com.civicflow.service.AuthService;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.BEFORE_EACH_TEST_METHOD)
class AdminUserManagementTest {

    private static final String ADMIN_PASSWORD = "adminPass!123";
    private static final String STAFF_PASSWORD = "staffPass!123";

    @Autowired MockMvc mvc;
    @Autowired AppUserRepository users;
    @Autowired DemoDataSeeder seeder;

    @BeforeEach
    void seedUsers() {
        seeder.seed();
        AppUser admin = users.findById("u-lindiwe").orElseThrow();
        admin.setPasswordHash(AuthService.PASSWORDS.encode(ADMIN_PASSWORD));
        users.save(admin);
        AppUser staff = users.findById("u-thandi").orElseThrow();
        staff.setPasswordHash(AuthService.PASSWORDS.encode(STAFF_PASSWORD));
        users.save(staff);
    }

    private String token(String email, String password) throws Exception {
        String body = "{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}";
        String response = mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        return response;
    }

    @Test
    void adminCanListUsers() throws Exception {
        String body = token("lindiwe@mzansimetro.example.org", ADMIN_PASSWORD);
        String token = com.jayway.jsonpath.JsonPath.read(body, "$.token");

        mvc.perform(get("/api/admin/users").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].email").exists());
    }

    @Test
    void staffMemberCannotAccessAdminUsers() throws Exception {
        String body = token("thandi@mzansimetro.example.org", STAFF_PASSWORD);
        String token = com.jayway.jsonpath.JsonPath.read(body, "$.token");

        mvc.perform(get("/api/admin/users").header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminCanCreateUserAndAssignRole() throws Exception {
        String body = token("lindiwe@mzansimetro.example.org", ADMIN_PASSWORD);
        String token = com.jayway.jsonpath.JsonPath.read(body, "$.token");

        String create = "{\"fullName\":\"New Admin\",\"email\":\"new.admin@example.org\",\"title\":\"Operations Lead\",\"role\":\"DEPARTMENT_MANAGER\",\"password\":\"StrongPass!123\",\"active\":true}";

        mvc.perform(post("/api/admin/users").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(create))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email").value("new.admin@example.org"))
                .andExpect(jsonPath("$.role").value("DEPARTMENT_MANAGER"));
    }

    @Test
    void lastAdminCannotBeDeactivated() throws Exception {
        String body = token("lindiwe@mzansimetro.example.org", ADMIN_PASSWORD);
        String token = com.jayway.jsonpath.JsonPath.read(body, "$.token");

        mvc.perform(patch("/api/admin/users/u-lindiwe/status")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"active\":false}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("INVALID_STATE"));
    }
}
