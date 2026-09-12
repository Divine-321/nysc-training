"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ExternalLink, Loader2 } from "lucide-react";
import type {
  PDFDocumentLoadingTask,
  PDFDocumentProxy,
  RenderTask,
} from "pdfjs-dist";

/**
 * Draws a PDF into the page instead of handing the file to the browser.
 *
 * A plain <iframe> only works where the browser has its own PDF reader, which
 * on a desktop it does and on a phone it does not: Android Chrome replaces the
 * frame with a filename and an Open button, so study material simply did not
 * appear. Drawing the pages ourselves means they show everywhere, and it is us
 * rather than the device that decides the starting size — each page is fitted
 * to the width it has been given.
 *
 * Pages are drawn only as they come near the screen and released again once
 * they are well past it. A canvas costs roughly three megabytes, so a long
 * document drawn all at once would exhaust a phone; this keeps only a handful
 * alive at a time no matter how many pages there are.
 *
 * Text is not selectable here — that needs a second, invisible layer of
 * positioned text over every page, and misaligning it is worse than not having
 * it. The "open in a new tab" link below the pages gives the real file, with
 * selection and search, for anyone who needs it.
 */

// pdf.js runs its parsing in a web worker; without one it would block the page
// while a large document is read. The file is copied from the library into
// public/ — REGENERATE IT WHEN BUMPING pdfjs-dist, since the worker and the
// library refuse to run at different versions:
//
//   cp node_modules/pdfjs-dist/build/pdf.worker.min.mjs public/pdf.worker.min.mjs
//
// A mismatch is not silent: loading throws, and the failure below shows the
// link to the original file, which is exactly what this replaced.
const WORKER_SRC = "/pdf.worker.min.mjs";

// Cap the drawing resolution. Retina phones report 3 or 4, which triples the
// memory for detail nobody can see at reading size.
const MAX_PIXEL_RATIO = 2;

// How far outside the screen a page starts drawing, as a share of the
// viewport. A whole screen of warning is enough to have the next page ready
// before it is scrolled to.
const RENDER_MARGIN = "100% 0px";

// Pages drawn without waiting to be told they are on screen, because they
// always are. Also the floor if a browser's observer never reports: something
// is always readable rather than a column of empty rectangles.
const EAGER_PAGES = 2;

type PdfViewerProps = {
  url: string;
  title: string;
  /** Tailwind height for the scrolling area. */
  className?: string;
};

function PdfPage({
  doc,
  pageNumber,
  width,
  scrollRoot,
}: {
  doc: PDFDocumentProxy;
  pageNumber: number;
  width: number;
  /** The scrolling box the pages sit in — what "near the screen" is measured against. */
  scrollRoot: HTMLElement | null;
}) {
  const holderRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // The opening pages start drawing without waiting to be told they are on
  // screen, because they always are. Samsung Internet left every page blank at
  // the right size — frames, page numbers, no drawing — which is what it looks
  // like when the observer never reports. Whatever the browser does with it,
  // the first pages now appear.
  const [visible, setVisible] = useState(pageNumber <= EAGER_PAGES);
  // Page one's shape is a good guess for the rest, and is corrected the moment
  // this page is actually drawn. Without a guess every page would start flat
  // and the scrollbar would lurch as they filled in.
  const [ratio, setRatio] = useState(1.414);
  const [failed, setFailed] = useState(false);
  const hasIntersectedRef = useRef(false);

  useEffect(() => {
    const holder = holderRef.current;
    if (!holder) return;

    // Measured against the scrolling box, not the window. With the window as
    // root the box's own clipping still hides pages, so the margin would buy
    // nothing and every page would appear blank until scrolled onto.
    //
    // Releasing a page that scrolled away matters — a phone cannot hold a
    // whole document in canvases — but a browser whose observer never reports
    // a page as on screen must not be allowed to blank one that plainly is.
    // So the release only starts once this browser has reported an
    // intersection at least once, proving it works here.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          hasIntersectedRef.current = true;
          setVisible(true);
        } else if (hasIntersectedRef.current && pageNumber > EAGER_PAGES) {
          setVisible(false);
        }
      },
      { root: scrollRoot, rootMargin: RENDER_MARGIN },
    );

    observer.observe(holder);
    return () => observer.disconnect();
  }, [scrollRoot, pageNumber]);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!visible || !canvas || width === 0) return;

    let task: RenderTask | null = null;
    let cancelled = false;

    void (async () => {
      try {
        const page = await doc.getPage(pageNumber);
        if (cancelled) return;

        const unscaled = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: width / unscaled.width });
        const pixelRatio = Math.min(
          window.devicePixelRatio || 1,
          MAX_PIXEL_RATIO,
        );

        setRatio(viewport.height / viewport.width);

        // The canvas is sized in device pixels and scaled back down by CSS, so
        // the page is sharp on a high-density screen. The matching transform
        // tells pdf.js to draw at that larger size.
        canvas.width = Math.floor(viewport.width * pixelRatio);
        canvas.height = Math.floor(viewport.height * pixelRatio);

        // Only `canvas` is passed: pdf.js takes its own context from it, and
        // handing it both is the deprecated path.
        task = page.render({
          canvas,
          viewport,
          transform:
            pixelRatio === 1 ? undefined : [pixelRatio, 0, 0, pixelRatio, 0, 0],
        });

        await task.promise;
        if (!cancelled) setFailed(false);
      } catch (renderError) {
        // Cancelling is routine — scrolling away or a resize does it — and
        // must not be reported. Anything else is a page that genuinely would
        // not draw, and saying so beats the silent blank rectangle that hid
        // this from us in the first place.
        const cancelledRender =
          cancelled ||
          (renderError instanceof Error &&
            renderError.name === "RenderingCancelledException");

        if (!cancelledRender) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      task?.cancel();

      // Hand the memory back. A drawn page that scrolled far away is redrawn
      // when it returns, which is cheap; keeping every page alive is what runs
      // a phone out of memory.
      canvas.width = 0;
      canvas.height = 0;
    };
  }, [doc, pageNumber, width, visible]);

  return (
    <div
      ref={holderRef}
      style={{ aspectRatio: `1 / ${ratio}` }}
      className="relative w-full overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-gray-200"
    >
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={`Page ${pageNumber}`}
        className="block h-full w-full"
      />

      {/* A page that would not draw says so. Silence here is what made a whole
          document of empty rectangles look like a portal fault rather than
          something to open in a new tab. */}
      {failed && (
        <p className="absolute inset-0 flex items-center justify-center p-4 text-center text-xs font-medium text-gray-500">
          This page could not be displayed. Use the link below the document to
          open it instead.
        </p>
      )}

      {/* The browser's own PDF reader numbered the pages; drawing them
          ourselves means doing that ourselves too. */}
      <span className="pointer-events-none absolute bottom-1.5 right-1.5 rounded bg-black/45 px-1.5 py-0.5 text-[10px] font-semibold text-white">
        {pageNumber}
      </span>
    </div>
  );
}

