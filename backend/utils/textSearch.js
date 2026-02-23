const natural = require('natural');
const TfIdf = natural.TfIdf;

/**
 * Split text into meaningful chunks (sentences or short paragraphs).
 * @param {string} text
 * @returns {string[]}
 */
function splitIntoChunks(text) {
    // Split on sentence boundaries, then filter out very short chunks
    const sentences = text
        .replace(/\s+/g, ' ')
        .split(/(?<=[.!?])\s+|(?<=\n)\s*/)
        .map((s) => s.trim())
        .filter((s) => s.length > 10);

    // Group sentences into chunks of ~2–3 sentences for better context
    const chunks = [];
    for (let i = 0; i < sentences.length; i += 2) {
        const chunk = sentences.slice(i, i + 2).join(' ');
        if (chunk.trim().length > 10) {
            chunks.push(chunk.trim());
        }
    }
    return chunks;
}

/**
 * Find text passages related to the query within the PDF pages.
 * Uses TF-IDF to compute similarity between query and each text chunk.
 *
 * @param {string} query - The highlighted text to find related content for
 * @param {Array<{ pageNumber: number, text: string }>} pages - Extracted PDF pages
 * @param {number} [maxResults=10] - Maximum number of results to return
 * @returns {Array<{ pageNumber: number, snippet: string, score: number, textContent: string }>}
 */
function findRelatedText(query, pages, maxResults = 10) {
    if (!query || !pages || pages.length === 0) {
        return [];
    }

    const tfidf = new TfIdf();
    const chunkMap = []; // Maps TF-IDF document index → { pageNumber, text }

    // Add the query as document 0
    tfidf.addDocument(query);

    // Add all text chunks from all pages
    for (const page of pages) {
        const chunks = splitIntoChunks(page.text);
        for (const chunk of chunks) {
            tfidf.addDocument(chunk);
            chunkMap.push({
                pageNumber: page.pageNumber,
                text: chunk,
            });
        }
    }

    // Compute similarity of each chunk to the query
    const results = [];

    // Get terms from the query document
    const queryTerms = [];
    tfidf.listTerms(0).forEach((item) => {
        queryTerms.push({ term: item.term, tfidf: item.tfidf });
    });

    // Score each chunk document
    for (let i = 0; i < chunkMap.length; i++) {
        const docIndex = i + 1; // +1 because query is document 0
        let score = 0;

        // Calculate similarity: sum of TF-IDF values for query terms in this document
        for (const qt of queryTerms) {
            score += tfidf.tfidf(qt.term, docIndex);
        }

        // Skip chunks that are too similar to the query (likely the same text)
        const normalizedQuery = query.replace(/\s+/g, ' ').trim().toLowerCase();
        const normalizedChunk = chunkMap[i].text
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();

        if (normalizedChunk.includes(normalizedQuery) && normalizedQuery.length > 20) {
            continue; // Skip exact matches of the highlight itself
        }

        if (score > 0) {
            // Create a short snippet (first 150 chars)
            const snippet =
                chunkMap[i].text.length > 150
                    ? chunkMap[i].text.substring(0, 150) + '...'
                    : chunkMap[i].text;

            results.push({
                pageNumber: chunkMap[i].pageNumber,
                snippet,
                score: Math.round(score * 100) / 100,
                textContent: chunkMap[i].text,
            });
        }
    }

    // Sort by score descending and return top results
    results.sort((a, b) => b.score - a.score);

    // Normalize scores to 0–1 range for confidence display
    const maxScore = results.length > 0 ? results[0].score : 1;
    return results.slice(0, maxResults).map((r) => ({
        ...r,
        confidence: Math.round((r.score / maxScore) * 100) / 100,
    }));
}

module.exports = { findRelatedText, splitIntoChunks };
