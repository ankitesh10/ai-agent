import type { AssistantModelMessage, ModelMessage, ToolModelMessage } from "ai";

type AssistantPart = Exclude<AssistantModelMessage["content"], string>[number];
type MessagePart = {
  type?: string;
  text?: string;
  toolCallId?: string;
  toolName?: string;
  input?: unknown;
  output?: unknown;
};

const isPart = (part: unknown): part is MessagePart =>
  typeof part === "object" && part !== null;

/**
 * Keep only portable conversation history.
 *
 * Tool results must keep their matching assistant tool calls, and OpenAI
 * provider metadata is intentionally stripped so reasoning item references
 * are not replayed without their hidden paired items.
 */
export const filterCompatibleMessages = (
  messages: ModelMessage[],
): ModelMessage[] => {
  const toolResultIds = new Set<string>();

  for (const message of messages) {
    if (message.role !== "tool") {
      continue;
    }

    for (const part of message.content) {
      if (isPart(part) && part.type === "tool-result" && part.toolCallId) {
        toolResultIds.add(part.toolCallId);
      }
    }
  }

  const validToolCallIds = new Set<string>();

  for (const message of messages) {
    if (message.role !== "assistant" || typeof message.content === "string") {
      continue;
    }

    for (const part of message.content) {
      if (
        isPart(part) &&
        part.type === "tool-call" &&
        part.toolCallId &&
        toolResultIds.has(part.toolCallId)
      ) {
        validToolCallIds.add(part.toolCallId);
      }
    }
  }

  const filteredMessages: ModelMessage[] = [];

  for (const message of messages) {
    if (message.role === "user") {
      filteredMessages.push({ role: "user", content: message.content });
      continue;
    }

    if (message.role === "assistant") {
      if (typeof message.content === "string") {
        if (message.content.trim()) {
          filteredMessages.push({ role: "assistant", content: message.content });
        }

        continue;
      }

      const content: AssistantPart[] = [];

      for (const part of message.content) {
        if (
          isPart(part) &&
          part.type === "text" &&
          typeof part.text === "string" &&
          part.text.trim()
        ) {
          content.push({ type: "text", text: part.text });
        }

        if (
          isPart(part) &&
          part.type === "tool-call" &&
          part.toolCallId &&
          part.toolName &&
          validToolCallIds.has(part.toolCallId)
        ) {
          content.push({
            type: "tool-call",
            toolCallId: part.toolCallId,
            toolName: part.toolName,
            input: part.input,
          });
        }
      }

      if (content.length > 0) {
        filteredMessages.push({ role: "assistant", content });
      }

      continue;
    }

    if (message.role === "tool") {
      const content: ToolModelMessage["content"] = [];

      for (const part of message.content) {
        if (
          isPart(part) &&
          part.type === "tool-result" &&
          part.toolCallId &&
          part.toolName &&
          validToolCallIds.has(part.toolCallId)
        ) {
          content.push({
            type: "tool-result",
            toolCallId: part.toolCallId,
            toolName: part.toolName,
            output: part.output,
          });
        }
      }

      if (content.length > 0) {
        filteredMessages.push({ role: "tool", content });
      }
    }
  }

  return filteredMessages;
};
