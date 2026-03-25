defmodule Canopy.Schemas.ApiToken do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "api_tokens" do
    field :name, :string
    field :token_hash, :string
    field :token_prefix, :string
    field :last_used_at, :utc_datetime
    field :expires_at, :utc_datetime

    belongs_to :user, Canopy.Schemas.User

    timestamps()
  end

  def changeset(token, attrs) do
    token
    |> cast(attrs, [:name, :token_hash, :token_prefix, :user_id, :expires_at])
    |> validate_required([:name, :token_hash, :token_prefix, :user_id])
  end

  @doc "Generate a new raw token and its hash. Returns {raw_token, prefix, hash}"
  def generate do
    raw = "cnpy_" <> Base.encode64(:crypto.strong_rand_bytes(32), padding: false)
    prefix = String.slice(raw, 0, 12)
    hash = Base.encode16(:crypto.hash(:sha256, raw), case: :lower)
    {raw, prefix, hash}
  end

  @doc "Verify a raw token against a stored hash"
  def verify(raw) do
    Base.encode16(:crypto.hash(:sha256, raw), case: :lower)
  end
end
