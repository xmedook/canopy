defmodule CanopyWeb.Plugs.Auth do
  @moduledoc "JWT authentication plug."
  import Plug.Conn
  import Phoenix.Controller, only: [json: 2]

  def init(opts), do: opts

  def call(conn, _opts) do
    token = extract_token(conn)

    case token do
      nil ->
        conn
        |> put_status(401)
        |> json(%{error: "unauthorized", code: "INVALID_TOKEN"})
        |> halt()

      "cnpy_" <> _ = raw ->
        authenticate_api_token(conn, raw)

      token ->
        with {:ok, claims} <- Canopy.Guardian.decode_and_verify(token),
             {:ok, user} <- Canopy.Guardian.resource_from_claims(claims) do
          conn
          |> assign(:current_user, user)
          |> assign(:claims, claims)
        else
          _ ->
            conn
            |> put_status(401)
            |> json(%{error: "unauthorized", code: "INVALID_TOKEN"})
            |> halt()
        end
    end
  end

  defp authenticate_api_token(conn, raw) do
    import Ecto.Query
    hash = Canopy.Schemas.ApiToken.verify(raw)
    now = DateTime.utc_now()

    case Canopy.Repo.one(
      from t in Canopy.Schemas.ApiToken,
        where: t.token_hash == ^hash and (is_nil(t.expires_at) or t.expires_at > ^now),
        preload: [:user]
    ) do
      nil ->
        conn
        |> put_status(401)
        |> json(%{error: "unauthorized", code: "INVALID_TOKEN"})
        |> halt()

      api_token ->
        # Update last_used_at async (non-blocking)
        spawn(fn ->
          Canopy.Repo.update_all(
            from(t in Canopy.Schemas.ApiToken, where: t.id == ^api_token.id),
            set: [last_used_at: DateTime.truncate(now, :second)]
          )
        end)

        conn
        |> assign(:current_user, api_token.user)
        |> assign(:claims, %{"role" => api_token.user.role})
    end
  end

  defp extract_token(conn) do
    case get_req_header(conn, "authorization") do
      ["Bearer " <> token] ->
        token

      _ ->
        # Fallback: query param token for SSE streaming routes only
        if is_streaming_request?(conn) do
          conn.params["token"]
        else
          nil
        end
    end
  end

  defp is_streaming_request?(conn) do
    path = conn.request_path || ""
    accept = get_req_header(conn, "accept") |> List.first() || ""
    String.contains?(path, "/stream") or String.contains?(accept, "text/event-stream")
  end
end
