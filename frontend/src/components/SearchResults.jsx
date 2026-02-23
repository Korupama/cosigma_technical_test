import { FaExclamationTriangle, FaExternalLinkAlt, FaSearch, FaTimes } from 'react-icons/fa';

function SearchResults({
    results,
    isLoading,
    error,
    title = 'Search Results',
    emptyMessage = 'No results found',
    onJump,
    onClose,
}) {
    if (error) {
        return (
            <div className="search-results">
                <div className="search-results-header">
                    <h3>{title}</h3>
                    <button className="close-btn" onClick={onClose} aria-label="Close results">
                        <FaTimes className="icon-inline" aria-hidden="true" />
                    </button>
                </div>
                <div className="search-error">
                    <div className="error-icon">
                        <FaExclamationTriangle className="icon-inline" aria-hidden="true" />
                    </div>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="search-results">
                <div className="search-results-header">
                    <h3>Searching...</h3>
                </div>
                <div className="search-loading">
                    <div className="loading-spinner" />
                    <p>Analyzing document for related passages...</p>
                </div>
            </div>
        );
    }

    if (!results || results.length === 0) {
        return (
            <div className="search-results">
                <div className="search-results-header">
                    <h3>{title}</h3>
                    <button className="close-btn" onClick={onClose} aria-label="Close results">
                        <FaTimes className="icon-inline" aria-hidden="true" />
                    </button>
                </div>
                <div className="search-empty">
                    <div className="empty-icon">
                        <FaSearch className="icon-inline" aria-hidden="true" />
                    </div>
                    <p>{emptyMessage}</p>
                    <span className="empty-hint">Try selecting a different passage</span>
                </div>
            </div>
        );
    }

    return (
        <div className="search-results">
            <div className="search-results-header">
                <h3>{title} ({results.length})</h3>
                <button className="close-btn" onClick={onClose} aria-label="Close results">
                    <FaTimes className="icon-inline" aria-hidden="true" />
                </button>
            </div>
            <div className="search-results-list">
                {results.map((result, index) => {
                    const confidence = Number.isFinite(result.confidence)
                        ? result.confidence
                        : Number.isFinite(result.score)
                            ? result.score
                            : 0;

                    return (
                    <div key={`${result.pageNumber}-${index}-${result.snippet || result.textContent}`} className="search-result-item">
                        <div className="result-meta">
                            <span className="result-page">Page {result.pageNumber}</span>
                            <span
                                className={`result-confidence ${confidence >= 0.8
                                        ? 'high'
                                        : confidence >= 0.5
                                            ? 'medium'
                                            : 'low'
                                    }`}
                            >
                                {Math.round(confidence * 100)}% match
                            </span>
                        </div>
                        <p className="result-snippet">{result.snippet}</p>
                        <button
                            className="jump-btn"
                            onClick={() => onJump(result)}
                        >
                            <FaExternalLinkAlt className="icon-inline jump-icon" aria-hidden="true" /> Jump to page
                        </button>
                    </div>
                )})}
            </div>
        </div>
    );
}

export default SearchResults;
