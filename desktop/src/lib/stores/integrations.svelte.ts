// src/lib/stores/integrations.svelte.ts
import type { Integration } from "$api/types";
import { integrations as integrationsApi } from "$api/client";
import { toastStore } from "./toasts.svelte";

class IntegrationsStore {
  integrations = $state<Integration[]>([]);
  loading = $state(false);
  error = $state<string | null>(null);

  totalCount = $derived(this.integrations.length);
  connectedCount = $derived(
    this.integrations.filter((i) => {
      if (i.status === "connected") return true;
      if ("connected" in i && (i as Record<string, unknown>).connected === true)
        return true;
      return false;
    }).length,
  );

  async fetchIntegrations(): Promise<void> {
    this.loading = true;
    try {
      this.integrations = await integrationsApi.list();
      this.error = null;
    } catch (e) {
      const msg = (e as Error).message;
      this.error = msg;
      toastStore.error("Failed to load integrations", msg);
    } finally {
      this.loading = false;
    }
  }

  async connect(slug: string, config?: Record<string, unknown>): Promise<void> {
    this.loading = true;
    try {
      await integrationsApi.connect(slug, config);
      await this.fetchIntegrations();
      this.error = null;
      toastStore.success("Integration connected", slug);
    } catch (e) {
      const msg = (e as Error).message;
      this.error = msg;
      toastStore.error("Failed to connect integration", msg);
    } finally {
      this.loading = false;
    }
  }

  async disconnect(slug: string): Promise<void> {
    this.loading = true;
    try {
      await integrationsApi.disconnect(slug);
      await this.fetchIntegrations();
      this.error = null;
      toastStore.success("Integration disconnected", slug);
    } catch (e) {
      const msg = (e as Error).message;
      this.error = msg;
      toastStore.error("Failed to disconnect integration", msg);
    } finally {
      this.loading = false;
    }
  }
}

export const integrationsStore = new IntegrationsStore();
