// Painel CVH · service worker: só notificações (não guarda páginas em cache, para nunca mostrar versão velha)
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('push', (e) => {
  let m = {}; try { m = e.data ? e.data.json() : {}; } catch (_) { m = { titulo: 'CVH', corpo: e.data ? e.data.text() : '' }; }
  const crit = m.nivel === 'critico';
  e.waitUntil((async () => {
    const abertos = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    abertos.forEach((c) => c.postMessage({ tipo: 'cvh-notificacao', m }));
    const ic = /motoboy/.test(m.url || '') ? 'motoboy-192.png' : /intensivet/.test(m.url || '') ? 'estacao-recepcao-192.png' : 'painel-192.png';
    await self.registration.showNotification((crit ? 'URGENTE · ' : '') + (m.titulo || 'CVH'), {
      body: m.corpo || '', icon: ic, badge: ic, tag: 'cvh-' + (m.id || Date.now()), renotify: true,
      requireInteraction: crit, vibrate: crit ? [600, 200, 600, 200, 600, 200, 900] : [120, 80, 120], data: { url: m.url || 'painel.html' },
    });
    await marcarIcone();
  })());
});
// número vermelho no ícone do app: quantos avisos ainda estão na central de notificações
async function marcarIcone() {
  try { const n = (await self.registration.getNotifications()).length; if (self.navigator.setAppBadge) { if (n) await self.navigator.setAppBadge(n); else await self.navigator.clearAppBadge(); } } catch (_) { try { await self.navigator.setAppBadge(); } catch (__) {} }
}
self.addEventListener('notificationclose', (e) => e.waitUntil(marcarIcone()));
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil((async () => {
    await marcarIcone();
    const abertos = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const pag = String((e.notification.data || {}).url || 'painel.html').replace(/[?#].*$/, '');
    for (const c of abertos) if (c.url.indexOf(pag) >= 0) { await c.focus(); return; }
    await self.clients.openWindow(new URL((e.notification.data || {}).url || 'painel.html', self.registration.scope).href);
  })());
});
