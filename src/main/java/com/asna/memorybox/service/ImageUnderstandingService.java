package com.asna.memorybox.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.json.JsonParser;
import org.springframework.boot.json.JsonParserFactory;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.RestClient;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Base64;
import java.util.Map;

@Service
public class ImageUnderstandingService {

    private final RestClient restClient;
    private final JsonParser jsonParser;

    @Value("${HF_TOKEN}")
    private String hfToken;

    public ImageUnderstandingService() {
        this.restClient = RestClient.builder()
                .baseUrl("https://router.huggingface.co/v1")
                .build();

        this.jsonParser = JsonParserFactory.getJsonParser();
    }

    public String generateCaption(String imagePath) {
        try {
            byte[] imageBytes = Files.readAllBytes(Path.of(imagePath));

            String base64Image = Base64.getEncoder()
                    .encodeToString(imageBytes);

            String extension = getExtension(imagePath);

            String imageDataUrl =
                    "data:image/" + extension + ";base64," + base64Image;

            String response = callModel(imageDataUrl);

            Map<String, Object> json = jsonParser.parseMap(response);

            return extractCaption(json);

        } catch (IOException e) {
            throw new RuntimeException("Failed to process image", e);
        }
    }

    private String callModel(String imageDataUrl) {
        int maxAttempts = 4;

        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return sendRequest(imageDataUrl);

            } catch (HttpServerErrorException.ServiceUnavailable e) {
                if (attempt == maxAttempts) {
                    throw new RuntimeException(
                            "Image understanding service is temporarily unavailable after "
                                    + maxAttempts + " attempts. Please try again shortly.",
                            e
                    );
                }

                long delayMillis = 3000L * (1L << (attempt - 1));

                System.out.println(
                        "Hugging Face image model is temporarily unavailable. "
                                + "Retrying in " + (delayMillis / 1000)
                                + " seconds (attempt "
                                + (attempt + 1)
                                + " of " + maxAttempts + ")..."
                );

                try {
                    Thread.sleep(delayMillis);
                } catch (InterruptedException interruptedException) {
                    Thread.currentThread().interrupt();

                    throw new RuntimeException(
                            "Interrupted while retrying image understanding",
                            interruptedException
                    );
                }
            }
        }

        throw new RuntimeException(
                "Image understanding failed unexpectedly."
        );
    }

    private String sendRequest(String imageDataUrl) {
        return restClient.post()
                .uri("/chat/completions")
                .header("Authorization", "Bearer " + hfToken)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {
                          "model": "Qwen/Qwen3-VL-2B-Instruct:featherless-ai",
                          "messages": [
                            {
                              "role": "user",
                              "content": [
                                {
                                  "type": "text",
                                  "text": "Describe this image in one sentence. Focus on the people, activity, setting, and important objects."
                                },
                                {
                                  "type": "image_url",
                                  "image_url": {
                                    "url": "%s"
                                  }
                                }
                              ]
                            }
                          ]
                        }
                        """.formatted(imageDataUrl))
                .retrieve()
                .body(String.class);
    }

    @SuppressWarnings("unchecked")
    private String extractCaption(Map<String, Object> json) {
        var choices =
                (java.util.List<Map<String, Object>>) json.get("choices");

        var firstChoice = choices.get(0);

        var message =
                (Map<String, Object>) firstChoice.get("message");

        return (String) message.get("content");
    }

    private String getExtension(String imagePath) {
        String extension = imagePath.substring(
                imagePath.lastIndexOf('.') + 1
        );

        return extension.equalsIgnoreCase("jpg")
                ? "jpeg"
                : extension;
    }
}
