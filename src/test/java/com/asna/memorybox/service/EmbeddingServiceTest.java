package com.asna.memorybox.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class EmbeddingServiceTest {

    @Test
    void generatesEmbedding() {
        float[] embedding =
                new EmbeddingService().generateEmbedding("Our tennis day");

        assertEquals(1024, embedding.length);
    }
}
