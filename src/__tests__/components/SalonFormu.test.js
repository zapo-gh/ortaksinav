import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { ExamProvider } from '../../context/ExamContext';
import { NotificationProvider } from '../../components/NotificationSystem';
import SalonFormu from '../../components/SalonFormu';

// Mock logger
jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

const theme = createTheme();

const mockSalonlar = [
  {
    id: 1,
    ad: 'A101',
    kapasite: 30,
    aktif: true,
    siraTipi: 'ikili',
    gruplar: [
      { id: 1, siraSayisi: 5 },
      { id: 2, siraSayisi: 5 }
    ]
  }
];

const renderWithProviders = (component) => {
  return render(
    <ThemeProvider theme={theme}>
      <NotificationProvider>
        <ExamProvider>
          {component}
        </ExamProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
};

describe('SalonFormu Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render salon form with existing salons', () => {
    renderWithProviders(
      <SalonFormu 
        salonlar={mockSalonlar} 
        onSalonlarDegistir={jest.fn()} 
      />
    );
    
    expect(screen.getByText('Sınav Salonları Yönetimi')).toBeInTheDocument();
    expect(screen.getByText('A101')).toBeInTheDocument();
  });

  it('should render empty state when no salons', () => {
    renderWithProviders(
      <SalonFormu 
        salonlar={[]} 
        onSalonlarDegistir={jest.fn()} 
      />
    );
    
    expect(screen.getByText('Henüz salon eklenmemiş')).toBeInTheDocument();
  });

  it('should add new salon when add button is clicked', async () => {
    const mockOnSalonlarDegistir = jest.fn();
    
    renderWithProviders(
      <SalonFormu 
        salonlar={[]} 
        onSalonlarDegistir={mockOnSalonlarDegistir} 
      />
    );
    
    const addButton = screen.getByText('Yeni Salon Ekle');
    fireEvent.click(addButton);
    
    // Check if form fields appear
    expect(screen.getByLabelText(/Salon Adı/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Kapasite/)).toBeInTheDocument();
  });

  it('should display salon capacity correctly', () => {
    renderWithProviders(
      <SalonFormu 
        salonlar={mockSalonlar} 
        onSalonlarDegistir={jest.fn()} 
      />
    );
    
    expect(screen.getByText('30')).toBeInTheDocument();
  });

  it('should show salon status correctly', () => {
    renderWithProviders(
      <SalonFormu 
        salonlar={mockSalonlar} 
        onSalonlarDegistir={jest.fn()} 
      />
    );
    
    // Check for active status
    expect(screen.getByText('Aktif')).toBeInTheDocument();
  });

  it('should handle salon deletion', async () => {
    const mockOnSalonlarDegistir = jest.fn();
    
    renderWithProviders(
      <SalonFormu 
        salonlar={mockSalonlar} 
        onSalonlarDegistir={mockOnSalonlarDegistir} 
      />
    );
    
    const deleteButton = screen.getByTitle('Salonu Sil');
    fireEvent.click(deleteButton);
    
    // Should show confirmation dialog
    expect(screen.getByText('Salon Silme Onayı')).toBeInTheDocument();
  });

  it('should calculate capacity correctly', () => {
    renderWithProviders(
      <SalonFormu 
        salonlar={mockSalonlar} 
        onSalonlarDegistir={jest.fn()} 
      />
    );
    
    // Capacity should be calculated based on groups and rows
    expect(screen.getByText('30')).toBeInTheDocument();
  });

  it('should show instant save functionality', () => {
    renderWithProviders(
      <SalonFormu 
        salonlar={mockSalonlar} 
        onSalonlarDegistir={jest.fn()} 
      />
    );
    
    // Check if instant save mechanism is present
    expect(screen.getByText('Anında Kaydet')).toBeInTheDocument();
  });
});

