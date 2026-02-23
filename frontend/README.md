# Frontend - PDF Highlight & Find Related

React + Vite frontend for viewing PDFs, creating text highlights, finding related passages, and jumping to matched locations.

## Features

- Upload and render multi-page PDFs in-browser
- Find any text string directly in the PDF
- Select text to create persistent highlights
- List highlights in a side panel with per-highlight actions
- Trigger related-text search via backend API
- Show loading, empty, and error states for search
- Jump to result page and visually indicate matched area (or page-level fallback)

## Run

```bash
npm install
npm run dev
```

Frontend runs on `http://localhost:5173` by default.

## Build & Lint

```bash
npm run lint
npm run build
```

## API Dependency

The frontend calls `http://localhost:5000/api/search` from `src/services/api.js`.
Start the backend before using **Find Related**.
