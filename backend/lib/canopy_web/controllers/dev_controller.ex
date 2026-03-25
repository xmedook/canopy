defmodule CanopyWeb.DevController do
  @moduledoc "Temporary dev-only controller for DB reset. Remove before production."
  use CanopyWeb, :controller
  alias Canopy.Repo

  def reset(conn, _params) do
    tables = ~w(
      audit_events
      activity_events
      cost_events
      budget_incidents
      schedules
      memory_entries
      work_products
      sessions
      issues
      projects
      goals
      skills
      agents
      team_memberships
      teams
      departments
      divisions
      workspaces
      organization_memberships
      organizations
      users
    )

    Enum.each(tables, fn table ->
      try do
        Repo.query!("TRUNCATE TABLE #{table} CASCADE", [])
      rescue
        _ -> :ok
      end
    end)

    conn
    |> put_status(200)
    |> json(%{ok: true, message: "Database cleared. All tables truncated."})
  end
end
