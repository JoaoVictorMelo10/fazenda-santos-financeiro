// Service worker da Fazenda Santos.
// Objetivo: o app abrir e navegar mesmo sem internet (campo do Antonio).
const CACHE = 'fazenda-santos-v2'
const BASICOS = ['/', '/manifest.json', '/icon-192.png', '/icon-512.png']

self.addEventListener('install', (evento) => {
  evento.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(BASICOS)))
  self.skipWaiting()
})

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys().then((chaves) =>
      Promise.all(chaves.filter((chave) => chave !== CACHE).map((chave) => caches.delete(chave)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (evento) => {
  const requisicao = evento.request
  const url = new URL(requisicao.url)

  if (requisicao.method !== 'GET') return
  if (url.origin !== self.location.origin) return // Supabase/backend nunca passam por aqui

  // Navegação (abrir o app, trocar de tela com refresh): rede primeiro,
  // e sem rede entrega o app guardado — o React Router assume a rota.
  if (requisicao.mode === 'navigate') {
    evento.respondWith(
      fetch(requisicao)
        .then((resposta) => {
          const copia = resposta.clone()
          caches.open(CACHE).then((cache) => cache.put('/', copia))
          return resposta
        })
        .catch(() => caches.match('/'))
    )
    return
  }

  // Arquivos do app (js/css/ícones): cache primeiro (os nomes têm hash,
  // então nunca ficam desatualizados), rede quando ainda não tem.
  evento.respondWith(
    caches.match(requisicao).then((guardado) => {
      if (guardado) return guardado
      return fetch(requisicao).then((resposta) => {
        const copia = resposta.clone()
        caches.open(CACHE).then((cache) => cache.put(requisicao, copia))
        return resposta
      })
    })
  )
})
