import { render, screen, fireEvent, waitFor } from '../../utils/test-utils';
import { createTheme } from '@mui/material/styles';
import PlanlamaYap from '../../components/PlanlamaYap';

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

// renderWithProviders removed

describe('PlanlamaYap Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render planning form', () => {
    render(
      <PlanlamaYap
        ogrenciler={mockOgrenciler}
        ayarlar={mockAyarlar}
        salonlar={mockSalonlar}
        onYerlestirmeYap={jest.fn()}
        yukleme={false}
      />
    );

    expect(screen.getByText('Sınav Yerleştirme Planlaması')).toBeInTheDocument();
  });

  it('should show loading state when yukleme is true', () => {
    render(
      <PlanlamaYap
        ogrenciler={mockOgrenciler}
        ayarlar={mockAyarlar}
        salonlar={mockSalonlar}
        onYerlestirmeYap={jest.fn()}
        yukleme={true}
      />
    );

    expect(screen.getByText('İşleniyor...')).toBeInTheDocument();
  });

  it('should show error when no students', () => {
    render(
      <PlanlamaYap
        ogrenciler={[]}
        ayarlar={mockAyarlar}
        salonlar={mockSalonlar}
        onYerlestirmeYap={jest.fn()}
        yukleme={false}
      />
    );

    expect(screen.getByText(/Öğrenci bulunamadı/)).toBeInTheDocument();
  });

  it('should show error when no active salons', () => {
    const inactiveSalonlar = [{ ...mockSalonlar[0], aktif: false }];

    render(
      <PlanlamaYap
        ogrenciler={mockOgrenciler}
        ayarlar={mockAyarlar}
        salonlar={inactiveSalonlar}
        onYerlestirmeYap={jest.fn()}
        yukleme={false}
      />
    );

    expect(screen.getByText(/Aktif salon bulunamadı/)).toBeInTheDocument();
  });

  it('should show error when no courses', () => {
    const emptyAyarlar = { ...mockAyarlar, dersler: [] };

    render(
      <PlanlamaYap
        ogrenciler={mockOgrenciler}
        ayarlar={emptyAyarlar}
        salonlar={mockSalonlar}
        onYerlestirmeYap={jest.fn()}
        yukleme={false}
      />
    );

    expect(screen.getByText(/Ders bulunamadı/)).toBeInTheDocument();
  });

  it('should call onYerlestirmeYap when start button is clicked', async () => {
    const mockOnYerlestirmeYap = jest.fn();

    render(
      <PlanlamaYap
        ogrenciler={mockOgrenciler}
        ayarlar={mockAyarlar}
        salonlar={mockSalonlar}
        onYerlestirmeYap={mockOnYerlestirmeYap}
        yukleme={false}
      />
    );

    const startButton = screen.getByText('Yerleştirme Başlat');
    fireEvent.click(startButton);

    expect(mockOnYerlestirmeYap).toHaveBeenCalled();
  });

  it('should show statistics when all requirements are met', () => {
    render(
      <PlanlamaYap
        ogrenciler={mockOgrenciler}
        ayarlar={mockAyarlar}
        salonlar={mockSalonlar}
        onYerlestirmeYap={jest.fn()}
        yukleme={false}
      />
    );

    expect(screen.getByText(/Toplam Öğrenci/)).toBeInTheDocument();
    expect(screen.getByText(/Toplam Salon/)).toBeInTheDocument();
    expect(screen.getByText(/Toplam Kapasite/)).toBeInTheDocument();
  });

  it('should disable start button when loading', () => {
    render(
      <PlanlamaYap
        ogrenciler={mockOgrenciler}
        ayarlar={mockAyarlar}
        salonlar={mockSalonlar}
        onYerlestirmeYap={jest.fn()}
        yukleme={true}
      />
    );

    const startButton = screen.getByText('İşleniyor...');
    expect(startButton).toBeDisabled();
  });

  it('should show validation summary', () => {
    render(
      <PlanlamaYap
        ogrenciler={mockOgrenciler}
        ayarlar={mockAyarlar}
        salonlar={mockSalonlar}
        onYerlestirmeYap={jest.fn()}
        yukleme={false}
      />
    );

    expect(screen.getByText('Kontrol Sonuçları')).toBeInTheDocument();
  });
});
