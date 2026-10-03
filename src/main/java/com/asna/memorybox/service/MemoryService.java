package com.asna.memorybox.service;

import com.asna.memorybox.entity.Memory;
import com.asna.memorybox.repository.MemoryRepository;
import org.springframework.stereotype.Service;

@Service
public class MemoryService {

    private final MemoryRepository memoryRepository;

    public MemoryService(MemoryRepository memoryRepository) {
        this.memoryRepository = memoryRepository;
    }

    public Memory saveMemory(Memory memory) {
        return memoryRepository.save(memory);
    }
}