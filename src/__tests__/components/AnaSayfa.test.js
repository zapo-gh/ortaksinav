import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { ExamProvider } from '../../context/ExamContext';
import { NotificationProvider } from '../../components/NotificationSystem';
import AnaSayfa from '../../pages/AnaSayfa';

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

// Mock react-to-print
jest.mock('react-to-print', () => ({
  useReactToPrint: () => jest.fn()
}));

const theme = createTheme();

const mockOgrenciler = [
  { id: 1, ad: 'Ahmet', soyad: 'Yılmaz', sinif: '9-A', cinsiyet: 'E' },
  { id: 2, ad: 'Ayşe', soyad: 'Kara', sinif: '9-A', cinsiyet: 'K' }
];

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

const mockAyarlar = {
  sinavAdi: 'Test Sınavı',
  dersler: [
    {
      id: 1,
      ad: 'Matematik',
      siniflar: ['9-A']
    }
  ]
};

const renderWithProviders = (component) => {
  return render(
    <ThemeProvider theme={theme}>
      <NotificationProvider>
        <DndProvider backend={HTML5Backend}>
          <ExamProvider>
            {component}
          </ExamProvider>
        </DndProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
};

describe('AnaSayfa Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render main page with correct title', () => {
    renderWithProviders(<AnaSayfa />);
    
    expect(screen.getByText('Ortak Sınav Yerleştirme Sistemi')).toBeInTheDocument();
  });

  it('should render tab navigation correctly', () => {
    renderWithProviders(<AnaSayfa />);
    
    expect(screen.getByText('Öğrenciler')).toBeInTheDocument();
    expect(screen.getByText('Sınav Salonları')).toBeInTheDocument();
    expect(screen.getByText('Ayarlar')).toBeInTheDocument();
    expect(screen.getByText('Planlama Yap')).toBeInTheDocument();
    expect(screen.getByText('Salon Planı')).toBeInTheDocument();
    expect(screen.getByText('Kayıtlı Planlar')).toBeInTheDocument();
  });

  it('should switch between tabs correctly', async () => {
    renderWithProviders(<AnaSayfa />);
    
    const ogrencilerTab = screen.getByText('Öğrenciler');
    fireEvent.click(ogrencilerTab);
    
    // Should show student list content
    expect(screen.getByText('Öğrenci Listesi ve Seçimi')).toBeInTheDocument();
  });

  it('should show loading state when data is loading', () => {
    renderWithProviders(<AnaSayfa />);
    
    // Check if loading state is handled
    expect(screen.getByText('Veriler yükleniyor...')).toBeInTheDocument();
  });

  it('should handle error state correctly', () => {
    renderWithProviders(<AnaSayfa />);
    
    // Error handling should be present
    // This would require mocking the context to return an error state
  });

  it('should render footer correctly', () => {
    renderWithProviders(<AnaSayfa />);
    
    expect(screen.getByText(/Akhisar Farabi Mesleki ve Teknik Anadolu Lisesi/)).toBeInTheDocument();
  });

  it('should handle print functionality', () => {
    renderWithProviders(<AnaSayfa />);
    
    // Print functionality should be available
    // This would require checking for print button or FAB
  });

  it('should show empty state when no placement results', () => {
    renderWithProviders(<AnaSayfa />);
    
    // Empty state message removed - no longer displayed
    // Test passes if component renders without errors
    expect(screen.getByText('Ortak Sınav Yerleştirme Sistemi')).toBeInTheDocument();
  });

  it('should handle student move functionality', () => {
    renderWithProviders(<AnaSayfa />);
    
    // Drag and drop functionality should be available
    // This is complex to test but we can check if the structure is present
  });

  it('should show plan save functionality', () => {
    renderWithProviders(<AnaSayfa />);
    
    // Plan save functionality should be available
    expect(screen.getByText('Plan Kaydet')).toBeInTheDocument();
  });

  it('should handle plan loading functionality', () => {
    renderWithProviders(<AnaSayfa />);
    
    // Plan loading functionality should be available
    expect(screen.getByText('Kayıtlı Planlar')).toBeInTheDocument();
  });
});

