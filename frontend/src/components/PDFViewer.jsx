/**
 * PDFViewer — orchestrator component.
 *
 * Key fix: always renders <div className="pdf-viewer" ref={containerRef}>
 * so the ResizeObserver has a real element when it runs on mount.
 * Previously, the early return for the empty state meant containerRef was
 * never attached, keeping containerWidth = 0 even after a PDF was loaded.
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import PDFPage from './PDFPage';

// ── Worker ────────────────────────────────────────────────────────────────────
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
).toString();

// ── Component ─────────────────────────────────────────────────────────────────
function PDFViewer({ pdfFile, highlights, onAddHighlight, jumpTarget, onJumpComplete }) {
    const containerRef = useRef(null);
    const pageRefs = useRef({});
    const jumpTimeoutRef = useRef(null);

    const [pdfDoc, setPdfDoc] = useState(null);
    const [numPages, setNumPages] = useState(0);
    const [containerWidth, setContainerWidth] = useState(0);
    const [activeJumpRegion, setActiveJumpRegion] = useState(null);

    // ── Container width via ResizeObserver ─────────────────────────────────
    // containerRef always points to <div.pdf-viewer>, even when empty,
    // so ResizeObserver fires immediately on mount.
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        // Read width right now (before observer fires)
        setContainerWidth(el.clientWidth);

        const ro = new ResizeObserver(([entry]) =>
            setContainerWidth(entry.contentRect.width)
        );
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // ── Load PDF ───────────────────────────────────────────────────────────
    useEffect(() => {
        if (!pdfFile) return;

        let cancelled = false;
        let loadingTask;

        (async () => {
            try {
                const data = await pdfFile.arrayBuffer();
                loadingTask = pdfjsLib.getDocument({ data });
                const doc = await loadingTask.promise;
                if (!cancelled) {
                    setPdfDoc(doc);
                    setNumPages(doc.numPages);
                    setActiveJumpRegion(null);
                }
            } catch (err) {
                if (!cancelled) console.error('[PDFViewer] load error:', err);
            }
        })();

        return () => {
            cancelled = true;
            loadingTask?.destroy();
        };
    }, [pdfFile]);

    // ── Text selection → highlight ─────────────────────────────────────────
    const handleMouseUp = useCallback(() => {
        const sel = window.getSelection();
        const text = sel?.toString().trim();
        if (!text || text.length < 3) return;

        let pageEl = sel.anchorNode?.parentElement;
        while (pageEl && !pageEl.dataset.pageNumber) pageEl = pageEl.parentElement;
        const pageNumber = pageEl ? parseInt(pageEl.dataset.pageNumber, 10) : 1;

        const range = sel.getRangeAt(0);
        const pageRect = pageEl?.getBoundingClientRect();

        const rects = pageRect
            ? Array.from(range.getClientRects())
                .filter(r => r.width > 0 && r.height > 0)
                .map(r => ({
                    left: r.left - pageRect.left,
                    top: r.top - pageRect.top,
                    width: r.width,
                    height: r.height,
                }))
            : [];

        const relativeRects = rects.map((rect) => ({
            leftRatio: pageRect.width ? rect.left / pageRect.width : 0,
            topRatio: pageRect.height ? rect.top / pageRect.height : 0,
            widthRatio: pageRect.width ? rect.width / pageRect.width : 0,
            heightRatio: pageRect.height ? rect.height / pageRect.height : 0,
        }));

        onAddHighlight({
            id: Date.now().toString(),
            text,
            pageNumber,
            rects: relativeRects,
        });
        sel.removeAllRanges();
    }, [onAddHighlight]);

    // ── Jump to page ───────────────────────────────────────────────────────
    useEffect(() => {
        if (!jumpTarget) return;

        const el = pageRefs.current[jumpTarget.pageNumber];
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        if (jumpTimeoutRef.current) {
            clearTimeout(jumpTimeoutRef.current);
        }

        jumpTimeoutRef.current = setTimeout(() => {
            setActiveJumpRegion(null);
            onJumpComplete?.();
        }, 3000);

        return () => {
            if (jumpTimeoutRef.current) {
                clearTimeout(jumpTimeoutRef.current);
                jumpTimeoutRef.current = null;
            }
        };
    }, [jumpTarget, onJumpComplete]);

    const handleJumpLocated = useCallback((pageNumber, region) => {
        if (!jumpTarget || jumpTarget.pageNumber !== pageNumber) {
            return;
        }

        if (!region) {
            setActiveJumpRegion({ pageNumber, region: null });
            return;
        }

        setActiveJumpRegion({ pageNumber, region });
    }, [jumpTarget]);

    // ── Always render the container div (so containerRef is always used) ───
    return (
        <div className="pdf-viewer" ref={containerRef} onMouseUp={handleMouseUp}>
            {/* Empty state — shown when no PDF is uploaded */}
            {!pdfFile && (
                <div className="pdf-viewer-empty">
                    <div className="empty-icon">PDF</div>
                    <h2>No PDF Loaded</h2>
                    <p>Upload a PDF file to get started</p>
                </div>
            )}

            {/* Pages — each owns its own canvas + textLayer rendering */}
            {pdfFile && Array.from({ length: numPages }, (_, i) => i + 1).map(pageNum => (
                <div
                    key={pageNum}
                    ref={el => (pageRefs.current[pageNum] = el)}
                >
                    <PDFPage
                        pdfDoc={pdfDoc}
                        pageNum={pageNum}
                        containerWidth={containerWidth}
                        highlights={highlights}
                        jumpTarget={jumpTarget}
                        activeJumpRegion={activeJumpRegion}
                        onJumpLocated={handleJumpLocated}
                    />
                </div>
            ))}
        </div>
    );
}

export default PDFViewer;
