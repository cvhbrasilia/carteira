// Painel CVH · service worker: só notificações (não guarda páginas em cache, para nunca mostrar versão velha)
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('push', (e) => {
  let m = {}; try { m = e.data ? e.data.json() : {}; } catch (_) { m = { titulo: 'CVH', corpo: e.data ? e.data.text() : '' }; }
  const crit = m.nivel === 'critico';
  e.waitUntil((async () => {
    const abertos = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    abertos.forEach((c) => c.postMessage({ tipo: 'cvh-notificacao', m }));
    const ic = /motoboy/.test(m.url || '') ? 'motoboy-192.png' : /intensivet/.test(m.url || '') ? 'estacao-recepcao-192.png' : /^\/?(index\.html)?([?#]|$)/.test(m.url || 'painel') ? 'icone-192.png' : 'painel-192.png';
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
    // abre o assunto do aviso: com o app já aberto, pede para ele ir até lá; fechado, abre direto no módulo
    const url = new URL((e.notification.data || {}).url || 'painel.html', self.registration.scope).href, pag = url.replace(/[?#].*$/, '');
    for (const c of abertos) if (c.url.replace(/[?#].*$/, '') === pag) { c.postMessage({ tipo: 'cvh-abrir', url }); await c.focus(); return; }
    await self.clients.openWindow(url);
  })());
});

// Compartilhar do Android (painel instalado pelo Chrome): o PDF ou a foto do WhatsApp chega aqui, fica guardado no aparelho
// e o painel abre e manda para a caixa "Enviar ao CVH" da pessoa, a mesma do Atalho do iPhone
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'POST' || !/\/compartilhar$/.test(u.pathname)) return;
  e.respondWith((async () => {
    try {
      const f = await e.request.formData(), arqs = f.getAll('arquivo').filter((x) => x && typeof x === 'object' && x.size);
      const c = await caches.open('cvh-compartilhar');
      for (let i = 0; i < arqs.length; i++) {
        const a = arqs[i];
        await c.put('/compartilhado/' + Date.now() + '-' + i, new Response(a, { headers: { 'content-type': a.type || 'application/octet-stream', 'x-nome': encodeURIComponent(a.name || 'Exame') } }));
      }
    } catch (_) { /* segue para o painel, que avisa se nada chegou */ }
    return Response.redirect(new URL((u.searchParams.get('app') === 'dea' ? 'painel-dea.html' : 'painel.html') + '?compartilhado=1', self.registration.scope).href, 303);
  })());
});
