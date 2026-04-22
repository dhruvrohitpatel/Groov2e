import { useCallback, useEffect, useRef } from 'react';

/**
 * Manages canvas element refs for chunked virtual-scroll rendering.
 *
 * Provides a callback ref (for `ref={canvasRef}`) that stores canvases
 * by their `data-index` chunk index, and automatically cleans up refs
 * for canvases that have been unmounted by the virtualizer.
 *
 * Used by Channel, TimeScale, and SpectrogramChannel.
 *
 * @returns
 * - `canvasRef` — Callback ref to attach to each `<canvas data-index={i}>` element.
 * - `canvasMapRef` — Stable ref to a `Map<number, HTMLCanvasElement>` for iterating
 *   over mounted canvases during draw effects.
 */
export function useChunkedCanvasRefs() {
  const canvasMapRef = useRef<Map<number, HTMLCanvasElement>>(new Map());

  const canvasRef = useCallback((canvas: HTMLCanvasElement | null) => {
    if (canvas !== null) {
      const idx = parseInt(canvas.dataset.index!, 10);
      canvasMapRef.current.set(idx, canvas);
    }
  }, []);

  // Clean up stale refs for unmounted chunks.
  // Intentionally has no dependency array — runs after every render because
  // the virtualizer can unmount canvases at any time, and drawing effects
  // need the map pruned before they iterate it.
  useEffect(() => {
    const map = canvasMapRef.current;
    for (const [idx, canvas] of map.entries()) {
      if (!canvas.isConnected) {
        map.delete(idx);
      }
    }
  });

  return { canvasRef, canvasMapRef };
}
