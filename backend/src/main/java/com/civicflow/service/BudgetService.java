package com.civicflow.service;

import com.civicflow.domain.Department;
import com.civicflow.domain.PublicNeed;
import com.civicflow.domain.enums.POStatus;
import com.civicflow.repository.PublicNeedRepository;
import com.civicflow.repository.PurchaseOrderRepository;
import com.civicflow.repository.PurchaseRequestRepository;
import com.civicflow.rules.BudgetCalculator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

/** BR-03: department budget is always derived (never stored as "spent"). */
@Service
public class BudgetService {

    private final PublicNeedRepository needs;
    private final PurchaseRequestRepository requests;
    private final PurchaseOrderRepository orders;
    private final Lookup lookup;

    public BudgetService(PublicNeedRepository needs, PurchaseRequestRepository requests,
                         PurchaseOrderRepository orders, Lookup lookup) {
        this.needs = needs;
        this.requests = requests;
        this.orders = orders;
        this.lookup = lookup;
    }

    @Transactional(readOnly = true)
    public BudgetCalculator.Summary summary(String departmentId) {
        Department department = lookup.department(departmentId);
        List<BudgetCalculator.Line> lines = new ArrayList<>();
        for (PublicNeed need : needs.findByDepartmentId(departmentId)) {
            requests.findByNeedId(need.getId()).ifPresent(pr -> {
                var po = orders.findByPurchaseRequestId(pr.getId())
                        .filter(o -> o.getStatus() != POStatus.CANCELLED).orElse(null);
                lines.add(new BudgetCalculator.Line(pr.getStatus(), pr.getAmount(), po == null ? null : po.getAmount()));
            });
        }
        return BudgetCalculator.summarise(department.getBudgetAllocated(), lines);
    }
}
