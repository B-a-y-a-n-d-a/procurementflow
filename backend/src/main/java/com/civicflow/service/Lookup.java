package com.civicflow.service;

import com.civicflow.domain.AppUser;
import com.civicflow.domain.Department;
import com.civicflow.domain.Implementation;
import com.civicflow.domain.InnovationOpportunity;
import com.civicflow.domain.OpportunitySubmission;
import com.civicflow.domain.Provider;
import com.civicflow.domain.PublicNeed;
import com.civicflow.domain.PurchaseOrder;
import com.civicflow.domain.PurchaseRequest;
import com.civicflow.domain.Supplier;
import com.civicflow.repository.AppUserRepository;
import com.civicflow.repository.DepartmentRepository;
import com.civicflow.repository.ImplementationRepository;
import com.civicflow.repository.InnovationOpportunityRepository;
import com.civicflow.repository.OpportunitySubmissionRepository;
import com.civicflow.repository.ProviderRepository;
import com.civicflow.repository.PublicNeedRepository;
import com.civicflow.repository.PurchaseOrderRepository;
import com.civicflow.repository.PurchaseRequestRepository;
import com.civicflow.repository.SupplierRepository;
import com.civicflow.web.ApiException;
import org.springframework.stereotype.Component;

/** Small typed finders with consistent 404s, plus name resolution for DTOs. */
@Component
public class Lookup {

    private final AppUserRepository users;
    private final DepartmentRepository departments;
    private final PublicNeedRepository needs;
    private final PurchaseRequestRepository requests;
    private final InnovationOpportunityRepository opportunities;
    private final OpportunitySubmissionRepository submissions;
    private final ProviderRepository providers;
    private final SupplierRepository suppliers;
    private final PurchaseOrderRepository orders;
    private final ImplementationRepository implementations;

    public Lookup(AppUserRepository users, DepartmentRepository departments, PublicNeedRepository needs,
                  PurchaseRequestRepository requests, InnovationOpportunityRepository opportunities,
                  OpportunitySubmissionRepository submissions, ProviderRepository providers,
                  SupplierRepository suppliers, PurchaseOrderRepository orders,
                  ImplementationRepository implementations) {
        this.users = users;
        this.departments = departments;
        this.needs = needs;
        this.requests = requests;
        this.opportunities = opportunities;
        this.submissions = submissions;
        this.providers = providers;
        this.suppliers = suppliers;
        this.orders = orders;
        this.implementations = implementations;
    }

    public AppUser user(String id) {
        return users.findById(id).orElseThrow(() -> ApiException.notFound("User", id));
    }

    public String userName(String id) {
        if (id == null) {
            return "System";
        }
        return users.findById(id).map(AppUser::getFullName).orElse("Unknown user");
    }

    public Department department(String id) {
        return departments.findById(id).orElseThrow(() -> ApiException.notFound("Department", id));
    }

    public String departmentName(String id) {
        return id == null ? null : departments.findById(id).map(Department::getName).orElse(null);
    }

    public PublicNeed need(String id) {
        return needs.findById(id).orElseThrow(() -> ApiException.notFound("Public need", id));
    }

    public PurchaseRequest request(String id) {
        return requests.findById(id).orElseThrow(() -> ApiException.notFound("Purchase request", id));
    }

    public InnovationOpportunity opportunity(String id) {
        return opportunities.findById(id).orElseThrow(() -> ApiException.notFound("Opportunity", id));
    }

    public OpportunitySubmission submission(String id) {
        return submissions.findById(id).orElseThrow(() -> ApiException.notFound("Submission", id));
    }

    public Provider provider(String id) {
        return providers.findById(id).orElseThrow(() -> ApiException.notFound("Provider", id));
    }

    public Supplier supplier(String id) {
        return suppliers.findById(id).orElseThrow(() -> ApiException.notFound("Supplier", id));
    }

    public PurchaseOrder order(String id) {
        return orders.findById(id).orElseThrow(() -> ApiException.notFound("Purchase order", id));
    }

    public Implementation implementation(String id) {
        return implementations.findById(id).orElseThrow(() -> ApiException.notFound("Implementation", id));
    }

    /** Root need of a purchase order (for audit correlation and derived location). */
    public PublicNeed needOfOrder(PurchaseOrder po) {
        return need(request(po.getPurchaseRequestId()).getNeedId());
    }

    public PublicNeed needOfImplementation(Implementation impl) {
        return needOfOrder(order(impl.getPurchaseOrderId()));
    }
}
