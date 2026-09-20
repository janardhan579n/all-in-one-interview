# syntax=docker/dockerfile:1
#
# Backend image. Two stages so the runtime image carries a JRE and a jar, not Maven
# and a .m2 cache.
#
# Build from the REPOSITORY ROOT, not from backend/:
#   docker build -f backend/Dockerfile -t learnplatform-api .
# The content library lives at /content in the repo and is copied into the image, so the
# container has no bind-mount requirement and runs fully offline once built.

FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /build

# Dependencies first: this layer is cached until pom.xml itself changes, so ordinary
# source edits rebuild in seconds rather than re-downloading the world.
COPY backend/pom.xml ./pom.xml
RUN mvn -B -q dependency:go-offline

COPY backend/src ./src
RUN mvn -B -q clean package -DskipTests

FROM eclipse-temurin:17-jre-jammy AS runtime
WORKDIR /app

# Never run as root. The volume mounted at /data must be writable by this uid.
RUN useradd --system --uid 10001 --create-home appuser

COPY --from=build /build/target/*.jar /app/app.jar
COPY content /app/content

ENV CONTENT_DIRECTORY=/app/content \
    APP_DATASOURCE_FILE=/data/learning.db \
    JAVA_OPTS="-XX:MaxRAMPercentage=70"

RUN mkdir -p /data && chown -R appuser:appuser /data /app
USER appuser
VOLUME ["/data"]
EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=3s --start-period=40s --retries=5 \
  CMD ["sh", "-c", "wget -q -O- http://127.0.0.1:8080/api/health | grep -q '\"status\":\"UP\"'"]

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]
