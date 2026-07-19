import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import supabase from './supabaseClient'
import { sincronizarPendencias, contarPendencias } from './lib/db'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [sessao, setSessao] = useState(undefined) // undefined = carregando, null = deslogado
  const [perfil, setPerfil] = useState(null)
  const [pendencias, setPendencias] = useState(0)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSessao(data.session ?? null))

    const { data: listener } = supabase.auth.onAuthStateChange((_evento, novaSessao) => {
      setSessao(novaSessao)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  const carregarPerfil = useCallback(async () => {
    if (!sessao) {
      setPerfil(null)
      return
    }
    const { data } = await supabase.from('perfis').select('*').eq('id', sessao.user.id).maybeSingle()

    if (data) {
      setPerfil(data)
      return
    }

    // Conta antiga, criada antes do gatilho de perfil automático:
    // monta o perfil na hora com o que a conta tem.
    const nome = sessao.user.user_metadata?.nome || sessao.user.email?.split('@')[0] || 'Usuário'
    const papel = sessao.user.user_metadata?.papel || 'socio'
    const { data: criado } = await supabase
      .from('perfis')
      .insert([{ id: sessao.user.id, nome, papel }])
      .select()
      .maybeSingle()
    setPerfil(criado || { id: sessao.user.id, nome, papel })
  }, [sessao])

  useEffect(() => { carregarPerfil() }, [carregarPerfil])

  useEffect(() => {
    if (!sessao) return

    async function tentarSincronizar() {
      await sincronizarPendencias(supabase)
      setPendencias(await contarPendencias())
    }

    tentarSincronizar()
    window.addEventListener('online', tentarSincronizar)
    const intervalo = setInterval(tentarSincronizar, 60000)

    return () => {
      window.removeEventListener('online', tentarSincronizar)
      clearInterval(intervalo)
    }
  }, [sessao])

  const logout = () => supabase.auth.signOut()

  return (
    <AuthContext.Provider value={{ sessao, perfil, pendencias, logout, recarregarPerfil: carregarPerfil }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
