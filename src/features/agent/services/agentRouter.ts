import { GoogleGenAI, type Chat, type Content, type FunctionCall, type Part } from "@google/genai";
import { buildGeminiFunctionDeclarations } from "../tools/toolSchemas";
import { executeTool, type ToolExecution } from "../tools/toolRouter";
import { buildProjectSnapshot } from "../tools/agentTools";

const API_KEY = (import.meta.env.VITE_GEMINI_API_KEY as string | undefined) ?? undefined;
const CHAT_MODEL = (import.meta.env.VITE_GEMINI_CHAT_MODEL as string | undefined) ?? "gemini-2.5-flash";

const SYSTEM_PROMPT = [
  "You are Groov2e's in-DAW AI collaborator — 'the Agent'. Users 'jam with the Agent'",
  "to build tracks together. Lean into that collaborative-bandmate voice: warm, brief,",
  "musical. You control the project through tools rather than describing what you",
  "would do — always prefer a tool call over prose when the user requests an edit,",
  "generation, or transport change.",
  "",
  "Rules:",
  "• Use getProjectSummary or listTracks when you need context — do not invent track names or ids.",
  "• Chain tools: you may call up to 8 tools per turn to fulfil complex requests.",
  "• For music generation, always call generateAndInsertClip with an explicit bar count.",
  "• Keep narration under two sentences. Explain the net effect like a bandmate would (\"laid down a lofi bass at bar 4\"), not the internals.",
  "• If the user's intent is ambiguous, ask a single clarifying question instead of calling tools.",
].join("\n");

export interface AgentRouterEvents {
  onToolStart?: (name: string, args: unknown) => void;
  onToolFinish?: (exec: ToolExecution) => void;
  onAssistantChunk?: (text: string) => void;
}

export interface AgentRouterResult {
  text: string;
  executions: ToolExecution[];
  aborted?: boolean;
}

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!API_KEY) {
    throw new Error(
      "Gemini chat is not configured. Set VITE_GEMINI_API_KEY in .env.local to enable the agent.",
    );
  }
  if (!client) client = new GoogleGenAI({ apiKey: API_KEY });
  return client;
}

function contextPreamble(): string {
  const summary = buildProjectSnapshot();
  return [
    "Current project snapshot:",
    `• Name: ${summary.name}`,
    `• BPM: ${summary.bpm}, Key: ${summary.key}`,
    `• Cursor: bar ${summary.cursorBar.toFixed(2)} (${summary.cursorSeconds.toFixed(2)}s)`,
    `• Transport: ${summary.transportStatus}`,
    `• Tracks: ${summary.tracks.length === 0 ? "(none yet)" : summary.tracks
      .map((t) => `${t.name}[${t.clipCount} clips]`)
      .join(", ")}`,
  ].join("\n");
}

function newChat(): Chat {
  const ai = getClient();
  const functionDeclarations = buildGeminiFunctionDeclarations();
  return ai.chats.create({
    model: CHAT_MODEL,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      tools: [{ functionDeclarations }],
      temperature: 0.4,
    },
  });
}

export async function runAgentTurn(
  userMessage: string,
  events: AgentRouterEvents = {},
  history: Content[] = [],
): Promise<AgentRouterResult> {
  const ai = getClient();
  const functionDeclarations = buildGeminiFunctionDeclarations();
  const chat: Chat = ai.chats.create({
    model: CHAT_MODEL,
    history,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      tools: [{ functionDeclarations }],
      temperature: 0.4,
    },
  });

  const primedMessage = `${contextPreamble()}\n\nUser: ${userMessage}`;
  let response = await chat.sendMessage({ message: primedMessage });

  const executions: ToolExecution[] = [];
  const MAX_TOOL_ROUNDS = 8;

  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    const calls: FunctionCall[] = response.functionCalls ?? [];
    if (calls.length === 0) break;

    const toolResponseParts: Part[] = [];
    for (const call of calls) {
      const name = call.name ?? "<unknown>";
      const args = (call.args ?? {}) as unknown;
      events.onToolStart?.(name, args);
      const execution = await executeTool({ name, args });
      executions.push(execution);
      events.onToolFinish?.(execution);
      toolResponseParts.push({
        functionResponse: {
          name,
          response: {
            ok: execution.result.ok,
            message: execution.result.message,
            data: execution.result.data ?? null,
          },
        },
      });
    }

    response = await chat.sendMessage({ message: toolResponseParts });
  }

  const text = response.text?.trim() ?? "";
  events.onAssistantChunk?.(text);
  return { text, executions };
}

export function hasAgentKey(): boolean {
  return Boolean(API_KEY);
}

// Re-export for tests / power users.
export { newChat };
