import { useState } from 'react'
import { Botao, Input, Alerta } from './UI'
import { TriangleAlert } from 'lucide-react'

// Confirmação de exclusão em duas etapas:
//  1. aviso claro do que vai acontecer
//  2. digitar o texto exato (nº do ferro ou nome do lote) pra liberar o botão
// Só chama onConfirmar quando o texto bate — evita apagar sem querer.
export default function ConfirmarExclusao({ titulo, aviso, textoConfirmacao, rotuloConfirmar = 'Excluir', onConfirmar, onCancelar }) {
  const [digitado, setDigitado] = useState('')
  const [erro, setErro] = useState('')
  const [excluindo, setExcluindo] = useState(false)

  const confere = digitado.trim() === String(textoConfirmacao).trim()

  async function confirmar() {
    if (!confere) return
    setExcluindo(true)
    setErro('')
    try {
      await onConfirmar()
    } catch (e) {
      setErro(e.message || 'Não foi possível excluir.')
      setExcluindo(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4" onClick={onCancelar}>
      <div className="bg-surface rounded-3xl w-full max-w-md p-6 anima-pop" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-3">
          <span className="bg-danger-soft text-danger rounded-full p-2.5 shrink-0"><TriangleAlert size={24} /></span>
          <h2 className="font-display text-xl font-semibold">{titulo}</h2>
        </div>

        <div className="text-text-soft space-y-2 mb-4">{aviso}</div>

        <p className="text-sm font-semibold text-text mb-1.5">
          Pra confirmar, digite <span className="text-danger">{textoConfirmacao}</span> abaixo:
        </p>
        <Input value={digitado} onChange={(e) => setDigitado(e.target.value)} placeholder={String(textoConfirmacao)} autoFocus />

        {erro && <div className="mt-3"><Alerta tipo="erro">{erro}</Alerta></div>}

        <div className="flex gap-2 mt-5">
          <Botao variante="perigo" className="flex-1" disabled={!confere || excluindo} onClick={confirmar}>
            {excluindo ? 'Excluindo...' : rotuloConfirmar}
          </Botao>
          <Botao variante="fantasma" onClick={onCancelar} disabled={excluindo}>Cancelar</Botao>
        </div>
      </div>
    </div>
  )
}