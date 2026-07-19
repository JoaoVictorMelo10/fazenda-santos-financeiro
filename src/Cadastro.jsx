import supabase from './supabaseClient.js'
import { useState } from 'react'
import { Link, useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { Input, Select, Botao, Alerta, Campo } from './componentes/UI'
import CampoSenha from './componentes/CampoSenha'

const CODIGO_CONVITE = import.meta.env.VITE_CODIGO_CONVITE || ''

function Cadastro() {
  const { sessao } = useAuth()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [papel, setPapel] = useState('socio')
  const [codigo, setCodigo] = useState('')

  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const navigate = useNavigate()

  if (sessao && !sucesso) return <Navigate to="/painel-principal" replace />

  async function criarConta(evento) {
    evento.preventDefault()
    setErro('')

    if (CODIGO_CONVITE && codigo.trim().toUpperCase() !== CODIGO_CONVITE.toUpperCase()) {
      setErro('Código de convite incorreto. Peça o código pra quem te convidou.')
      return
    }

    setCarregando(true)

    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: { data: { nome: nome.trim(), papel } },
    })

    setCarregando(false)

    if (error) {
      setErro(error.message.includes('already registered') ? 'Esse email já tem uma conta.' : 'Erro ao criar conta: ' + error.message)
      return
    }

    if (data.session) {
      navigate('/painel-principal')
      return
    }

    setSucesso(true)
  }

  if (sucesso) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-primary-dark to-primary px-5">
        <div className="w-full max-w-sm bg-surface rounded-3xl shadow-xl p-6 text-center space-y-3 anima-pop">
          <h1 className="font-display text-2xl font-semibold">Confira seu email</h1>
          <p className="text-text-soft">Mandamos um link de confirmação pra <strong>{email}</strong>. Depois de confirmar, é só entrar.</p>
          <Link to="/" className="inline-block text-primary font-semibold">Voltar pro login</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-primary-dark to-primary px-5 py-10">
      <div className="w-full max-w-sm anima-entra">
        <div className="text-center mb-8">
          <p className="text-white/70 font-semibold tracking-[0.2em] text-sm mb-1">FAZENDA SANTOS</p>
          <h1 className="font-display text-3xl font-semibold text-white">Criar conta</h1>
        </div>

        <form onSubmit={criarConta} className="bg-surface rounded-3xl shadow-xl p-6 space-y-4">
          <Campo rotulo="Seu nome" id="nome" dica="É como você vai aparecer nos lançamentos">
            <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
          </Campo>

          <Campo rotulo="Email" id="email">
            <Input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Campo>

          <Campo rotulo="Senha" id="senha" dica="Pelo menos 6 letras ou números">
            <CampoSenha id="senha" autoComplete="new-password" minLength={6} value={senha} onChange={(e) => setSenha(e.target.value)} required />
          </Campo>

          <Campo rotulo="Função" id="papel">
            <Select id="papel" value={papel} onChange={(e) => setPapel(e.target.value)}>
              <option value="socio">Sócio</option>
              <option value="campo">Campo (usa offline)</option>
            </Select>
          </Campo>

          {CODIGO_CONVITE && (
            <Campo rotulo="Código de convite" id="codigo">
              <Input id="codigo" value={codigo} onChange={(e) => setCodigo(e.target.value)} required />
            </Campo>
          )}

          {erro && <Alerta tipo="erro">{erro}</Alerta>}

          <Botao type="submit" disabled={carregando} className="w-full">
            {carregando ? 'Criando...' : 'Criar conta'}
          </Botao>

          <p className="text-center text-sm text-text-soft">
            Já tem conta? <Link to="/" className="text-primary font-semibold">Entrar</Link>
          </p>
        </form>
      </div>
    </div>
  )
}

export default Cadastro
