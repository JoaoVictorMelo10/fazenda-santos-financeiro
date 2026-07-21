import { BrowserRouter, Routes, Route } from 'react-router-dom'

import { AuthProvider } from './AuthContext'
import RotaProtegida from './RotaProtegida'

import FormularioLogin from "./Login"
import Cadastro from "./Cadastro"
import CadastroAnimais from "./CadastroAnimais"
import ListarAnimais from "./ListaAnimais"
import LancamentoCusto from "./LancamentoCusto"
import TelaCustosRebanho from "./TelaCustosRebanho"
import RegistroVenda from "./RegistroVenda"
import PainelPrincipal from "./PainelPrincipal"
import ExibirAnimal from './TelaDetalheAnimal'
import TelaDetalheLote from './TelaDetalheLote'
import ListaLotes from './ListaLotes'
import Relatorios from './Relatorios'
import Configuracoes from './Configuracoes'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<FormularioLogin />} />
          <Route path="/criar-conta" element={<Cadastro />} />

          <Route path='/painel-principal' element={<RotaProtegida><PainelPrincipal /></RotaProtegida>} />
          <Route path='/cadastro-animais' element={<RotaProtegida><CadastroAnimais /></RotaProtegida>} />
          <Route path='/lista-animais' element={<RotaProtegida><ListarAnimais /></RotaProtegida>} />
          <Route path='/lancamento-custo' element={<RotaProtegida><LancamentoCusto /></RotaProtegida>} />
          <Route path='/custos-rebanho' element={<RotaProtegida><TelaCustosRebanho /></RotaProtegida>} />
          <Route path='/registro-venda' element={<RotaProtegida><RegistroVenda /></RotaProtegida>} />
          <Route path='/animal/:numero_ferro' element={<RotaProtegida><ExibirAnimal /></RotaProtegida>} />
          <Route path='/lotes' element={<RotaProtegida><ListaLotes /></RotaProtegida>} />
          <Route path='/lote/:lote_id' element={<RotaProtegida><TelaDetalheLote /></RotaProtegida>} />
          <Route path='/relatorios' element={<RotaProtegida><Relatorios /></RotaProtegida>} />
          <Route path='/configuracoes' element={<RotaProtegida><Configuracoes /></RotaProtegida>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App