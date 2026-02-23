import { useRef, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

const H_PADDING = 48;
const ROUNDING_PRECISION = 1000;

function normalizeText(text = '') {
    return text.replace(/\s+/g, ' ').trim().toLowerCase();
}

function findRegionFromTextLayer(textLayerEl, targetText) {
    if (!textLayerEl || !targetText) return null;

    const spans = Array.from(textLayerEl.querySelectorAll('span'));
    if (!spans.length) return null;

    const needle = normalizeText(targetText);
    if (!needle) return null;

    const layerRect = textLayerEl.getBoundingClientRect();
    const normalizedSource = spans
        .map((span) => normalizeText(span.textContent || ''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

    if (!normalizedSource) return null;

    const index = normalizedSource.indexOf(needle);
    if (index === -1) return null;

    const matchEnd = index + needle.length;
    let cursor = 0;
    const matchedRects = [];

    for (const span of spans) {
        const token = normalizeText(span.textContent || '');
        if (!token) continue;

        const start = cursor;
        const end = start + token.length;
        cursor = end + 1;

        if (end <= index || start >= matchEnd) {
            continue;
        }

        const rect = span.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
            matchedRects.push({
                left: rect.left - layerRect.left,
                top: rect.top - layerRect.top,
                right: rect.right - layerRect.left,
                bottom: rect.bottom - layerRect.top,
            });
        }
    }

    if (!matchedRects.length) return null;

    const region = matchedRects.reduce(
        (acc, rect) => ({
            left: Math.min(acc.left, rect.left),
            top: Math.min(acc.top, rect.top),
            right: Math.max(acc.right, rect.right),
            bottom: Math.max(acc.bottom, rect.bottom),
        }),
        {
            left: Number.POSITIVE_INFINITY,
            top: Number.POSITIVE_INFINITY,
            right: Number.NEGATIVE_INFINITY,
            bottom: Number.NEGATIVE_INFINITY,
        }
    );

    const width = Math.max(0, region.right - region.left);
    const height = Math.max(0, region.bottom - region.top);
    if (width === 0 || height === 0) return null;

    const safeRound = (value) =>
        Math.round(value * ROUNDING_PRECISION) / ROUNDING_PRECISION;

    return {
        leftRatio: safeRound(region.left / layerRect.width),
        topRatio: safeRound(region.top / layerRect.height),
        widthRatio: safeRound(width / layerRect.width),
        heightRatio: safeRound(height / layerRect.height),
    };
}

function PDFPage({
    pdfDoc,
    pageNum,
    containerWidth,
    highlights,
    jumpTarget,
    activeJumpRegion,
    onJumpLocated,
}) {
    const canvasRef = useRef(null);
    const textLayerRef = useRef(null);
    const renderJobRef = useRef(null); // { renderTask, abortCtrl }

    useEffect(() => {
        if (!pdfDoc || containerWidth <= 0) return;

        const canvas = canvasRef.current;
        const textLayerEl = textLayerRef.current;
        if (!canvas || !textLayerEl) return;

        // Cancel any in-flight work for this page.
        renderJobRef.current?.renderTask?.cancel();
        renderJobRef.current?.abortCtrl?.abort();
        const abortCtrl = new AbortController();

        let renderTask;

        (async () => {
            try {
                const page = await pdfDoc.getPage(pageNum);

                // ── Scale: fit page to container width ────────────────────────
                const naturalVP = page.getViewport({ scale: 1 });
                const scale = (containerWidth - H_PADDING) / naturalVP.width;
                const viewport = page.getViewport({ scale });

                // ── Canvas: HiDPI ─────────────────────────────────────────────
                const dpr = window.devicePixelRatio || 1;
                canvas.style.width = `${viewport.width}px`;
                canvas.style.height = `${viewport.height}px`;
                canvas.width = Math.floor(viewport.width * dpr);
                canvas.height = Math.floor(viewport.height * dpr);

                const ctx = canvas.getContext('2d');
                ctx.scale(dpr, dpr);

                // ── Render canvas ─────────────────────────────────────────────
                renderTask = page.render({ canvasContext: ctx, viewport });
                renderJobRef.current = { renderTask, abortCtrl };
                await renderTask.promise;

                if (abortCtrl.signal.aborted) return;

                // ── Text layer: custom selectable overlay ──────────────────────
                textLayerEl.replaceChildren();
                textLayerEl.style.width = `${viewport.width}px`;
                textLayerEl.style.height = `${viewport.height}px`;

                const textContent = await page.getTextContent();
                for (const item of textContent.items) {
                    if (!item.str) continue;

                    const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
                    const fontHeight = Math.hypot(tx[2], tx[3]);

                    const span = document.createElement('span');
                    span.className = 'text-layer-item';
                    span.dataset.raw = item.str;
                    span.textContent = item.str;
                    span.style.left = `${tx[4]}px`;
                    span.style.top = `${tx[5] - fontHeight}px`;
                    span.style.fontSize = `${fontHeight}px`;
                    span.style.fontFamily = item.fontName || 'sans-serif';
                    textLayerEl.appendChild(span);
                }

                if (jumpTarget?.pageNumber === pageNum) {
                    const located =
                        findRegionFromTextLayer(textLayerEl, jumpTarget.textContent) ||
                        findRegionFromTextLayer(textLayerEl, jumpTarget.snippet);
                    onJumpLocated?.(pageNum, located);
                }

            } catch (err) {
                if (err?.name !== 'RenderingCancelledException' && !abortCtrl.signal.aborted) {
                    console.error(`[PDFPage ${pageNum}] render error:`, err);
                }
            }
        })();

        return () => {
            renderTask?.cancel();
            abortCtrl.abort();
        };
    }, [pdfDoc, pageNum, containerWidth, jumpTarget, onJumpLocated]);

    const pageHighlights = highlights.filter((h) => h.pageNumber === pageNum);
    const hasActiveJump = activeJumpRegion?.pageNumber === pageNum;
    const resolvedJumpRegion = hasActiveJump ? activeJumpRegion.region : null;

    return (
        <div
            className="pdf-page"
            data-page-number={pageNum}
        >
            <div className="page-number-badge">Page {pageNum}</div>

            <div className="page-content">
                {/* Canvas: pdf.js renders pixels here */}
                <canvas ref={canvasRef} />

                <div className="textLayer" ref={textLayerRef} />

                {/* Saved yellow highlight overlays */}
                {pageHighlights
                    .map(h =>
                        h.rects?.map((rect, idx) => (
                            <div
                                key={`${h.id}-${idx}`}
                                className="highlight-overlay"
                                style={{
                                    left: `${rect.leftRatio * 100}%`,
                                    top: `${rect.topRatio * 100}%`,
                                    width: `${rect.widthRatio * 100}%`,
                                    height: `${rect.heightRatio * 100}%`,
                                }}
                            />
                        ))
                    )}

                {/* Blue pulsing border for jump-to-page fallback */}
                {jumpTarget?.pageNumber === pageNum && !resolvedJumpRegion && (
                    <div className="jump-indicator page-fallback">
                        <div className="jump-indicator-pulse" />
                        <div className="jump-indicator-label">
                            Related text on this page
                        </div>
                    </div>
                )}

                {/* Precise jump indication when text location is resolved */}
                {resolvedJumpRegion && (
                    <div
                        className="jump-indicator exact-match"
                        style={{
                            left: `${resolvedJumpRegion.leftRatio * 100}%`,
                            top: `${resolvedJumpRegion.topRatio * 100}%`,
                            width: `${resolvedJumpRegion.widthRatio * 100}%`,
                            height: `${resolvedJumpRegion.heightRatio * 100}%`,
                        }}
                    >
                        <div className="jump-indicator-pulse" />
                    </div>
                )}
            </div>
        </div>
    );
}

export default PDFPage;
