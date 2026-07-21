import { generateText, stepCountIs, tool, type ToolSet } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import type { ModelMessage } from "ai";

import type {
  EvalData,
  SingleTurnResult,
  MultiTurnEvalData,
  MultiTurnResult,
} from "./types.ts";
import { buildMessages, buildMockedTools } from "./utils.ts";
import { SYSTEM_PROMPT } from "../dist/agent/system/prompt";

// "tools": ["readFile", "writeFile", "listFiles", "deleteFile"]

const TOOL_DEFINATIONS: any = {
  readFile: {
    description:
      "Read the contents of a file at the specified path given, read",
    parameters: z.object({
      path: z.string().describe("the path to the file that you want to read"),
    }),
  },
  writeFile: {
    description: "Write given content to the file at the given path",
    parameters: z.object({
      path: z
        .string()
        .describe("the path to the file that you want to write to"),
      content: z.string().describe("the content you want to write to the file"),
    }),
  },
  listFiles: {
    description: "List all the files in a directory",
    parameters: z.object({
      path: z.string().describe("the path to the file that you want to list"),
    }),
  },
  deleteFile: {
    description: "Delete a file at the given path",
    parameters: z.object({
      path: z.string().describe("the path to the file that you want to delete"),
    }),
  },
  runCommand: {
    description: "Execute a shell command and return its output",
    parameters: z.object({
      path: z.string().describe("the shell command to execute"),
    }),
  },
};

export const singleTurnExecuter = async (data: EvalData) => {
  const messages = buildMessages(data);

  const tools: ToolSet = {};

  for (const toolName of data.tools) {
    const def = TOOL_DEFINATIONS[toolName];

    if (def) {
      tools[toolName] = tool({
        description: def.description,
        inputSchema: def.parameters,
      });
    }
  }

  const { toolCalls } = await generateText({
    model: openai(data.config?.model ?? "gpt-5-mini"),
    messages,
    tools,
    stopWhen: stepCountIs(1),
    temperature: data.config?.temperature ?? undefined,
  });

  const calls = toolCalls.map((tc) => {
    toolName: tc.toolName;
    args: "args" in tc ? tc.args : {};
  });

  const toolNames = toolCalls.map((tc) => tc.toolName);

  return {
    toolCalls,
    toolNames,
    selectAny: toolNames.length > 0,
  };
};

export const multiTurnWithMocks = async (data: MultiTurnEvalData) => {
  const tools = buildMockedTools(data.mockTools);

  const messages: ModelMessage[] = data.messages ?? [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: data.prompt! },
  ];

  const result = await generateText({
    model: openai(data.config?.model ?? "gpt-5-mini"),
    messages,
    tools,
    stopWhen: stepCountIs(data.config?.maxSteps ?? 20),
  });

  const allTools: string[] = [];

  const steps = result.steps.map((step) => {
    const stepToolCalls = (step.toolCalls ?? []).map((tc) => {
      allTools.push(tc.toolName);

      return {
        toolName: tc.toolName,
        args: "args" in tc ? tc.args : {},
      };
    });

    const stepToolResults = (step.staticToolResults ?? []).map((tr) => ({
      toolName: tr.toolName,
      result: "results" in tr ? tr.results : tr,
    }));

    return {
      toolCalls: stepToolCalls?.length > 0 ? stepToolCalls : undefined,
      stepToolResults: stepToolResults.length > 0 ? stepToolResults : undefined,
      text: step.text || undefined,
    };
  });

  const toolsUsed = [new Set(allTools)];

  return {
    text: result.text,
    steps,
    toolsUsed,
    toolCallOrder: allTools,
  };
};
