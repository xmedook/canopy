defmodule CanopyWeb.CostController do
  use CanopyWeb, :controller

  alias Canopy.Repo
  alias Canopy.Schemas.{CostEvent, Agent, BudgetPolicy}
  import Ecto.Query

  def summary(conn, _params) do
    today = Date.utc_today()
    beginning_of_today = DateTime.new!(today, ~T[00:00:00], "Etc/UTC")
    beginning_of_week = DateTime.new!(Date.add(today, -Date.day_of_week(today) + 1), ~T[00:00:00], "Etc/UTC")
    beginning_of_month = DateTime.new!(Date.new!(today.year, today.month, 1), ~T[00:00:00], "Etc/UTC")

    today_cost = cost_since(beginning_of_today)
    week_cost = cost_since(beginning_of_week)
    month_cost = cost_since(beginning_of_month)

    # Fetch the workspace-level budget policy (if one exists). BudgetPolicy has no
    # daily_limit_cents column — only monthly_limit_cents — so daily_budget_cents
    # is not yet tracked in the schema and remains 0.
    workspace_policy =
      Repo.one(
        from bp in BudgetPolicy,
          where: bp.scope_type == "workspace",
          limit: 1
      )

    monthly_budget_cents = if workspace_policy, do: workspace_policy.monthly_limit_cents, else: 0

    monthly_remaining_cents =
      if monthly_budget_cents > 0,
        do: max(monthly_budget_cents - month_cost, 0),
        else: 0

    top_agent =
      Repo.one(
        from ce in CostEvent,
          where: ce.inserted_at >= ^beginning_of_month,
          join: a in Agent,
          on: ce.agent_id == a.id,
          group_by: [a.id, a.name],
          order_by: [desc: sum(ce.cost_cents)],
          limit: 1,
          select: %{
            agent_id: a.id,
            agent_name: a.name,
            cost_cents: sum(ce.cost_cents)
          }
      )

    json(conn, %{
      today_cents: today_cost,
      week_cents: week_cost,
      month_cents: month_cost,
      # daily_budget_cents: BudgetPolicy has no daily_limit_cents column yet
      daily_budget_cents: 0,
      monthly_budget_cents: monthly_budget_cents,
      # daily_remaining_cents: no daily limit tracked yet
      daily_remaining_cents: 0,
      monthly_remaining_cents: monthly_remaining_cents,
      cache_savings_cents: 0,
      top_agent: top_agent
    })
  end

  def by_agent(conn, _params) do
    results =
      Repo.all(
        from ce in CostEvent,
          join: a in Agent,
          on: ce.agent_id == a.id,
          group_by: [a.id, a.name, a.adapter],
          order_by: [desc: sum(ce.cost_cents)],
          select: %{
            agent_id: a.id,
            agent_name: a.name,
            adapter: a.adapter,
            total_cents: sum(ce.cost_cents),
            total_input: sum(ce.tokens_input),
            total_output: sum(ce.tokens_output),
            event_count: count(ce.id)
          }
      )

    json(conn, %{agents: results})
  end

  def by_model(conn, _params) do
    results =
      Repo.all(
        from ce in CostEvent,
          group_by: ce.model,
          order_by: [desc: sum(ce.cost_cents)],
          select: %{
            model: ce.model,
            total_cents: sum(ce.cost_cents),
            total_input: sum(ce.tokens_input),
            total_output: sum(ce.tokens_output),
            event_count: count(ce.id)
          }
      )

    json(conn, %{models: results})
  end

  def daily(conn, _params) do
    thirty_days_ago = DateTime.utc_now() |> DateTime.add(-30, :day)

    results =
      Repo.all(
        from ce in CostEvent,
          where: ce.inserted_at >= ^thirty_days_ago,
          group_by: fragment("date_trunc('day', ?)", ce.inserted_at),
          order_by: fragment("date_trunc('day', ?)", ce.inserted_at),
          select: %{
            date: fragment("date_trunc('day', ?)", ce.inserted_at),
            total_cents: sum(ce.cost_cents),
            total_tokens: sum(ce.tokens_input) + sum(ce.tokens_output)
          }
      )

    json(conn, %{daily: results})
  end

  def events(conn, params) do
    limit = min(String.to_integer(params["limit"] || "50"), 200)
    offset = String.to_integer(params["offset"] || "0")

    events =
      Repo.all(
        from ce in CostEvent,
          join: a in Agent,
          on: ce.agent_id == a.id,
          order_by: [desc: ce.inserted_at],
          limit: ^limit,
          offset: ^offset,
          select: %{
            id: ce.id,
            agent_id: a.id,
            agent_name: a.name,
            model: ce.model,
            tokens_input: ce.tokens_input,
            tokens_output: ce.tokens_output,
            tokens_cache: ce.tokens_cache,
            cost_cents: ce.cost_cents,
            session_id: ce.session_id,
            inserted_at: ce.inserted_at
          }
      )

    json(conn, %{events: events})
  end

  defp cost_since(since) do
    Repo.one(
      from ce in CostEvent,
        where: ce.inserted_at >= ^since,
        select: coalesce(sum(ce.cost_cents), 0)
    ) || 0
  end
end
