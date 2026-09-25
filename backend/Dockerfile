# ---- Build stage: compile and package with Maven (no local Maven needed) ----
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -q -B dependency:go-offline
COPY src ./src
ARG SKIP_TESTS=false
RUN mvn -q -B package -DskipTests=${SKIP_TESTS}

# ---- Runtime stage: slim JRE ----
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN addgroup -S civic && adduser -S civic -G civic
COPY --from=build /app/target/civicflow-backend.jar app.jar
USER civic
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --start-period=40s --retries=10 \
  CMD wget -qO- http://localhost:8080/api/health || exit 1
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "/app/app.jar"]
