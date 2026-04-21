import { runAgentTurn, hasAgentKey } from "../features/agent/services/agentRouter";
import { generateMusicClip, hasGeminiKey } from "../features/agent/services/geminiAudioService";
import { createId } from "../lib/id";
import { useGroovyStore } from "../store/useGroovyStore";
import type { AgentClipAttachment } from "../types/agent";
import type { ToolExecution } from "../features/agent/tools/toolRouter";

function hashSeed(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 10000;
}

function buildPromptForContext(
  prompt: string,
  ctx: { bpm: number; key: string; selectedTrack: string | null },
): string {
  const bits: string[] = [prompt];
  if (ctx.selectedTrack) bits.push(`Intended for a track called "${ctx.selectedTrack}".`);
  bits.push(`Target tempo ${ctx.bpm} BPM in the key of ${ctx.key}.`);
  return bits.join(" ");
}

// Summarise what the agent actually did in this turn as a single short line so
// the Genie panel always has a human-readable recap even when the model's
// final text is empty or terse.
function summariseExecutions(executions: ToolExecution[]): string | null {
  if (executions.length === 0) return null;
  const changed = executions.filter((e) => e.result.ok && e.destructive);
  if (changed.length === 0) {
    const reads = executions.filter((e) => e.result.ok).length;
    return reads > 0 ? `Checked the project (${reads} lookup${reads === 1 ? "" : "s"}).` : null;
  }
  const first = changed[0]?.result.message ?? "Applied changes.";
  if (changed.length === 1) return first;
  return `${first} (+${changed.length - 1} more change${changed.length - 1 === 1 ? "" : "s"}).`;
}

export const agentController = {
  async submitText(prompt: string) {
    const trimmedPrompt = prompt.trim();
    const state = useGroovyStore.getState();

    if (!trimmedPrompt || state.agentRequest.isLoading) return;

    state.appendChatMessage({
      id: createId("message"),
      role: "user",
      content: trimmedPrompt,
      createdAt: new Date().toISOString(),
    });

    if (!hasAgentKey()) {
      state.appendChatMessage({
        id: createId("message"),
        role: "assistant",
        content:
          "I'm not connected to Gemini yet. Add VITE_GEMINI_API_KEY to .env.local and restart the dev server — then I can edit the project and generate audio for you.",
        createdAt: new Date().toISOString(),
      });
      return;
    }

    state.clearAgentActivity();
    state.setAgentLocked(true);
    state.setAgentLoading(true);

    try {
      const { text, executions } = await runAgentTurn(trimmedPrompt, {
        onToolStart: (name, args) => {
          useGroovyStore.getState().startAgentActivity(createId("act"), name, args);
        },
        onToolFinish: (exec) => {
          const s = useGroovyStore.getState();
          const running = [...s.agentActivity].reverse().find(
            (a) => a.name === exec.name && a.status === "running",
          );
          if (!running) return;
          s.finishAgentActivity(running.id, {
            status: exec.result.ok ? "ok" : "error",
            message: exec.result.message,
            destructive: exec.destructive,
            snapshotPushed: exec.snapshotPushed,
            durationMs: Math.round(exec.durationMs),
          });
        },
      });

      const body = text.trim() || summariseExecutions(executions) || "Done.";
      useGroovyStore.getState().appendChatMessage({
        id: createId("message"),
        role: "assistant",
        content: body,
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      useGroovyStore.getState().appendChatMessage({
        id: createId("message"),
        role: "assistant",
        content: error instanceof Error ? error.message : "The agent encountered an unexpected error.",
        createdAt: new Date().toISOString(),
      });
    } finally {
      useGroovyStore.getState().setAgentLoading(false);
      useGroovyStore.getState().setAgentLocked(false);
    }
  },

  insertAttachment(messageId: string) {
    useGroovyStore.getState().insertAttachmentClip(messageId);
  },

  async regenerateAttachment(messageId: string) {
    const state = useGroovyStore.getState();
    const message = state.chatMessages.find((m) => m.id === messageId);
    if (!message?.attachment) return;

    if (!hasGeminiKey()) {
      useGroovyStore.getState().appendChatMessage({
        id: createId("message"),
        role: "assistant",
        content: "Gemini is not configured, so I can't regenerate this clip.",
        createdAt: new Date().toISOString(),
      });
      return;
    }

    const prompt = state.agentRequest.lastPayload?.prompt ?? message.attachment.label ?? message.attachment.trackName;
    const ctx = state.agentRequest.lastPayload?.context ?? {
      bpm: state.project.bpm,
      key: state.project.key,
      trackNames: state.tracks.map((t) => t.name),
      selectedTrack: state.selectedTrackId
        ? state.tracks.find((t) => t.id === state.selectedTrackId)?.name ?? null
        : null,
      cursor: state.cursorPosition,
    };

    state.setAgentLoading(true);
    try {
      const enrichedPrompt = buildPromptForContext(prompt, ctx);
      const result = await generateMusicClip(enrichedPrompt, { trackName: message.attachment.trackName });

      useGroovyStore.getState().replaceAttachment(messageId, {
        kind: "clip",
        trackName: message.attachment.trackName,
        audioUrl: result.audioUrl,
        startTime: message.attachment.startTime,
        duration: result.duration,
        inserted: false,
        seed: hashSeed(`${messageId}:${result.audioUrl}`),
        label: message.attachment.label,
      } satisfies AgentClipAttachment);
    } catch (error) {
      useGroovyStore.getState().appendChatMessage({
        id: createId("message"),
        role: "assistant",
        content: error instanceof Error ? error.message : "Audio regeneration failed.",
        createdAt: new Date().toISOString(),
      });
    } finally {
      useGroovyStore.getState().setAgentLoading(false);
    }
  },
};
