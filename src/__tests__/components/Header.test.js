import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import Header from '../../components/Header';

// Mock theme
const theme = createTheme();

const renderWithTheme = (component) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('Header Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render header with title', () => {
    renderWithTheme(<Header baslik="Test Başlık" />);
    
    expect(screen.getByText('Test Başlık')).toBeInTheDocument();
  });

  it('should render navigation buttons', () => {
    renderWithTheme(<Header baslik="Test" />);
    
    expect(screen.getByText('Ana Sayfa')).toBeInTheDocument();
    expect(screen.getByText('Sınavlar')).toBeInTheDocument();
    expect(screen.getByText('Öğrenciler')).toBeInTheDocument();
    expect(screen.getByText('Raporlar')).toBeInTheDocument();
  });

  it('should render user section', () => {
    renderWithTheme(<Header baslik="Test" />);
    
    expect(screen.getByText('Giriş Yap')).toBeInTheDocument();
  });

  it('should handle login button click', () => {
    renderWithTheme(<Header baslik="Test" />);
    
    const loginButton = screen.getByText('Giriş Yap');
    fireEvent.click(loginButton);
    
    // Login button should still be visible (no actual login logic)
    expect(screen.getByText('Giriş Yap')).toBeInTheDocument();
  });

  it('should be responsive', () => {
    renderWithTheme(<Header baslik="Test" />);
    
    // Check if responsive elements are present
    expect(screen.getByRole('button', { name: /menu/i })).toBeInTheDocument();
  });

  it('should display correct title when baslik prop is provided', () => {
    const customTitle = 'Özel Başlık';
    renderWithTheme(<Header baslik={customTitle} />);
    
    expect(screen.getByText(customTitle)).toBeInTheDocument();
  });

  it('should display default title when baslik prop is empty', () => {
    renderWithTheme(<Header baslik="" />);
    
    // Should still render the header structure
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });
});

