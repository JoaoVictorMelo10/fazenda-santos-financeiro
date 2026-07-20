// Ícone de boi desenhado à mão (traço), no estilo dos ícones lucide:
// contorno de 2px, sem preenchimento, herda a cor via currentColor.
// Substitui a "patinha" genérica pra dar identidade de gado ao app.
export default function IconeBoi({ size = 24, strokeWidth = 2, ...props }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 24 24" fill="#ffffff" stroke="#1d5c3d" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
            <rect width="24" height="24" fill="#edf0e8" stroke="none" />
            <path d="M3.5 9
         C4 8 5 7.5 6.5 7.5
         C9 7.5 12 7.8 15 7.8
         C16 7 17 6.5 18 6.8
         L18.5 8
         C19.5 8.2 20.5 8.8 21 9.8
         C21.3 10.5 20.8 11 20 11
         C19.6 11 19.3 10.8 19 10.5
         C18.5 11 18 11.3 17.3 11.4
         C17.2 13 16.8 14.5 16.5 16
         L15 16
         C15 14.7 15.2 13.3 15.2 12
         C13 12.3 10.5 12.3 8.3 12
         C8.3 13.3 8.3 14.7 8.3 16
         L6.8 16
         C6.8 14.7 6.7 13.3 6.5 12
         C5.3 11.7 4.3 11 3.7 10
         C3.4 9.7 3.3 9.3 3.5 9 Z" />
            <path d="M15 16 L15 19.5" />
            <path d="M16.5 16 L16.8 19.5" />
            <path d="M6.8 16 L6.6 19.5" />
            <path d="M8.3 16 L8.3 19.5" />
            <path d="M3.6 9.3C3 10 2.8 12 3 14C3.1 15 3 15.8 2.7 16.3" />
            <path d="M18 6.8C18.2 6 18 5.2 17.3 4.8" />
            <path d="M15 7.8C15.3 7 16 6.6 16.8 6.7" />
            <path d="M18.3 9v.01" />
        </svg>
    )
}