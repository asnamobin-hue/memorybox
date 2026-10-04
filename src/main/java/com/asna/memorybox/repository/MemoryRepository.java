package com.asna.memorybox.repository;

import com.asna.memorybox.entity.Memory;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface MemoryRepository extends JpaRepository<Memory, Long> {

    List<Memory> findAllByOrderByCreatedAtDesc();

    @Query("""
        SELECT m
        FROM Memory m
        ORDER BY cosine_distance(m.embedding, :embedding)
        """)
    List<Memory> searchSimilar(float[] embedding, Pageable pageable);
}
