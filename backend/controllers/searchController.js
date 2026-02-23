const { extractPagesText } = require('../utils/pdfParser');
const { findRelatedText } = require('../utils/textSearch');

/**
 * POST /api/search
 * Accepts multipart form data with:
 *   - pdf: PDF file
 *   - query: highlighted text string
 * Returns ranked related text matches.
 */
async function searchRelated(req, res) {
    try {
        const { query } = req.body;
        const pdfFile = req.file;

        if (!pdfFile) {
            return res.status(400).json({
                error: 'Missing PDF file. Please upload a PDF file.',
            });
        }

        if (!query || query.trim().length === 0) {
            return res.status(400).json({
                error: 'Missing query. Please provide the highlighted text.',
            });
        }

        // Extract text from each page of the PDF
        const pages = await extractPagesText(pdfFile.buffer);

        if (pages.length === 0) {
            return res.status(400).json({
                error: 'Could not extract text from the PDF. The file may be image-based.',
            });
        }

        // Find related text passages
        const results = findRelatedText(query.trim(), pages);

        return res.json({
            query: query.trim(),
            totalPages: pages.length,
            results,
        });
    } catch (error) {
        console.error('Search error:', error);
        return res.status(500).json({
            error: 'An error occurred while processing the PDF. Please try again.',
        });
    }
}

module.exports = { searchRelated };
