import supabase from './supabaseClient.js'
import { useState } from 'react'
import { useNavigate, Link, Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { Input, Botao, Alerta, Campo } from './componentes/UI'
import CampoSenha from './componentes/CampoSenha'

function FormularioLogin() {
  const { sessao } = useAuth()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const navigate = useNavigate()

  if (sessao) return <Navigate to="/painel-principal" replace />

  async function fazerLogin(evento) {
    evento.preventDefault()
    setErro('')
    setCarregando(true)

    const resposta = await supabase.auth.signInWithPassword({ email, password: senha })

    setCarregando(false)

    if (resposta.error) {
      setErro('Email ou senha incorretos.')
      return
    }

    navigate('/painel-principal')
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-primary-dark to-primary px-5">
      <div className="w-full max-w-sm anima-entra">
        <div className="text-center mb-8">
          <p className="text-white/70 font-semibold tracking-[0.2em] text-sm mb-1">FAZENDA SANTOS</p>
          <h1 className="font-display text-3xl font-semibold text-white">Controle do gado</h1>
        </div>

        <form onSubmit={fazerLogin} className="bg-surface rounded-3xl shadow-xl p-6 space-y-4">
          <Campo rotulo="Email" id="email">
            <Input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Campo>

          <Campo rotulo="Senha" id="senha">
            <CampoSenha id="senha" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
          </Campo>

          {erro && <Alerta tipo="erro">{erro}</Alerta>}

          <Botao type="submit" disabled={carregando} className="w-full">
            {carregando ? 'Entrando...' : 'Entrar'}
          </Botao>

          <p className="text-center text-sm text-text-soft">
            Ainda não tem conta? <Link to="/criar-conta" className="text-primary font-semibold">Criar conta</Link>
          </p>
        </form>
      </div>
    </div>
  )
}

export default FormularioLogin
