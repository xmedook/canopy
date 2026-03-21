import type { User } from "../types";

const MOCK_USERS: User[] = [
  {
    id: "user-admin",
    email: "admin@canopy.dev",
    name: "Roberto Luna",
    role: "admin",
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "user-dev",
    email: "dev@canopy.dev",
    name: "Dev User",
    role: "member",
    created_at: "2026-01-01T00:00:00Z",
  },
];

export function mockUsers(): User[] {
  return MOCK_USERS;
}
