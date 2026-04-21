import { z } from "zod";
import { agentTools } from "./agentTools";

// Gemini's FunctionDeclaration accepts a JSON Schema object via
// `parametersJsonSchema`. We convert each Zod schema to JSON Schema here and
// clean up Zod-specific fields the API would reject.
export interface GeminiFunctionDeclaration {
  name: string;
  description: string;
  parametersJsonSchema: unknown;
}

// Recursively strip fields that Gemini's JSON Schema validator rejects while
// keeping the structural description intact.
function sanitiseSchema(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(sanitiseSchema);
  if (!node || typeof node !== "object") return node;

  const src = node as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(src)) {
    if (key === "$schema" || key === "$id" || key === "$ref") continue;
    if (key === "additionalProperties") continue;
    out[key] = sanitiseSchema(value);
  }
  // Gemini rejects objects with no "properties" but with "required"; ensure
  // we always have a properties dict when type=object.
  if (out.type === "object" && !out.properties) {
    out.properties = {};
  }
  return out;
}

function toJsonSchema(schema: z.ZodType): unknown {
  const raw = z.toJSONSchema(schema, { target: "draft-7" });
  return sanitiseSchema(raw);
}

export function buildGeminiFunctionDeclarations(): GeminiFunctionDeclaration[] {
  return agentTools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    parametersJsonSchema: toJsonSchema(tool.schema),
  }));
}
