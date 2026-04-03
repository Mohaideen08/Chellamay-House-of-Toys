import { createTheme } from '@mui/material/styles';

export const createAppTheme = ({ primary, secondary, bg, dark = false }) =>
  createTheme({
    palette: {
      mode: dark ? 'dark' : 'light',
      primary: { main: primary, contrastText: dark ? '#000' : '#fff' },
      secondary: { main: secondary, contrastText: dark ? '#000' : '#fff' },
      background: {
        default: bg,
        paper: dark ? '#1E1E2E' : '#fff',
      },
      text: {
        primary: dark ? '#E0E0E0' : '#1A1A2E',
        secondary: dark ? '#9E9E9E' : '#6B7280',
      },
      success: { main: '#22C55E' },
      warning: { main: '#F59E0B' },
      error: { main: '#EF4444' },
      info: { main: '#3B82F6' },
    },
    typography: {
      fontFamily: '"Poppins", "Inter", "Roboto", sans-serif',
      h4: { fontWeight: 700 },
      h5: { fontWeight: 700 },
      h6: { fontWeight: 600 },
      subtitle1: { fontWeight: 500 },
      subtitle2: { fontWeight: 500 },
      button: { fontWeight: 600, textTransform: 'none' },
    },
    shape: { borderRadius: 12 },
    components: {
      MuiCssBaseline: {
        styleOverrides: `
          @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap');
          * { box-sizing: border-box; }
          :root {
            --color-primary: ${primary};
            --color-secondary: ${secondary};
            --color-bg: ${bg};
          }
          ::-webkit-scrollbar { width: 6px; height: 6px; }
          ::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 10px; }
          ::-webkit-scrollbar-thumb { background: #C1C1C1; border-radius: 10px; }
          ::-webkit-scrollbar-thumb:hover { background: #A8A8A8; }
        `,
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            padding: '8px 20px',
            boxShadow: 'none',
            transition: 'all 0.25s ease',
            '&:hover': { boxShadow: '0 4px 14px rgba(0,0,0,0.15)', transform: 'translateY(-1px)' },
          },
          containedPrimary: {
            background: `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`,
            '&:hover': { background: `linear-gradient(135deg, ${secondary} 0%, ${primary} 100%)` },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
            border: '1px solid rgba(0,0,0,0.05)',
          },
        },
      },
      MuiPaper: {
        styleOverrides: { root: { borderRadius: 12 } },
      },
      MuiDialog: {
        styleOverrides: { paper: { borderRadius: 16 } },
      },
      MuiChip: {
        styleOverrides: { root: { borderRadius: 8, fontWeight: 500 } },
      },
      MuiTextField: {
        defaultProps: { size: 'small' },
        styleOverrides: {
          root: { '& .MuiOutlinedInput-root': { borderRadius: 10 } },
        },
      },
      MuiSelect: {
        styleOverrides: { root: { borderRadius: 10 } },
      },
      MuiDataGrid: {
        defaultProps: { rowHeight: 48 },
        styleOverrides: {
          root: { border: 'none' },
          columnHeaders: {
            borderRadius: '12px 12px 0 0',
            fontWeight: 700,
            backgroundColor: `${primary}18`,
          },
          columnHeader: {
            '&:focus': { outline: 'none !important' },
            '&:focus-within': { outline: 'none !important' },
          },
          cell: {
            display: 'flex',
            alignItems: 'center',
            borderColor: 'rgba(0,0,0,0.05)',
            outline: 'none !important',
            '&:focus': { outline: 'none !important' },
            '&:focus-within': { outline: 'none !important' },
          },
          row: {
            '&:hover': { backgroundColor: `${primary}0a` },
            '&.Mui-selected': { backgroundColor: 'transparent !important' },
            '&.Mui-selected:hover': { backgroundColor: `${primary}0a !important` },
          },
        },
      },
    },
  });

