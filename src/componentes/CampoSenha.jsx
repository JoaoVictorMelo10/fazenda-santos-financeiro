import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { classeInput } from './UI'

// Campo de senha com botão de mostrar/esconder — evita erro de digitação
// sem enxergar o que escreveu, comum em telas pequenas.
export default function CampoSenha({ id, ...props }) {
  const [visivel, setVisivel] = useState(false)
  return (
    <div className="relative">
      <input id={id} type={visivel ? 'text' : 'password'} className={`${classeInput} pr-12`} {...props} />
      <button
        type="button"
        onClick={() => setVisivel(!visivel)}
        aria-label={visivel ? 'Esconder senha' : 'Mostrar senha'}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-text-soft rounded-full hover:bg-surface-2"
      >
        {visivel ? <EyeOff size={22} /> : <Eye size={22} />}
      </button>
    </div>
  )
}
