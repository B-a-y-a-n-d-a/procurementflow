package com.civicflow.domain;

import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

/** Value object: where a need or provider is (province, municipality, ward, coordinates). */
@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class GeoLocation {
    private String province;
    private String municipality;
    private String ward;
    private BigDecimal latitude;
    private BigDecimal longitude;
}
