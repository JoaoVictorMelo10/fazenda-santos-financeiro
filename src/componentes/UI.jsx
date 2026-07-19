export function Botao({ variante = 'primaria', tamanho = 'normal', className = '', ...props }) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none'

  const tamanhos = {
    normal: 'px-5 py-3.5 text-base',
    pequeno: 'px-4 py-2.5 text-sm',
  }

  const variantes = {
    primaria: 'bg-primary text-white shadow-sm shadow-primary/25 hover:bg-primary-dark',
    secundaria: 'bg-white text-primary border-2 border-primary hover:bg-primary-soft',
    perigo: 'bg-danger text-white hover:bg-danger/90',
    fantasma: 'text-text-soft hover:bg-surface-2',
  }

  return <button className={`${base} ${tamanhos[tamanho]} ${variantes[variante]} ${className}`} {...props} />
}

export function Cartao({ className = '', as: Tag = 'div', ...props }) {
  return <Tag className={`bg-surface rounded-2xl border border-border p-5 shadow-[0_1px_2px_rgba(29,34,28,0.04)] ${className}`} {...props} />
}

/* Marca de ferro: o número do animal apresentado como uma marca
   carimbada — anel duplo, número em serifa. Assinatura visual do app. */
export function MarcaFerro({ numero, tamanho = 'normal' }) {
  const tamanhos = {
    normal: 'w-14 h-14 text-xl',
    grande: 'w-20 h-20 text-3xl',
    pequeno: 'w-11 h-11 text-base',
  }
  return (
    <span className={`${tamanhos[tamanho]} shrink-0 inline-flex items-center justify-center rounded-xl border-2 border-primary text-primary font-display font-bold numeros ring-2 ring-primary/15 ring-offset-2 ring-offset-surface bg-primary-soft/40`}>
      {numero}
    </span>
  )
}

const estilosSelo = {
  aberto: 'bg-primary-soft text-primary-dark',
  vendido: 'bg-info-soft text-info',
  perda: 'bg-danger-soft text-danger',
  pendente: 'bg-warn-soft text-warn',
}

export function Selo({ tipo = 'aberto', children }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${estilosSelo[tipo]}`}>
      {children}
    </span>
  )
}

export function Campo({ rotulo, dica, erro, children, id, className = '' }) {
  return (
    <label htmlFor={id} className={`block ${className}`}>
      <span className="block text-base font-semibold text-text mb-1.5">{rotulo}</span>
      {children}
      {dica && !erro && <span className="block text-sm text-text-soft mt-1">{dica}</span>}
      {erro && <span className="block text-sm text-danger font-medium mt-1">{erro}</span>}
    </label>
  )
}

export const classeInput =
  'w-full rounded-xl border-2 border-border bg-white px-4 py-3.5 text-base text-text placeholder:text-text-soft/70 focus:border-primary focus:outline-none transition-colors'

export function Input(props) {
  return <input className={classeInput} {...props} />
}

export function Select(props) {
  return <select className={classeInput} {...props} />
}

export function Alerta({ tipo = 'erro', children }) {
  const estilos = {
    erro: 'bg-danger-soft text-danger',
    aviso: 'bg-warn-soft text-warn',
    sucesso: 'bg-primary-soft text-primary-dark',
  }
  return <p className={`anima-pop rounded-xl px-4 py-3 text-base font-medium ${estilos[tipo]}`}>{children}</p>
}

export function EstadoVazio({ titulo, descricao }) {
  return (
    <div className="text-center py-12 px-4">
      <p className="font-display text-xl text-text mb-1">{titulo}</p>
      {descricao && <p className="text-text-soft">{descricao}</p>}
    </div>
  )
}

export function Esqueleto({ altura = 'h-20', className = '' }) {
  return <div className={`esqueleto ${altura} ${className}`} aria-hidden="true" />
}
