import supabase from './supabaseClient.js'
import { useState, useEffect } from "react"
import { useAuth } from './AuthContext'
import { salvarCustoOffline } from './lib/db'
import { Tela } from './componentes/Tela'
import { Cartao, Campo, Input, Select, Botao, Alerta } from './componentes/UI'
import { hojeISO, moeda, rotulosCategoria } from './lib/formato'

const categorias = Object.entries(rotulosCategoria).map(([valor, rotulo]) => ({ valor, rotulo }))

function LancamentoCusto() {
  const { sessao } = useAuth()
  const [alvo, setAlvo] = useState('ferro')
  const [ferro, setFerro] = useState('')
  const [loteId, setLoteId] = useState('')
  const [lotes, setLotes] = useState([])
  const [categoria, setCategoria] = useState('racao')
  const [valor, setValor] = useState('')
  const [data, setData] = useState(hojeISO())
  const [observacao, setObservacao] = useState('')

  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    // animais(count) traz quantas cabeças cada lote tem — usado no aviso de rateio
    supabase.from('lotes').select('id, nome, animais(count)').order('nome').then(({ data }) => setLotes(data || []))
  }, [])

  const loteEscolhido = lotes.find((l) => l.id === loteId)
  const cabecasNoLote = loteEscolhido?.animais?.[0]?.count || 0

  async function enviarCusto(evento) {
    evento.preventDefault()
    setErro('')
    setMensagem('')

    if (!valor || !data) {
      setErro('Preencha o valor e a data.')
      return
    }
    if (alvo === 'ferro' && !ferro) {
      setErro('Informe o número do ferro.')
      return
    }
    if (alvo === 'lote' && !loteId) {
      setErro('Escolha o lote.')
      return
    }

    setEnviando(true)

    let animalId = null
    if (alvo === 'ferro' && navigator.onLine) {
      const { data: animal, error: erroAnimal } = await supabase
        .from('animais')
        .select('id')
        .eq('numero_ferro', Number(ferro))
        .maybeSingle()

      if (erroAnimal || !animal) {
        setErro(`Nenhum animal encontrado com o ferro nº ${ferro}. Confira o número ou cadastre o animal primeiro.`)
        setEnviando(false)
        return
      }
      animalId = animal.id
    }

    const registro = {
      animal_id: alvo === 'ferro' ? animalId : null,
      lote_id: alvo === 'lote' ? loteId : null,
      categoria,
      valor: Number(valor),
      data,
      descricao: observacao || null,
      lancado_por: sessao?.user?.id,
    }

    if (!navigator.onLine || (alvo === 'ferro' && !animalId)) {
      await salvarCustoOffline({ ...registro, _numero_ferro_pendente: alvo === 'ferro' ? Number(ferro) : null })
      setMensagem('Sem internet agora. O custo ficou guardado no celular e será enviado sozinho quando a conexão voltar.')
      limpar()
      setEnviando(false)
      return
    }

    const { error } = await supabase.from('custos').insert([registro])
    setEnviando(false)

    if (error) {
      await salvarCustoOffline({ ...registro, _numero_ferro_pendente: alvo === 'ferro' ? Number(ferro) : null })
      setMensagem('Não consegui enviar agora. O custo ficou guardado no celular pra tentar de novo depois.')
      limpar()
      return
    }

    setMensagem('Custo lançado. Pode lançar o próximo.')
    limpar()
  }

  function limpar() {
    setFerro('')
    setLoteId('')
    setValor('')
    setObservacao('')
  }

  return (
    <Tela titulo="Lançar custo">
      <form onSubmit={enviarCusto} className="space-y-4 anima-lista">
        <Cartao className="space-y-4">
          <Campo rotulo="Tipo de custo" id="categoria">
            <Select id="categoria" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
              {categorias.map((c) => <option key={c.valor} value={c.valor}>{c.rotulo}</option>)}
            </Select>
          </Campo>

          <div>
            <span className="block text-base font-semibold text-text mb-1.5">Pra quem é esse custo</span>
            <div className="grid grid-cols-2 gap-3">
              <BotaoSegmento ativo={alvo === 'ferro'} onClick={() => setAlvo('ferro')} rotulo="Um animal" />
              <BotaoSegmento ativo={alvo === 'lote'} onClick={() => setAlvo('lote')} rotulo="Um lote inteiro" />
            </div>
          </div>

          {alvo === 'ferro' && (
            <Campo rotulo="Número do ferro" id="ferro">
              <Input id="ferro" type="number" inputMode="numeric" value={ferro} onChange={(e) => setFerro(e.target.value)} />
            </Campo>
          )}

          {alvo === 'lote' && (
            <Campo rotulo="Lote" id="lote">
              <Select id="lote" value={loteId} onChange={(e) => setLoteId(e.target.value)}>
                <option value="">Escolha o lote</option>
                {lotes.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
              </Select>
              {loteId && cabecasNoLote > 0 && valor && (
                <p className="text-sm text-text-soft mt-2 anima-pop">
                  Será dividido entre as {cabecasNoLote} cabeças do lote: {moeda(Number(valor) / cabecasNoLote)} por animal.
                </p>
              )}
            </Campo>
          )}
        </Cartao>

        <Cartao className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Valor (R$)" id="valor">
              <Input id="valor" type="number" step="0.01" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} />
            </Campo>
            <Campo rotulo="Data" id="data" dica="Já vem com hoje">
              <Input id="data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
            </Campo>
          </div>

          <Campo rotulo="Observação" id="observacao" dica="Opcional">
            <Input id="observacao" value={observacao} onChange={(e) => setObservacao(e.target.value)} />
          </Campo>
        </Cartao>

        {erro && <Alerta tipo="erro">{erro}</Alerta>}
        {mensagem && <Alerta tipo="sucesso">{mensagem}</Alerta>}

        <Botao type="submit" disabled={enviando} className="w-full">
          {enviando ? 'Enviando...' : 'Lançar custo'}
        </Botao>
      </form>
    </Tela>
  )
}

function BotaoSegmento({ ativo, onClick, rotulo }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border-2 py-3.5 text-base font-semibold transition-all duration-150 active:scale-[0.98] ${
        ativo ? 'border-primary bg-primary-soft text-primary-dark' : 'border-border text-text-soft'
      }`}
    >
      {rotulo}
    </button>
  )
}

export default LancamentoCusto
