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

    @Query(value = """
        SELECT
            m.id,
            ts_rank(
                to_tsvector(
                    'simple',
                    concat_ws(
                        ' ',
                        coalesce(m.user_description, ''),
                        coalesce(m.ai_caption, ''),
                        coalesce(m.remark, '')
                    )
                ),
                plainto_tsquery('simple', :query)
            ) AS keyword_score
        FROM memories m
        WHERE to_tsvector(
            'simple',
            concat_ws(
                ' ',
                coalesce(m.user_description, ''),
                coalesce(m.ai_caption, ''),
                coalesce(m.remark, '')
            )
        ) @@ plainto_tsquery('simple', :query)
        ORDER BY keyword_score DESC
        """, nativeQuery = true)
    List<Object[]> searchKeywordScores(String query);
}
