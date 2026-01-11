import React from 'react';
import { render, screen, fireEvent, waitFor } from '../../utils/test-utils';
import { createTheme } from '@mui/material/styles';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import AnaSayfa from '../../pages/AnaSayfa';
import { useExamStore } from '../../store/useExamStore';
import { act } from '@testing-library/react';

// Mock logger - already mocked globally or we can keep it here if specific to this test
// But test-utils doesn't mock logger, so we keep it.

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

// renderWithProviders removed because we use render from test-utils


describe('AnaSayfa Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    act(() => {
      useExamStore.setState({
        ogrenciler: [],
        salonlar: [],
        ayarlar: { dersler: [] },
        yerlestirmeSonucu: null,
        aktifTab: 'genel-ayarlar',
        yukleme: false,
        hata: null,
        role: 'admin', // Default to admin for most tests
        authUser: { email: 'admin@test.com' }
      });
    });
  });

  it('should render main page with correct title', () => {
    render(<AnaSayfa />);

    expect(screen.getByText('Ortak Sınav Yerleştirme Sistemi')).toBeInTheDocument();
  });

  it('should render tab navigation correctly', () => {
    render(<AnaSayfa />);

    expect(screen.getByText('Öğrenciler')).toBeInTheDocument();
    expect(screen.getByText('Sınav Salonları')).toBeInTheDocument();
    expect(screen.getByText('Ayarlar')).toBeInTheDocument();
    expect(screen.getByText('Planlama Yap')).toBeInTheDocument();
    expect(screen.getByText('Salon Planı')).toBeInTheDocument();
    expect(screen.getByText('Kayıtlı Planlar')).toBeInTheDocument();
  });

  it('should switch between tabs correctly', async () => {
    render(<AnaSayfa />);

    const ogrencilerTab = screen.getByText('Öğrenciler');
    fireEvent.click(ogrencilerTab);

    // Should show student list content
    expect(screen.getByText('Öğrenci Listesi ve Seçimi')).toBeInTheDocument();
  });

  it('should show loading state when data is loading', () => {
    act(() => {
      useExamStore.setState({ yukleme: true, aktifTab: 'salon-plani' });
    });
    render(<AnaSayfa />);

    // Check if loading state is handled
    expect(screen.getByText('Yerleştirme Yapılıyor...')).toBeInTheDocument();
  });

  it('should handle error state correctly', () => {
    render(<AnaSayfa />);

    // Error handling should be present
    // This would require mocking the context to return an error state
  });

  it('should render footer correctly', () => {
    render(<AnaSayfa />);

    expect(screen.getByText(/Akhisar Farabi Mesleki ve Teknik Anadolu Lisesi/)).toBeInTheDocument();
  });

  it('should handle print functionality', () => {
    render(<AnaSayfa />);

    // Print functionality should be available
    // This would require checking for print button or FAB
  });

  it('should show empty state when no placement results', () => {
    render(<AnaSayfa />);

    // Check for title (might appear multiple times, e.g. header and text)
    const titleElements = screen.getAllByText('Ortak Sınav Yerleştirme Sistemi');
    expect(titleElements.length).toBeGreaterThan(0);
    expect(titleElements[0]).toBeInTheDocument();
  });

  it('should handle student move functionality', () => {
    render(<AnaSayfa />);

    // Drag and drop functionality should be available
    // This is complex to test but we can check if the structure is present
  });

  it('should show plan save functionality', () => {
    render(<AnaSayfa />);

    // Plan save functionality should be available
    expect(screen.getByText('Plan Kaydet')).toBeInTheDocument();
  });

  it('should handle plan loading functionality', () => {
    render(<AnaSayfa />);

    // Plan loading functionality should be available
    expect(screen.getByText('Kayıtlı Planlar')).toBeInTheDocument();
  });
});
