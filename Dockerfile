FROM eclipse-temurin:25-jdk

WORKDIR /app

# Install Python for the embedding helper
RUN apt-get update \
    && apt-get install -y python3 python3-pip \
    && rm -rf /var/lib/apt/lists/*

COPY .mvn/ .mvn/
COPY mvnw pom.xml ./

RUN chmod +x mvnw
RUN ./mvnw dependency:go-offline -DskipTests

# Python embedding helper
COPY embedding_helper.py ./

RUN python3 -m pip install --break-system-packages huggingface_hub

COPY src/ src/

RUN ./mvnw clean package -DskipTests

EXPOSE 8080

CMD ["java", "-jar", "target/memorybox-0.0.1-SNAPSHOT.jar"]
