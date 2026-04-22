// Single source of truth for all audio blob URLs in the session.
// No other file should call URL.createObjectURL — use this module instead.
const registry = new Map<string, string>();

export function getOrCreateUrl(clipId: string, blob: Blob): string {
  const existing = registry.get(clipId);
  if (existing) return existing;
  const url = URL.createObjectURL(blob);
  registry.set(clipId, url);
  return url;
}

export function revokeForClip(clipId: string): void {
  const url = registry.get(clipId);
  if (url) {
    URL.revokeObjectURL(url);
    registry.delete(clipId);
  }
}

export function revokeAll(): void {
  for (const url of registry.values()) {
    URL.revokeObjectURL(url);
  }
  registry.clear();
}

export function hasUrl(clipId: string): boolean {
  return registry.has(clipId);
}
