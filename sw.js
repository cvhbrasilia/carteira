// Painel CVH · service worker: só notificações (não guarda páginas em cache, para nunca mostrar versão velha)
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('push', (e) => {
  let m = {}; try { m = e.data ? e.data.json() : {}; } catch (_) { m = { titulo: 'CVH', corpo: e.data ? e.data.text() : '' }; }
  const crit = m.nivel === 'critico';
  e.waitUntil((async () => {
    const abertos = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    abertos.forEach((c) => c.postMessage({ tipo: 'cvh-notificacao', m }));
    await self.registration.showNotification((crit ? 'URGENTE · ' : '') + (m.titulo || 'CVH'), {
      body: m.corpo || '', icon: 'painel-192.png', badge: 'painel-192.png', tag: 'cvh-' + (m.id || Date.now()), renotify: true,
      requireInteraction: crit, vibrate: crit ? [600, 200, 600, 200, 600, 200, 900] : [120, 80, 120], data: { url: m.url || 'painel.html' },
    });
  })());
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil((async () => {
    const abertos = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of abertos) if (/painel/.test(c.url)) { await c.focus(); return; }
    await self.clients.openWindow(new URL((e.notification.data || {}).url || 'painel.html', self.registration.scope).href);
  })());
});
