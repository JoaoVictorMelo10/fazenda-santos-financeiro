import { useState, useEffect, useCallback } from "react"
import supabase from './supabaseClient.js'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { Tela } from './componentes/Tela'
import { Cartao, Selo, Campo, Input, Botao, Alerta, MarcaFerro, Esqueleto } from './componentes/UI'
import { moeda, formatarData, removerCorrigidos, rotulosCategoria, hojeISO } from './lib/formato'
import { buscarPrecoArroba } from './lib/preco'
import { Handshake, TriangleAlert, SlidersHorizontal, Pencil } from 'lucide-react'

function ExibirAnimal() {
  const { numero_ferro } = useParams()
  const { sessao } = useAuth()

  const [animal, setAnimal] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [custosAnimal, setCustosAnimal] = useState([])
  const [custoAcumulado, setCustoAcumulado] = useState(0)
  const [cabecasNoLote, setCabecasNoLote] = useState(1)
  const [venda, setVenda] = useState(null)

  // Premissas da projeção — o app preenche tudo sozinho, mas deixa ajustar
  const [precoArroba, setPrecoArroba] = useState('')
  const [fontePreco, setFontePreco] = useState(null)
  const [pesoAlvo, setPesoAlvo] = useState('')
  const [ganhoMes, setGanhoMes] = useState('1')
  const [custoMensal, setCustoMensal] = useState('')
  const [ajustando, setAjustando] = useState(false)

  const [corrigindo, setCorrigindo] = useState(null) // custo sendo corrigido
  const [novoValor, setNovoValor] = useState('')
  const [justificativa, setJustificativa] = useState('')

  const [mostrarPerda, setMostrarPerda] = useState(false)
  const [motivoPerda, setMotivoPerda] = useState('')
  const [erro, setErro] = useState('')

  const carregarTudo = useCallback(async () => {
    const { data: animalData } = await supabase
      .from('animais')
      .select('*, lotes(nome)')
      .eq('numero_ferro', numero_ferro)
      .maybeSingle()
    setAnimal(animalData)
    setCarregando(false)

    if (!animalData) return

    const { data: custoView } = await supabase
      .from('vw_custo_por_animal')
      .select('custo_acumulado')
      .eq('animal_id', animalData.id)
      .maybeSingle()
    setCustoAcumulado(Number(custoView?.custo_acumulado || 0))

    const { data: diretos } = await supabase
      .from('custos')
      .select('*')
      .eq('animal_id', animalData.id)

    let doLote = []
    if (animalData.lote_id) {
      const { data } = await supabase
        .from('custos')
        .select('*')
        .eq('lote_id', animalData.lote_id)
      doLote = data || []

      const { count } = await supabase
        .from('animais')
        .select('id', { count: 'exact', head: true })
        .eq('lote_id', animalData.lote_id)
      setCabecasNoLote(count || 1)
    }

    const validos = removerCorrigidos([...(diretos || []), ...doLote])
    setCustosAnimal(validos.sort((a, b) => new Date(b.data) - new Date(a.data)))

    if (animalData.status === 'vendido') {
      const { data: vendas } = await supabase
        .from('vendas')
        .select('*')
        .eq('animal_id', animalData.id)
      const validas = removerCorrigidos(vendas || [], 'venda_original_id')
      setVenda(validas[0] || null)
    }

    if (animalData.peso_alvo_arr) setPesoAlvo(String(animalData.peso_alvo_arr))
  }, [numero_ferro])

  useEffect(() => { carregarTudo() }, [carregarTudo])

  // Preço da arroba: busca sozinho ao abrir a tela (com cache de 6h no aparelho)
  useEffect(() => {
    buscarPrecoArroba().then((resultado) => {
      if (resultado?.preco) {
        setPrecoArroba((atual) => atual || String(resultado.preco))
        setFontePreco(resultado.fonte)
      }
    })
  }, [])

  async function marcarPerda(evento) {
    evento.preventDefault()
    if (!motivoPerda) {
      setErro('Descreva o motivo da perda.')
      return
    }
    const { error } = await supabase
      .from('animais')
      .update({ status: 'perda', perda_motivo: motivoPerda, perda_em: hojeISO() })
      .eq('id', animal.id)

    if (error) {
      setErro('Erro ao marcar perda: ' + error.message)
      return
    }
    setMostrarPerda(false)
    carregarTudo()
  }

  async function salvarCorrecao(evento) {
    evento.preventDefault()
    setErro('')
    if (!novoValor || !justificativa.trim()) {
      setErro('Informe o valor correto e o motivo da correção.')
      return
    }
    const { error } = await supabase.from('custos').insert([{
      animal_id: corrigindo.animal_id,
      lote_id: corrigindo.lote_id,
      categoria: corrigindo.categoria,
      valor: Number(novoValor),
      data: corrigindo.data,
      descricao: corrigindo.descricao,
      lancado_por: sessao?.user?.id,
      custo_original_id: corrigindo.id,
      justificativa: justificativa.trim(),
    }])
    if (error) {
      setErro('Erro ao corrigir: ' + error.message)
      return
    }
    setCorrigindo(null)
    setNovoValor('')
    setJustificativa('')
    carregarTudo()
  }

  if (carregando) {
    return (
      <Tela titulo={`Ferro ${numero_ferro}`} voltar>
        <div className="space-y-3">
          <Esqueleto altura="h-28" />
          <Esqueleto altura="h-40" />
        </div>
      </Tela>
    )
  }

  if (!animal) {
    return (
      <Tela titulo="Animal" voltar>
        <Cartao className="text-center py-8">
          <p className="font-display text-xl mb-1">Ferro {numero_ferro} não encontrado</p>
          <p className="text-text-soft mb-4">Confira o número ou cadastre o animal.</p>
          <Link to="/cadastro-animais"><Botao variante="secundaria">Cadastrar animal</Botao></Link>
        </Cartao>
      </Tela>
    )
  }

  const valorCompra = Number(animal.valor_total_compra)
  const custoTotal = valorCompra + custoAcumulado

  // ---------- Projeção automática ----------
  const diasNaFazenda = Math.max(Math.floor((new Date() - new Date(animal.data_entrada + 'T00:00:00')) / 86400000), 0)
  const mesesDecorridos = Math.max(diasNaFazenda / 30.44, 0.25)

  // Custo mensal real do animal, tirado dos lançamentos; se ainda não há
  // lançamentos, usa a estimativa cadastrada ou um padrão editável.
  const custoMensalAuto = custoAcumulado > 0
    ? custoAcumulado / mesesDecorridos
    : Number(animal.custo_medio_mensal) || 350
  const custoMensalUsado = custoMensal !== '' ? Number(custoMensal) : custoMensalAuto

  const pesoEntrada = Number(animal.peso_entrada_arr)
  const ganhoMesNum = Math.max(Number(ganhoMes) || 0, 0)
  const pesoAlvoNum = Number(pesoAlvo) || null
  const precoNum = Number(precoArroba) || null

  let projecao = null
  if (animal.status === 'ativo' && pesoAlvoNum && precoNum) {
    const pesoAtualEstimado = Math.min(pesoEntrada + ganhoMesNum * mesesDecorridos, pesoAlvoNum)
    const mesesRestantes = ganhoMesNum > 0 ? Math.max((pesoAlvoNum - pesoAtualEstimado) / ganhoMesNum, 0) : 0
    const custoFuturo = custoMensalUsado * mesesRestantes
    const custoTotalProjetado = custoTotal + custoFuturo
    const receitaProjetada = pesoAlvoNum * precoNum
    const resultado = receitaProjetada - custoTotalProjetado
    projecao = {
      pesoAtualEstimado,
      mesesRestantes,
      custoFuturo,
      custoTotalProjetado,
      receitaProjetada,
      resultado,
      margem: custoTotalProjetado > 0 ? (100 * resultado / custoTotalProjetado).toFixed(1) : null,
    }
  }

  return (
    <Tela titulo={`Ferro ${numero_ferro}`} voltar>
      <div className="anima-lista">
        <div className="flex items-center gap-4 mb-4">
          <MarcaFerro numero={numero_ferro} tamanho="grande" />
          <div className="flex-1">
            {animal.status === 'ativo' && <Selo tipo="aberto">Em aberto · {diasNaFazenda} dias</Selo>}
            {animal.status === 'vendido' && <Selo tipo="vendido">Vendido</Selo>}
            {animal.status === 'perda' && <Selo tipo="perda">Perda</Selo>}
            <p className="text-text-soft text-sm mt-1.5">Entrada em {formatarData(animal.data_entrada)}</p>
          </div>
        </div>

        <Cartao className="mb-4 space-y-2">
          <Linha rotulo="Peso de entrada" valor={`${animal.peso_entrada_arr}@`} />
          <Linha rotulo="Valor pago por @" valor={moeda(animal.valor_arroba_compra)} />
          <Linha rotulo="Valor de compra" valor={moeda(valorCompra)} destaque />
          {animal.lotes?.nome && <Linha rotulo="Lote" valor={animal.lotes.nome} />}
          {animal.observacao && <Linha rotulo="Observação" valor={animal.observacao} />}
          {animal.status === 'perda' && <Linha rotulo="Motivo da perda" valor={animal.perda_motivo} />}
        </Cartao>

        <p className="font-display text-lg font-semibold mb-2">Custos lançados</p>
        <Cartao className="mb-4 divide-y divide-border">
          {custosAnimal.map((custo) => {
            const rateado = Boolean(custo.lote_id)
            const valorExibido = rateado ? Number(custo.valor) / cabecasNoLote : Number(custo.valor)
            return (
              <div key={custo.id} className="py-2.5 first:pt-0 last:pb-0 flex justify-between items-center gap-2">
                <div className="min-w-0">
                  <p className="font-medium">
                    {rotulosCategoria[custo.categoria] || custo.categoria}
                    {custo.custo_original_id && <span className="text-warn text-xs font-semibold ml-1.5">corrigido</span>}
                  </p>
                  <p className="text-sm text-text-soft">
                    {formatarData(custo.data)}
                    {rateado ? ` · parte do lote (÷${cabecasNoLote})` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <p className="font-semibold numeros">{moeda(valorExibido)}</p>
                  {animal.status === 'ativo' && !rateado && (
                    <button
                      type="button"
                      onClick={() => { setCorrigindo(custo); setNovoValor(String(custo.valor)); setJustificativa('') }}
                      aria-label="Corrigir este custo"
                      className="p-1.5 text-text-soft rounded-full hover:bg-surface-2"
                    >
                      <Pencil size={16} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
          {custosAnimal.length === 0 && <p className="text-text-soft text-center py-4">Nenhum custo lançado ainda</p>}
          <div className="pt-3 flex justify-between items-center">
            <span className="font-semibold">Custo total (compra + gastos)</span>
            <span className="font-display text-xl font-semibold numeros">{moeda(custoTotal)}</span>
          </div>
        </Cartao>

        {corrigindo && (
          <Cartao as="form" onSubmit={salvarCorrecao} className="mb-4 space-y-3 anima-pop border-warn">
            <p className="font-display text-lg font-semibold">
              Corrigir {rotulosCategoria[corrigindo.categoria]} de {formatarData(corrigindo.data)}
            </p>
            <p className="text-text-soft text-sm -mt-2">
              O lançamento original de {moeda(corrigindo.valor)} fica guardado no histórico; este novo valor entra no lugar dele.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Campo rotulo="Valor correto (R$)" id="novoValor">
                <Input id="novoValor" type="number" step="0.01" inputMode="decimal" value={novoValor} onChange={(e) => setNovoValor(e.target.value)} />
              </Campo>
            </div>
            <Campo rotulo="Motivo da correção" id="justificativa" dica="Ex.: digitei o valor errado">
              <Input id="justificativa" value={justificativa} onChange={(e) => setJustificativa(e.target.value)} />
            </Campo>
            <div className="flex gap-2">
              <Botao type="submit" className="flex-1">Salvar correção</Botao>
              <Botao type="button" variante="fantasma" onClick={() => setCorrigindo(null)}>Cancelar</Botao>
            </div>
          </Cartao>
        )}

        {animal.status === 'vendido' && venda && (
          <Cartao className="mb-4 space-y-2">
            <p className="font-display text-lg font-semibold mb-1">Resultado da venda</p>
            <Linha rotulo="Comprador" valor={venda.comprador} />
            <Linha rotulo="Data da venda" valor={formatarData(venda.data_venda)} />
            <Linha rotulo="Peso de saída" valor={`${venda.peso_saida_arr}@ a ${moeda(venda.valor_arroba_venda)}`} />
            <Linha rotulo="Ganho de peso" valor={`${(Number(venda.peso_saida_arr) - pesoEntrada).toFixed(1)}@`} />
            <Linha rotulo="Valor recebido" valor={moeda(venda.valor_total_venda)} />
            <Linha rotulo="Custo por @ produzida" valor={venda.peso_saida_arr > 0 ? moeda(custoTotal / Number(venda.peso_saida_arr)) : '—'} />
            <div className="pt-2 flex justify-between items-center">
              <span className="font-semibold">Lucro</span>
              <ValorResultado valor={Number(venda.valor_total_venda) - custoTotal} />
            </div>
          </Cartao>
        )}

        {animal.status === 'ativo' && (
          <Cartao className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <p className="font-display text-lg font-semibold">Projeção de resultado</p>
              <button
                type="button"
                onClick={() => setAjustando(!ajustando)}
                className="flex items-center gap-1.5 text-sm font-semibold text-primary rounded-lg px-2 py-1 hover:bg-primary-soft"
              >
                <SlidersHorizontal size={16} />
                Ajustar
              </button>
            </div>
            <p className="text-text-soft text-sm mb-3">
              O app calcula sozinho com o preço do dia e os custos reais deste animal. Toque em "Ajustar" pra mudar as premissas.
            </p>

            {!pesoAlvoNum && !ajustando && (
              <div className="bg-surface-2 rounded-xl p-4">
                <p className="text-text-soft text-sm">
                  Falta só o <strong>peso alvo</strong> de venda pra projetar o resultado.
                </p>
                <Botao variante="secundaria" tamanho="pequeno" className="mt-2" onClick={() => setAjustando(true)}>
                  Informar peso alvo
                </Botao>
              </div>
            )}

            {ajustando && (
              <div className="grid grid-cols-2 gap-3 mb-3 anima-pop">
                <Campo rotulo="Peso alvo (@)" id="pesoAlvo">
                  <Input id="pesoAlvo" type="number" step="0.01" inputMode="decimal" value={pesoAlvo} onChange={(e) => setPesoAlvo(e.target.value)} />
                </Campo>
                <Campo rotulo="Preço da @ (R$)" id="preco" dica={fontePreco === 'cepea' ? 'Preço CEPEA de hoje' : precoArroba ? 'Edite se quiser simular' : 'Digite o preço do dia'}>
                  <Input id="preco" type="number" step="0.01" inputMode="decimal" value={precoArroba} onChange={(e) => setPrecoArroba(e.target.value)} />
                </Campo>
                <Campo rotulo="Ganho por mês (@)" id="ganho">
                  <Input id="ganho" type="number" step="0.1" inputMode="decimal" value={ganhoMes} onChange={(e) => setGanhoMes(e.target.value)} />
                </Campo>
                <Campo rotulo="Custo por mês (R$)" id="custoMes" dica={custoAcumulado > 0 ? 'Calculado dos lançamentos reais' : 'Estimativa'}>
                  <Input id="custoMes" type="number" step="0.01" inputMode="decimal" value={custoMensal} placeholder={custoMensalAuto.toFixed(0)} onChange={(e) => setCustoMensal(e.target.value)} />
                </Campo>
              </div>
            )}

            {pesoAlvoNum && !precoNum && (
              <div className="bg-surface-2 rounded-xl p-4 anima-pop">
                <p className="text-text-soft text-sm">
                  Falta o <strong>preço da arroba</strong> pra calcular. Quando o backend estiver ligado ele vem sozinho do CEPEA — por enquanto, {ajustando ? 'digite o preço do dia no campo acima' : 'toque em "Ajustar" e digite o preço do dia'}. O resultado aparece na hora, sem botão de confirmar.
                </p>
                {!ajustando && (
                  <Botao variante="secundaria" tamanho="pequeno" className="mt-2" onClick={() => setAjustando(true)}>
                    Informar preço
                  </Botao>
                )}
              </div>
            )}

            {projecao && (
              <div className="bg-surface-2 rounded-xl p-4 space-y-1.5">
                <Linha rotulo="Peso estimado hoje" valor={`~${projecao.pesoAtualEstimado.toFixed(1)}@`} />
                <Linha rotulo="Falta até o alvo" valor={`~${projecao.mesesRestantes < 0.5 ? 'menos de 1 mês' : Math.ceil(projecao.mesesRestantes) + ' meses'}`} />
                <Linha rotulo="Custo futuro estimado" valor={moeda(projecao.custoFuturo)} />
                <Linha rotulo="Custo total projetado" valor={moeda(projecao.custoTotalProjetado)} />
                <Linha rotulo="Receita projetada" valor={moeda(projecao.receitaProjetada)} />
                <div className="pt-1.5 flex justify-between items-center">
                  <span className="font-semibold">Resultado projetado</span>
                  <ValorResultado valor={projecao.resultado} sufixo={projecao.margem !== null ? ` (${projecao.margem}%)` : ''} />
                </div>
                <p className="text-xs text-text-soft pt-1">
                  Estimativa com o preço de hoje{fontePreco === 'cepea' ? ' (CEPEA)' : ''} e ganho de peso suposto. O valor real na venda pode mudar.
                </p>
              </div>
            )}
          </Cartao>
        )}

        {erro && <Alerta tipo="erro">{erro}</Alerta>}

        <div className="space-y-3 mt-4">
          {animal.status === 'ativo' && (
            <>
              <Link to={`/registro-venda?ferro=${numero_ferro}`} className="block">
                <Botao className="w-full">
                  <Handshake size={20} />
                  Registrar venda
                </Botao>
              </Link>

              {!mostrarPerda ? (
                <Botao variante="fantasma" className="w-full" onClick={() => setMostrarPerda(true)}>
                  <TriangleAlert size={18} />
                  Marcar como perda
                </Botao>
              ) : (
                <Cartao as="form" onSubmit={marcarPerda} className="space-y-3 anima-pop">
                  <Campo rotulo="Motivo da perda" id="motivo" dica="Ex.: morte por doença">
                    <Input id="motivo" value={motivoPerda} onChange={(e) => setMotivoPerda(e.target.value)} />
                  </Campo>
                  <div className="flex gap-2">
                    <Botao type="submit" variante="perigo" className="flex-1">Confirmar perda</Botao>
                    <Botao type="button" variante="fantasma" onClick={() => setMostrarPerda(false)}>Cancelar</Botao>
                  </div>
                </Cartao>
              )}
            </>
          )}
        </div>
      </div>
    </Tela>
  )
}

function Linha({ rotulo, valor, destaque }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-text-soft">{rotulo}</span>
      <span className={destaque ? 'font-semibold numeros text-right' : 'text-right numeros'}>{valor}</span>
    </div>
  )
}

function ValorResultado({ valor, sufixo = '' }) {
  return (
    <span className={`font-display text-xl font-semibold numeros ${valor >= 0 ? 'text-primary' : 'text-danger'}`}>
      {moeda(valor)}{sufixo}
    </span>
  )
}

export default ExibirAnimal