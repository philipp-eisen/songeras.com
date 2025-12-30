/// <reference types="vite/client" />

declare namespace React.JSX {
  interface IntrinsicElements {
    'hover-tilt': React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement> & {
        'tilt-factor'?: string | number
        'scale-factor'?: string | number
      },
      HTMLElement
    >
  }
}
