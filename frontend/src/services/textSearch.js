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

export async function searchTextInPdf(pdfFile, query, maxResults = 30) {
  const normalizedQuery = normalizeText(query).toLowerCase();
  if (!pdfFile || !normalizedQuery) {
    return [];
  }

  const pages = await extractPages(pdfFile);
  const results = [];

  for (const page of pages) {
    if (!page.text) continue;

    const source = page.text;
    const lower = source.toLowerCase();
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
