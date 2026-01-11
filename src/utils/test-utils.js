import React from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ExamProvider } from '../context/ExamContext';
import { NotificationProvider } from '../components/NotificationSystem';
import { ThemeProvider, createTheme } from '@mui/material/styles';


// Create a custom render function that includes providers
const AllTheProviders = ({ children }) => {
    // Create a new QueryClient for each test to ensure isolation
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                staleTime: 0,
            },
        },
    });

    const theme = createTheme({
        palette: {
            primary: { main: '#1976d2' },
            secondary: { main: '#dc004e' },
        },
    });

    return (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider theme={theme}>
                <NotificationProvider>
                    <ExamProvider>
                        {children}
                    </ExamProvider>
                </NotificationProvider>
            </ThemeProvider>
        </QueryClientProvider>
    );
};

const customRender = (ui, options) =>
    render(ui, { wrapper: AllTheProviders, ...options });

// re-export everything
export * from '@testing-library/react';

// override render method
export { customRender as render };
