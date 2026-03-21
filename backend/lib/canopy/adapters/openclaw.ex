defmodule Canopy.Adapters.OpenClaw do
  @moduledoc """
  OpenClaw WebSocket adapter.

  **Status: stub placeholder (P2).**

  This adapter is not yet implemented. To implement it, establish a
  WebSocket connection to the OpenClaw server: authenticate using the
  OpenClaw API credentials in `config`, open a persistent session over
  the WebSocket transport, and stream `run.delta` events matching the
  `Canopy.Adapter` event shape.

  Calls to `execute_heartbeat/1` and `send_message/2` will fail with
  `run.failed` until a real implementation is provided.
  """

  @stub true

  @behaviour Canopy.Adapter

  @doc "Returns true — this adapter is a stub placeholder."
  def stub?, do: @stub

  @impl true
  def type, do: "openclaw"

  @impl true
  def name, do: "OpenClaw"

  @impl true
  def supports_session?, do: true

  @impl true
  def supports_concurrent?, do: false

  @impl true
  def capabilities, do: [:chat, :tools]

  @impl true
  def start(_config), do: {:ok, %{status: :placeholder}}

  @impl true
  def stop(_), do: :ok

  @impl true
  def execute_heartbeat(_params), do: stub_stream()

  @impl true
  def send_message(_session, _message), do: stub_stream()

  defp stub_stream do
    adapter_name = name()

    Stream.resource(
      fn -> :once end,
      fn
        :once ->
          {[
             %{
               event_type: "run.failed",
               data: %{
                 "error" => "#{adapter_name} adapter is a stub and has not been implemented",
                 "adapter" => type(),
                 "hint" =>
                   "Implement #{adapter_name} by connecting to the OpenClaw WebSocket API. See @moduledoc for details."
               },
               tokens: 0
             }
           ], :done}

        :done ->
          {:halt, :done}
      end,
      fn _ -> :ok end
    )
  end
end
