export const theme = {
  colors: {
    primary: '#00ff00',
    secondary: '#ff00ff',
    accent: '#00ffff',
    background: '#0a0e27',
    surface: '#111827',
    border: '#1f2937',
    text: '#ffffff',
  },
  fonts: {
    mono: 'Courier New, Courier, monospace',
  },
} as const

export type ThemeColors = keyof typeof theme.colors
