package com.asna.memorybox.controller;

import com.asna.memorybox.entity.Memory;
import com.asna.memorybox.service.MemoryService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/memories")
public class MemoryController {

    private final MemoryService memoryService;

    public MemoryController(MemoryService memoryService) {
        this.memoryService = memoryService;
    }

    @PostMapping
    public ResponseEntity<Memory> createMemory(@RequestBody Memory memory) {
        Memory savedMemory = memoryService.saveMemory(memory);
        return ResponseEntity.ok(savedMemory);
    }
}