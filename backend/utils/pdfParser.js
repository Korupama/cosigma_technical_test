const { PDFParse } = require('pdf-parse');

/**
 * Parse a PDF buffer and extract text content per page.
 * Uses pdf-parse with a custom page renderer to capture per-page text.
 *
 * @param {Buffer} pdfBuffer - The PDF file buffer
 * @returns {Promise<Array<{ pageNumber: number, text: string }>>}
 */
async function extractPagesText(pdfBuffer) {
    const parser = new PDFParse({ data: pdfBuffer });

    try {
        const info = await parser.getInfo();
        const totalPages = Number(info?.total) || 0;

        if (!totalPages) {
            return [];
        }

        const pages = [];
        for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
            const pageResult = await parser.getText({ partial: [pageNumber] });
            const pageText = (pageResult?.text || '').replace(/\s+/g, ' ').trim();

            pages.push({
                pageNumber,
                text: pageText,
            });
        }

        return pages;
    } finally {
        await parser.destroy();
    }
}

module.exports = { extractPagesText };
