import { useState, useEffect } from "react"
import supabase from "./supabaseClient"
import { useAuth } from "./AuthContext"
import { listarPendencias, descartarPendencia, getUltimoSync, sincronizarPendencias, contarPendencias } from "./lib/db"
import { Tela } from "./componentes/Tela"
import { Cartao, Campo, Input, Botao, Alerta } from "./componentes/UI"
import { moeda, formatarData, rotulosCategoria } from "./lib/formato"
import { WifiOff, CircleCheck, RefreshCw, Trash2 } from "lucide-react"

const CODIGO_CONVITE = import.meta.env.VITE_CODIGO_CONVITE || ''

function Configuracoes() {
  const { perfil, sessao, recarregarPerfil } = useAuth()
  const [usuarios, setUsuarios] = useState([])
  const [pendencias, setPendencias] = useState({ custos: [], vendas: [] })
  const [ultimoSync, setUltimoSync] = useState(null)
  const [sincronizando, setSincronizando] = useState(false)

  const [meuNome, setMeuNome] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')

  async function carregar() {
    const { data } = await supabase.from('perfis').select('*').order('criado_em')
    setUsuarios(data || [])
    setPendencias(await listarPendencias())
    setUltimoSync(getUltimoSync())
  }

  useEffect(() => { carregar() }, [])
  useEffect(() => { if (perfil?.nome) setMeuNome(perfil.nome) }, [perfil])

  const totalPendente = pendencias.custos.length + pendencias.vendas.length

  async function sincronizarAgora() {
    setSincronizando(true)
    const resultado = await sincronizarPendencias(supabase)
    await carregar()
    setSincronizando(false)
    if (resultado.enviados > 0) setMensagem(`${resultado.enviados} lançamento(s) enviados.`)
    if (resultado.falhas > 0) setErro(`${resultado.falhas} não puderam ser enviados — veja o motivo na lista abaixo.`)
    if (resultado.enviados === 0 && resultado.falhas === 0) setMensagem('Nada pendente pra enviar.')
    await contarPendencias()
  }

  async function descartar(tipo, item) {
    const descricao = tipo === 'custo'
      ? `custo de ${moeda(item.valor)} (${rotulosCategoria[item.categoria] || item.categoria})`
      : `venda do ferro ${item._numero_ferro_pendente}`
    if (!window.confirm(`Descartar o ${descricao} guardado neste aparelho? Ele nunca chegou ao sistema e não poderá ser recuperado.`)) return
    await descartarPendencia(tipo, item.localId)
    await carregar()
  }

  async function salvarMeuNome(evento) {
    evento.preventDefault()
    setErro('')
    setMensagem('')
    if (!meuNome.trim()) {
      setErro('Escreva seu nome.')
      return
    }
    const { error } = await supabase.from('perfis').update({ nome: meuNome.trim() }).eq('id', sessao.user.id)
    if (error) {
      setErro('Erro ao salvar: ' + error.message)
      return
    }
    setMensagem('Nome atualizado.')
    recarregarPerfil()
    carregar()
  }

  return (
    <Tela titulo="Configurações">
      <div className="anima-lista">
        <p className="font-display text-lg font-semibold mb-2">Meu perfil</p>
        <Cartao as="form" onSubmit={salvarMeuNome} className="mb-5 space-y-3">
          <Campo rotulo="Meu nome" id="meuNome" dica="É como você aparece no painel e nos lançamentos">
            <Input id="meuNome" value={meuNome} onChange={(e) => setMeuNome(e.target.value)} />
          </Campo>
          <Botao type="submit" variante="secundaria" tamanho="pequeno">Salvar nome</Botao>
        </Cartao>

        <p className="font-display text-lg font-semibold mb-2">Sincronização deste aparelho</p>
        <Cartao className="mb-5 space-y-3">
          <div className="flex items-center gap-3">
            {totalPendente > 0 ? (
              <>
                <span className="bg-warn-soft text-warn rounded-full p-2.5"><WifiOff size={20} /></span>
                <div className="flex-1">
                  <p className="font-semibold">{totalPendente} lançamento{totalPendente > 1 ? 's' : ''} pendente{totalPendente > 1 ? 's' : ''}</p>
                  <p className="text-text-soft text-sm">Serão enviados sozinhos quando a internet voltar</p>
                </div>
              </>
            ) : (
              <>
                <span className="bg-primary-soft text-primary rounded-full p-2.5"><CircleCheck size={20} /></span>
                <div className="flex-1">
                  <p className="font-semibold">Tudo sincronizado</p>
                  <p className="text-text-soft text-sm">
                    {ultimoSync ? `Última vez em ${new Date(ultimoSync).toLocaleString('pt-BR')}` : 'Ainda sem sincronização por aqui'}
                  </p>
                </div>
              </>
            )}
            <Botao variante="secundaria" tamanho="pequeno" onClick={sincronizarAgora} disabled={sincronizando}>
              <RefreshCw size={16} className={sincronizando ? 'animate-spin' : ''} />
              Enviar agora
            </Botao>
          </div>

          {totalPendente > 0 && (
            <div className="divide-y divide-border border-t border-border pt-2">
              {pendencias.custos.map((item) => (
                <PendenciaLinha
                  key={`c${item.localId}`}
                  titulo={`Custo · ${rotulosCategoria[item.categoria] || item.categoria} · ${moeda(item.valor)}`}
                  subtitulo={`${item._numero_ferro_pendente ? `Ferro ${item._numero_ferro_pendente}` : 'Lote'} · ${formatarData(item.data)}`}
                  erro={item.ultimoErro}
                  aoDescartar={() => descartar('custo', item)}
                />
              ))}
              {pendencias.vendas.map((item) => (
                <PendenciaLinha
                  key={`v${item.localId}`}
                  titulo={`Venda · Ferro ${item._numero_ferro_pendente} · ${item.peso_saida_arr}@`}
                  subtitulo={formatarData(item.data_venda)}
                  erro={item.ultimoErro}
                  aoDescartar={() => descartar('venda', item)}
                />
              ))}
            </div>
          )}
        </Cartao>

        <p className="font-display text-lg font-semibold mb-2">Usuários</p>
        <Cartao className="mb-5 divide-y divide-border">
          {usuarios.map((usuario) => (
            <div key={usuario.id} className="py-2.5 first:pt-0 last:pb-0 flex justify-between items-center">
              <span className="font-medium">
                {usuario.nome}
                {usuario.id === sessao?.user?.id && <span className="text-primary text-sm font-semibold"> · você</span>}
              </span>
              <span className="text-text-soft text-sm">{usuario.papel === 'campo' ? 'Campo' : 'Sócio'}</span>
            </div>
          ))}
          {usuarios.length === 0 && <p className="text-text-soft text-center py-4">Nenhum usuário cadastrado ainda</p>}
        </Cartao>

        <p className="font-display text-lg font-semibold mb-2">Convidar alguém</p>
        <Cartao className="space-y-2">
          <p className="text-text-soft">
            Mande o link do app pra pessoa e peça pra tocar em <strong>"Criar conta"</strong> na tela de entrada.
            O nome e a função que ela preencher já entram sozinhos aqui na lista.
          </p>
          {CODIGO_CONVITE && (
            <p className="text-text-soft">
              Ela vai precisar do código de convite: <strong className="text-text">{CODIGO_CONVITE}</strong>
            </p>
          )}
        </Cartao>

        {erro && <div className="mt-4"><Alerta tipo="erro">{erro}</Alerta></div>}
        {mensagem && <div className="mt-4"><Alerta tipo="sucesso">{mensagem}</Alerta></div>}
      </div>
    </Tela>
  )
}

function PendenciaLinha({ titulo, subtitulo, erro, aoDescartar }) {
  return (
    <div className="py-2.5 flex items-center justify-between gap-2">
      <div className="min-w-0">
        <p className="font-medium truncate">{titulo}</p>
        <p className="text-sm text-text-soft">{subtitulo}</p>
        {erro && <p className="text-sm text-danger mt-0.5">Não enviado: {erro}</p>}
      </div>
      <button onClick={aoDescartar} aria-label="Descartar este lançamento pendente" className="p-2 text-text-soft rounded-full hover:bg-danger-soft hover:text-danger shrink-0">
        <Trash2 size={18} />
      </button>
    </div>
  )
}

export default Configuracoes