export default function PdfViewer({
  url,
  title,
  className = "h-[70vh]",
}: PdfViewerProps) {
  // Held in state rather than a ref: the pages need it to know what to measure
  // themselves against, and a ref cannot be read while rendering them.
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [pageWidth, setPageWidth] = useState(0);
  const [error, setError] = useState("");

  // Track the usable width so pages are fitted to it, and refitted when the
  // phone is turned on its side.
  useEffect(() => {
    if (!scrollEl) return;

    const observer = new ResizeObserver(([entry]) => {
      setPageWidth(Math.floor(entry.contentRect.width));
    });

    observer.observe(scrollEl);
    return () => observer.disconnect();
  }, [scrollEl]);

  useEffect(() => {
    let cancelled = false;
    // Teardown lives on the loading task rather than the document, and closing
    // it is what shuts down the worker and frees the parsed file.
    let task: PDFDocumentLoadingTask | null = null;

    void (async () => {
      try {
        // Imported here rather than at the top of the file: pdf.js reaches for
        // browser APIs as it loads, so it must not be pulled in while the page
        // is being rendered on the server.
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = WORKER_SRC;

        const loading = pdfjs.getDocument({ url });
        task = loading;

        const document_ = await loading.promise;
        if (cancelled) return;

        setDoc(document_);
      } catch {
        if (!cancelled) {
          setError(
            "This document could not be displayed here. Open it in a new tab instead.",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      setDoc(null);
      void task?.destroy();
    };
  }, [url]);

  return (
    <div className="space-y-3">
      <div
        ref={setScrollEl}
        className={`w-full overflow-y-auto rounded-xl border border-gray-200 bg-gray-100 p-2 sm:p-3 ${className}`}
      >
        {error ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-gray-600">
            <AlertTriangle size={24} className="text-amber-500" />
            <p>{error}</p>
          </div>
        ) : !doc ? (
          <div className="flex h-full items-center justify-center gap-2 p-6 text-sm text-gray-500">
            <Loader2 size={18} className="animate-spin" />
            Loading document...
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {Array.from({ length: doc.numPages }, (_, index) => (
              <PdfPage
                key={index + 1}
                doc={doc}
                pageNumber={index + 1}
                width={pageWidth}
                scrollRoot={scrollEl}
              />
            ))}
          </div>
        )}
      </div>

      <p className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
        <span>
          {doc ? `${doc.numPages} page${doc.numPages === 1 ? "" : "s"}` : title}
        </span>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 font-semibold text-[#1a6b3c] hover:underline"
        >
          <ExternalLink size={13} /> Open in a new tab
        </a>
      </p>
    </div>
  );
}
