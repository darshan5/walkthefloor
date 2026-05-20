"use client";

import { useEffect, useState } from "react";
import { WifiOff, RefreshCw } from "lucide-react";
import { syncOfflineQueue, getOfflineQueue } from "@/lib/offline-queue";
import { toast } from "sonner";

export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false);
  const [queueCount, setQueueCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    setIsOffline(!navigator.onLine);
    setQueueCount(getOfflineQueue().length);

    function handleOnline() {
      setIsOffline(false);
      handleSync();
    }

    function handleOffline() {
      setIsOffline(true);
    }

    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "REQUEST_OFFLINE_SYNC") {
        handleSync();
      }
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    navigator.serviceWorker?.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      navigator.serviceWorker?.removeEventListener("message", handleMessage);
    };
  }, []);

  async function handleSync() {
    const queue = getOfflineQueue();
    if (queue.length === 0) return;

    setSyncing(true);
    const result = await syncOfflineQueue();
    setSyncing(false);
    setQueueCount(getOfflineQueue().length);

    if (result.synced > 0) {
      toast.success(`Synced ${result.synced} offline item${result.synced > 1 ? "s" : ""}`);
    }
    if (result.failed > 0) {
      toast.error(`${result.failed} item${result.failed > 1 ? "s" : ""} failed to sync`);
    }
  }

  if (!isOffline && queueCount === 0) return null;

  return (
    <div className="fixed top-14 left-0 right-0 z-50 flex items-center justify-center gap-2 bg-amber-500 px-3 py-1.5 text-xs text-white md:left-60">
      {isOffline ? (
        <>
          <WifiOff className="h-3.5 w-3.5" />
          <span>You&apos;re offline — changes will sync when reconnected</span>
          {queueCount > 0 && <span>({queueCount} pending)</span>}
        </>
      ) : (
        <>
          <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
          <span>{syncing ? "Syncing..." : `${queueCount} item${queueCount > 1 ? "s" : ""} pending sync`}</span>
          {!syncing && (
            <button onClick={handleSync} className="underline ml-1">Sync now</button>
          )}
        </>
      )}
    </div>
  );
}
