// Preço da arroba do boi gordo (CEPEA), buscado no backend e
// guardado por 6 horas no aparelho pra não depender do backend acordado.

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || ''
const CHAVE = 'precoArroba'
const VALIDADE_MS = 6 * 60 * 60 * 1000

export function precoGuardado() {
  try {
    const bruto = localStorage.getItem(CHAVE)
    if (!bruto) return null
    const { preco, em } = JSON.parse(bruto)
    return { preco, em, vencido: Date.now() - em > VALIDADE_MS }
  } catch {
    return null
  }
}

export async function buscarPrecoArroba() {
  const guardado = precoGuardado()
  if (guardado && !guardado.vencido) return { preco: guardado.preco, fonte: 'guardado' }

  if (!BACKEND_URL) {
    return guardado ? { preco: guardado.preco, fonte: 'guardado_vencido' } : null
  }

  try {
    const resposta = await fetch(`${BACKEND_URL}/api/preco-arroba`)
    const json = await resposta.json()
    if (json.preco) {
      localStorage.setItem(CHAVE, JSON.stringify({ preco: json.preco, em: Date.now() }))
      return { preco: json.preco, fonte: 'cepea' }
    }
  } catch {
    // sem rede ou backend dormindo; cai pro guardado
  }
  return guardado ? { preco: guardado.preco, fonte: 'guardado_vencido' } : null
}
