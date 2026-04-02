import React, { createContext, useContext, useState, useEffect } from 'react';

export const THEMES = [
  {
    key: 'pink',
    label: 'Pink Bloom',
    primary: '#E91E8C',
    secondary: '#9C27B0',
    bg: '#FDF0F9',
    logoFilter: 'invert(15%) sepia(95%) saturate(700%) hue-rotate(300deg) brightness(0.85)',
  },
  {
    key: 'blue',
    label: 'Ocean Blue',
    primary: '#1565C0',
    secondary: '#0288D1',
    bg: '#F0F4FF',
    logoFilter: 'invert(15%) sepia(95%) saturate(700%) hue-rotate(185deg) brightness(0.85)',
  },
  {
    key: 'green',
    label: 'Forest Green',
    primary: '#2E7D32',
    secondary: '#00897B',
    bg: '#F0FBF0',
    logoFilter: 'invert(15%) sepia(95%) saturate(700%) hue-rotate(95deg) brightness(0.85)',
  },
  {
    key: 'orange',
    label: 'Sunset Orange',
    primary: '#E65100',
    secondary: '#F57C00',
    bg: '#FFF8F0',
    logoFilter: 'invert(15%) sepia(95%) saturate(700%) hue-rotate(10deg) brightness(0.85)',
  },
  {
    key: 'purple',
    label: 'Deep Purple',
    primary: '#4527A0',
    secondary: '#7B1FA2',
    bg: '#F5F0FF',
    logoFilter: 'invert(15%) sepia(95%) saturate(700%) hue-rotate(230deg) brightness(0.85)',
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

