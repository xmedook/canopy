// src/lib/api/mock/index.ts
// Mock API router — intercepts requests in dev mode when backend is unavailable

import { mockDashboard } from "./dashboard";
import { mockAgents, mockAgentById } from "./agents";
import { mockSchedules } from "./schedules";
import { mockIssues } from "./issues";
import { mockCosts } from "./costs";
import { mockActivity } from "./activity";
import { mockSessions } from "./sessions";
import { getInbox, performInboxAction } from "./inbox";
import { getGoals, getGoalTree, getGoalById } from "./goals";
import { getDocuments, getDocumentTree, getDocumentById } from "./documents";
import { getProjects, getProjectById } from "./projects";
import { getSpawnInstances, createSpawnInstance } from "./spawn";
import { getMockMessages } from "./chat";
import {
  getMutableEntries,
  getMockMemoryNamespaces,
  getMockMemoryById,
  searchMockMemory,
  createMockEntry,
  updateMockEntry,
  deleteMockEntry,
} from "./memory";
import { mockSkills } from "./skills";
import { mockWebhooks } from "./webhooks";
import { mockAlertRules } from "./alerts";
import { mockIntegrations, mockAdapters } from "./integrations";
import { mockGateways } from "./gateways";
import { mockUsers } from "./users";
import { mockConfig } from "./config";
import { mockTemplates } from "./templates";
import { mockSecrets } from "./secrets";
import { mockApprovals } from "./approvals";
import { mockOrganizations, mockOrgMembers } from "./organizations";
import { mockLabels } from "./labels";
import { mockPlugins, mockPluginLogs } from "./plugins";
import { mockSignals } from "./signals";
import { mockAudit } from "./audit";
import { mockLogs } from "./logs";
import type { CanopyAgent, Schedule, HeartbeatRun, Issue } from "../types";

// Simulated network delay (kept minimal for responsiveness)
function delay(ms = 30): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms + Math.random() * 20));
}

// rawPath includes query string; path is cleanPath (no query string)
type RouteHandler = (
  path: string,
  options: RequestInit,
  rawPath: string,
) => unknown;

// ── Route table ───────────────────────────────────────────────────────────────

