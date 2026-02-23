# PDF Reader, Highlight, and Related Text Finder

A full-stack application for reading PDFs in the browser, selecting and copying text, creating highlights on demand, finding related passages, and jumping to matched locations with visual indication.

---

## Core Features

- PDF rendering in browser with page scrolling
- Native text selection and copy support
- On-demand **Highlight** action (not automatic)
- On-demand **Related Text** action from selected text or saved highlights
- Fast **Find Text** with prebuilt in-memory index (quick-response behavior)
- Jump to page + visual indication for matched locations
- Collapsible right tools sidebar with:
  - peek strip when collapsed
  - hover overlay preview
  - click-to-expand persistent mode
- Loading, empty, and error states

---

## Tech Stack

- Frontend: React + Vite + pdfjs-dist
- Backend: Node.js + Express + natural (TF-IDF)
- Containerization: Docker + Docker Compose

---

## Prerequisites

- Node.js 18+
- npm 9+
- Docker Desktop (or Docker Engine + Compose plugin)

---

## Run with Docker (Recommended)

From project root:

```bash
docker compose up --build
```

If your machine uses the legacy command:

```bash
docker-compose up --build
```

### URLs

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

### Useful commands

```bash
# Stop and remove containers
docker compose down

# Follow logs
docker compose logs -f

# Clean rebuild (including volumes)
docker compose down -v
docker compose up --build
```

---

## Run Locally (Without Docker)

### Backend

```bash
cd backend
npm install
node server.js
```

Backend runs at `http://localhost:5000`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`.

---

## Usage Flow

1. Upload a PDF file.
2. Read normally, select and copy text freely.
3. Use **Selection Actions** in the right panel:
   - **Highlight** to save selection as highlight
   - **Related Text** to search related passages
4. Use **Find Text** for quick exact-string search.
5. Click **Jump to page** on a result to navigate and highlight the target area.

---

## API Reference

### `POST /api/search`

Search related passages in the uploaded PDF.

**Request** (`multipart/form-data`):

| Field | Type | Description |
|---|---|---|
| `pdf` | File | PDF file (max 50MB) |
| `query` | String | Highlighted/selected text |

**Response example**:

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

## Detailed Feature Notes

For implementation details and behavior design, see:

- [FEATURE_EXPLANATION.md](FEATURE_EXPLANATION.md)

---

## Project Structure

```text
backend/
  server.js
  routes/
  controllers/
  utils/

frontend/
  src/
    App.jsx
    components/
    services/
    App.css
  index.html

docker-compose.yml
README.md
FEATURE_EXPLANATION.md
```
