import { useState } from 'react';
import SearchResults from './SearchResults';

function SidePanel({
    highlights,
    searchResults,
    isSearching,
    searchError,
    searchMode,
    searchQuery,
    activeHighlightId,
    onFindRelated,
    onTextSearch,
    onJump,
    onCloseResults,
    onRemoveHighlight,
}) {
    const [textInput, setTextInput] = useState('');

    const handleSubmit = (event) => {
        event.preventDefault();
        onTextSearch(textInput);
    };

    return (
        <div className="side-panel">
            <div className="panel-section text-search-section">
                <h2 className="panel-title">
                    <span className="title-icon">Search</span>
                    Find Text
                </h2>

                <form className="text-search-form" onSubmit={handleSubmit}>
                    <input
                        className="text-search-input"
                        type="text"
                        placeholder="Enter text to find in PDF"
                        value={textInput}
                        onChange={(event) => setTextInput(event.target.value)}
                    />
                    <button className="text-search-btn" type="submit" disabled={isSearching}>
                        {isSearching && searchMode === 'text' ? 'Searching...' : 'Find'}
                    </button>
                </form>
            </div>

            <div className="panel-section highlights-section">
                <h2 className="panel-title">
                    <span className="title-icon">List</span>
                    Highlights
                    {highlights.length > 0 && (
                        <span className="count-badge">{highlights.length}</span>
                    )}
                </h2>

                {highlights.length === 0 ? (
                    <div className="highlights-empty">
                        <p>Select text in the PDF to create highlights</p>
                        <span className="hint">Click and drag to select text</span>
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
                                        x
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
            </div>

            {(searchResults || isSearching || searchError) && (
                <div className="panel-section results-section">
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
                </div>
            )}
        </div>
    );
}

export default SidePanel;
