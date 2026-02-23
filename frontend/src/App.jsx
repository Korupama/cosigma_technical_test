import { useState, useCallback, useEffect, useRef } from 'react';
import { FaChevronLeft, FaChevronRight, FaFilePdf, FaSearch, FaUpload } from 'react-icons/fa';
import PDFViewer from './components/PDFViewer';
import SidePanel from './components/SidePanel';
import { searchRelated } from './services/api';
import { buildPdfTextIndex, searchInPdfTextIndex } from './services/textSearch';
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
  const [textSearchIndex, setTextSearchIndex] = useState(null);
  const [isTextIndexing, setIsTextIndexing] = useState(false);
  const [textIndexError, setTextIndexError] = useState(null);
  const [pendingTextQuery, setPendingTextQuery] = useState('');
  const [selectedTextInfo, setSelectedTextInfo] = useState(null);
  const [activeHighlightId, setActiveHighlightId] = useState(null);
  const [jumpTarget, setJumpTarget] = useState(null);
  const [isToolbarCollapsed, setIsToolbarCollapsed] = useState(false);
  const [isToolbarPeekActive, setIsToolbarPeekActive] = useState(false);
  const toolbarHoverTimeoutRef = useRef(null);

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
      setTextSearchIndex(null);
      setIsTextIndexing(false);
      setTextIndexError(null);
      setPendingTextQuery('');
      setSelectedTextInfo(null);
      setActiveHighlightId(null);
      setJumpTarget(null);
    }
  };

  useEffect(() => {
    if (!pdfFile) {
      setTextSearchIndex(null);
      setIsTextIndexing(false);
      setTextIndexError(null);
      setPendingTextQuery('');
      return;
    }

    let cancelled = false;

    setIsTextIndexing(true);
    setTextIndexError(null);

    (async () => {
      try {
        const index = await buildPdfTextIndex(pdfFile);
        if (!cancelled) {
          setTextSearchIndex(index);
        }
      } catch (error) {
        if (!cancelled) {
          setTextIndexError(error.message || 'Failed to build search index');
          setTextSearchIndex(null);
        }
      } finally {
        if (!cancelled) {
          setIsTextIndexing(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pdfFile]);

  const handleSelectionChange = useCallback((selectionInfo) => {
    setSelectedTextInfo(selectionInfo);
  }, []);

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

  const handleAddHighlightFromSelection = useCallback(() => {
    if (!selectedTextInfo) return;

    handleAddHighlight({
      id: Date.now().toString(),
      text: selectedTextInfo.text,
      pageNumber: selectedTextInfo.pageNumber,
      rects: selectedTextInfo.rects,
    });
  }, [handleAddHighlight, selectedTextInfo]);

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

  const handleFindRelatedFromSelection = useCallback(async () => {
    if (!pdfFile || !selectedTextInfo?.text) {
      return;
    }

    setActiveHighlightId(null);
    setIsSearching(true);
    setSearchResults(null);
    setSearchError(null);
    setSearchMode('related');
    setSearchQuery(selectedTextInfo.text);
    setJumpTarget(null);

    try {
      const data = await searchRelated(pdfFile, selectedTextInfo.text);
      setSearchResults(data.results);
    } catch (error) {
      setSearchError(error.message || 'Failed to search for related text');
    } finally {
      setIsSearching(false);
    }
  }, [pdfFile, selectedTextInfo]);

  const runIndexedTextSearch = useCallback((query, index) => {
    const results = searchInPdfTextIndex(index, query);
    setSearchResults(results);
    setSearchError(null);
    setSearchMode('text');
    setSearchQuery(query);
    setActiveHighlightId(null);
    setJumpTarget(null);
  }, []);

  const handleTextSearch = useCallback((query) => {
    if (!pdfFile) {
      setSearchError('Please upload a PDF before searching text');
      setSearchMode('text');
      return;
    }

    const normalizedQuery = query.trim();
    if (!normalizedQuery) {
      setPendingTextQuery('');
      setSearchResults(null);
      setSearchError(null);
      setSearchMode(null);
      setSearchQuery('');
      return;
    }

    if (textIndexError) {
      setSearchError(textIndexError);
      setSearchMode('text');
      setSearchQuery(normalizedQuery);
      return;
    }

    if (!textSearchIndex) {
      setPendingTextQuery(normalizedQuery);
      setSearchMode('text');
      setSearchQuery(normalizedQuery);
      setSearchResults(null);
      setSearchError(null);
      return;
    }

    setPendingTextQuery('');
    runIndexedTextSearch(normalizedQuery, textSearchIndex);
  }, [pdfFile, runIndexedTextSearch, textIndexError, textSearchIndex]);

  useEffect(() => {
    if (!pendingTextQuery || !textSearchIndex || isTextIndexing) {
      return;
    }

    runIndexedTextSearch(pendingTextQuery, textSearchIndex);
    setPendingTextQuery('');
  }, [pendingTextQuery, textSearchIndex, isTextIndexing, runIndexedTextSearch]);

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

  const handleToggleToolbar = useCallback(() => {
    setIsToolbarPeekActive(false);
    setIsToolbarCollapsed((prev) => !prev);
  }, []);

  const handleExpandToolbar = useCallback(() => {
    setIsToolbarPeekActive(false);
    setIsToolbarCollapsed(false);
  }, []);

  const handleToolbarMouseEnter = useCallback(() => {
    if (!isToolbarCollapsed) return;

    if (toolbarHoverTimeoutRef.current) {
      clearTimeout(toolbarHoverTimeoutRef.current);
    }

    toolbarHoverTimeoutRef.current = setTimeout(() => {
      setIsToolbarPeekActive(true);
      toolbarHoverTimeoutRef.current = null;
    }, 120);
  }, [isToolbarCollapsed]);

  const handleToolbarMouseLeave = useCallback(() => {
    if (toolbarHoverTimeoutRef.current) {
      clearTimeout(toolbarHoverTimeoutRef.current);
      toolbarHoverTimeoutRef.current = null;
    }

    setIsToolbarPeekActive(false);
  }, []);

  useEffect(() => () => {
    if (toolbarHoverTimeoutRef.current) {
      clearTimeout(toolbarHoverTimeoutRef.current);
    }
  }, []);

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <h1 className="app-title">
            <span className="title-accent">PDF</span> Reader
          </h1>
        </div>
        <div className="header-center">
          {pdfFileName && (
            <div className="file-name-badge">
              <FaFilePdf className="icon-inline file-icon" aria-hidden="true" />
              {pdfFileName}
            </div>
          )}
        </div>
        <div className="header-right">
          <label className="upload-btn" htmlFor="pdf-upload">
            <FaUpload className="icon-inline upload-icon" aria-hidden="true" />
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
            onSelectionChange={handleSelectionChange}
            jumpTarget={jumpTarget}
            onJumpComplete={handleJumpComplete}
          />
        </div>
        <div
          className={`panel-container ${isToolbarCollapsed ? 'collapsed' : ''} ${isToolbarPeekActive ? 'peek-active' : ''}`}
          onMouseEnter={handleToolbarMouseEnter}
          onMouseLeave={handleToolbarMouseLeave}
        >
          <button
            className="toolbar-toggle-btn"
            type="button"
            aria-label={isToolbarCollapsed ? 'Expand right toolbar' : 'Collapse right toolbar'}
            onClick={handleToggleToolbar}
          >
            {isToolbarCollapsed ? (
              <FaChevronLeft className="icon-inline" aria-hidden="true" />
            ) : (
              <FaChevronRight className="icon-inline" aria-hidden="true" />
            )}
          </button>

          <div className="panel-peek" aria-hidden={!isToolbarCollapsed}>
            <button
              className="panel-peek-btn"
              type="button"
              onClick={handleExpandToolbar}
              aria-label="Expand tools panel"
              disabled={!isToolbarCollapsed}
            >
              <FaSearch className="icon-inline" aria-hidden="true" />
              <span>Tools</span>
            </button>
          </div>

          <div className="panel-content">
            <SidePanel
              highlights={highlights}
              searchResults={searchResults}
              isSearching={isSearching}
              searchError={searchError}
              searchMode={searchMode}
              searchQuery={searchQuery}
              isTextIndexing={isTextIndexing}
              textIndexError={textIndexError}
              pendingTextQuery={pendingTextQuery}
              selectedTextInfo={selectedTextInfo}
              activeHighlightId={activeHighlightId}
              onFindRelated={handleFindRelated}
              onFindRelatedFromSelection={handleFindRelatedFromSelection}
              onAddHighlightFromSelection={handleAddHighlightFromSelection}
              onTextSearch={handleTextSearch}
              onJump={handleJump}
              onCloseResults={handleCloseResults}
              onRemoveHighlight={handleRemoveHighlight}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
