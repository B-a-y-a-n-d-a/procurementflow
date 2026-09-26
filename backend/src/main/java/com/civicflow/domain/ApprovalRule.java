package com.civicflow.domain;

import com.civicflow.domain.enums.UserRole;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/** One approval threshold band: amounts in [minAmount, maxAmount] need the listed approvers, in order. */
@Entity
@Table(name = "approval_rule")
@Getter
@Setter
@NoArgsConstructor
public class ApprovalRule extends BaseEntity {
    private String ruleSetId;
    private BigDecimal minAmount;
    /** null = no upper bound */
    private BigDecimal maxAmount;
    @Convert(converter = JsonListConverters.UserRoleList.class)
    private List<UserRole> approverRoles = new ArrayList<>();
    private int sortOrder;
}
