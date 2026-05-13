import "dotenv/config";
import { generateText, type ModelMessage } from "ai";

import type { AgentCallbacks } from "../types";
import { openai } from "@ai-sdk/openai";
import { SYSTEM_PROMPT } from "./system/prompt";

const MODEL_NAME = "gpt-5.4-mini";

export async function runAgent(
  userMessage: string,
  conversationHistory: ModelMessage[],
  callbacks: AgentCallbacks,
): Promise<any> {
  const { text } = await generateText({
    model: openai(MODEL_NAME),
    prompt: userMessage,
    system: SYSTEM_PROMPT,
  });

  console.log(text);
}

runAgent("Hello, can you hear me");
