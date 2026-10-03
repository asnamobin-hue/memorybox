package com.asna.memorybox.controller;

import com.asna.memorybox.entity.Memory;
import com.asna.memorybox.service.MemoryService;
import com.asna.memorybox.service.StorageService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/memories")
public class MemoryController {

    private final MemoryService memoryService;
    private final StorageService storageService;

    public MemoryController(
            MemoryService memoryService,
            StorageService storageService) {
        this.memoryService = memoryService;
        this.storageService = storageService;
    }

    @PostMapping
    public ResponseEntity<Memory> createMemory(
            @RequestParam("image") MultipartFile image,
            @RequestParam(value = "userDescription", required = false) String userDescription) {

        String imagePath = storageService.saveImage(image);

        Memory memory = new Memory();
        memory.setImageUrl(imagePath);
        memory.setUserDescription(userDescription);

        Memory savedMemory = memoryService.saveMemory(memory);

        return ResponseEntity.ok(savedMemory);
    }
}