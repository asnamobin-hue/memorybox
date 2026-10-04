package com.asna.memorybox.service;

import com.asna.memorybox.entity.Memory;
import com.asna.memorybox.repository.MemoryRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class MemoryService {

    private final MemoryRepository memoryRepository;
    private final EmbeddingService embeddingService;

    public MemoryService(
            MemoryRepository memoryRepository,
            EmbeddingService embeddingService) {
        this.memoryRepository = memoryRepository;
        this.embeddingService = embeddingService;
    }

    public Memory saveMemory(Memory memory) {
        return memoryRepository.save(memory);
    }

    public Optional<Memory> findMemory(Long id) {
        return memoryRepository.findById(id);
    }

    public List<Memory> findAllMemories() {
        return memoryRepository.findAllByOrderByCreatedAtDesc();
    }

    public List<Memory> searchMemories(String query, int limit) {
        float[] embedding = embeddingService.generateEmbedding(query);

        return memoryRepository.searchSimilar(
                embedding,
                PageRequest.of(0, limit)
        );
    }

    public Optional<Memory> updateFavorite(Long id, boolean favorite) {
        return memoryRepository.findById(id)
                .map(memory -> {
                    memory.setFavorite(favorite);
                    return memoryRepository.save(memory);
                });
    }

    public Optional<Memory> updateRemark(Long id, String remark) {
        return memoryRepository.findById(id)
                .map(memory -> {
                    String normalizedRemark =
                            remark == null || remark.isBlank()
                                    ? null
                                    : remark.trim();

                    memory.setRemark(normalizedRemark);

                    String searchableText = buildSearchableText(memory);
                    float[] embedding =
                            embeddingService.generateEmbedding(searchableText);

                    memory.setEmbedding(embedding);

                    return memoryRepository.save(memory);
                });
    }

    public boolean deleteMemory(Long id) {
        if (!memoryRepository.existsById(id)) {
            return false;
        }

        memoryRepository.deleteById(id);
        return true;
    }

    public String buildSearchableText(Memory memory) {
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
