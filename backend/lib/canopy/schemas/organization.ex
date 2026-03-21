defmodule Canopy.Schemas.Organization do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "organizations" do
    field :name, :string
    field :slug, :string
    field :logo_url, :string
    field :plan, :string, default: "free"
    field :settings, :map, default: %{}

    has_many :memberships, Canopy.Schemas.OrganizationMembership
    has_many :invitations, Canopy.Schemas.Invitation

    timestamps()
  end

  def changeset(organization, attrs) do
    organization
    |> cast(attrs, [:name, :slug, :logo_url, :plan, :settings])
    |> validate_required([:name, :slug])
    |> validate_format(:slug, ~r/^[a-z0-9-]+$/)
    |> unique_constraint(:slug)
  end
end
