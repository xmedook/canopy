defmodule CanopyWeb.DashboardController do
  use CanopyWeb, :controller

  alias Canopy.Repo
  alias Canopy.Schemas.{Agent, Session, ActivityEvent, Issue, BudgetPolicy}
  import Ecto.Query

  def show(conn, _params) do
    agents = Repo.all(from a in Agent, select: %{status: a.status, id: a.id})
    active_count = Enum.count(agents, &(&1.status in ["active", "working"]))
    total_count = length(agents)

    live_runs =
      Repo.all(
        from s in Session,
          where: s.status == "active",
          join: a in Agent,
          on: s.agent_id == a.id,
          select: %{
            id: s.id,
            agent_id: a.id,
            agent_name: a.name,
            model: s.model,
            started_at: s.started_at,
            tokens_input: s.tokens_input,
            tokens_output: s.tokens_output,
            cost_cents: s.cost_cents
          },
          limit: 20,
          order_by: [desc: s.started_at]
      )

    recent_activity =
      Repo.all(
        from e in ActivityEvent,
          left_join: a in Agent,
          on: e.agent_id == a.id,
          order_by: [desc: e.inserted_at],
          limit: 20,
          select: %{
            id: e.id,
            type: e.event_type,
            agent_id: e.agent_id,
            agent_name: a.name,
            title: e.message,
            detail: e.message,
            level: e.level,
            metadata: e.metadata,
            created_at: e.inserted_at
          }
      )

    today = Date.utc_today()
    beginning_of_day = DateTime.new!(today, ~T[00:00:00], "Etc/UTC")
    beginning_of_week =
      DateTime.new!(Date.add(today, -Date.day_of_week(today) + 1), ~T[00:00:00], "Etc/UTC")
    beginning_of_month =
      DateTime.new!(Date.new!(today.year, today.month, 1), ~T[00:00:00], "Etc/UTC")

    today_cost =
      Repo.one(
        from ce in Canopy.Schemas.CostEvent,
          where: ce.inserted_at >= ^beginning_of_day,
          select: coalesce(sum(ce.cost_cents), 0)
      ) || 0

    week_cost =
      Repo.one(
        from ce in Canopy.Schemas.CostEvent,
          where: ce.inserted_at >= ^beginning_of_week,
          select: coalesce(sum(ce.cost_cents), 0)
      ) || 0

    month_cost =
      Repo.one(
        from ce in Canopy.Schemas.CostEvent,
          where: ce.inserted_at >= ^beginning_of_month,
          select: coalesce(sum(ce.cost_cents), 0)
      ) || 0

    open_issues = Repo.aggregate(from(i in Issue, where: i.status in ["backlog", "in_progress"]), :count)

    # Workspace-level budget policy for budget_remaining_pct. BudgetPolicy tracks
    # monthly limits only; daily_limit_cents is not yet in the schema.
    workspace_policy =
      Repo.one(
        from bp in BudgetPolicy,
          where: bp.scope_type == "workspace",
          limit: 1
      )

    {monthly_limit_cents, budget_remaining_pct} =
      case workspace_policy do
        nil ->
          {0, 100}

        %BudgetPolicy{monthly_limit_cents: limit} when limit > 0 ->
          used_pct = Float.round(month_cost / limit * 100, 1)
          remaining_pct = max(100.0 - used_pct, 0.0)
          {limit, remaining_pct}

        _ ->
          {0, 100}
      end

    memory_info = :erlang.memory()
    memory_mb = div(memory_info[:total], 1_048_576)

    json(conn, %{
      kpis: %{
        active_agents: active_count,
        total_agents: total_count,
        live_runs: length(live_runs),
        open_issues: open_issues,
        budget_remaining_pct: budget_remaining_pct
      },
      live_runs: live_runs,
      recent_activity: recent_activity,
      finance_summary: %{
        today_cents: today_cost,
        week_cents: week_cost,
        month_cents: month_cost,
        # daily_limit_cents: BudgetPolicy has no daily_limit_cents column yet
        daily_limit_cents: 0,
        monthly_limit_cents: monthly_limit_cents,
        # cache_savings_pct: no cache token tracking in CostEvent yet
        cache_savings_pct: 0
      },
      system_health: %{
        backend: "ok",
        primary_gateway: "anthropic",
        gateway_status: "ok",
        memory_mb: memory_mb,
        # cpu_pct: no system metrics collection yet
        cpu_pct: 0
      }
    })
  end
end
