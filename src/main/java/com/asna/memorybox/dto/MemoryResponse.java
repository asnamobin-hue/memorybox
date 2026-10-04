package com.asna.memorybox.dto;

import com.asna.memorybox.entity.Memory;

import java.time.LocalDateTime;

public record MemoryResponse(
        Long id,
        String imageUrl,
        String userDescription,
        String aiCaption,
        String remark,
        boolean favorite,
        LocalDateTime createdAt
) {

    public static MemoryResponse from(Memory memory) {
        return new MemoryResponse(
                memory.getId(),
                memory.getImageUrl(),
                memory.getUserDescription(),
                memory.getAiCaption(),
                memory.getRemark(),
                memory.isFavorite(),
                memory.getCreatedAt()
        );
    }
}
