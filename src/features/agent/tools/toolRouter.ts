import { z } from "zod";
import { agentTools, agentToolsByName, type ToolResult, type ToolDefinition } from "./agentTools";
import { useGroovyStore } from "../../../store/useGroovyStore";

export interface ToolInvocation {
  name: string;
  args: unknown;
}

export interface ToolExecution extends ToolInvocation {
  result: ToolResult;
  durationMs: number;
  snapshotPushed: boolean;
  /** For destructive tools we stash a "pending" marker so the UI can render a
   * confirmation card; the actual mutation still runs (a subsequent Undo
   * reverts it). Keeping execution immediate keeps the demo snappy. */
  destructive: boolean;
}

function formatZodError(error: z.ZodError, toolName: string): string {
  const messages = error.issues.map((issue) => {
    const path = issue.path.join(".") || "(root)";
    return `${path}: ${issue.message}`;
  });
  return `Invalid arguments for ${toolName}: ${messages.join("; ")}`;
}

export async function executeTool(invocation: ToolInvocation): Promise<ToolExecution> {
  const started = performance.now();
  const tool = agentToolsByName.get(invocation.name) as ToolDefinition<unknown> | undefined;

  if (!tool) {
    return {
      ...invocation,
      durationMs: 0,
      snapshotPushed: false,
      destructive: false,
      result: { ok: false, message: `Unknown tool "${invocation.name}".` },
    };
  }

  const parsed = tool.schema.safeParse(invocation.args ?? {});
  if (!parsed.success) {
    return {
      ...invocation,
      durationMs: 0,
      snapshotPushed: false,
      destructive: Boolean(tool.destructive),
      result: {
        ok: false,
        message: formatZodError(parsed.error, tool.name),
      },
    };
  }

  const snapshotLenBefore = useGroovyStore.getState().agentUndoStack.length;
  let result: ToolResult;
  try {
    result = await tool.handler(parsed.data);
  } catch (error) {
    result = {
      ok: false,
      message: error instanceof Error ? error.message : "Tool threw an unexpected error.",
    };
  }

  const snapshotLenAfter = useGroovyStore.getState().agentUndoStack.length;
  return {
    ...invocation,
    durationMs: performance.now() - started,
    snapshotPushed: snapshotLenAfter > snapshotLenBefore,
    destructive: Boolean(tool.destructive),
    result,
  };
}

// Surface helpers for other modules to enumerate tools without pulling Zod.
export function listTools(): Array<{
  name: string;
  description: string;
  category: ToolDefinition["category"];
  destructive: boolean;
}> {
  return agentTools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    category: tool.category,
    destructive: Boolean(tool.destructive),
  }));
}
