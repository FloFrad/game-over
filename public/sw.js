// Service worker : le jeu fonctionne hors connexion une fois ouvert une première fois en ligne.
//  - à l'installation : on met en cache la page, ses scripts, les sprites et les polices ;
//  - pages : réseau d'abord (on reçoit les mises à jour), cache en secours ;
//  - le reste : cache d'abord, rafraîchi en arrière-plan (les scripts du build ont un nom unique).
// Changer VERSION à chaque release : les anciens caches sont supprimés.

const VERSION = 'paulochon-v0.3';
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];
const SPRITES = ['hero', 'princess', 'gloumpf', 'ronchon-sleeping', 'potion-giant', 'potion-plume', 'sword', 'ghost', 'anvil', 'banana-peel', 'bird', 'skull'];
const STATIC = ['./', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', ...SPRITES.map((s) => `assets/svg/${s}.svg`)];

self.addEventListener('install', (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

async function precache() {
  const cache = await caches.open(VERSION);
  await Promise.all(STATIC.map((u) => cache.add(u).catch(() => undefined)));
  try {
    // Les scripts et styles du build (noms avec empreinte) sont listés dans la page elle-même
    const html = await (await fetch('./', { cache: 'reload' })).text();
    const local = [...html.matchAll(/(?:src|href)="(\.\/[^"]+)"/g)].map((m) => m[1]);
    await Promise.all(local.map((u) => cache.add(u).catch(() => undefined)));
    // Polices Google : la feuille de style, puis les fichiers de police qu'elle cite
    const sheets = [...html.matchAll(/href="(https:\/\/fonts\.googleapis\.com\/[^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, '&'));
    for (const url of sheets) {
      const res = await fetch(url);
      await cache.put(url, res.clone());
      const css = await res.text();
      const files = [...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)].map((m) => m[1]);
      await Promise.all(files.map((f) => cache.add(f).catch(() => undefined)));
    }
  } catch {
    /* hors connexion pendant l'installation : le cache se remplira à la prochaine visite */
  }
}

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  if (!sameOrigin && !FONT_HOSTS.includes(url.hostname)) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put('./', copy));
          return res;
        })
        .catch(() => caches.match('./').then((r) => r ?? Response.error())),
    );
    return;
  }

  event.respondWith(
    caches.open(VERSION).then(async (cache) => {
      const cached = await cache.match(req);
      const refresh = fetch(req)
        .then((res) => {
          if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
          return res;
        })
        .catch(() => undefined);
      return cached ?? (await refresh) ?? Response.error();
    }),
  );
});
