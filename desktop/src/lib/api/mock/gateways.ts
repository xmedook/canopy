import type { Gateway } from "../types";

const MOCK_GATEWAYS: Gateway[] = [
  {
    id: "gw-1",
    name: "Anthropic",
    provider: "anthropic",
    endpoint: "https://api.anthropic.com",
    api_key_set: true,
    is_primary: true,
    status: "healthy",
    latency_ms: 142,
    last_probe_at: new Date(Date.now() - 60_000).toISOString(),
    models: [
      "claude-sonnet-4-6",
      "claude-opus-4-6",
      "claude-haiku-4-5-20251001",
    ],
    created_at: "2026-03-01T00:00:00Z",
  },
];

export function mockGateways(): Gateway[] {
  return MOCK_GATEWAYS;
}
