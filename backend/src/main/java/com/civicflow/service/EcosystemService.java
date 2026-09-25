package com.civicflow.service;

import com.civicflow.domain.AppUser;
import com.civicflow.domain.InnovationSolution;
import com.civicflow.domain.Provider;
import com.civicflow.domain.enums.ImplementationStatus;
import com.civicflow.domain.enums.NeedCategory;
import com.civicflow.domain.enums.SolutionStatus;
import com.civicflow.domain.enums.UserRole;
import com.civicflow.repository.ImplementationRepository;
import com.civicflow.repository.InnovationSolutionRepository;
import com.civicflow.repository.ProviderRepository;
import com.civicflow.repository.PublicNeedRepository;
import com.civicflow.security.CurrentUser;
import com.civicflow.web.ApiException;
import com.civicflow.web.dto.Dto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/** Provider ecosystem, solution registry (incl. open-source catalogue) and the geographic view. */
@Service
public class EcosystemService {

    private final ProviderRepository providers;
    private final InnovationSolutionRepository solutions;
    private final PublicNeedRepository needs;
    private final ImplementationRepository implementations;
    private final AuditService audit;
    private final CurrentUser currentUser;
    private final Lookup lookup;
    private final DtoMapper mapper;

    public EcosystemService(ProviderRepository providers, InnovationSolutionRepository solutions,
                            PublicNeedRepository needs, ImplementationRepository implementations, AuditService audit,
                            CurrentUser currentUser, Lookup lookup, DtoMapper mapper) {
        this.providers = providers;
        this.solutions = solutions;
        this.needs = needs;
        this.implementations = implementations;
        this.audit = audit;
        this.currentUser = currentUser;
        this.lookup = lookup;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public List<Dto.Provider> providers() {
        currentUser.get();
        return providers.findAllByOrderByName().stream().map(mapper::provider).toList();
    }

    @Transactional(readOnly = true)
    public Dto.ProviderDetail provider(String id) {
        currentUser.get();
        return mapper.providerDetail(lookup.provider(id));
    }

    @Transactional(readOnly = true)
    public List<Dto.Solution> solutions(String q, NeedCategory category, Boolean openSource, String province) {
        AppUser user = currentUser.get();
        String query = q == null ? null : q.toLowerCase(Locale.ROOT).trim();
        return solutions.findAllByOrderByName().stream()
                .filter(s -> s.getStatus() == SolutionStatus.PUBLISHED || s.getProviderId().equals(user.getProviderId()))
                .filter(s -> category == null || s.getCategory() == category)
                .filter(s -> openSource == null || s.isOpenSource() == openSource)
                .filter(s -> province == null || province.isBlank() || s.getCoverageProvinces().contains(province))
                .filter(s -> query == null || query.isEmpty()
                        || s.getName().toLowerCase(Locale.ROOT).contains(query)
                        || s.getDescription().toLowerCase(Locale.ROOT).contains(query)
                        || s.getTechnologies().stream().anyMatch(t -> t.toLowerCase(Locale.ROOT).contains(query)))
                .map(mapper::solution).toList();
    }

    @Transactional
    public Dto.Solution saveSolution(String id, Dto.SaveSolutionRequest in) {
        AppUser user = currentUser.require(UserRole.PROVIDER);
        if (in.isOpenSource() && (in.license() == null || in.license().isBlank())) {
            throw new IllegalArgumentException("Open-source solutions must state a licence");
        }
        InnovationSolution s;
        if (id == null) {
            s = new InnovationSolution();
            s.setProviderId(user.getProviderId());
            s.setCreatedAt(Clock.now());
            s.setStatus(SolutionStatus.PUBLISHED);
        } else {
            s = solutions.findById(id).orElseThrow(() -> ApiException.notFound("Solution", id));
            if (!s.getProviderId().equals(user.getProviderId())) {
                throw ApiException.forbidden("You can only edit your own solutions");
            }
        }
        s.setName(in.name().trim());
        s.setDescription(in.description().trim());
        s.setCategory(in.category());
        s.setTechnologies(in.technologies() == null ? new ArrayList<>() : new ArrayList<>(in.technologies()));
        s.setOpenSource(in.isOpenSource());
        s.setRepositoryUrl(in.repositoryUrl());
        s.setLicense(in.license());
        s.setDemoUrl(in.demoUrl());
        s.setCoverageProvinces(in.coverageProvinces() == null ? new ArrayList<>() : new ArrayList<>(in.coverageProvinces()));
        s.setMaturity(in.maturity());
        s.setExternalDeployments(in.externalDeployments());
        s = solutions.save(s);
        audit.record(user.getId(), id == null ? "SOLUTION_REGISTERED" : "SOLUTION_UPDATED", "InnovationSolution",
                s.getId(), null, lookup.provider(user.getProviderId()).getName() + " " + (id == null ? "registered" : "updated")
                        + " solution " + s.getName(), null);
        return mapper.solution(s);
    }

    @Transactional(readOnly = true)
    public Dto.MapData map() {
        AppUser user = currentUser.get();
        boolean staff = user.getRole() != UserRole.PROVIDER;
        List<Dto.MapNeed> needPoints = needs.findAllByOrderByCreatedAtDesc().stream()
                .map(mapper::needSummary)
                .filter(n -> staff || n.opportunityId() != null)
                .map(n -> new Dto.MapNeed(n.id(), n.reference(), n.title(), n.category(), n.stage(), n.opportunityId(),
                        n.location())).toList();
        List<Dto.MapProvider> providerPoints = providers.findAllByOrderByName().stream()
                .map(p -> new Dto.MapProvider(p.getId(), p.getName(), p.getProviderType(), mapper.geo(p.getLocation())))
                .toList();
        List<Dto.MapImplementation> implPoints = !staff ? List.of() : implementations.findAll().stream()
                .filter(i -> i.getStatus() != ImplementationStatus.CANCELLED)
                .map(mapper::implementationSummary)
                .map(i -> new Dto.MapImplementation(i.id(), i.needTitle(), i.status(), i.progressPct(), i.location()))
                .toList();
        return new Dto.MapData(needPoints, providerPoints, implPoints);
    }

    public static boolean isLocal(Provider p, String province) {
        return p.getLocation() != null && province.equalsIgnoreCase(p.getLocation().getProvince());
    }
}
