package com.asna.memorybox.controller;

import com.asna.memorybox.dto.MemoryResponse;
import com.asna.memorybox.entity.Memory;
import com.asna.memorybox.service.MemoryProcessingService;
import com.asna.memorybox.service.MemoryService;
import com.asna.memorybox.service.StorageService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/memories")
public class MemoryController {

    private final MemoryService memoryService;
    private final StorageService storageService;
    private final MemoryProcessingService memoryProcessingService;

    public MemoryController(
            MemoryService memoryService,
            StorageService storageService,
            MemoryProcessingService memoryProcessingService) {

        this.memoryService = memoryService;
        this.storageService = storageService;
        this.memoryProcessingService = memoryProcessingService;
    }

    @GetMapping
    public ResponseEntity<List<MemoryResponse>> getMemories() {

        return ResponseEntity.ok(
                memoryService.findAllMemories()
                        .stream()
                        .map(MemoryResponse::from)
                        .toList()
        );
    }

    @GetMapping("/search")
    public ResponseEntity<List<MemoryResponse>> searchMemories(
            @RequestParam("q") String query,
            @RequestParam(defaultValue = "5") int limit) {

        return ResponseEntity.ok(
                memoryService.searchMemories(query, limit)
                        .stream()
                        .map(MemoryResponse::from)
                        .toList()
        );
    }

    @GetMapping("/{id}")
    public ResponseEntity<MemoryResponse> getMemory(
            @PathVariable Long id) {

        return memoryService.findMemory(id)
                .map(MemoryResponse::from)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/favorite")
    public ResponseEntity<MemoryResponse> updateFavorite(
            @PathVariable Long id,
            @RequestParam boolean favorite) {

        return memoryService.updateFavorite(id, favorite)
                .map(MemoryResponse::from)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/remark")
    public ResponseEntity<MemoryResponse> updateRemark(
            @PathVariable Long id,
            @RequestParam(required = false) String remark) {

        return memoryService.updateRemark(id, remark)
                .map(MemoryResponse::from)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMemory(
            @PathVariable Long id) {

        if (!memoryService.deleteMemory(id)) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.noContent().build();
    }

    @PostMapping
    public ResponseEntity<MemoryResponse> createMemory(
            @RequestParam("image") MultipartFile image,
            @RequestParam(value = "userDescription", required = false) String userDescription) {

        String imagePath = storageService.saveImage(image);

        Memory memory = new Memory();
        memory.setImageUrl(imagePath);
        memory.setUserDescription(userDescription);

        Memory savedMemory =
                memoryService.saveMemory(memory);

        memoryProcessingService.processMemory(
                savedMemory.getId(),
                imagePath
        );

        return ResponseEntity.ok(
                MemoryResponse.from(savedMemory)
        );
    }
}
