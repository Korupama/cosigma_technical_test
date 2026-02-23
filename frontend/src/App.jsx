import { useState, useCallback } from 'react';
import PDFViewer from './components/PDFViewer';
import SidePanel from './components/SidePanel';
import { searchRelated } from './services/api';
import { searchTextInPdf } from './services/textSearch';
import './App.css';

function App() {
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfFileName, setPdfFileName] = useState('');
  const [highlights, setHighlights] = useState([]);
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [searchMode, setSearchMode] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeHighlightId, setActiveHighlightId] = useState(null);
  const [jumpTarget, setJumpTarget] = useState(null);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      setPdfFileName(file.name);
      setHighlights([]);
      setSearchResults(null);
      setSearchError(null);
      setSearchMode(null);
      setSearchQuery('');
      setActiveHighlightId(null);
      setJumpTarget(null);
    }
  };

  const handleAddHighlight = useCallback((highlight) => {
    setHighlights((prev) => {
      // Avoid duplicate highlights
      const exists = prev.some(
        (h) => h.text === highlight.text && h.pageNumber === highlight.pageNumber
      );
      if (exists) return prev;
      return [...prev, highlight];
    });
  }, []);

  const handleRemoveHighlight = useCallback(
    (id) => {
      setHighlights((prev) => prev.filter((h) => h.id !== id));
      if (activeHighlightId === id) {
        setSearchResults(null);
        setSearchError(null);
        setActiveHighlightId(null);
      }
    },
    [activeHighlightId]
  );

  const handleFindRelated = useCallback(
    async (highlight) => {
      if (!pdfFile) return;

      setActiveHighlightId(highlight.id);
      setIsSearching(true);
      setSearchResults(null);
      setSearchError(null);
      setSearchMode('related');
      setJumpTarget(null);

      try {
        const data = await searchRelated(pdfFile, highlight.text);
        setSearchResults(data.results);
      } catch (error) {
        setSearchError(error.message || 'Failed to search for related text');
      } finally {
        setIsSearching(false);
      }
    },
    [pdfFile]
  );

  const handleTextSearch = useCallback(
    async (query) => {
      if (!pdfFile) {
        setSearchError('Please upload a PDF before searching text');
        setSearchMode('text');
        return;
      }

      const normalizedQuery = query.trim();
      if (!normalizedQuery) {
        setSearchResults(null);
        setSearchError(null);
        setSearchMode(null);
        setSearchQuery('');
        return;
      }

      setSearchQuery(normalizedQuery);
      setIsSearching(true);
      setSearchResults(null);
      setSearchError(null);
      setSearchMode('text');
      setActiveHighlightId(null);
      setJumpTarget(null);

      try {
        const results = await searchTextInPdf(pdfFile, normalizedQuery);
        setSearchResults(results);
      } catch (error) {
        setSearchError(error.message || 'Failed to search text in PDF');
      } finally {
        setIsSearching(false);
      }
    },
    [pdfFile]
  );

  const handleJump = useCallback((result) => {
    setJumpTarget({
      pageNumber: result.pageNumber,
      textContent: result.textContent,
      snippet: result.snippet,
    });
  }, []);

  const handleJumpComplete = useCallback(() => {
    setJumpTarget(null);
  }, []);

  const handleCloseResults = useCallback(() => {
    setSearchResults(null);
    setSearchError(null);
    setSearchMode(null);
    setSearchQuery('');
    setActiveHighlightId(null);
    setJumpTarget(null);
  }, []);

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <h1 className="app-title">
            <span className="title-accent">PDF</span> Highlight & Discover
          </h1>
        </div>
        <div className="header-center">
          {pdfFileName && (
            <div className="file-name-badge">
              <span className="file-icon">PDF</span>
              {pdfFileName}
            </div>
          )}
        </div>
        <div className="header-right">
          <label className="upload-btn" htmlFor="pdf-upload">
            <span className="upload-icon">Upload</span>
            {pdfFile ? 'Change PDF' : 'Upload PDF'}
          </label>
          <input
            id="pdf-upload"
            type="file"
            accept="application/pdf"
            onChange={handleFileUpload}
            hidden
          />
        </div>
      </header>

      {/* Main content */}
      <main className="app-main">
        <div className="viewer-container">
          <PDFViewer
            pdfFile={pdfFile}
            highlights={highlights}
            onAddHighlight={handleAddHighlight}
            jumpTarget={jumpTarget}
            onJumpComplete={handleJumpComplete}
          />
        </div>
        <div className="panel-container">
          <SidePanel
            highlights={highlights}
            searchResults={searchResults}
            isSearching={isSearching}
            searchError={searchError}
            searchMode={searchMode}
            searchQuery={searchQuery}
            activeHighlightId={activeHighlightId}
            onFindRelated={handleFindRelated}
            onTextSearch={handleTextSearch}
            onJump={handleJump}
            onCloseResults={handleCloseResults}
            onRemoveHighlight={handleRemoveHighlight}
          />
        </div>
      </main>
    </div>
  );
}

export default App;
