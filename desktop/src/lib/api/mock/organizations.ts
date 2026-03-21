import type { Organization, OrganizationMembership } from "../types";

const MOCK_ORGANIZATIONS: Organization[] = [
  {
    id: "org-miosa",
    name: "MIOSA",
    slug: "miosa",
    description: "Optimal System Agent platform",
    avatar_url: null,
    plan: "enterprise",
    member_count: 1,
    agent_count: 6,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-03-21T00:00:00Z",
  },
];

const MOCK_ORG_MEMBERS: OrganizationMembership[] = [
  {
    id: "mem-1",
    organization_id: "org-miosa",
    user_id: "user-admin",
    user_name: "Roberto Luna",
    user_email: "admin@canopy.dev",
    role: "owner",
    joined_at: "2026-01-01T00:00:00Z",
  },
];

export function mockOrganizations(): Organization[] {
  return MOCK_ORGANIZATIONS;
}

export function mockOrgMembers(_orgId: string): OrganizationMembership[] {
  return MOCK_ORG_MEMBERS;
}
