// Ícone de boi desenhado à mão (traço), no estilo dos ícones lucide:
// contorno de 2px, sem preenchimento, herda a cor via currentColor.
// Substitui a "patinha" genérica pra dar identidade de gado ao app.
export default function IconeBoi({ size = 24, strokeWidth = 2, ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* chifres */}
      <path d="M6 8C3.5 8 2 6 2.5 3.5" />
      <path d="M18 8c2.5 0 4-2 3.5-4.5" />
      {/* orelhas */}
      <path d="M6 8C4.5 7.5 3.5 8 3 9.5" />
      <path d="M18 8c1.5-.5 2.5 0 3 1.5" />
      {/* topo da cabeça */}
      <path d="M6 8c0-2 2.7-3.5 6-3.5s6 1.5 6 3.5" />
      {/* laterais descendo pro focinho */}
      <path d="M6 8c0 3 1 5 2.5 6.2" />
      <path d="M18 8c0 3-1 5-2.5 6.2" />
      {/* focinho */}
      <path d="M8.5 14.2C8 15 8 16 8.7 16.8a5 5 0 0 0 6.6 0c.7-.8.7-1.8.2-2.6" />
      {/* narinas */}
      <path d="M10.5 16v.01" />
      <path d="M13.5 16v.01" />
      {/* olhos */}
      <path d="M9.5 10.5v.01" />
      <path d="M14.5 10.5v.01" />
    </svg>
  )
}