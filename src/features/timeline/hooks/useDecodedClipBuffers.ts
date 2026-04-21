import { useEffect, useRef, useState } from "react";
import { getGlobalAudioContext } from "@waveform-playlist/playout";
import type { Clip } from "../../../types/models";

interface DecodedClipBuffersResult {
  buffersBySource: Record<string, AudioBuffer>;
  isReady: boolean;
  lastError: string | null;
}

function getClipSourceKey(clip: Clip): string {
  return clip.filePath ?? clip.fileUrl;
}

export function useDecodedClipBuffers(clips: Record<string, Clip>): DecodedClipBuffersResult {
  const [buffersBySource, setBuffersBySource] = useState<Record<string, AudioBuffer>>({});
  const [failedSources, setFailedSources] = useState<Set<string>>(() => new Set());
  const [lastError, setLastError] = useState<string | null>(null);
  const pendingLoadsRef = useRef<Map<string, Promise<void>>>(new Map());
  const clipSourceKeys = Object.values(clips).map(getClipSourceKey);

  useEffect(() => {
    let isCancelled = false;

    const loadClipBuffer = async (clip: Clip) => {
      const sourceKey = getClipSourceKey(clip);
      if (
        buffersBySource[sourceKey] ||
        failedSources.has(sourceKey) ||
        pendingLoadsRef.current.has(sourceKey)
      ) {
        return;
      }

      const loadPromise = (async () => {
        try {
          const response = await fetch(clip.fileUrl);
          if (!response.ok) {
            throw new Error(`Failed to load "${clip.name}" (${response.status}).`);
          }

          const bytes = await response.arrayBuffer();
          const decoded = await getGlobalAudioContext().decodeAudioData(bytes.slice(0));

          if (isCancelled) {
            return;
          }

          setBuffersBySource((currentBuffers) =>
            currentBuffers[sourceKey]
              ? currentBuffers
              : {
                  ...currentBuffers,
                  [sourceKey]: decoded,
                },
          );
          setLastError(null);
        } catch (error) {
          if (!isCancelled) {
            setFailedSources((prev) => {
              if (prev.has(sourceKey)) return prev;
              const next = new Set(prev);
              next.add(sourceKey);
              return next;
            });
            setLastError(error instanceof Error ? error.message : `Audio for "${clip.name}" could not be loaded.`);
          }
        } finally {
          pendingLoadsRef.current.delete(sourceKey);
        }
      })();

      pendingLoadsRef.current.set(sourceKey, loadPromise);
      await loadPromise;
    };

    for (const clip of Object.values(clips)) {
      void loadClipBuffer(clip);
    }

    return () => {
      isCancelled = true;
    };
  }, [buffersBySource, clips, failedSources]);

  return {
    buffersBySource,
    isReady:
      clipSourceKeys.length === 0 ||
      clipSourceKeys.every((sourceKey) => Boolean(buffersBySource[sourceKey]) || failedSources.has(sourceKey)),
    lastError,
  };
}
