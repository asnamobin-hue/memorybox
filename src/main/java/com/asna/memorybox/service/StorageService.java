package com.asna.memorybox.service;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@Service
public class StorageService {

    private final Path uploadDirectory = Paths.get("uploads");

    public String saveImage(MultipartFile image) {
        if (image == null || image.isEmpty()) {
            throw new IllegalArgumentException("Image file cannot be empty");
        }

        String originalFilename = image.getOriginalFilename();
        String extension = "";

        if (originalFilename != null && originalFilename.contains(".")) {
            extension = originalFilename.substring(originalFilename.lastIndexOf("."));
        }

        String filename = UUID.randomUUID() + extension;
        Path targetPath = uploadDirectory.resolve(filename);

        try {
            Files.createDirectories(uploadDirectory);
            Files.copy(image.getInputStream(), targetPath);
        } catch (IOException e) {
            throw new RuntimeException("Failed to store image", e);
        }

        return targetPath.toString();
    }
}