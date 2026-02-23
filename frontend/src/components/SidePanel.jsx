import { useEffect, useState } from 'react';
import {
    FaChevronDown,
    FaChevronRight,
    FaHighlighter,
    FaList,
    FaMagic,
    FaSearch,
    FaTimes,
} from 'react-icons/fa';
import SearchResults from './SearchResults';

function SidePanel({
    highlights,
    searchResults,
    isSearching,
    searchError,
    searchMode,
    searchQuery,
    isTextIndexing,
    textIndexError,
    pendingTextQuery,
    selectedTextInfo,
    activeHighlightId,
    onFindRelated,
    onFindRelatedFromSelection,
    onAddHighlightFromSelection,
    onTextSearch,
    onJump,
    onCloseResults,
    onRemoveHighlight,
}) {
    const [textInput, setTextInput] = useState('');
    const [expandedSections, setExpandedSections] = useState({
        selection: true,
        textSearch: true,
        highlights: true,
        results: true,
    });

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            onTextSearch(textInput);
        }, 120);

        return () => clearTimeout(timeoutId);
    }, [textInput, onTextSearch]);

    const handleSubmit = (event) => {
        event.preventDefault();
        onTextSearch(textInput);
    };

    const toggleSection = (section) => {
        setExpandedSections((prev) => ({
            ...prev,
            [section]: !prev[section],
        }));
    };

    const renderChevron = (isExpanded) => (
        isExpanded
            ? <FaChevronDown className="icon-inline section-chevron" aria-hidden="true" />
            : <FaChevronRight className="icon-inline section-chevron" aria-hidden="true" />
    );

    return (
        <div className="side-panel">
            <div className="panel-section selection-actions-section">
                <button
                    className="panel-header-btn"
                    onClick={() => toggleSection('selection')}
                    aria-expanded={expandedSections.selection}
                    type="button"
                >
                    <h2 className="panel-title">
                        <FaList className="icon-inline title-icon" aria-hidden="true" />
                        Selection Actions
                    </h2>
                    {renderChevron(expandedSections.selection)}
                </button>

                {expandedSections.selection && (
                    <>
                        <div className="selection-preview">
                            {selectedTextInfo?.text ? `"${selectedTextInfo.text}"` : 'Select text in PDF to use actions'}
                        </div>

                        <div className="selection-actions-row">
                            <button
                                className="selection-action-btn"
                                onClick={onAddHighlightFromSelection}
                                disabled={!selectedTextInfo?.text}
                            >
                                <FaHighlighter className="icon-inline" aria-hidden="true" />
                                Highlight
                            </button>
                            <button
                                className="selection-action-btn"
                                onClick={onFindRelatedFromSelection}
                                disabled={!selectedTextInfo?.text || isSearching}
                            >
                                <FaMagic className="icon-inline" aria-hidden="true" />
                                {isSearching && searchMode === 'related' ? 'Searching...' : 'Related Text'}
                            </button>
                        </div>
                    </>
                )}
            </div>

            <div className="panel-section text-search-section">
                <button
                    className="panel-header-btn"
                    onClick={() => toggleSection('textSearch')}
                    aria-expanded={expandedSections.textSearch}
                    type="button"
                >
                    <h2 className="panel-title">
                        <FaSearch className="icon-inline title-icon" aria-hidden="true" />
                        Find Text
                    </h2>
                    {renderChevron(expandedSections.textSearch)}
                </button>

                {expandedSections.textSearch && (
                    <>
                        <form className="text-search-form" onSubmit={handleSubmit}>
                            <input
                                className="text-search-input"
                                type="text"
                                placeholder="Type to find in PDF (quick search)"
                                value={textInput}
                                onChange={(event) => setTextInput(event.target.value)}
                            />
                            <button className="text-search-btn" type="submit" disabled={isSearching || isTextIndexing}>
                                Find
                            </button>
                        </form>
                        <div className="text-search-status">
                            {isTextIndexing && 'Preparing quick search index...'}
                            {!isTextIndexing && pendingTextQuery && `Searching "${pendingTextQuery}"...`}
                            {!isTextIndexing && !pendingTextQuery && !textIndexError && 'Quick search ready'}
                            {textIndexError && textIndexError}
                        </div>
                    </>
                )}
            </div>

            <div className="panel-section highlights-section">
                <button
                    className="panel-header-btn"
                    onClick={() => toggleSection('highlights')}
                    aria-expanded={expandedSections.highlights}
                    type="button"
                >
                    <h2 className="panel-title">
                        <FaHighlighter className="icon-inline title-icon" aria-hidden="true" />
                        Highlights
                        {highlights.length > 0 && (
                            <span className="count-badge">{highlights.length}</span>
                        )}
                    </h2>
                    {renderChevron(expandedSections.highlights)}
                </button>

                {expandedSections.highlights && (
                    <>
                        {highlights.length === 0 ? (
                            <div className="highlights-empty">
                                <p>No highlights yet</p>
                                <span className="hint">Select text, then click Highlight button above</span>
                            </div>
                        ) : (
                            <div className="highlights-list">
                                {highlights.map((highlight) => (
                                    <div
                                        key={highlight.id}
                                        className={`highlight-card ${activeHighlightId === highlight.id ? 'active' : ''
                                            }`}
                                    >
                                        <div className="highlight-card-header">
                                            <span className="highlight-page">Page {highlight.pageNumber}</span>
                                            <button
                                                className="remove-btn"
                                                onClick={() => onRemoveHighlight(highlight.id)}
                                                title="Remove highlight"
                                            >
                                                <FaTimes className="icon-inline" aria-hidden="true" />
                                            </button>
                                        </div>
                                        <p className="highlight-text">"{highlight.text}"</p>
                                        <button
                                            className="find-related-btn"
                                            onClick={() => onFindRelated(highlight)}
                                            disabled={isSearching}
                                        >
                                            {isSearching && activeHighlightId === highlight.id ? (
                                                <>
                                                    <span className="btn-spinner" /> Searching...
                                                </>
                                            ) : (
                                                <>Find Related</>
                                            )}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>

            {(searchResults || isSearching || searchError) && (
                <div className="panel-section results-section">
                    <button
                        className="panel-header-btn"
                        onClick={() => toggleSection('results')}
                        aria-expanded={expandedSections.results}
                        type="button"
                    >
                        <h2 className="panel-title">
                            <FaSearch className="icon-inline title-icon" aria-hidden="true" />
                            Results
                        </h2>
                        {renderChevron(expandedSections.results)}
                    </button>

                    {expandedSections.results && (
                        <SearchResults
                            results={searchResults}
                            isLoading={isSearching}
                            error={searchError}
                            title={searchMode === 'text' ? 'Text Matches' : 'Related Passages'}
                            emptyMessage={
                                searchMode === 'text'
                                    ? `No matches found for "${searchQuery}"`
                                    : 'No related text found in this document'
                            }
                            onJump={onJump}
                            onClose={onCloseResults}
                        />
                    )}
                </div>
            )}
        </div>
    );
}

export default SidePanel;
