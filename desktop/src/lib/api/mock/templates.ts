import type { AgentTemplate } from "../types";

const MOCK_TEMPLATES: AgentTemplate[] = [
  {
    id: "tmpl-fullstack",
    name: "Full-Stack Development Team",
    description:
      "A complete dev team setup with orchestrator, frontend, backend, reviewer, and devops agents. Includes code generation, PR review, and deployment skills.",
    adapter: "osa",
    model: "claude-opus-4-6",
    system_prompt: "",
    skills: ["skill-codegen", "skill-review", "skill-deploy", "skill-search"],
    config: {
      agents: {
        orchestrator: { adapter: "osa", model: "claude-opus-4-6" },
        frontend: { adapter: "claude_code", model: "claude-sonnet-4-6" },
        backend: { adapter: "claude_code", model: "claude-sonnet-4-6" },
        reviewer: { adapter: "claude_code", model: "claude-sonnet-4-6" },
        devops: { adapter: "bash" },
      },
      skills: {
        code_generation: { enabled: true },
        pr_review: { enabled: true },
        deployment: { enabled: false },
        web_search: { enabled: true },
      },
      schedules: {},
    },
    category: "development",
    downloads: 0,
    created_at: "2026-03-01T00:00:00Z",
  },
  {
    id: "tmpl-research",
    name: "Research Assistant",
    description:
      "A focused research team: one orchestrator coordinating a researcher and a writer. Optimised for document synthesis, literature review, and report generation.",
    adapter: "osa",
    model: "claude-opus-4-6",
    system_prompt: "",
    skills: ["skill-search"],
    config: {
      agents: {
        orchestrator: { adapter: "osa", model: "claude-opus-4-6" },
        researcher: { adapter: "claude_code", model: "claude-sonnet-4-6" },
        writer: { adapter: "claude_code", model: "claude-sonnet-4-6" },
      },
      skills: {
        web_search: { enabled: true },
      },
      schedules: {},
    },
    category: "research",
    downloads: 0,
    created_at: "2026-03-01T00:00:00Z",
  },
];

export function mockTemplates(): AgentTemplate[] {
  return MOCK_TEMPLATES;
}
