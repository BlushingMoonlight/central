// Central — service worker. Guarda o "shell" do app (HTML, CSS, JS, ícones) para abrir sem internet, sempre buscando
// primeiro na rede. NUNCA guarda as respostas da API (que são POST, em outro endereço). Recebe o push e abre a Conversa.
const CACHE = 'central-shell-1';
const SHELL = ['./', 'index.html', 'config.js', 'manifest.webmanifest', 'assets/design/tokens.css', 'assets/design/componentes.css',
  'app/main.js', 'app/api.js', 'app/ui.js', 'app/fila.js', 'app/midia.js', 'app/conversa.js', 'app/captura.js', 'app/entrada.js',
  'app/vida.js', 'app/agenda.js', 'app/financas.js', 'app/pessoas.js', 'app/ajustes.js', 'app/painel.js',
  'app/icones/icone.svg', 'app/icones/icone-192.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((l) => Promise.all(l.filter((n) => n !== CACHE).map((n) => caches.delete(n)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const r = e.request;
  const url = new URL(r.url);
  // Só o shell, do mesmo endereço e por GET. A API e a demonstração (app/demo.js) nunca entram no cache.
  if (r.method !== 'GET' || url.origin !== location.origin || url.pathname.endsWith('/app/demo.js')) return;
  e.respondWith(fetch(r).then((resp) => {
    if (resp.ok) { const copia = resp.clone(); caches.open(CACHE).then((c) => c.put(r, copia)); }
    return resp;
  }).catch(() => caches.match(r, { ignoreSearch: true }).then((m) => m || caches.match('index.html'))));
});

// O push: "Nova mensagem" na tela bloqueada, ou o começo da mensagem dela se o aviso trouxer o texto (Avisos, AJ1).
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = {}; }
  const titulo = d.texto ? 'Pepper' : 'Nova mensagem';
  e.waitUntil(self.registration.showNotification(titulo, {
    body: d.texto || '', icon: 'app/icones/icone-192.png', badge: 'app/icones/icone-192.png', tag: 'central-conversa', data: { url: '/#CV' },
  }));
});

// Tocar no aviso abre a Conversa (ou traz para a frente a janela que já estiver aberta).
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((janelas) => {
    for (const j of janelas) if ('focus' in j) { j.navigate('/#CV').catch(() => {}); return j.focus(); }
    return self.clients.openWindow('/#CV');
  }));
});
