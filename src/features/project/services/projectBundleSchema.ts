import { z } from "zod";

const PersistedAssetReferenceSchema = z.object({
  kind: z.enum(["appAsset", "file", "externalFile"]),
  path: z.string(),
});

const PersistedClipSchema = z.object({
  id: z.string().min(1),
  trackId: z.string().min(1),
  asset: PersistedAssetReferenceSchema,
  startTime: z.number().finite().nonnegative(),
  duration: z.number().finite().nonnegative(),
  sourceOffset: z.number().finite().default(0),
  name: z.string().default(""),
  muted: z.boolean().default(false),
  takeGroupId: z.string().optional(),
});

const TrackSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  volume: z.number().finite(),
  pan: z.number().finite().default(0),
  muted: z.boolean(),
  solo: z.boolean(),
  armed: z.boolean(),
  clips: z.array(z.string()),
  sub: z.string().optional(),
  color: z.string().optional(),
  gain: z.number().finite().optional(),
  vol: z.number().finite().optional(),
  input: z.string().optional(),
  output: z.string().optional(),
});

const ProjectSchema = z.object({
  name: z.string(),
  bpm: z.number().finite().min(20).max(400),
  key: z.string(),
  sampleRate: z.number().finite().positive().optional(),
  timeSig: z.string().optional(),
  length: z.number().finite().optional(),
  masterOut: z.string().optional(),
});

const TakeGroupSchema = z.object({
  id: z.string().min(1),
  trackId: z.string().min(1),
  regionStartTime: z.number().finite(),
  regionDuration: z.number().finite().nonnegative(),
  activeClipId: z.string().nullable(),
  clipIds: z.array(z.string()),
});

const AudioAssetSchema = z.object({
  mimeType: z.string(),
  dataBase64: z.string(),
});

const SelectionSchema = z.object({
  selectedTrackId: z.string().nullable(),
  selectedClipId: z.string().nullable(),
  cursorPosition: z.number().finite().nonnegative(),
});

export const BrowserProjectFileSchema = z.object({
  formatVersion: z.literal(2),
  bundleKind: z.literal("groov2e-browser-project"),
  project: ProjectSchema,
  transport: z.object({
    metronomeEnabled: z.boolean(),
  }),
  tracks: z.array(TrackSchema),
  clips: z.array(PersistedClipSchema),
  takeGroups: z.array(TakeGroupSchema),
  selection: SelectionSchema,
  audioAssets: z.record(z.string(), AudioAssetSchema),
  exportWarnings: z
    .object({
      missingClipIds: z.array(z.string()).default([]),
    })
    .optional(),
});

export type ValidatedBundle = z.infer<typeof BrowserProjectFileSchema>;

export class BundleValidationError extends Error {
  issues: z.ZodIssue[];
  constructor(issues: z.ZodIssue[]) {
    const preview = issues
      .slice(0, 2)
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    super(`Project bundle is not valid — ${preview}${issues.length > 2 ? ` (+${issues.length - 2} more)` : ""}`);
    this.name = "BundleValidationError";
    this.issues = issues;
  }
}
