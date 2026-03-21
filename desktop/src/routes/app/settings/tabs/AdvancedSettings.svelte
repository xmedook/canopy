<!-- src/routes/app/settings/tabs/AdvancedSettings.svelte -->
<script lang="ts">
  import { settingsStore } from '$lib/stores/settings.svelte';
  import { themeStore } from '$lib/stores/theme.svelte';
  import { toastStore } from '$lib/stores/toasts.svelte';
  import { clearCache } from '$api/client';

  function handleClearCache() {
    clearCache();
    toastStore.success('Cache cleared');
  }

  function handleResetDefaults() {
    settingsStore.update('theme', 'dark');
    settingsStore.update('font_size', 14);
    settingsStore.update('sidebar_default_collapsed', false);
    settingsStore.update('notifications_enabled', true);
    settingsStore.update('auto_approve_budget_under_cents', 500);
    settingsStore.update('default_adapter', 'osa');
    settingsStore.update('default_model', 'claude-sonnet-4-6');
    settingsStore.update('working_directory', '');
    themeStore.setMode('dark');
    toastStore.info('Settings reset to defaults');
  }

  function handleExportConfig() {
    const blob = new Blob([JSON.stringify(settingsStore.data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'canopy-settings.json';
    a.click();
    URL.revokeObjectURL(url);
    toastStore.success('Settings exported');
  }

  function handleImportConfig(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        const keys = Object.keys(settingsStore.data) as (keyof typeof settingsStore.data)[];
        for (const key of keys) {
          if (key in parsed) {
            settingsStore.update(key, (parsed as typeof settingsStore.data)[key]);
          }
        }
        toastStore.success('Settings imported');
      } catch {
        toastStore.error('Import failed', 'Invalid settings file');
      }
    };
    reader.readAsText(file);
    input.value = '';
  }
</script>

<section class="stg-section">
  <h2 class="stg-section-title">Advanced</h2>

  <div class="stg-card">
    <div class="stg-field">
      <span class="stg-label">API Response Cache</span>
      <p class="stg-desc">Clear the in-memory response cache. Data will be re-fetched from the backend on next load.</p>
      <button class="stg-btn stg-btn--ghost" onclick={handleClearCache}>
        Clear Cache
      </button>
    </div>

    <div class="stg-sep"></div>

    <div class="stg-field">
      <span class="stg-label">Reset to Defaults</span>
      <p class="stg-desc">Restore all settings to their factory defaults. This does not affect agent configurations.</p>
      <button class="stg-btn stg-btn--danger" onclick={handleResetDefaults}>
        Reset to Defaults
      </button>
    </div>

    <div class="stg-sep"></div>

    <div class="stg-field">
      <span class="stg-label">Export Configuration</span>
      <p class="stg-desc">Download current settings as a JSON file for backup or migration.</p>
      <button class="stg-btn stg-btn--ghost" onclick={handleExportConfig}>
        Export Config
      </button>
    </div>

    <div class="stg-sep"></div>

    <div class="stg-field">
      <span class="stg-label">Import Configuration</span>
      <p class="stg-desc">Upload a previously exported settings JSON file to restore a configuration.</p>
      <label class="stg-btn stg-btn--ghost stg-file-label" aria-label="Import configuration file">
        Import Config
        <input type="file" accept=".json" class="stg-file-input" onchange={handleImportConfig} />
      </label>
    </div>
  </div>
</section>

<style>
  .stg-section { max-width: 640px; }

  .stg-section-title {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 4px;
  }

  .stg-card {
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    padding: 4px 0;
    margin-top: 16px;
  }

  .stg-sep {
    height: 1px;
    background: var(--border-default);
    margin: 0;
  }

  .stg-field {
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .stg-label {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .stg-desc {
    font-size: 12px;
    color: var(--text-tertiary);
    line-height: 1.5;
  }

  .stg-btn {
    display: inline-flex;
    align-items: center;
    padding: 7px 14px;
    font-size: 13px;
    font-weight: 500;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: background var(--transition-fast), border-color var(--transition-fast);
    border: 1px solid;
    align-self: flex-start;
  }

  .stg-btn--ghost {
    color: var(--text-primary);
    background: var(--bg-elevated);
    border-color: var(--border-default);
  }

  .stg-btn--ghost:hover {
    background: var(--bg-tertiary);
    border-color: var(--border-hover);
  }

  .stg-btn--danger {
    color: var(--accent-error);
    background: rgba(239, 68, 68, 0.08);
    border-color: rgba(239, 68, 68, 0.2);
  }

  .stg-btn--danger:hover {
    background: rgba(239, 68, 68, 0.15);
    border-color: rgba(239, 68, 68, 0.35);
  }

  .stg-file-label {
    position: relative;
    cursor: pointer;
  }

  .stg-file-input {
    position: absolute;
    inset: 0;
    opacity: 0;
    width: 100%;
    height: 100%;
    cursor: pointer;
  }
</style>
