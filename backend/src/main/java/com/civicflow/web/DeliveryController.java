package com.civicflow.web;

import com.civicflow.domain.enums.NeedCategory;
import com.civicflow.service.DashboardService;
import com.civicflow.service.EcosystemService;
import com.civicflow.service.ImpactService;
import com.civicflow.service.ImplementationService;
import com.civicflow.web.dto.Dto;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Implementation, impact, ecosystem (providers/solutions/map) and dashboards. */
@RestController
@RequestMapping("/api")
public class DeliveryController {

    private final ImplementationService implementations;
    private final ImpactService impact;
    private final EcosystemService ecosystem;
    private final DashboardService dashboards;

    public DeliveryController(ImplementationService implementations, ImpactService impact,
                              EcosystemService ecosystem, DashboardService dashboards) {
        this.implementations = implementations;
        this.impact = impact;
        this.ecosystem = ecosystem;
        this.dashboards = dashboards;
    }

    // ---------- implementation ----------
    @GetMapping("/implementations")
    public List<Dto.ImplementationSummary> implementations() {
        return implementations.list();
    }

    @GetMapping("/implementations/{id}")
    public Dto.ImplementationDetail implementation(@PathVariable String id) {
        return implementations.get(id);
    }

    @PatchMapping("/implementations/{id}")
    public Dto.ImplementationDetail update(@PathVariable String id,
                                           @Valid @RequestBody Dto.UpdateImplementationRequest body) {
        return implementations.update(id, body);
    }

    @PostMapping("/implementations/{id}/milestones")
    public Dto.ImplementationDetail addMilestone(@PathVariable String id,
                                                 @Valid @RequestBody Dto.CreateMilestoneRequest body) {
        return implementations.addMilestone(id, body);
    }

    @PostMapping("/milestones/{id}/complete")
    public Dto.ImplementationDetail completeMilestone(@PathVariable String id) {
        return implementations.completeMilestone(id);
    }

    @PostMapping("/implementations/{id}/updates")
    public Dto.ImplementationDetail addUpdate(@PathVariable String id, @Valid @RequestBody Dto.CreateUpdateRequest body) {
        return implementations.addUpdate(id, body);
    }

    @PostMapping("/implementations/{id}/complete")
    public Dto.ImplementationDetail complete(@PathVariable String id) {
        return implementations.complete(id);
    }

    // ---------- impact ----------
    @PostMapping("/implementations/{id}/metrics")
    public Dto.ImplementationDetail addMetric(@PathVariable String id, @Valid @RequestBody Dto.CreateMetricRequest body) {
        return impact.addMetric(id, body);
    }

    @PostMapping("/metrics/{id}/measurements")
    public Dto.ImplementationDetail addMeasurement(@PathVariable String id,
                                                   @Valid @RequestBody Dto.CreateMeasurementRequest body) {
        return impact.addMeasurement(id, body);
    }

    @GetMapping("/impact")
    public List<Dto.ImpactMetric> impact() {
        return impact.all();
    }

    @GetMapping("/impact/templates")
    public List<Dto.MetricTemplate> templates(@RequestParam(required = false) NeedCategory category) {
        return impact.templates(category);
    }

    // ---------- ecosystem ----------
    @GetMapping("/providers")
    public List<Dto.Provider> providers() {
        return ecosystem.providers();
    }

    @GetMapping("/providers/{id}")
    public Dto.ProviderDetail provider(@PathVariable String id) {
        return ecosystem.provider(id);
    }

    @GetMapping("/solutions")
    public List<Dto.Solution> solutions(@RequestParam(required = false) String q,
                                        @RequestParam(required = false) NeedCategory category,
                                        @RequestParam(required = false) Boolean openSource,
                                        @RequestParam(required = false) String province) {
        return ecosystem.solutions(q, category, openSource, province);
    }

    @PostMapping("/solutions")
    public Dto.Solution createSolution(@Valid @RequestBody Dto.SaveSolutionRequest body) {
        return ecosystem.saveSolution(null, body);
    }

    @PutMapping("/solutions/{id}")
    public Dto.Solution updateSolution(@PathVariable String id, @Valid @RequestBody Dto.SaveSolutionRequest body) {
        return ecosystem.saveSolution(id, body);
    }

    @GetMapping("/map")
    public Dto.MapData map() {
        return ecosystem.map();
    }

    // ---------- dashboards ----------
    @GetMapping("/dashboard/executive")
    public Dto.ExecutiveDashboard executive() {
        return dashboards.executive();
    }

    @GetMapping("/dashboard/department/{id}")
    public Dto.DepartmentDashboard department(@PathVariable String id) {
        return dashboards.department(id);
    }

    @GetMapping("/dashboard/procurement")
    public Dto.ProcurementDashboard procurement() {
        return dashboards.procurement();
    }

    @GetMapping("/dashboard/provider")
    public Dto.ProviderDashboard providerDashboard() {
        return dashboards.provider();
    }
}
