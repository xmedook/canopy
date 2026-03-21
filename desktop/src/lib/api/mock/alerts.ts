import type { AlertRule } from "../types";

const MOCK_ALERT_RULES: AlertRule[] = [
  {
    id: "ar-1",
    name: "Agent error rate high",
    entity_type: "agent",
    field: "error_rate",
    operator: "gt",
    value: "0.05",
    action: "notify",
    enabled: true,
    triggered_count: 2,
    last_triggered_at: new Date(Date.now() - 86_400_000).toISOString(),
    created_at: "2026-03-01T00:00:00Z",
  },
];

export function mockAlertRules(): AlertRule[] {
  return MOCK_ALERT_RULES;
}
