// Helpers de formatação e regras compartilhadas.

export function moeda(valor, casas = 2) {
  return Number(valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  })
}

export function formatarData(data) {
  if (!data) return ''
  return new Date(String(data).slice(0, 10) + 'T00:00:00').toLocaleDateString('pt-BR')
}

export function hojeISO() {
  const agora = new Date()
  agora.setMinutes(agora.getMinutes() - agora.getTimezoneOffset())
  return agora.toISOString().slice(0, 10)
}

// Regra R5: correção nunca apaga o original, só o substitui.
// Um registro deixa de valer quando existe outro apontando pra ele
// via *_original_id. Este helper remove os substituídos da lista.
export function removerCorrigidos(registros, chave = 'custo_original_id') {
  const corrigidos = new Set(registros.filter((r) => r[chave]).map((r) => r[chave]))
  return registros.filter((r) => !corrigidos.has(r.id))
}

export const rotulosCategoria = {
  racao: 'Ração',
  sal_mineral: 'Sal mineral',
  veterinario: 'Veterinário',
  vacina: 'Vacina / remédio',
  transporte: 'Transporte',
  outro: 'Outro',
}
