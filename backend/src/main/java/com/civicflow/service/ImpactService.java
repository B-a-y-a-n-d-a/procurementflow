package com.civicflow.service;

import com.civicflow.domain.AppUser;
import com.civicflow.domain.ImpactMeasurement;
import com.civicflow.domain.ImpactMetric;
import com.civicflow.domain.Implementation;
import com.civicflow.domain.enums.Direction;
import com.civicflow.domain.enums.ImplementationStatus;
import com.civicflow.domain.enums.NeedCategory;
import com.civicflow.domain.enums.UserRole;
import com.civicflow.repository.ImpactMeasurementRepository;
import com.civicflow.repository.ImpactMetricRepository;
import com.civicflow.security.CurrentUser;
import com.civicflow.web.ApiException;
import com.civicflow.web.dto.Dto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/** US-11: impact metrics (baseline/target) and dated, evidenced measurements (BR-15). */
@Service
public class ImpactService {

    private static final Duration MEASUREMENT_CLOCK_SKEW = Duration.ofMinutes(5);

    private static final List<Dto.MetricTemplate> COMMON = List.of(
            new Dto.MetricTemplate("Jobs supported", "Local jobs created or sustained by the implementation", "jobs", Direction.INCREASE),
            new Dto.MetricTemplate("Local SMEs supported", "Local SMEs / co-operatives contracted or sub-contracted", "SMEs", Direction.INCREASE));

    private static final Map<NeedCategory, List<Dto.MetricTemplate>> TEMPLATES = Map.of(
            NeedCategory.WASTE_ENVIRONMENT, List.of(
                    new Dto.MetricTemplate("Illegal dumping hotspots", "Active illegal dumping hotspots tracked", "hotspots", Direction.DECREASE),
                    new Dto.MetricTemplate("Wards covered", "Wards where the solution is operating", "wards", Direction.INCREASE),
                    new Dto.MetricTemplate("Waste removed", "Illegally dumped waste cleared", "tonnes", Direction.INCREASE)),
            NeedCategory.WATER_ENERGY, List.of(
                    new Dto.MetricTemplate("Water lost", "Non-revenue water lost per month", "kL/month", Direction.DECREASE),
                    new Dto.MetricTemplate("Leak response time", "Average time from detection to repair", "hours", Direction.DECREASE)),
            NeedCategory.INFRASTRUCTURE, List.of(
                    new Dto.MetricTemplate("Fault repair time", "Average days from fault report to repair", "days", Direction.DECREASE),
                    new Dto.MetricTemplate("Assets monitored", "Infrastructure assets under monitoring", "assets", Direction.INCREASE)),
            NeedCategory.DIGITAL_SERVICES, List.of(
                    new Dto.MetricTemplate("Service turnaround time", "Average days to complete the service", "days", Direction.DECREASE),
                    new Dto.MetricTemplate("Citizens served digitally", "Applications submitted online", "applications", Direction.INCREASE)),
            NeedCategory.COMMUNITY_SAFETY, List.of(
                    new Dto.MetricTemplate("Incident response time", "Average minutes to respond to a report", "minutes", Direction.DECREASE),
                    new Dto.MetricTemplate("Citizens reached", "Residents using the reporting channel", "citizens", Direction.INCREASE)),
            NeedCategory.LOCAL_ECONOMIC_DEVELOPMENT, List.of(
                    new Dto.MetricTemplate("Businesses supported", "Local businesses onboarded / supported", "businesses", Direction.INCREASE),
                    new Dto.MetricTemplate("Digital transactions", "Monthly digital transactions by participants", "transactions", Direction.INCREASE)));

    private final ImpactMetricRepository metrics;
    private final ImpactMeasurementRepository measurements;
    private final ImplementationService implementations;
    private final AuditService audit;
    private final NotificationService notifications;
    private final CurrentUser currentUser;
    private final Lookup lookup;
    private final DtoMapper mapper;

    public ImpactService(ImpactMetricRepository metrics, ImpactMeasurementRepository measurements,
                         ImplementationService implementations, AuditService audit,
                         NotificationService notifications, CurrentUser currentUser, Lookup lookup,
                         DtoMapper mapper) {
        this.metrics = metrics;
        this.measurements = measurements;
        this.implementations = implementations;
        this.audit = audit;
        this.notifications = notifications;
        this.currentUser = currentUser;
        this.lookup = lookup;
        this.mapper = mapper;
    }

