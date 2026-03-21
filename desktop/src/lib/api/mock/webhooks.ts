import type { Webhook } from "../types";

const MOCK_WEBHOOKS: Webhook[] = [
  {
    id: "wh-1",
    name: "GitHub Push Events",
    direction: "incoming",
    url: "https://canopy.local/webhooks/github",
    events: ["push", "pull_request"],
    secret: null,
    enabled: true,
    last_triggered_at: new Date(Date.now() - 3_600_000).toISOString(),
    failure_count: 0,
    created_at: "2026-03-01T00:00:00Z",
  },
];

export function mockWebhooks(): Webhook[] {
  return MOCK_WEBHOOKS;
}
