import "dotenv/config";
import { generateText, type ModelMessage } from "ai";

import type { AgentCallbacks } from "../types.ts";
import { openai } from "@ai-sdk/openai";
import { SYSTEM_PROMPT } from "./system/prompt.ts";
import { tools } from "./tools/index.ts";
import { executeTool } from "./executeTools.ts";
import { getTracer, Laminar } from "@lmnr-ai/lmnr";
const MODEL_NAME = "gpt-5.4-mini";

Laminar.initialize({
  projectApiKey: process.env.LMNR_PROJECT_API_KEY,
});

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
    experimental_telemetry: {
      isEnabled: true,
      tracer: getTracer(),
    },
  });

  // console.log(text, toolCalls);

  // toolCalls.forEach(async (tc) => {
  //   console.log(await executeTool(tc.toolName, tc.input));
  // });

  await Laminar.flush();

  console.log("done");
}
