"use client";

const QUEUE_KEY = "wtf_offline_queue";

type QueuedRequest = {
  id: string;
  url: string;
  method: string;
  body: any;
  timestamp: number;
};

export function addToOfflineQueue(url: string, method: string, body: any) {
  const queue = getOfflineQueue();
  queue.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    url,
    method,
    body,
    timestamp: Date.now(),
  });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function getOfflineQueue(): QueuedRequest[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function clearOfflineQueue() {
  localStorage.removeItem(QUEUE_KEY);
}

export async function syncOfflineQueue(): Promise<{ synced: number; failed: number }> {
  const queue = getOfflineQueue();
  if (queue.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;
  const remaining: QueuedRequest[] = [];

  for (const req of queue) {
    try {
      const res = await fetch(req.url, {
        method: req.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body),
      });
      if (res.ok) {
        synced++;
      } else {
        failed++;
        remaining.push(req);
      }
    } catch {
      failed++;
      remaining.push(req);
    }
  }

  localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
  return { synced, failed };
}
