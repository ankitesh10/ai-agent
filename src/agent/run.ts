import "dotenv/config";
import { generateText, type ModelMessage } from "ai";

import type { AgentCallbacks } from "../types";
import { openai } from "@ai-sdk/openai";
import { SYSTEM_PROMPT } from "./system/prompt";
import { tools } from "./tools";
import { executeTool } from "./executeTools";
const MODEL_NAME = "gpt-5.4-mini";

export async function runAgent(
  userMessage: string,
  conversationHistory: ModelMessage[],
  callbacks: AgentCallbacks,
): Promise<any> {
  const { text, toolCalls } = await generateText({
    model: openai(MODEL_NAME),
    prompt: userMessage,
    system: SYSTEM_PROMPT,
    tools,
  });

  console.log(text, toolCalls);

  toolCalls.forEach(async (tc) => {
    console.log(await executeTool(tc.toolName, tc.input));
  });
}

runAgent("What is the current time right now?");
