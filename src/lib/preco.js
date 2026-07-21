// Preço da arroba do boi gordo, buscado no backend e guardado por 6 horas
// no aparelho pra não depender do backend acordado.
// O backend busca a cotação regional MG Norte (Scot Consultoria) e, se não
// achar, cai pro Indicador CEPEA/ESALQ de SP — o rótulo diz qual veio.

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || ''
const CHAVE = 'precoArroba'
const VALIDADE_MS = 6 * 60 * 60 * 1000

export function precoGuardado() {
  try {
    const bruto = localStorage.getItem(CHAVE)
    if (!bruto) return null
    const { preco, precoPrazo, precoVaca, rotulo, em } = JSON.parse(bruto)
    return { preco, precoPrazo: precoPrazo ?? null, precoVaca: precoVaca ?? null, rotulo: rotulo || null, em, vencido: Date.now() - em > VALIDADE_MS }
  } catch {
    return null
  }
}

export async function buscarPrecoArroba() {
  const guardado = precoGuardado()
  if (guardado && !guardado.vencido) {
    return { preco: guardado.preco, precoPrazo: guardado.precoPrazo, precoVaca: guardado.precoVaca, rotulo: guardado.rotulo, fonte: 'guardado' }
  }

  if (!BACKEND_URL) {
    return guardado ? { preco: guardado.preco, precoPrazo: guardado.precoPrazo, precoVaca: guardado.precoVaca, rotulo: guardado.rotulo, fonte: 'guardado_vencido' } : null
  }

  try {
    const resposta = await fetch(`${BACKEND_URL}/api/preco-arroba`)
    const json = await resposta.json()
    if (json.preco) {
      const rotulo = json.rotulo || 'CEPEA/SP'
      const precoPrazo = json.preco_prazo ?? null
      const precoVaca = json.preco_vaca ?? null
      localStorage.setItem(CHAVE, JSON.stringify({ preco: json.preco, precoPrazo, precoVaca, rotulo, em: Date.now() }))
      return { preco: json.preco, precoPrazo, precoVaca, rotulo, fonte: 'auto' }
    }
  } catch {
    // sem rede ou backend dormindo; cai pro guardado
  }
  return guardado ? { preco: guardado.preco, precoPrazo: guardado.precoPrazo, precoVaca: guardado.precoVaca, rotulo: guardado.rotulo, fonte: 'guardado_vencido' } : null
}