const routes: Array<{ pattern: RegExp; handler: RouteHandler }> = [
  // ── Health ──────────────────────────────────────────────────────────────────
  {
    pattern: /^\/health$/,
    handler: () => ({
      status: "ok",
      version: "1.0.0-mock",
      provider: null,
      uptime_seconds: 3600,
      agents_active: 2,
    }),
  },

  // ── Dashboard ───────────────────────────────────────────────────────────────
  { pattern: /^\/dashboard$/, handler: () => mockDashboard() },

  // ── Agents — specific routes before general ─────────────────────────────────
  {
    // POST /agents/:id/wake|sleep|pause|terminate|focus
    pattern: /^\/agents\/([^/]+)\/([^/]+)$/,
    handler: (path) => {
      const id = path.split("/")[2];
      return mockAgentById(id);
    },
  },
  {
    // GET/PATCH/DELETE /agents/:id
    pattern: /^\/agents\/([^/]+)$/,
    handler: (path, options) => {
      const id = path.split("/")[2];
      const method = (options.method ?? "GET").toUpperCase();
      if (method === "DELETE") return undefined;
      if (method === "PATCH" && options.body) {
        const base = mockAgentById(id);
        try {
          const body = JSON.parse(
            typeof options.body === "string"
              ? options.body
              : JSON.stringify(options.body),
          ) as Partial<CanopyAgent>;
          return { ...base, ...body, updated_at: new Date().toISOString() };
        } catch {
          return base;
        }
      }
      return mockAgentById(id);
    },
  },
  {
    // GET /agents + POST /agents
    pattern: /^\/agents$/,
    handler: (_path, options) => {
      if ((options.method ?? "GET").toUpperCase() === "POST") {
        const agents = mockAgents();
        const base = agents[0];
        try {
          const body = JSON.parse(
            typeof options.body === "string"
              ? options.body
              : JSON.stringify(options.body ?? {}),
          ) as Partial<CanopyAgent>;
          const newAgent: CanopyAgent = {
            ...base,
            id: `agent-new-${Date.now()}`,
            name: body.name ?? "new-agent",
            display_name: body.display_name ?? "New Agent",
            avatar_emoji: body.avatar_emoji ?? "🤖",
            role: body.role ?? "General",
            adapter: body.adapter ?? "osa",
            model: body.model ?? "claude-sonnet-4-6",
            system_prompt: body.system_prompt ?? "",
            status: "idle",
            current_task: null,
            last_active_at: null,
            token_usage_today: {
              input: 0,
              output: 0,
              cache_read: 0,
              cache_write: 0,
            },
            cost_today_cents: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          return newAgent;
        } catch {
          return base;
        }
      }
      const agents = mockAgents();
      return { agents, count: agents.length };
    },
  },

  // ── Sessions ─────────────────────────────────────────────────────────────────
  {
    pattern: /^\/sessions\/([^/]+)\/(transcript|messages)$/,
    handler: (path) => {
      const id = path.split("/")[2];
      return { messages: getMockMessages(id) };
    },
  },
  {
    // GET/DELETE /sessions/:id
    pattern: /^\/sessions\/([^/]+)$/,
    handler: (path, options) => {
      const id = path.split("/")[2];
      const method = (options.method ?? "GET").toUpperCase();
      if (method === "DELETE") return undefined;
      return mockSessions().find((s) => s.id === id) ?? mockSessions()[0];
    },
  },
  {
    // GET /sessions + POST /sessions
    pattern: /^\/sessions$/,
    handler: (_path, options) => {
      if ((options.method ?? "GET").toUpperCase() === "POST") {
        const sess = mockSessions()[0];
        return { ...sess, id: `sess-new-${Date.now()}`, status: "active" };
      }
      const sessions = mockSessions();
      return { sessions, count: sessions.length };
    },
  },

  // ── Messages ─────────────────────────────────────────────────────────────────
  {
    pattern: /^\/messages$/,
    handler: () => ({
      stream_id: `stream-${Date.now()}`,
      session_id: "sess-1",
    }),
  },

  // ── Schedules ────────────────────────────────────────────────────────────────
  {
    // POST /schedules/:id/trigger
    pattern: /^\/schedules\/([^/]+)\/trigger$/,
    handler: (path): HeartbeatRun => {
      const scheduleId = path.split("/")[2];
      const sched =
        mockSchedules().find((s) => s.id === scheduleId) ?? mockSchedules()[0];
      return {
        id: `run-mock-${Date.now()}`,
        schedule_id: sched.id,
        agent_id: sched.agent_id,
        agent_name: sched.agent_name,
        status: "running",
        trigger: "manual",
        started_at: new Date().toISOString(),
        completed_at: null,
        duration_ms: null,
        token_usage: null,
        cost_cents: null,
        output_summary: null,
        error_message: null,
      };
    },
  },
  {
    // GET /schedules/:id/runs
    pattern: /^\/schedules\/([^/]+)\/runs$/,
    handler: () => ({ runs: [] }),
  },
  {
    // GET/PATCH/DELETE /schedules/:id
    pattern: /^\/schedules\/([^/]+)$/,
    handler: (path, options) => {
      const id = path.split("/")[2];
      const method = (options.method ?? "GET").toUpperCase();
      if (method === "DELETE") return undefined;
      const sched =
        mockSchedules().find((s) => s.id === id) ?? mockSchedules()[0];
      if (method === "PATCH" && options.body) {
        try {
          const body = JSON.parse(
            typeof options.body === "string"
              ? options.body
              : JSON.stringify(options.body),
          ) as Partial<Schedule>;
          return { ...sched, ...body, updated_at: new Date().toISOString() };
        } catch {
          return sched;
        }
      }
      return sched;
    },
  },
  {
    // GET /schedules + POST /schedules
    pattern: /^\/schedules$/,
    handler: (_path, options) => {
      if ((options.method ?? "GET").toUpperCase() === "POST") {
        const base = mockSchedules()[0];
        return { ...base, id: `sched-new-${Date.now()}` };
      }
      return { schedules: mockSchedules() };
    },
  },

  // ── Issues ───────────────────────────────────────────────────────────────────
  {
    // GET/PATCH/DELETE /issues/:id
    pattern: /^\/issues\/([^/]+)$/,
    handler: (path, options) => {
      const id = path.split("/")[2];
      const method = (options.method ?? "GET").toUpperCase();
      if (method === "DELETE") return undefined;
      const issue = mockIssues().find((i) => i.id === id) ?? mockIssues()[0];
      if (method === "PATCH" && options.body) {
        try {
          const body = JSON.parse(
            typeof options.body === "string"
              ? options.body
              : JSON.stringify(options.body),
          ) as Partial<Issue>;
          return { ...issue, ...body, updated_at: new Date().toISOString() };
        } catch {
          return issue;
        }
      }
      return issue;
    },
  },
  {
    // GET /issues + POST /issues
    pattern: /^\/issues$/,
    handler: (_path, options) => {
      if ((options.method ?? "GET").toUpperCase() === "POST") {
        const base = mockIssues()[0];
        return {
          ...base,
          id: `iss-new-${Date.now()}`,
          created_at: new Date().toISOString(),
        };
      }
      return { issues: mockIssues() };
    },
  },

  // ── Goals (project-scoped) ────────────────────────────────────────────────────
  {
    pattern: /^\/projects\/([^/]+)\/goals\/([^/]+)$/,
    handler: (path, options) => {
      const goalId = path.split("/")[4];
      const method = (options.method ?? "GET").toUpperCase();
      const goal = getGoalById(goalId) ?? getGoalTree()[0];
      if (method === "PATCH" && options.body) {
        try {
          const body = JSON.parse(
            typeof options.body === "string"
              ? options.body
              : JSON.stringify(options.body),
          );
          return { ...goal, ...body, updated_at: new Date().toISOString() };
        } catch {
          return goal;
        }
      }
      return goal;
    },
  },
  {
    pattern: /^\/projects\/([^/]+)\/goals$/,
    handler: () => ({ goals: getGoalTree() }),
  },

  // ── Goals (standalone — legacy or direct access) ──────────────────────────────
  {
    pattern: /^\/goals\/tree$/,
    handler: () => ({ tree: getGoalTree() }),
  },
  {
    pattern: /^\/goals\/([^/]+)$/,
    handler: (path) => {
      const id = path.split("/")[2];
      return { goal: getGoalById(id) };
    },
  },
  {
    pattern: /^\/goals$/,
    handler: () => ({ goals: getGoals(), count: getGoals().length }),
  },

  // ── Projects ──────────────────────────────────────────────────────────────────
  {
    // GET/PATCH /projects/:id
    pattern: /^\/projects\/([^/]+)$/,
    handler: (path) => {
      const id = path.split("/")[2];
      return getProjectById(id);
    },
  },
  {
    // GET /projects + POST /projects
    pattern: /^\/projects$/,
    handler: (_path, options) => {
      if ((options.method ?? "GET").toUpperCase() === "POST") {
        let body: Record<string, unknown> = {};
        try {
          body =
            typeof options.body === "string"
              ? JSON.parse(options.body)
              : (options.body ?? {});
        } catch {
          /* ignore */
        }
        return {
          id: `proj-${Date.now()}`,
          name: (body.name as string) ?? "New Project",
          description: (body.description as string) ?? "",
          status: "active",
          workspace_path:
            (body.workspace_path as string) ?? "~/.canopy/projects",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          agent_count: 0,
          session_count: 0,
          goal_count: 0,
          issue_count: 0,
        };
      }
      return { projects: getProjects(), count: getProjects().length };
    },
  },

  // ── Documents ────────────────────────────────────────────────────────────────
  {
    pattern: /^\/documents\/tree$/,
    handler: () => ({ tree: getDocumentTree() }),
  },
  {
    pattern: /^\/documents\/([^/]+)$/,
    handler: (path) => {
      const id = path.split("/")[2];
      return { document: getDocumentById(id) };
    },
  },
  {
    pattern: /^\/documents$/,
    handler: () => ({
      documents: getDocuments(),
      count: getDocuments().length,
    }),
  },

  // ── Costs ─────────────────────────────────────────────────────────────────────
  { pattern: /^\/costs\/summary$/, handler: () => mockCosts().summary },
  {
    pattern: /^\/costs\/by-agent$/,
    handler: () => ({ agents: mockCosts().byAgent }),
  },
  {
    pattern: /^\/costs\/by-model$/,
    handler: () => ({ models: mockCosts().byModel }),
  },

  // ── Budgets ────────────────────────────────────────────────────────────────────
  {
    pattern: /^\/budgets\/incidents$/,
    handler: () => ({ incidents: mockCosts().incidents }),
  },
  {
    pattern: /^\/budgets$/,
    handler: () => ({ policies: mockCosts().policies }),
  },

  // ── Activity ──────────────────────────────────────────────────────────────────
  { pattern: /^\/activity/, handler: () => ({ events: mockActivity() }) },

  // ── Inbox ─────────────────────────────────────────────────────────────────────
  {
    // POST /inbox/:id/actions/:actionId  or  /inbox/:id/action
    pattern: /^\/inbox\/([^/]+)\/(actions?|dismiss)(\/([^/]+))?$/,
    handler: (path, options) => {
      const parts = path.split("/");
      const itemId = parts[2];
      let actionId = parts[4] ?? "ack";
      if (!parts[4] && options.body) {
        try {
          const body =
            typeof options.body === "string"
              ? JSON.parse(options.body)
              : options.body;
          actionId = (body as { action_id?: string }).action_id ?? "ack";
        } catch {
          // ignore
        }
      }
      if (path.includes("/dismiss")) actionId = "ack";
      return { item: performInboxAction(itemId, actionId) };
    },
  },
  {
    pattern: /^\/inbox$/,
    handler: () => ({ items: getInbox(), count: getInbox().length }),
  },

  // ── Skills ────────────────────────────────────────────────────────────────────
  {
    pattern: /^\/skills\/([^/]+)\/toggle$/,
    handler: (path) => {
      const id = path.split("/")[2];
      const skill = mockSkills().find((s) => s.id === id) ?? mockSkills()[0];
      return { ...skill, enabled: !skill.enabled };
    },
  },
  { pattern: /^\/skills$/, handler: () => ({ skills: mockSkills() }) },

  // ── Webhooks ──────────────────────────────────────────────────────────────────
  {
    // DELETE /webhooks/:id
    pattern: /^\/webhooks\/([^/]+)$/,
    handler: (_path, options) => {
      if ((options.method ?? "GET").toUpperCase() === "DELETE")
        return undefined;
      return mockWebhooks()[0];
    },
  },
  {
    pattern: /^\/webhooks$/,
    handler: (_path, options) => {
      if ((options.method ?? "GET").toUpperCase() === "POST") {
        return { ...mockWebhooks()[0], id: `wh-new-${Date.now()}` };
      }
      return { webhooks: mockWebhooks() };
    },
  },

  // ── Alerts ────────────────────────────────────────────────────────────────────
  {
    pattern: /^\/alerts\/rules$/,
    handler: (_path, options) => {
      if ((options.method ?? "GET").toUpperCase() === "POST") {
        return { ...mockAlertRules()[0], id: `ar-new-${Date.now()}` };
      }
      return { rules: mockAlertRules() };
    },
  },
  { pattern: /^\/alerts$/, handler: () => ({ rules: mockAlertRules() }) },

  // ── Integrations ──────────────────────────────────────────────────────────────
  {
    pattern: /^\/integrations$/,
    handler: () => ({ integrations: mockIntegrations() }),
  },

  // ── Adapters ──────────────────────────────────────────────────────────────────
  {
    pattern: /^\/adapters$/,
    handler: () => ({ adapters: mockAdapters() }),
  },

  // ── Gateways ──────────────────────────────────────────────────────────────────
  {
    pattern: /^\/gateways$/,
    handler: () => ({ gateways: mockGateways() }),
  },

  // ── Workspaces ────────────────────────────────────────────────────────────────
  {
    pattern: /^\/workspaces$/,
    handler: (_path, options) => {
      const defaultWorkspaces = [
        {
          id: "ws-osa-dev",
          name: "OSA Development",
          description: "Main development workspace",
          directory: "~/.canopy/default",
          agent_count: 6,
          project_count: 2,
          skill_count: 4,
          status: "active" as const,
          created_at: "2026-01-01T00:00:00Z",
          updated_at: new Date().toISOString(),
        },
      ];
      if ((options.method ?? "GET").toUpperCase() === "POST") {
        let body: Record<string, unknown> = {};
        try {
          body =
            typeof options.body === "string"
              ? JSON.parse(options.body)
              : (options.body ?? {});
        } catch {
          /* ignore */
        }
        const name = (body.name as string) ?? "New Workspace";
        return {
          id: `ws-${Date.now()}`,
          name,
          description: "",
          directory:
            (body.directory as string) ??
            `~/.canopy/${name.toLowerCase().replace(/\s+/g, "-")}`,
          agent_count: 0,
          project_count: 0,
          skill_count: 0,
          status: "active" as const,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }
      return { workspaces: defaultWorkspaces };
    },
  },

  // ── Settings ──────────────────────────────────────────────────────────────────
  {
    pattern: /^\/settings$/,
    handler: (_path, options) => {
      const base = {
        theme: "dark" as const,
        font_size: 15,
        sidebar_default_collapsed: false,
        notifications_enabled: true,
        auto_approve_budget_under_cents: 100,
        default_adapter: "osa" as const,
        default_model: "claude-sonnet-4-6",
        working_directory: "~",
      };
      if ((options.method ?? "GET").toUpperCase() === "PATCH" && options.body) {
        try {
          const body = JSON.parse(
            typeof options.body === "string"
              ? options.body
              : JSON.stringify(options.body),
          );
          return { ...base, ...body };
        } catch {
          return base;
        }
      }
      return base;
    },
  },

  // ── Audit ─────────────────────────────────────────────────────────────────────
  {
    pattern: /^\/audit/,
    handler: () => ({ entries: mockAudit() }),
  },

  // ── Logs ──────────────────────────────────────────────────────────────────────
  {
    pattern: /^\/logs/,
    handler: () => ({ entries: mockLogs() }),
  },

  // ── Memory ────────────────────────────────────────────────────────────────────
  {
    pattern: /^\/memory\/search$/,
    handler: (_path, _options, rawPath) => {
      const q = new URLSearchParams(rawPath.split("?")[1] ?? "").get("q") ?? "";
      return {
        entries: searchMockMemory(q),
        count: searchMockMemory(q).length,
      };
    },
  },
  {
    pattern: /^\/memory\/namespaces$/,
    handler: () => ({ namespaces: getMockMemoryNamespaces() }),
  },
  {
    pattern: /^\/memory\/([^/]+)$/,
    handler: (path, options) => {
      const id = path.split("/")[2];
      const method = (options.method ?? "GET").toUpperCase();
      if (method === "DELETE") {
        deleteMockEntry(id);
        return undefined;
      }
      if (method === "PUT" && options.body) {
        try {
          const body = JSON.parse(
            typeof options.body === "string"
              ? options.body
              : JSON.stringify(options.body),
          );
          return { entry: updateMockEntry(id, body) };
        } catch {
          return { entry: getMockMemoryById(id) };
        }
      }
      return { entry: getMockMemoryById(id) };
    },
  },
  {
    pattern: /^\/memory$/,
    handler: (_path, options) => {
      const method = (options.method ?? "GET").toUpperCase();
      if (method === "POST" && options.body) {
        try {
          const body = JSON.parse(
            typeof options.body === "string"
              ? options.body
              : JSON.stringify(options.body),
          );
          return { entry: createMockEntry(body) };
        } catch {
          return { entry: null };
        }
      }
      return {
        entries: getMutableEntries(),
        count: getMutableEntries().length,
      };
    },
  },

  // ── Signals ───────────────────────────────────────────────────────────────────
  {
    pattern: /^\/signals\/feed$/,
    handler: () => ({ signals: mockSignals() }),
  },
  {
    pattern: /^\/signals/,
    handler: () => ({ signals: mockSignals() }),
  },

  // ── Spawn ─────────────────────────────────────────────────────────────────────
  {
    pattern: /^\/spawn\/active$/,
    handler: () => {
      const instances = getSpawnInstances().filter(
        (i) => i.status === "running",
      );
      return { instances, count: instances.length };
    },
  },
  {
    pattern: /^\/spawn$/,
    handler: (_path, options) => {
      if (options.method?.toUpperCase() === "POST") {
        let body: Partial<{
          agent_id: string;
          agent_name: string;
          task: string;
          model: string;
        }> = {};
        if (options.body) {
          try {
            body =
              typeof options.body === "string"
                ? JSON.parse(options.body)
                : (options.body as typeof body);
          } catch {
            // use empty body
          }
        }
        return { instance: createSpawnInstance(body) };
      }
      const instances = getSpawnInstances();
      return { instances, count: instances.length };
    },
  },

  // ── Templates ─────────────────────────────────────────────────────────────────
  {
    pattern: /^\/templates\/([^/]+)$/,
    handler: (path) => {
      const id = path.split("/")[2];
      return mockTemplates().find((t) => t.id === id) ?? mockTemplates()[0];
    },
  },
  { pattern: /^\/templates$/, handler: () => ({ templates: mockTemplates() }) },

  // ── Config ────────────────────────────────────────────────────────────────────
  { pattern: /^\/config/, handler: () => ({ config: mockConfig() }) },

  // ── Users ─────────────────────────────────────────────────────────────────────
  {
    pattern: /^\/users\/([^/]+)$/,
    handler: (path) => {
      const id = path.split("/")[2];
      return mockUsers().find((u) => u.id === id) ?? mockUsers()[0];
    },
  },
  { pattern: /^\/users$/, handler: () => ({ users: mockUsers() }) },

  // ── Secrets ──────────────────────────────────────────────────────────────────
  {
    pattern: /^\/secrets\/([^/]+)\/rotate$/,
    handler: (path) => {
      const id = path.split("/")[2];
      const secret = mockSecrets().find((s) => s.id === id) ?? mockSecrets()[0];
      return { ...secret, last_rotated_at: new Date().toISOString() };
    },
  },
  {
    pattern: /^\/secrets\/([^/]+)$/,
    handler: (path, options) => {
      const id = path.split("/")[2];
      if ((options.method ?? "GET").toUpperCase() === "DELETE")
        return undefined;
      return mockSecrets().find((s) => s.id === id) ?? mockSecrets()[0];
    },
  },
  {
    pattern: /^\/secrets$/,
    handler: (_path, options) => {
      if ((options.method ?? "GET").toUpperCase() === "POST") {
        return {
          id: `secret-new-${Date.now()}`,
          name: "new-secret",
          type: "api_key",
          description: null,
          last_rotated_at: null,
          expires_at: null,
          created_by: "user-admin",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }
      return { secrets: mockSecrets() };
    },
  },

  // ── Approvals ──────────────────────────────────────────────────────────────────
  {
    pattern: /^\/approvals\/([^/]+)\/(approve|reject)$/,
    handler: (path) => {
      const id = path.split("/")[2];
      const action = path.split("/")[3];
      const base =
        mockApprovals().find((a) => a.id === id) ?? mockApprovals()[0];
      return {
        ...base,
        status: action === "approve" ? "approved" : "rejected",
        reviewed_by: "user-admin",
        reviewer_name: "Roberto Luna",
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    },
  },
  {
    pattern: /^\/approvals\/([^/]+)$/,
    handler: (path) => {
      const id = path.split("/")[2];
      return mockApprovals().find((a) => a.id === id) ?? mockApprovals()[0];
    },
  },
  {
    pattern: /^\/approvals$/,
    handler: (_path, options) => {
      if ((options.method ?? "GET").toUpperCase() === "POST") {
        return {
          id: `approval-new-${Date.now()}`,
          title: "New approval request",
          description: null,
          status: "pending",
          requester_id: "user-admin",
          requester_name: "Roberto Luna",
          reviewer_id: null,
          reviewer_name: null,
          entity_type: null,
          entity_id: null,
          comment: null,
          expires_at: null,
          reviewed_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }
      return { approvals: mockApprovals() };
    },
  },

  // ── Organizations ──────────────────────────────────────────────────────────────
  {
    pattern: /^\/organizations\/([^/]+)\/members$/,
    handler: (path) => {
      const id = path.split("/")[2];
      return { members: mockOrgMembers(id) };
    },
  },
  {
    pattern: /^\/organizations\/([^/]+)$/,
    handler: (path, options) => {
      const id = path.split("/")[2];
      if ((options.method ?? "GET").toUpperCase() === "DELETE")
        return undefined;
      return (
        mockOrganizations().find((o) => o.id === id) ?? mockOrganizations()[0]
      );
    },
  },
  {
    pattern: /^\/organizations$/,
    handler: (_path, options) => {
      if ((options.method ?? "GET").toUpperCase() === "POST") {
        return {
          id: `org-new-${Date.now()}`,
          name: "New Org",
          slug: "new-org",
          description: null,
          avatar_url: null,
          plan: "free",
          member_count: 1,
          agent_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }
      return { organizations: mockOrganizations() };
    },
  },

  // ── Labels ─────────────────────────────────────────────────────────────────────
  {
    pattern: /^\/labels\/([^/]+)$/,
    handler: (path, options) => {
      const id = path.split("/")[2];
      if ((options.method ?? "GET").toUpperCase() === "DELETE")
        return undefined;
      return mockLabels().find((l) => l.id === id) ?? mockLabels()[0];
    },
  },
  {
    pattern: /^\/labels$/,
    handler: (_path, options) => {
      if ((options.method ?? "GET").toUpperCase() === "POST") {
        return {
          id: `label-new-${Date.now()}`,
          name: "new-label",
          color: "#3b82f6",
          description: null,
          project_id: null,
          issue_count: 0,
          created_at: new Date().toISOString(),
        };
      }
      return { labels: mockLabels() };
    },
  },

  // ── Plugins ────────────────────────────────────────────────────────────────────
  {
    pattern: /^\/plugins\/([^/]+)\/logs$/,
    handler: (path) => {
      const id = path.split("/")[2];
      return { logs: mockPluginLogs(id) };
    },
  },
  {
    pattern: /^\/plugins\/([^/]+)$/,
    handler: (path, options) => {
      const id = path.split("/")[2];
      if ((options.method ?? "GET").toUpperCase() === "DELETE")
        return undefined;
      return mockPlugins().find((p) => p.id === id) ?? mockPlugins()[0];
    },
  },
  {
    pattern: /^\/plugins$/,
    handler: (_path, options) => {
      if ((options.method ?? "GET").toUpperCase() === "POST") {
        return {
          id: `plugin-new-${Date.now()}`,
          name: "New Plugin",
          description: "",
          version: "1.0.0",
          author: "MIOSA",
          status: "inactive",
          enabled: false,
          config: {},
          capabilities: [],
          installed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }
      return { plugins: mockPlugins() };
    },
  },

  // ── Access / Role Assignments ──────────────────────────────────────────────────
  {
    pattern: /^\/access\/([^/]+)$/,
    handler: (_path, options) => {
      if ((options.method ?? "GET").toUpperCase() === "DELETE")
        return undefined;
      return {
        id: "ra-1",
        user_id: "user-admin",
        role: "admin",
        scope: "global",
      };
    },
  },
  {
    pattern: /^\/access(\/assign)?$/,
    handler: (_path, options) => {
      if ((options.method ?? "GET").toUpperCase() === "POST") {
        return {
          id: `ra-new-${Date.now()}`,
          user_id: "user-admin",
          role: "admin",
          scope: "global",
          created_at: new Date().toISOString(),
        };
      }
      return {
        assignments: [
          {
            id: "ra-1",
            user_id: "user-admin",
            user_name: "Roberto Luna",
            role: "admin",
            scope: "global",
            resource_type: null,
            resource_id: null,
            created_at: "2026-01-01T00:00:00Z",
          },
          {
            id: "ra-2",
            user_id: "user-dev",
            user_name: "Dev User",
            role: "member",
            scope: "workspace",
            resource_type: "workspace",
            resource_id: "ws-osa-dev",
            created_at: "2026-01-15T00:00:00Z",
          },
        ],
      };
    },
  },

  // ── Sidebar Badges ─────────────────────────────────────────────────────────────
  {
    pattern: /^\/sidebar-badges$/,
    handler: () => ({
      inbox: 3,
      issues: 2,
      approvals: 1,
      sessions: 0,
      agents: 0,
    }),
  },

  // ── Session message send ───────────────────────────────────────────────────────
  {
    pattern: /^\/sessions\/([^/]+)\/message$/,
    handler: (path) => {
      const sessionId = path.split("/")[2];
      return {
        stream_id: `stream-${Date.now()}`,
        session_id: sessionId,
      };
    },
  },
];

// ── Request handler ────────────────────────────────────────────────────────────

export async function handleRequest<T>(
  path: string,
  _options: RequestInit,
): Promise<T> {
  await delay();

  // Strip query params for matching
  const cleanPath = path.split("?")[0];

  for (const route of routes) {
    if (route.pattern.test(cleanPath)) {
      return route.handler(cleanPath, _options, path) as T;
    }
  }

  // Default: return empty object
  console.warn(`[mock] No handler for ${path}, returning empty`);
  return {} as T;
}
