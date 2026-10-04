package com.asna.memorybox.service;

import com.asna.memorybox.entity.Memory;
import com.asna.memorybox.repository.MemoryRepository;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class MemoryProcessingService {

    private final MemoryRepository memoryRepository;
    private final ImageUnderstandingService imageUnderstandingService;
    private final EmbeddingService embeddingService;

    public MemoryProcessingService(
            MemoryRepository memoryRepository,
            ImageUnderstandingService imageUnderstandingService,
            EmbeddingService embeddingService) {
        this.memoryRepository = memoryRepository;
        this.imageUnderstandingService = imageUnderstandingService;
        this.embeddingService = embeddingService;
    }

    @Async
    public void processMemory(Long memoryId, String imagePath) {
        try {
            String aiCaption =
                    imageUnderstandingService.generateCaption(imagePath);

            Memory memory = memoryRepository.findById(memoryId)
                    .orElseThrow(() ->
                            new IllegalStateException(
                                    "Memory not found: " + memoryId
                            ));

            memory.setAiCaption(aiCaption);

            String searchableText = buildSearchableText(memory);

            float[] embedding =
                    embeddingService.generateEmbedding(searchableText);

            memory.setEmbedding(embedding);

            memoryRepository.save(memory);

            System.out.println(
                    "Memory " + memoryId + " AI processing completed."
            );

        } catch (Exception e) {
            System.err.println(
                    "Memory " + memoryId + " AI processing failed: "
                            + e.getMessage()
            );
        }
    }

    private String buildSearchableText(Memory memory) {
        StringBuilder text = new StringBuilder();

        appendIfPresent(text, memory.getUserDescription());
        appendIfPresent(text, memory.getAiCaption());
        appendIfPresent(text, memory.getRemark());

        return text.toString();
    }

    private void appendIfPresent(StringBuilder text, String value) {
        if (value != null && !value.isBlank()) {
            if (text.length() > 0) {
                text.append(". ");
            }

            text.append(value.trim());
        }
    }
}
