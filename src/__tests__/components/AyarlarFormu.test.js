import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { ExamProvider } from '../../context/ExamContext';
import { NotificationProvider } from '../../components/NotificationSystem';
import AyarlarFormu from '../../components/AyarlarFormu';

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

const mockAyarlar = {
  sinavAdi: 'Test Sınavı',
  sinavTarihi: '2024-12-01',
  sinavSaati: '09:00',
  dersler: [
    {
      id: 1,
      ad: 'Matematik',
      siniflar: ['9-A', '10-B']
    }
  ]
};

const mockOgrenciler = [
  { id: 1, ad: 'Ahmet', soyad: 'Yılmaz', sinif: '9-A' },
  { id: 2, ad: 'Ayşe', soyad: 'Kara', sinif: '10-B' }
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

describe('AyarlarFormu Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render settings form with existing data', () => {
    renderWithProviders(
      <AyarlarFormu 
        ayarlar={mockAyarlar}
        onAyarlarDegistir={jest.fn()}
        ogrenciler={mockOgrenciler}
      />
    );
    
    expect(screen.getByText('Sınav Ayarları')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Sınavı')).toBeInTheDocument();
  });

  it('should render empty form when no settings', () => {
    renderWithProviders(
      <AyarlarFormu 
        ayarlar={{}}
        onAyarlarDegistir={jest.fn()}
        ogrenciler={[]}
      />
    );
    
    expect(screen.getByText('Sınav Ayarları')).toBeInTheDocument();
    expect(screen.getByLabelText(/Sınav Adı/)).toBeInTheDocument();
  });

  it('should handle form input changes', async () => {
    const mockOnAyarlarDegistir = jest.fn();
    
    renderWithProviders(
      <AyarlarFormu 
        ayarlar={mockAyarlar}
        onAyarlarDegistir={mockOnAyarlarDegistir}
        ogrenciler={mockOgrenciler}
      />
    );
    
    const sinavAdiInput = screen.getByLabelText(/Sınav Adı/);
    fireEvent.change(sinavAdiInput, { target: { value: 'Yeni Sınav' } });
    
    expect(sinavAdiInput.value).toBe('Yeni Sınav');
  });

  it('should add new course when add button is clicked', async () => {
    const mockOnAyarlarDegistir = jest.fn();
    
    renderWithProviders(
      <AyarlarFormu 
        ayarlar={mockAyarlar}
        onAyarlarDegistir={mockOnAyarlarDegistir}
        ogrenciler={mockOgrenciler}
      />
    );
    
    const addButton = screen.getByText('Ders Ekle');
    fireEvent.click(addButton);
    
    // Check if new course form appears
    expect(screen.getByLabelText(/Ders Adı/)).toBeInTheDocument();
  });

  it('should display existing courses', () => {
    renderWithProviders(
      <AyarlarFormu 
        ayarlar={mockAyarlar}
        onAyarlarDegistir={jest.fn()}
        ogrenciler={mockOgrenciler}
      />
    );
    
    expect(screen.getByText('Matematik')).toBeInTheDocument();
  });

  it('should show class selection for courses', () => {
    renderWithProviders(
      <AyarlarFormu 
        ayarlar={mockAyarlar}
        onAyarlarDegistir={jest.fn()}
        ogrenciler={mockOgrenciler}
      />
    );
    
    expect(screen.getByText('9-A')).toBeInTheDocument();
    expect(screen.getByText('10-B')).toBeInTheDocument();
  });

  it('should handle course deletion', async () => {
    const mockOnAyarlarDegistir = jest.fn();
    
    renderWithProviders(
      <AyarlarFormu 
        ayarlar={mockAyarlar}
        onAyarlarDegistir={mockOnAyarlarDegistir}
        ogrenciler={mockOgrenciler}
      />
    );
    
    const deleteButton = screen.getByTitle('Dersi Sil');
    fireEvent.click(deleteButton);
    
    // Should show confirmation dialog
    expect(screen.getByText('Ders Silme Onayı')).toBeInTheDocument();
  });

  it('should handle form submission', async () => {
    const mockOnAyarlarDegistir = jest.fn();
    
    renderWithProviders(
      <AyarlarFormu 
        ayarlar={mockAyarlar}
        onAyarlarDegistir={mockOnAyarlarDegistir}
        ogrenciler={mockOgrenciler}
      />
    );
    
    const submitButton = screen.getByText('Ayarları Kaydet');
    fireEvent.click(submitButton);
    
    // Should call the callback function
    expect(mockOnAyarlarDegistir).toHaveBeenCalled();
  });

  it('should validate required fields', async () => {
    renderWithProviders(
      <AyarlarFormu 
        ayarlar={{}}
        onAyarlarDegistir={jest.fn()}
        ogrenciler={[]}
      />
    );
    
    const submitButton = screen.getByText('Ayarları Kaydet');
    fireEvent.click(submitButton);
    
    // Should show validation error
    expect(screen.getByText(/Sınav adı gerekli/)).toBeInTheDocument();
  });
});

