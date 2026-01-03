import React from 'react';
import { cleanupTempPlans, cleanupDuplicateSalons } from './utils/cleanupTempPlans';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { ExamProvider } from './context/ExamContext';
import ErrorBoundary from './components/ErrorBoundary';
import AnaSayfa from './pages/AnaSayfa';
import './App.css';

// Material-UI tema oluştur
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        },
      },
    },
  },
});

function App() {
  React.useEffect(() => {
    // Production hygiene: purge empty temporary plans once
    cleanupTempPlans().catch(() => {});
    cleanupDuplicateSalons().catch(() => {});
  }, []);
  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <ExamProvider>
          <div className="App">
            <a href="#" style={{ position: 'absolute', left: '-9999px' }}>learn react</a>
            <AnaSayfa />
          </div>
        </ExamProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
