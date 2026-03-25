defmodule CanopyWeb.ApiTokenController do
  use CanopyWeb, :controller

  alias Canopy.Repo
  alias Canopy.Schemas.ApiToken
  import Ecto.Query

  # GET /api/v1/tokens — list user's tokens (never returns raw token)
  def index(conn, _params) do
    user = conn.assigns.current_user
    tokens = Repo.all(from t in ApiToken, where: t.user_id == ^user.id, order_by: [desc: t.inserted_at])

    json(conn, %{tokens: Enum.map(tokens, &serialize/1)})
  end

  # POST /api/v1/tokens — create a new token
  def create(conn, params) do
    user = conn.assigns.current_user
    name = params["name"] || "API Token"
    expires_at = parse_expires_at(params["expires_in_days"])

    {raw, prefix, hash} = ApiToken.generate()

    changeset = ApiToken.changeset(%ApiToken{}, %{
      name: name,
      token_hash: hash,
      token_prefix: prefix,
      user_id: user.id,
      expires_at: expires_at
    })

    case Repo.insert(changeset) do
      {:ok, token} ->
        # Return the raw token ONLY on creation — never again
        conn
        |> put_status(201)
        |> json(%{
          token: serialize(token),
          raw_token: raw,
          message: "Save this token now — it will not be shown again."
        })

      {:error, cs} ->
        conn
        |> put_status(422)
        |> json(%{error: "validation_failed", details: format_errors(cs)})
    end
  end

  # DELETE /api/v1/tokens/:id — revoke a token
  def delete(conn, %{"id" => id}) do
    user = conn.assigns.current_user

    case Repo.get_by(ApiToken, id: id, user_id: user.id) do
      nil ->
        conn |> put_status(404) |> json(%{error: "not_found"})

      token ->
        Repo.delete!(token)
        json(conn, %{ok: true})
    end
  end

  # --- Private helpers ---

  defp serialize(%ApiToken{} = t) do
    %{
      id: t.id,
      name: t.name,
      prefix: t.token_prefix,
      last_used_at: t.last_used_at,
      expires_at: t.expires_at,
      created_at: t.inserted_at
    }
  end

  defp parse_expires_at(nil), do: nil
  defp parse_expires_at(days) when is_integer(days) do
    DateTime.utc_now() |> DateTime.add(days * 86400, :second) |> DateTime.truncate(:second)
  end
  defp parse_expires_at(days) when is_binary(days) do
    case Integer.parse(days) do
      {d, _} -> parse_expires_at(d)
      :error -> nil
    end
  end

  defp format_errors(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {msg, opts} ->
      Regex.replace(~r"%{(\w+)}", msg, fn _, key ->
        opts |> Keyword.get(String.to_existing_atom(key), key) |> to_string()
      end)
    end)
  end
end
