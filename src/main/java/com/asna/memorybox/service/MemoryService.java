package com.asna.memorybox.service;

import com.asna.memorybox.entity.Memory;
import com.asna.memorybox.repository.MemoryRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

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
        int safeLimit = Math.max(1, Math.min(limit, 20));

        float[] embedding = embeddingService.generateEmbedding(query);

        List<Memory> semanticResults = memoryRepository.searchSimilar(
                embedding,
                PageRequest.of(0, safeLimit * 3)
        );

        List<Object[]> keywordResults =
                memoryRepository.searchKeywordScores(query);

        Map<Long, Double> semanticScores =
                buildRankScores(semanticResults);

        Map<Long, Double> keywordScores =
                buildKeywordScores(keywordResults);

        Set<Long> candidateIds = new HashSet<>();
        candidateIds.addAll(semanticScores.keySet());
        candidateIds.addAll(keywordScores.keySet());

        Map<Long, Memory> memoriesById = new HashMap<>();

        for (Memory memory : semanticResults) {
            memoriesById.put(memory.getId(), memory);
        }

        if (!keywordScores.isEmpty()) {
            List<Memory> keywordMemories =
                    memoryRepository.findAllById(keywordScores.keySet());

            for (Memory memory : keywordMemories) {
                memoriesById.put(memory.getId(), memory);
            }
        }

        List<RankedMemory> rankedMemories = new ArrayList<>();

        for (Long id : candidateIds) {
            Memory memory = memoriesById.get(id);

            if (memory == null) {
                continue;
            }

            double semanticScore =
                    semanticScores.getOrDefault(id, 0.0);

            double keywordScore =
                    keywordScores.getOrDefault(id, 0.0);

            double hybridScore =
                    (0.7 * semanticScore)
                            + (0.3 * keywordScore);

            rankedMemories.add(
                    new RankedMemory(memory, hybridScore)
            );
        }

        rankedMemories.sort(
                Comparator.comparingDouble(RankedMemory::score)
                        .reversed()
        );

        return rankedMemories.stream()
                .limit(safeLimit)
                .map(RankedMemory::memory)
                .toList();
    }

    private Map<Long, Double> buildRankScores(
            List<Memory> memories) {

        Map<Long, Double> scores = new HashMap<>();

        for (int i = 0; i < memories.size(); i++) {
            long rank = i + 1L;
            double score = 1.0 / rank;

            scores.put(
                    memories.get(i).getId(),
                    score
            );
        }

        return scores;
    }

    private Map<Long, Double> buildKeywordScores(
            List<Object[]> results) {

        Map<Long, Double> scores = new HashMap<>();

        double maxScore = 0.0;

        for (Object[] row : results) {
            double score = ((Number) row[1]).doubleValue();
            maxScore = Math.max(maxScore, score);
        }

        for (Object[] row : results) {
            Long id = ((Number) row[0]).longValue();
            double score = ((Number) row[1]).doubleValue();

            double normalizedScore =
                    maxScore > 0
                            ? score / maxScore
                            : 0.0;

            scores.put(id, normalizedScore);
        }

        return scores;
    }

    private record RankedMemory(
            Memory memory,
            double score
    ) {
    }

    public Optional<Memory> updateFavorite(
            Long id,
            boolean favorite) {

        return memoryRepository.findById(id)
                .map(memory -> {
                    memory.setFavorite(favorite);
                    return memoryRepository.save(memory);
                });
    }

    public Optional<Memory> updateRemark(
            Long id,
            String remark) {

        return memoryRepository.findById(id)
                .map(memory -> {
                    String normalizedRemark =
                            remark == null || remark.isBlank()
                                    ? null
                                    : remark.trim();

                    memory.setRemark(normalizedRemark);

                    String searchableText =
                            buildSearchableText(memory);

                    float[] embedding =
                            embeddingService.generateEmbedding(
                                    searchableText
                            );

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

    private void appendIfPresent(
            StringBuilder text,
            String value) {

        if (value != null && !value.isBlank()) {
            if (text.length() > 0) {
                text.append(". ");
            }

            text.append(value.trim());
        }
    }
}
