const CACHE_NAME = "tetris-webapp01-v1";
const ASSETS = ["./", "./index.html", "./manifest.json", "./data/daily_notice.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

async function showDailyNotification(customPayload = null) {
  let payload = customPayload;
  if (!payload) {
    try {
      const res = await fetch("./data/daily_notice.json", { cache: "no-store" });
      if (res.ok) payload = await res.json();
    } catch (_) {}
  }
  const title = (payload && payload.title) || "🧱 오늘의 테트리스 한 판!";
  const body = (payload && payload.body) || "잠깐 머리를 식히며 최고 점수에 도전해 보세요.";
  const tag = "daily-tetris-" + ((payload && payload.date) || new Date().toISOString().slice(0, 10));

  await self.registration.showNotification(title, {
    body,
    tag,
    renotify: false,
    badge: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 96 96'><text y='.85em' font-size='80'>🧱</text></svg>",
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 192 192'><rect width='192' height='192' rx='36' fill='%230f172a'/><text x='96' y='132' font-size='110' text-anchor='middle'>🧱</text></svg>",
    data: { url: "./index.html" },
  });
}

// Periodic Background Sync (1일 1회 백그라운드 알림 — Chrome/Android PWA 지원)
self.addEventListener("periodicsync", (event) => {
  if (event.tag === "daily-tetris-reminder") {
    event.waitUntil(showDailyNotification());
  }
});

// In-app / Test notification trigger
self.addEventListener("message", (event) => {
  if (!event.data) return;
  if (event.data.type === "SHOW_DAILY_NOTICE") {
    event.waitUntil(showDailyNotification(event.data.payload || null));
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const c of clients) {
        if ("focus" in c) return c.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow("./index.html");
    })
  );
});
