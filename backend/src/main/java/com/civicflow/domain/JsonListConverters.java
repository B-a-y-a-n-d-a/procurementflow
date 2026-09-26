package com.civicflow.domain;

import com.civicflow.domain.enums.ProviderType;
import com.civicflow.domain.enums.UserRole;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.util.ArrayList;
import java.util.List;

/** JPA converters that store lists as JSON text (columns are TEXT for MySQL/H2 portability). */
public final class JsonListConverters {

    static final ObjectMapper MAPPER = new ObjectMapper();

    private JsonListConverters() {
    }

    abstract static class Base<T> implements AttributeConverter<List<T>, String> {
        private final TypeReference<List<T>> type;

        Base(TypeReference<List<T>> type) {
            this.type = type;
        }

        @Override
        public String convertToDatabaseColumn(List<T> attribute) {
            try {
                return MAPPER.writeValueAsString(attribute == null ? List.of() : attribute);
            } catch (Exception e) {
                throw new IllegalStateException("Cannot serialise list", e);
            }
        }

        @Override
        public List<T> convertToEntityAttribute(String dbData) {
            if (dbData == null || dbData.isBlank()) {
                return new ArrayList<>();
            }
            try {
                return new ArrayList<>(MAPPER.readValue(dbData, type));
            } catch (Exception e) {
                throw new IllegalStateException("Cannot parse list: " + dbData, e);
            }
        }
    }

    @Converter
    public static class StringList extends Base<String> {
        public StringList() {
            super(new TypeReference<>() {
            });
        }
    }

    @Converter
    public static class ProviderTypeList extends Base<ProviderType> {
        public ProviderTypeList() {
            super(new TypeReference<>() {
            });
        }
    }

    @Converter
    public static class UserRoleList extends Base<UserRole> {
        public UserRoleList() {
            super(new TypeReference<>() {
            });
        }
    }
}
