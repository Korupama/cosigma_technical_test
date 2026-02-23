const API_BASE_URL = 'http://localhost:5000/api';

/**
 * Search for related text in a PDF document.
 * @param {File} pdfFile - The PDF file object
 * @param {string} query - The highlighted text to find related content for
 * @returns {Promise<{ query: string, totalPages: number, results: Array }>}
 */
export async function searchRelated(pdfFile, query) {
    const formData = new FormData();
    formData.append('pdf', pdfFile);
    formData.append('query', query);

    const response = await fetch(`${API_BASE_URL}/search`, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Search failed with status ${response.status}`);
    }

    return response.json();
}
