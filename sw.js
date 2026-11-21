const CACHE_NAME = "tetris-webapp01-v2";
const USER_STATS_CACHE = "tetris-user-stats-v1";
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
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== USER_STATS_CACHE)
          .map((k) => caches.delete(k))
      )
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

function localIsoDate(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function readUserStats() {
  try {
    const cache = await caches.open(USER_STATS_CACHE);
    const res = await cache.match("./user-stats.json");
    if (res) return await res.json();
  } catch (_) {}
  return { dailyScores: {}, best: 0 };
}

function buildScoreBasedNotice(stats, fallbackNotice) {
  const today = localIsoDate(0);
  const yesterday = localIsoDate(-1);
  const scores = (stats && stats.dailyScores) || {};
  const fmt = (n) => Number(n).toLocaleString("ko-KR");

  if (scores[yesterday] > 0) {
    const prev = scores[yesterday];
    const target = Math.ceil(prev * 1.2);
    return {
      date: today,
      title: `🧱 오늘의 테트리스 목표: ${fmt(target)}점 (+20%)`,
      body: `어제 점수 ${fmt(prev)}점에서 20% 올려야 합니다! 오늘은 ${fmt(target)}점에 도전해 보세요.`,
    };
  }

  // 어제 기록이 없으면 가장 최근 이전 기록(또는 최고 점수) 기준 +20%
  const prevDates = Object.keys(scores).filter((d) => d < today && scores[d] > 0).sort();
  if (prevDates.length > 0) {
    const lastDate = prevDates[prevDates.length - 1];
    const prev = scores[lastDate];
    const target = Math.ceil(prev * 1.2);
    return {
      date: today,
      title: `🧱 오늘의 테트리스 목표: ${fmt(target)}점 (+20%)`,
      body: `최근 기록(${lastDate}, ${fmt(prev)}점)에서 20% 올려야 합니다! 오늘은 ${fmt(target)}점에 도전해 보세요.`,
    };
  }

  if (stats && stats.best > 0) {
    const prev = stats.best;
    const target = Math.ceil(prev * 1.2);
    return {
      date: today,
      title: `🧱 오늘의 테트리스 목표: ${fmt(target)}점 (+20%)`,
      body: `현재 최고 점수 ${fmt(prev)}점에서 20% 올려서 ${fmt(target)}점에 도전해 보세요!`,
    };
  }

  return {
    date: (fallbackNotice && fallbackNotice.date) || today,
    title: (fallbackNotice && fallbackNotice.title) || "🧱 오늘의 테트리스 첫 도전!",
    body: "오늘 첫 점수를 기록하면 내일부터 어제 점수보다 20% 높은 목표 알림을 보내드립니다.",
  };
}

async function showDailyNotification(customPayload = null) {
  let payload = customPayload;
  if (!payload) {
    let fallbackNotice = null;
    try {
      const res = await fetch("./data/daily_notice.json", { cache: "no-store" });
      if (res.ok) fallbackNotice = await res.json();
    } catch (_) {}
    const stats = await readUserStats();
    payload = buildScoreBasedNotice(stats, fallbackNotice);
  }
  const title = payload.title || "🧱 오늘의 테트리스 한 판!";
  const body = payload.body || "어제 점수보다 20% 높은 점수에 도전해 보세요!";
  const tag = "daily-tetris-" + (payload.date || localIsoDate(0));

  await self.registration.showNotification(title, {
    body,
    tag,
    renotify: false,
    badge: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 96 96'><text y='.85em' font-size='80'>🧱</text></svg>",
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 192 192'><rect width='192' height='192' rx='36' fill='%230f172a'/><text x='96' y='132' font-size='110' text-anchor='middle'>🧱</text></svg>",
    data: { url: "./index.html" },
  });
}

self.addEventListener("periodicsync", (event) => {
  if (event.tag === "daily-tetris-reminder") {
    event.waitUntil(showDailyNotification());
  }
});

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
