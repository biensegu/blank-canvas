import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export function createAiGatewayProvider(apiKey: string, baseURL: string) {
  return createOpenAICompatible({
    name: "pieza-a-pieza-ai",
    baseURL,
    headers: { Authorization: `Bearer ${apiKey}` },
  });
}
