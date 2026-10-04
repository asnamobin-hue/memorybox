package com.asna.memorybox.service;

import org.springframework.boot.json.JsonParser;
import org.springframework.boot.json.JsonParserFactory;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.List;

@Service
public class EmbeddingService {

    private final JsonParser jsonParser = JsonParserFactory.getJsonParser();

    public float[] generateEmbedding(String text) {
        try {
            Process process = new ProcessBuilder(
                    "/usr/bin/python3",
                    "embedding_helper.py",
                    text
            )
                    .redirectErrorStream(true)
                    .start();

            String output;

            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(
                            process.getInputStream(),
                            StandardCharsets.UTF_8))) {

                output = reader.lines()
                        .reduce("", (a, b) -> a + b);
            }

            int exitCode = process.waitFor();

            if (exitCode != 0) {
                throw new RuntimeException(
                        "Embedding helper failed: " + output
                );
            }

            List<Object> values = jsonParser.parseList(output);

            float[] embedding = new float[values.size()];

            for (int i = 0; i < values.size(); i++) {
                embedding[i] = ((Number) values.get(i)).floatValue();
            }

            if (embedding.length != 1024) {
                throw new RuntimeException(
                        "Expected 1024-dimensional embedding, got "
                                + embedding.length
                );
            }

            return embedding;

        } catch (Exception e) {
            throw new RuntimeException("Failed to generate embedding", e);
        }
    }
}
