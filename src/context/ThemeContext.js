import React, { createContext, useContext, useState, useEffect } from 'react';

export const THEMES = [
  // ── Original 5 ──────────────────────────────────────────────────
  {
    key: 'pink',
    label: 'Pink Bloom',
    primary: '#E91E8C',
    secondary: '#9C27B0',
    bg: '#FDF0F9',
    dark: false,
    logoFilter: 'invert(15%) sepia(95%) saturate(700%) hue-rotate(300deg) brightness(0.85)',
  },
  {
    key: 'blue',
    label: 'Ocean Blue',
    primary: '#1565C0',
    secondary: '#0288D1',
    bg: '#F0F4FF',
    dark: false,
    logoFilter: 'invert(15%) sepia(95%) saturate(700%) hue-rotate(185deg) brightness(0.85)',
  },
  {
    key: 'green',
    label: 'Forest Green',
    primary: '#2E7D32',
    secondary: '#00897B',
    bg: '#F0FBF0',
    dark: false,
    logoFilter: 'invert(15%) sepia(95%) saturate(700%) hue-rotate(95deg) brightness(0.85)',
  },
  {
    key: 'orange',
    label: 'Sunset Orange',
    primary: '#E65100',
    secondary: '#F57C00',
    bg: '#FFF8F0',
    dark: false,
    logoFilter: 'invert(15%) sepia(95%) saturate(700%) hue-rotate(10deg) brightness(0.85)',
  },
  {
    key: 'purple',
    label: 'Deep Purple',
    primary: '#4527A0',
    secondary: '#7B1FA2',
    bg: '#F5F0FF',
    dark: false,
    logoFilter: 'invert(15%) sepia(95%) saturate(700%) hue-rotate(230deg) brightness(0.85)',
  },
  // ── 5 New Light Themes ──────────────────────────────────────────
  {
    key: 'red',
    label: 'Ruby Red',
    primary: '#C62828',
    secondary: '#E53935',
    bg: '#FFF5F5',
    dark: false,
    logoFilter: 'invert(15%) sepia(95%) saturate(700%) hue-rotate(340deg) brightness(0.85)',
  },
  {
    key: 'teal',
    label: 'Teal Wave',
    primary: '#00695C',
    secondary: '#0097A7',
    bg: '#F0FAFA',
    dark: false,
    logoFilter: 'invert(15%) sepia(95%) saturate(700%) hue-rotate(155deg) brightness(0.85)',
  },
  {
    key: 'indigo',
    label: 'Indigo Night',
    primary: '#283593',
    secondary: '#5C6BC0',
    bg: '#F0F2FF',
    dark: false,
    logoFilter: 'invert(15%) sepia(95%) saturate(700%) hue-rotate(210deg) brightness(0.85)',
  },
  {
    key: 'amber',
    label: 'Golden Amber',
    primary: '#F57F17',
    secondary: '#FF8F00',
    bg: '#FFFBF0',
    dark: false,
    logoFilter: 'invert(15%) sepia(95%) saturate(700%) hue-rotate(25deg) brightness(0.85)',
  },
  {
    key: 'rose',
    label: 'Rose Gold',
    primary: '#AD1457',
    secondary: '#C2185B',
    bg: '#FFF0F4',
    dark: false,
    logoFilter: 'invert(15%) sepia(95%) saturate(700%) hue-rotate(315deg) brightness(0.85)',
  },
  // ── Dark Mode ───────────────────────────────────────────────────
  {
    key: 'dark',
    label: 'Dark Mode',
    primary: '#BB86FC',
    secondary: '#03DAC6',
    bg: '#121212',
    dark: true,
    logoFilter: 'brightness(0) invert(1)',
  },
  {
    key: 'dark-blue',
    label: 'Dark Ocean',
    primary: '#64B5F6',
    secondary: '#4DD0E1',
    bg: '#0A1929',
    dark: true,
    logoFilter: 'brightness(0) invert(1)',
  },
  {
    key: 'dark-green',
    label: 'Dark Forest',
    primary: '#69F0AE',
    secondary: '#00E5FF',
    bg: '#0D1F0D',
    dark: true,
    logoFilter: 'brightness(0) invert(1)',
  },
];

// Hex to rgb channel helper
const hexToRgb = (hex) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
};

const ThemeCtx = createContext(null);

export const ThemeContextProvider = ({ children }) => {
  const [themeKey, setThemeKeyState] = useState(
    () => localStorage.getItem('appTheme') || 'pink'
  );

  const activeTheme = THEMES.find((t) => t.key === themeKey) || THEMES[0];

  // Inject CSS custom properties into :root on every theme change
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--color-primary', activeTheme.primary);
    root.style.setProperty('--color-secondary', activeTheme.secondary);
    root.style.setProperty('--color-bg', activeTheme.bg);
    root.style.setProperty('--color-primary-rgb', hexToRgb(activeTheme.primary));
    root.style.setProperty('--color-secondary-rgb', hexToRgb(activeTheme.secondary));
    // Dark mode body background
    document.body.style.backgroundColor = activeTheme.bg;
    document.body.setAttribute('data-theme-mode', activeTheme.dark ? 'dark' : 'light');
  }, [activeTheme]);

  const setThemeKey = (key) => {
    localStorage.setItem('appTheme', key);
    setThemeKeyState(key);
  };

  return (
    <ThemeCtx.Provider value={{ themeKey, setThemeKey, themes: THEMES, activeTheme }}>
      {children}
    </ThemeCtx.Provider>
  );
};

export const useThemeContext = () => useContext(ThemeCtx);

