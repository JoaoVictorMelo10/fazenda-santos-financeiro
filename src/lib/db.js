import Dexie from 'dexie'

// IndexedDB local. As tabelas são filas: tudo que está aqui é pendente,
// e o registro é apagado da fila assim que o Supabase confirma.
// (Não usamos flag booleana como índice: IndexedDB não aceita boolean
// como chave de busca e isso derrubava o modo offline com DexieError.)
export const dbLocal = new Dexie('fazendaSantosLocal')

dbLocal.version(1).stores({
  custosPendentes: '++localId, sincronizado',
  vendasPendentes: '++localId, sincronizado',
})

// v2: remove o índice problemático; os registros existentes são mantidos.
dbLocal.version(2).stores({
  custosPendentes: '++localId',
  vendasPendentes: '++localId',
})

export async function salvarCustoOffline(registro) {
  return dbLocal.custosPendentes.add({ ...registro, tentativas: 0, ultimoErro: null })
}

export async function salvarVendaOffline(registro) {
  return dbLocal.vendasPendentes.add({ ...registro, tentativas: 0, ultimoErro: null })
}

export async function contarPendencias() {
  const custos = await dbLocal.custosPendentes.count()
  const vendas = await dbLocal.vendasPendentes.count()
  return custos + vendas
}

export async function listarPendencias() {
  const custos = await dbLocal.custosPendentes.toArray()
  const vendas = await dbLocal.vendasPendentes.toArray()
  return { custos, vendas }
}

export async function descartarPendencia(tipo, localId) {
  const tabela = tipo === 'custo' ? dbLocal.custosPendentes : dbLocal.vendasPendentes
  return tabela.delete(localId)
}

function montarPayload(item) {
  const payload = {}
  for (const chave of Object.keys(item)) {
    if (['localId', 'sincronizado', 'tentativas', 'ultimoErro', '_numero_ferro_pendente'].includes(chave)) continue
    payload[chave] = item[chave]
  }
  return payload
}

async function resolverAnimalId(supabase, payload, numeroFerroPendente) {
  if (!numeroFerroPendente || payload.animal_id) return { payload }
  const { data: animal, error } = await supabase
    .from('animais')
    .select('id')
    .eq('numero_ferro', numeroFerroPendente)
    .single()
  if (error || !animal) return { erro: `Ferro nº ${numeroFerroPendente} não encontrado no sistema` }
  return { payload: { ...payload, animal_id: animal.id } }
}

async function enviarFila(supabase, tabelaLocal, tabelaRemota) {
  let enviados = 0
  let falhas = 0

  const pendentes = await tabelaLocal.toArray()
  for (const item of pendentes) {
    const resolvido = await resolverAnimalId(supabase, montarPayload(item), item._numero_ferro_pendente)

    if (resolvido.erro) {
      falhas++
      await tabelaLocal.update(item.localId, { tentativas: (item.tentativas || 0) + 1, ultimoErro: resolvido.erro })
      continue
    }

    const { error } = await supabase.from(tabelaRemota).insert([resolvido.payload])
    if (error) {
      falhas++
      await tabelaLocal.update(item.localId, { tentativas: (item.tentativas || 0) + 1, ultimoErro: error.message })
    } else {
      await tabelaLocal.delete(item.localId)
      enviados++
    }
  }

  return { enviados, falhas }
}

export async function sincronizarPendencias(supabase) {
  if (!navigator.onLine) return { enviados: 0, falhas: 0 }

  const custos = await enviarFila(supabase, dbLocal.custosPendentes, 'custos')
  const vendas = await enviarFila(supabase, dbLocal.vendasPendentes, 'vendas')

  const enviados = custos.enviados + vendas.enviados
  if (enviados > 0) {
    localStorage.setItem('ultimoSync', new Date().toISOString())
  }

  return { enviados, falhas: custos.falhas + vendas.falhas }
}

export function getUltimoSync() {
  return localStorage.getItem('ultimoSync')
}
