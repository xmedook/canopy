defmodule CanopyWeb.WorkProductController do
  use CanopyWeb, :controller

  alias Canopy.Repo
  alias Canopy.Schemas.{WorkProduct, Issue}
  import Ecto.Query

  def index(conn, %{"issue_id" => issue_id}) do
    case Repo.get(Issue, issue_id) do
      nil ->
        conn |> put_status(404) |> json(%{error: "not_found"})

      _issue ->
        work_products =
          Repo.all(
            from w in WorkProduct,
              where: w.issue_id == ^issue_id,
              order_by: [desc: w.inserted_at]
          )

        json(conn, %{work_products: Enum.map(work_products, &serialize/1)})
    end
  end

  def create(conn, params) do
    changeset = WorkProduct.changeset(%WorkProduct{}, params)

    case Repo.insert(changeset) do
      {:ok, work_product} ->
        conn |> put_status(201) |> json(%{work_product: serialize(work_product)})

      {:error, cs} ->
        conn
        |> put_status(422)
        |> json(%{error: "validation_failed", details: format_errors(cs)})
    end
  end

  # --- Private helpers ---

  defp serialize(%WorkProduct{} = w) do
    %{
      id: w.id,
      title: w.title,
      product_type: w.product_type,
      content: w.content,
      metadata: w.metadata,
      issue_id: w.issue_id,
      session_id: w.session_id,
      agent_id: w.agent_id,
      workspace_id: w.workspace_id,
      created_at: w.inserted_at,
      inserted_at: w.inserted_at,
      updated_at: w.updated_at
    }
  end

  defp format_errors(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {msg, opts} ->
      Regex.replace(~r"%{(\w+)}", msg, fn _, key ->
        opts |> Keyword.get(String.to_existing_atom(key), key) |> to_string()
      end)
    end)
  end
end
