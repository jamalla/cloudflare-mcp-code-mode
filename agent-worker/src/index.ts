import { streamText } from "ai";
import { tool, type ToolSet } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { z } from "zod";

type Env = {
  OPENAI_API_KEY: string;
  WEATHER_MCP: Fetcher;
};

async function getWeatherMcpTools(env: Env): Promise<{ tools: ToolSet; close: () => Promise<void> }> {
  const transport = new StreamableHTTPClientTransport(new URL("https://weather-mcp/mcp"), {
    fetch: (input, init) => env.WEATHER_MCP.fetch(new Request(input, init)),
  });

  const client = new Client({ name: "agent-worker", version: "1.0.0" });
  await client.connect(transport);

  const listed = await client.listTools();
  const tools: ToolSet = {};

  for (const mcpTool of listed.tools) {
    tools[mcpTool.name] = tool({
      description: mcpTool.description ?? `MCP tool: ${mcpTool.name}`,
      // Keep schema permissive so all MCP JSON-schema inputs can be passed through.
      inputSchema: z.record(z.any()),
      execute: async (args) => {
        const result = await client.callTool({
          name: mcpTool.name,
          arguments: args as Record<string, unknown>,
        });

        if ("toolResult" in result) return result.toolResult;
        if (result.structuredContent) return result.structuredContent;

        const textContent = (result.content ?? [])
          .filter((item) => item.type === "text")
          .map((item) => item.text)
          .join("\n");

        return textContent || result;
      },
    });
  }

  return {
    tools,
    close: async () => {
      await client.close();
    },
  };
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    // CORS — allow the frontend dev server
    if (req.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    if (req.method !== "POST" || new URL(req.url).pathname !== "/chat") {
      return new Response("Not found", { status: 404 });
    }

    const { messages } = await req.json();

    const { tools: mcpTools, close } = await getWeatherMcpTools(env);

    try {
      const openai = createOpenAI({ apiKey: env.OPENAI_API_KEY });

      const result = streamText({
        model: openai("gpt-4o"),
        system: "You are a helpful weather assistant. Use available tools for weather lookups.",
        messages,
        tools: mcpTools,
        maxSteps: 10,
      });

      // Stream back to the frontend
      const response = result.toDataStreamResponse();

      // Add CORS header to streamed response
      const headers = new Headers(response.headers);
      headers.set("Access-Control-Allow-Origin", "*");

      return new Response(response.body, { headers, status: response.status });
    } finally {
      await close();
    }
  },
};