export interface PersistBinaryOptions {
  bytes: Uint8Array;
  targetPath: string;
}

const NOT_AVAILABLE = "Project persistence is not available in browser mode.";

export function isTauriRuntime(): boolean {
  return false;
}

export async function chooseProjectDirectoryForOpen(): Promise<string | null> {
  return null;
}

export async function chooseProjectDirectoryForSave(_defaultProjectName: string): Promise<string | null> {
  return null;
}

export async function ensureDirectory(_path: string): Promise<void> {
  throw new Error(NOT_AVAILABLE);
}

export async function writeTextFile(_path: string, _contents: string): Promise<void> {
  throw new Error(NOT_AVAILABLE);
}

export async function readTextFile(_path: string): Promise<string> {
  throw new Error(NOT_AVAILABLE);
}

export async function copyFile(_sourcePath: string, _destinationPath: string): Promise<void> {
  throw new Error(NOT_AVAILABLE);
}

export async function fileExists(_path: string): Promise<boolean> {
  return false;
}

export async function writeBinaryFile(_options: PersistBinaryOptions): Promise<void> {
  throw new Error(NOT_AVAILABLE);
}

export async function buildScratchAudioDirectory(): Promise<string | null> {
  return null;
}

export async function buildProjectAudioPath(_projectDirectoryPath: string, _fileName: string): Promise<string> {
  throw new Error(NOT_AVAILABLE);
}

export async function resolveProjectFilePath(projectDirectoryPath: string): Promise<string> {
  return `${projectDirectoryPath}/project.groovy`;
}

export async function createRuntimeAssetUrl(filePath: string): Promise<string> {
  return filePath;
}

export async function copyIntoProjectAudioFolder(
  _sourcePath: string,
  _projectDirectoryPath: string,
  _targetFileName: string,
): Promise<string> {
  throw new Error(NOT_AVAILABLE);
}

export async function inferExtensionFromMimeType(mimeType: string): Promise<string> {
  if (mimeType.includes("wav")) return "wav";
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("mp4") || mimeType.includes("m4a")) return "m4a";
  if (mimeType.includes("mpeg")) return "mp3";
  return "webm";
}

export async function inferExtensionFromPath(filePath: string): Promise<string> {
  const match = /\.([a-z0-9]+)(?:$|\?)/i.exec(filePath);
  return match?.[1]?.toLowerCase() ?? "bin";
}

export async function inferBaseName(filePath: string): Promise<string> {
  const fileName = filePath.split(/[\\/]/).pop() ?? "asset";
  return fileName.replace(/\.[^.]+$/, "");
}
