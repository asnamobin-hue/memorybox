FROM eclipse-temurin:25-jdk

WORKDIR /app

COPY .mvn/ .mvn/
COPY mvnw pom.xml ./

RUN chmod +x mvnw
RUN ./mvnw dependency:go-offline -DskipTests

COPY src/ src/

RUN ./mvnw clean package -DskipTests

EXPOSE 8080

CMD ["java", "-jar", "target/memorybox-0.0.1-SNAPSHOT.jar"]
