import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

function normalizeText(value = '') {
  return value.replace(/\s+/g, ' ').trim();
}

function makeSnippet(text, startIndex, queryLength, radius = 70) {
  const start = Math.max(0, startIndex - radius);
  const end = Math.min(text.length, startIndex + queryLength + radius);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < text.length ? '…' : '';
  return `${prefix}${text.slice(start, end).trim()}${suffix}`;
}

async function extractPages(pdfFile) {
  const data = await pdfFile.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data });
  const doc = await loadingTask.promise;

  const pages = [];
  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
    const page = await doc.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const text = normalizeText(textContent.items.map((item) => item.str || '').join(' '));

    pages.push({
      pageNumber,
      text,
    });
  }

  loadingTask.destroy();
  return pages;
}

export async function buildPdfTextIndex(pdfFile) {
  if (!pdfFile) return [];

  const pages = await extractPages(pdfFile);
  return pages.map((page) => ({
    ...page,
    textLower: page.text.toLowerCase(),
  }));
}

export function searchInPdfTextIndex(textIndex, query, maxResults = 30) {
  const normalizedQuery = normalizeText(query).toLowerCase();
  if (!Array.isArray(textIndex) || textIndex.length === 0 || !normalizedQuery) {
    return [];
  }

  const results = [];

  for (const page of textIndex) {
    if (!page.text || !page.textLower) continue;

    const source = page.text;
    const lower = page.textLower;
    let fromIndex = 0;

    while (fromIndex < lower.length) {
      const foundAt = lower.indexOf(normalizedQuery, fromIndex);
      if (foundAt === -1) break;

      const textContent = source.slice(foundAt, foundAt + normalizedQuery.length);
      results.push({
        pageNumber: page.pageNumber,
        snippet: makeSnippet(source, foundAt, normalizedQuery.length),
        textContent,
        score: 1,
        confidence: 1,
      });

      if (results.length >= maxResults) {
        return results;
      }

      fromIndex = foundAt + normalizedQuery.length;
    }
  }

  return results;
}

export async function searchTextInPdf(pdfFile, query, maxResults = 30) {
  const textIndex = await buildPdfTextIndex(pdfFile);
  return searchInPdfTextIndex(textIndex, query, maxResults);
}
