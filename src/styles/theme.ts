/**
 * Arnaout Store Design Tokens - Premium Apple-Inspired White & Blue Technology Theme
 * 
 * Centralized theme tokens ensuring consistent color application across storefront & admin.
 */

export const themeTokens = {
  colors: {
    // Backgrounds
    primaryBg: '#FFFFFF',
    secondaryBg: '#F5F8FC',
    cardBg: '#FFFFFF',
    cardSubtleBg: '#F8FAFC',
    inputBg: '#FFFFFF',

    // Primary Accents
    primaryBlue: '#007AFF',
    blueHover: '#0066D6',
    lightBlueAccent: '#EAF3FF',
    blueBorder: '#BAE6FD',
    blueGlow: 'rgba(0, 122, 255, 0.12)',

    // Typography
    primaryText: '#172033',
    secondaryText: '#64748B',
    mutedText: '#94A3B8',

    // Borders & Dividers
    borders: '#DCE5F0',
    subtleBorder: '#E2E8F0',

    // Semantic States
    success: '#16A34A',
    successLight: '#DCFCE7',
    error: '#DC2626',
    errorLight: '#FEE2E2',
    warning: '#D97706',
    warningLight: '#FEF3C7',
  },
  shadows: {
    subtle: '0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03)',
    card: '0 4px 16px -2px rgba(0, 122, 255, 0.06), 0 2px 6px -1px rgba(0, 0, 0, 0.04)',
    elevated: '0 10px 30px -4px rgba(0, 122, 255, 0.1), 0 4px 12px -2px rgba(0, 0, 0, 0.05)',
    blueGlow: '0 8px 24px -4px rgba(0, 122, 255, 0.25)',
  },
  radii: {
    sm: '0.5rem',
    md: '0.75rem',
    lg: '1rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    full: '9999px',
  },
} as const;

export type ThemeTokens = typeof themeTokens;