    public List<Dto.MetricTemplate> templates(NeedCategory category) {
        List<Dto.MetricTemplate> list = new ArrayList<>(category == null ? List.of() : TEMPLATES.getOrDefault(category, List.of()));
        list.addAll(COMMON);
        return list;
    }

    @Transactional(readOnly = true)
    public List<Dto.ImpactMetric> all() {
        currentUser.requireStaff();
        return metrics.findAll().stream().map(mapper::metric).toList();
    }

    @Transactional
    public Dto.ImplementationDetail addMetric(String implementationId, Dto.CreateMetricRequest in) {
        Implementation impl = lookup.implementation(implementationId);
        AppUser user = implementations.requireManager(impl);
        if (impl.getStatus() == ImplementationStatus.CANCELLED) {
            throw ApiException.invalidState("Implementation is cancelled");
        }
        ImpactMetric m = new ImpactMetric();
        m.setImplementationId(implementationId);
        m.setName(in.name().trim());
        m.setDescription(in.description().trim());
        m.setUnit(in.unit().trim());
        m.setDirection(in.direction());
        m.setBaselineValue(in.baseline());
        m.setTargetValue(in.target());
        m.setCreatedBy(user.getId());
        m.setCreatedAt(Clock.now());
        metrics.save(m);
        audit.record(user.getId(), "IMPACT_METRIC_DEFINED", "ImpactMetric", m.getId(),
                lookup.needOfImplementation(impl).getId(),
                "Impact metric defined: " + m.getName() + " (baseline " + in.baseline().stripTrailingZeros().toPlainString()
                        + ", target " + in.target().stripTrailingZeros().toPlainString() + " " + m.getUnit() + ")",
                Map.of("direction", in.direction().name()));
        return mapper.implementationDetail(impl);
    }

    @Transactional
    public Dto.ImplementationDetail addMeasurement(String metricId, Dto.CreateMeasurementRequest in) {
        ImpactMetric m = metrics.findById(metricId).orElseThrow(() -> ApiException.notFound("Impact metric", metricId));
        Implementation impl = lookup.implementation(m.getImplementationId());
        AppUser user = implementations.requireManager(impl);
        // Measured results are evidence: they can't be dated in the future or before delivery started (T119).
        // A few minutes' tolerance covers clock skew between the browser and the server.
        if (in.measuredAt().isAfter(Clock.now().plus(MEASUREMENT_CLOCK_SKEW))) {
            throw ApiException.rule("MEASUREMENT_IN_FUTURE", "A measurement can't be dated in the future");
        }
        LocalDate measuredOn = in.measuredAt().atZone(Clock.SAST).toLocalDate();
        if (impl.getStartDate() != null && measuredOn.isBefore(impl.getStartDate())) {
            throw ApiException.rule("MEASUREMENT_BEFORE_START",
                    "A measurement can't be dated before the implementation started (" + impl.getStartDate() + ")",
                    Map.of("startDate", impl.getStartDate().toString()));
        }
        ImpactMeasurement ms = new ImpactMeasurement();
        ms.setMetricId(metricId);
        ms.setMeasuredValue(in.value());
        ms.setMeasuredAt(in.measuredAt());
        ms.setEvidenceUrl(in.evidenceUrl());
        ms.setNote(in.note());
        ms.setWard(in.ward());
        ms.setRecordedBy(user.getId());
        ms.setCreatedAt(Clock.now());
        measurements.save(ms);
        Dto.ImpactMetric derived = mapper.metric(m);
        String change = derived.changePct() == null ? "" : String.format(" (%+.1f%% vs baseline)", derived.changePct());
        audit.record(user.getId(), "IMPACT_UPDATED", "ImpactMetric", m.getId(), lookup.needOfImplementation(impl).getId(),
                m.getName() + " measured at " + in.value().stripTrailingZeros().toPlainString() + " " + m.getUnit()
                        + change + " - " + derived.status(),
                Map.of("value", in.value(), "status", derived.status().name(),
                        "evidenceUrl", in.evidenceUrl() == null ? "" : in.evidenceUrl()));
        notifications.notifyRole(UserRole.EXECUTIVE, null, "IMPACT_UPDATED", "Impact update: " + m.getName(),
                lookup.needOfImplementation(impl).getTitle() + change, "Implementation", impl.getId(),
                "/implementations/" + impl.getId());
        return mapper.implementationDetail(impl);
    }
}
