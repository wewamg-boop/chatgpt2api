

import { useEffect, useRef } from "react";

import { ConfigCard } from "./config-card";
import { CPAPoolDialog } from "./cpa-pool-dialog";
import { CPAPoolsCard } from "./cpa-pools-card";
import { ImportBrowserDialog } from "./import-browser-dialog";
import { SettingsHeader } from "./settings-header";
import { Sub2APIConnections } from "./sub2api-connections";
import { useSettingsStore } from "./settings-store";

function SettingsDataController() {
  const didLoadRef = useRef(false);
  const initialize = useSettingsStore((state: { initialize: () => Promise<void> }) => state.initialize);
  const loadPools = useSettingsStore((state: { loadPools: (silent?: boolean) => Promise<void> }) => state.loadPools);
  const pools = useSettingsStore((state: { pools: Array<{ import_job?: { status: string } | null }> }) => state.pools);

  useEffect(() => {
    if (didLoadRef.current) {
      return;
    }
    didLoadRef.current = true;
    void initialize();
  }, [initialize]);

  useEffect(() => {
    const hasRunningJobs = pools.some((pool: { import_job?: { status: string } | null }) => {
      const status = pool.import_job?.status;
      return status === "pending" || status === "running";
    });
    if (!hasRunningJobs) {
      return;
    }

    const timer = window.setInterval(() => {
      void loadPools(true);
    }, 1500);
    return () => window.clearInterval(timer);
  }, [loadPools, pools]);

  return null;
}

export default function SettingsPage() {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-white dark:bg-gray-950">
      <SettingsDataController />
      <SettingsHeader />
      <section className="space-y-6 max-w-4xl mx-auto px-4 py-6">
        <ConfigCard />
        <CPAPoolsCard />
        <Sub2APIConnections />
      </section>
      <CPAPoolDialog />
      <ImportBrowserDialog />
    </div>
  );
}
