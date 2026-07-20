// Service worker da Fazenda Santos.
//
// Tres objetivos ao mesmo tempo:
//  1. Abrir e navegar sem internet (campo do Antonio)
//  2. Atualizar sozinho quando sai versao nova (ninguem reinstala nada)
//  3. Abrir rapido mesmo com sinal fraco de zona rural
//
// Como: a "porta de entrada" (index.html) e buscada na REDE PRIMEIRO — e ela
// que aponta pra versao nova. Ja os arquivos do app (/assets/) tem um codigo
// unico no nome que muda a cada versao, entao podem vir do CACHE PRIMEIRO:
// abertura instantanea e zero risco de ficarem velhos (versao nova = nome
// novo = baixa da rede na primeira vez).
const CACHE = 'fazenda-santos-v3'
const BASICOS = ['/', '/manifest.json', '/icon-192.png', '/icon-512.png']

self.addEventListener('install', (evento) => {
  evento.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(BASICOS)))
  self.skipWaiting() // assume no lugar do worker antigo imediatamente
})

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((chaves) => Promise.all(chaves.filter((c) => c !== CACHE).map((c) => caches.delete(c))))
      .then(() => self.clients.claim())
  )
})

function guardarCopia(requisicao, resposta) {
  const copia = resposta.clone()
  caches.open(CACHE).then((cache) => cache.put(requisicao, copia))
}

self.addEventListener('fetch', (evento) => {
  const requisicao = evento.request
  const url = new URL(requisicao.url)

  if (requisicao.method !== 'GET') return
  if (url.origin !== self.location.origin) return // Supabase/backend nunca passam por aqui

  // Porta de entrada: rede primeiro (garante versao nova), cache como reserva
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

  // Arquivos com codigo de versao no nome: cache primeiro (rapido e seguro)
  if (url.pathname.startsWith('/assets/')) {
    evento.respondWith(
      caches.match(requisicao).then((guardado) => {
        if (guardado) return guardado
        return fetch(requisicao).then((resposta) => {
          guardarCopia(requisicao, resposta)
          return resposta
        })
      })
    )
    return
  }

  // O resto (manifest, icones): rede primeiro com reserva no cache
  evento.respondWith(
    fetch(requisicao)
      .then((resposta) => {
        guardarCopia(requisicao, resposta)
        return resposta
      })
      .catch(() => caches.match(requisicao))
  )
})