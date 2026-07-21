import { useState, useEffect } from "react"
import supabase from "./supabaseClient"
import { Link } from "react-router-dom"
import { Tela } from "./componentes/Tela"
import { Cartao, Select, Botao, EstadoVazio, Esqueleto } from "./componentes/UI"
import { moeda, removerCorrigidos, rotulosCategoria, hojeISO } from "./lib/formato"
import { Download } from "lucide-react"

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || ''
const CORES = ['bg-primary', 'bg-info', 'bg-accent', 'bg-warn', 'bg-danger', 'bg-text-soft']

function Relatorios() {
  const [periodo, setPeriodo] = useState('mes')
  const [dataInicio, setDataInicio] = useState(() => {
    const hoje = new Date()
    return new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10)
  })
  const [dataFim, setDataFim] = useState(hojeISO())

  const [carregando, setCarregando] = useState(true)
  const [custos, setCustos] = useState([])
  const [resultados, setResultados] = useState([])
  const [gerandoPdf, setGerandoPdf] = useState(false)

  useEffect(() => {
    const hoje = new Date()
    if (periodo === 'mes') {
      setDataInicio(new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10))
      setDataFim(hojeISO())
    } else if (periodo === 'trimestre') {
      setDataInicio(new Date(hoje.getFullYear(), hoje.getMonth() - 3, 1).toISOString().slice(0, 10))
      setDataFim(hojeISO())
    } else if (periodo === 'ano') {
      setDataInicio(new Date(hoje.getFullYear(), 0, 1).toISOString().slice(0, 10))
      setDataFim(hojeISO())
    }
  }, [periodo])

  useEffect(() => {
    async function carregar() {
      setCarregando(true)

      const { data: custosData } = await supabase
        .from('custos')
        .select('id, custo_original_id, categoria, valor')
        .gte('data', dataInicio)
        .lte('data', dataFim)
      setCustos(removerCorrigidos(custosData || []))

      // A view já vem com correções resolvidas, custo rateado e lote
      const { data: resultadosData } = await supabase
        .from('vw_resultado_animal')
        .select('*')
        .not('data_venda', 'is', null)
        .gte('data_venda', dataInicio)
        .lte('data_venda', dataFim)
      setResultados(resultadosData || [])

      setCarregando(false)
    }
    carregar()
  }, [dataInicio, dataFim])

  // Resultado do período: baseado nos animais VENDIDOS no período,
  // comparando o que foi recebido com tudo que cada um custou (compra + gastos).
  const totalRecebido = resultados.reduce((soma, r) => soma + Number(r.valor_total_venda || 0), 0)
  const custoDosVendidos = resultados.reduce((soma, r) => soma + Number(r.custo_total || 0), 0)
  const lucroTotal = resultados.reduce((soma, r) => soma + Number(r.lucro || 0), 0)
  const margemMedia = custoDosVendidos > 0 ? (100 * lucroTotal / custoDosVendidos).toFixed(1) : null

  const ganhoMedio = resultados.length
    ? resultados.reduce((soma, r) => soma + Number(r.ganho_peso_arr || 0), 0) / resultados.length
    : null
  const diasMedios = resultados.length
    ? Math.round(resultados.reduce((soma, r) => soma + Number(r.dias_na_fazenda || 0), 0) / resultados.length)
    : null

  // Gastos correntes do período (independente de venda)
  const totalGasto = custos.reduce((soma, c) => soma + Number(c.valor), 0)
  const porCategoria = {}
  custos.forEach((c) => { porCategoria[c.categoria] = (porCategoria[c.categoria] || 0) + Number(c.valor) })
  const categorias = Object.entries(porCategoria).sort((a, b) => b[1] - a[1])
  const maxCategoria = categorias.length ? categorias[0][1] : 0

  // Resultado por lote (SDD 5.5): agrupa os vendidos do período
  const porLote = {}
  for (const r of resultados) {
    const chave = r.lote_nome || 'Compra avulsa'
    if (!porLote[chave]) porLote[chave] = { vendidos: 0, lucro: 0, custo: 0, melhor: null, pior: null }
    const g = porLote[chave]
    g.vendidos++
    g.lucro += Number(r.lucro || 0)
    g.custo += Number(r.custo_total || 0)
    if (!g.melhor || Number(r.lucro) > Number(g.melhor.lucro)) g.melhor = r
    if (!g.pior || Number(r.lucro) < Number(g.pior.lucro)) g.pior = r
  }
  const lotes = Object.entries(porLote).sort((a, b) => b[1].lucro - a[1].lucro)

  async function exportarPdf() {
    if (!BACKEND_URL) {
      alert('A exportação em PDF depende do backend, que ainda não está configurado.')
      return
    }
    setGerandoPdf(true)
    try {
      const resposta = await fetch(`${BACKEND_URL}/api/relatorio/pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data_inicio: dataInicio, data_fim: dataFim }),
      })
      if (!resposta.ok) throw new Error('backend')
      const blob = await resposta.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `relatorio_${dataInicio}_${dataFim}.pdf`
      link.click()
    } catch {
      alert('Não consegui gerar o PDF agora. O backend pode estar acordando — tente de novo em meio minuto.')
    }
    setGerandoPdf(false)
  }

  return (
    <Tela titulo="Relatórios">
      <div className="flex gap-2 mb-4">
        <Select value={periodo} onChange={(e) => setPeriodo(e.target.value)} className="flex-1" aria-label="Período do relatório">
          <option value="mes">Este mês</option>
          <option value="trimestre">Último trimestre</option>
          <option value="ano">Este ano</option>
          <option value="personalizado">Personalizado</option>
        </Select>
        <Botao variante="secundaria" tamanho="pequeno" onClick={exportarPdf} disabled={gerandoPdf} aria-label="Exportar PDF">
          <Download size={18} />
          PDF
        </Botao>
      </div>

      {periodo === 'personalizado' && (
        <div className="flex gap-2 mb-4 anima-pop">
          <input type="date" aria-label="Data inicial" className="flex-1 rounded-xl border-2 border-border px-3 py-2.5 bg-white" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
          <input type="date" aria-label="Data final" className="flex-1 rounded-xl border-2 border-border px-3 py-2.5 bg-white" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
        </div>
      )}

      {carregando ? (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Esqueleto altura="h-20" /><Esqueleto altura="h-20" />
          <Esqueleto altura="h-20" /><Esqueleto altura="h-20" />
        </div>
      ) : (
        <div className="anima-lista">
          <div className="grid grid-cols-2 gap-3 mb-1">
            <Cartao className="text-center">
              <p className="text-2xl font-display font-semibold numeros">{moeda(totalRecebido, 0)}</p>
              <p className="text-text-soft text-sm">recebido nas vendas</p>
            </Cartao>
            <Cartao className="text-center">
              <p className="text-2xl font-display font-semibold numeros">{moeda(custoDosVendidos, 0)}</p>
              <p className="text-text-soft text-sm">custo dos vendidos</p>
            </Cartao>
            <Cartao className="text-center">
              <p className={`text-2xl font-display font-semibold numeros ${lucroTotal >= 0 ? 'text-primary' : 'text-danger'}`}>
                {moeda(lucroTotal, 0)}
              </p>
              <p className="text-text-soft text-sm">lucro</p>
            </Cartao>
            <Cartao className="text-center">
              <p className="text-2xl font-display font-semibold numeros">{margemMedia !== null ? `${margemMedia}%` : '—'}</p>
              <p className="text-text-soft text-sm">margem</p>
            </Cartao>
          </div>
          <p className="text-text-soft text-xs mb-4 px-1">
            Números dos {resultados.length} animais vendidos no período: cada venda comparada com tudo que o animal custou.
          </p>

          {resultados.length > 0 && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              <Cartao className="text-center">
                <p className="text-xl font-display font-semibold numeros">{ganhoMedio !== null ? `+${ganhoMedio.toFixed(1)}@` : '—'}</p>
                <p className="text-text-soft text-sm">ganho de peso médio</p>
              </Cartao>
              <Cartao className="text-center">
                <p className="text-xl font-display font-semibold numeros">{diasMedios !== null ? `${diasMedios} dias` : '—'}</p>
                <p className="text-text-soft text-sm">tempo médio na fazenda</p>
              </Cartao>
            </div>
          )}

          <p className="font-display text-lg font-semibold mb-2">Gastos do período · {moeda(totalGasto, 0)}</p>
          <Cartao className="mb-4">
            {categorias.length === 0 && <p className="text-text-soft text-center py-4">Nenhum custo no período</p>}
            <div className="space-y-3">
              {categorias.map(([categoria, valorCategoria], indice) => (
                <div key={categoria}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">
                      {rotulosCategoria[categoria] || categoria}
                      <span className="text-text-soft"> · {totalGasto > 0 ? Math.round(100 * valorCategoria / totalGasto) : 0}%</span>
                    </span>
                    <span className="numeros">{moeda(valorCategoria)}</span>
                  </div>
                  <div className="w-full bg-surface-2 rounded-full h-2.5">
                    <div className={`h-2.5 rounded-full ${CORES[indice % CORES.length]} transition-all duration-500`} style={{ width: `${(valorCategoria / maxCategoria) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Cartao>

          <Link to="/custos-rebanho" className="block text-center text-sm text-primary-dark font-semibold mb-4">
            Ver custos do rebanho
          </Link>

          {lotes.length > 0 && (
            <>
              <p className="font-display text-lg font-semibold mb-2">Resultado por lote</p>
              <div className="space-y-3 mb-4">
                {lotes.map(([nome, g]) => (
                  <Cartao key={nome}>
                    <div className="flex justify-between items-center mb-1">
                      <p className="font-semibold">{nome}</p>
                      <p className={`font-display text-lg font-semibold numeros ${g.lucro >= 0 ? 'text-primary' : 'text-danger'}`}>{moeda(g.lucro)}</p>
                    </div>
                    <p className="text-text-soft text-sm">
                      {g.vendidos} vendido{g.vendidos > 1 ? 's' : ''} · margem {g.custo > 0 ? (100 * g.lucro / g.custo).toFixed(1) : '—'}%
                    </p>
                    {g.vendidos > 1 && (
                      <p className="text-text-soft text-sm mt-0.5">
                        Melhor: ferro {g.melhor.numero_ferro} ({moeda(g.melhor.lucro, 0)}) · Pior: ferro {g.pior.numero_ferro} ({moeda(g.pior.lucro, 0)})
                      </p>
                    )}
                  </Cartao>
                ))}
              </div>
            </>
          )}

          <p className="font-display text-lg font-semibold mb-2">Vendas do período</p>
          <Cartao className="divide-y divide-border">
            {resultados.map((resultado) => (
              <div key={resultado.animal_id} className="py-2.5 first:pt-0 last:pb-0 flex justify-between items-center">
                <div>
                  <span className="font-medium">Ferro {resultado.numero_ferro}</span>
                  <span className="text-text-soft text-sm"> · {resultado.margem_pct !== null ? `${resultado.margem_pct}%` : '—'}</span>
                </div>
                <span className={`font-semibold numeros ${resultado.lucro >= 0 ? 'text-primary' : 'text-danger'}`}>
                  {moeda(resultado.lucro)}
                </span>
              </div>
            ))}
            {resultados.length === 0 && <EstadoVazio titulo="Nenhuma venda no período" />}
          </Cartao>
        </div>
      )}
    </Tela>
  )
}

export default Relatorios