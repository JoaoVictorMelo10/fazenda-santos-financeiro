import { BrowserRouter, Routes, Route } from 'react-router-dom'

import FormularioLogin from "./Login"
import CadastroAnimais from "./CadastroAnimais"
import ListarAnimais from "./ListaAnimais"
import LancamentoCusto from "./LancamentoCusto"
import RegistroVenda from "./RegistroVenda"
import PainelPrincipal from "./PainelPrincipal"
import LancamentoVendas from './RegistroVenda'
import ExibirAnimal from './TelaDetalheAnimal'



function App() {

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<FormularioLogin/>} />


        <Route path='/cadastro-animais' element={<CadastroAnimais />} />
        <Route path='/lista-animais' element={<ListarAnimais />} />
        <Route path='/lancamento-custo' element={<LancamentoCusto />} />
        <Route path='/registro-venda' element={<RegistroVenda />} />
        <Route path='/painel-principal' element={<PainelPrincipal />} />
        <Route path='/animal/:numero_ferro' element={<ExibirAnimal/>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
