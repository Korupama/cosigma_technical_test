# PDF Highlight & Discover

A full-stack web application that allows users to view PDF documents, highlight selected text, find related passages elsewhere in the same PDF, and jump directly to those locations with visual indication.

![Architecture](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-blue) ![Backend](https://img.shields.io/badge/Backend-Express.js-green) ![Search](https://img.shields.io/badge/Search-TF--IDF-orange)

---

## Features

- **PDF Viewing** — Render PDF documents in the browser with scrollable pages
- **Text Highlighting** — Select text to create persistent highlights with visual overlays
- **Direct Text Search** — Search any text string in the PDF and jump to matched pages
- **Find Related Text** — Discover semantically similar passages throughout the document using TF-IDF
- **Jump & Indicate** — Navigate to matched locations with a pulsing visual indicator
- **Confidence Scores** — Each match shows a percentage confidence score
- **Multiple Highlights** — Maintain a list of highlights with per-highlight search

---

## Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9

---

## Run Instructions

### 1. Backend

```bash
cd backend
npm install
node server.js
```

The server starts at **http://localhost:5000**.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

The app opens at **http://localhost:5173**.

### 3. Usage

1. Click **Upload PDF** and select any PDF file.
2. Select text on any page — a highlight is created and appears in the sidebar.
3. Click **Find Related** on a highlight card.
4. Review the ranked results with page numbers and confidence scores.
5. Click **Jump to page** to scroll to the matching passage with a visual indicator.

---

## Technical Explanation

### (a) How Related Results Are Computed

The backend uses **TF-IDF (Term Frequency–Inverse Document Frequency)** with the `natural` NLP library:

1. **Text Extraction** — `pdf-parse` extracts text content from each page of the uploaded PDF.
2. **Chunking** — Each page's text is split into sentence-level chunks (2–3 sentences per chunk) for granular matching.
3. **TF-IDF Model** — A TF-IDF model is built over all chunks. The highlighted text (query) is added as document 0.
4. **Scoring** — For each chunk, the sum of TF-IDF values for all query terms is computed. Chunks containing the exact highlighted text are filtered out to avoid self-matches.
5. **Ranking** — Results are sorted by descending score. Scores are normalized to a 0–1 confidence range relative to the best match.
6. **Response** — Top 10 results are returned, each with `pageNumber`, `snippet`, `score`, `confidence`, and `textContent`.

**Why TF-IDF?** It's a proven, zero-dependency approach that works well for finding passages that share vocabulary with the query. Words that appear rarely in the document but frequently in both the query and a candidate chunk produce high similarity scores.

### (b) How the Frontend Locates and Renders Matched Areas

1. **PDF Rendering** — `pdfjs-dist` renders each page onto an HTML `<canvas>` element.
2. **Custom Selectable Text Layer** — A transparent text layer is built from `page.getTextContent()` and rendered as absolutely-positioned spans. This provides robust browser-native text selection.
3. **Highlight Creation** — On `mouseup`, the Selection API captures selected text and client rects, then stores rects as ratios (`left/top/width/height`) so highlights remain aligned after resize.
4. **Highlight Rendering** — Yellow semi-transparent overlays are re-projected from stored ratios on each page render.
5. **Jump Navigation** — Clicking "Jump" scrolls to the matched page with `scrollIntoView({ behavior: 'smooth' })`.
6. **Visual Indication** — The viewer tries to resolve an exact text bounding region on that page by matching the returned chunk/snippet against the text-layer spans. If resolved, a pulsing blue box marks that exact area; otherwise, a page-level indicator is shown as fallback.

---

## API Reference

### `POST /api/search`

Find related text within a PDF document.

**Request** (multipart/form-data):
| Field | Type | Description |
|-------|------|-------------|
| `pdf` | File | PDF file (max 50MB) |
| `query` | String | The highlighted text to search for |

**Response**:
```json
{
  "query": "selected text",
  "totalPages": 10,
  "results": [
    {
      "pageNumber": 3,
      "snippet": "First 150 characters of the matching passage...",
      "score": 12.45,
      "confidence": 0.92,
      "textContent": "Full text of the matching chunk"
    }
  ]
}
```

---

## Project Structure

```
├── backend/
│   ├── server.js                 # Express entry point
│   ├── routes/searchRoutes.js    # API routes
│   ├── controllers/searchController.js  # Request handling
│   ├── utils/pdfParser.js        # PDF text extraction
│   └── utils/textSearch.js       # TF-IDF search engine
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx               # Main app (state management)
│   │   ├── components/
│   │   │   ├── PDFViewer.jsx     # PDF rendering + text layer
│   │   │   ├── SidePanel.jsx     # Highlights + results
│   │   │   └── SearchResults.jsx # Result list with jump
│   │   ├── services/api.js       # Backend API client
│   │   ├── App.css               # Component styles
│   │   └── index.css             # Global styles + tokens
│   └── index.html
│
└── README.md
```
