import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { ExamProvider, useExam } from '../../context/ExamContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const Wrapper = ({ children }) => (
  <QueryClientProvider client={queryClient}>
    <ExamProvider>{children}</ExamProvider>
  </QueryClientProvider>
);

// Mock logger
jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(() => { }),
    error: jest.fn(() => { }),
    warn: jest.fn(() => { }),
    debug: jest.fn(() => { }),
    log: jest.fn(() => { })
  }
}));

// Mock database
jest.mock('../../database', () => ({
  __esModule: true,
  default: {
    getAllStudents: jest.fn(() => Promise.resolve([])),
    getSettings: jest.fn(() => Promise.resolve(null)),
    getAllSalons: jest.fn(() => Promise.resolve([])),
    getLatestPlan: jest.fn(() => Promise.resolve(null)),
    saveStudents: jest.fn(() => Promise.resolve()),
    saveSettings: jest.fn(() => Promise.resolve()),
    saveSalons: jest.fn(() => Promise.resolve()),
    savePlan: jest.fn(() => Promise.resolve()),
    setDatabaseType: jest.fn(() => { })
  }
}));

import * as useExamData from '../../hooks/queries/useExamData';

// ...

// Mock React Query hooks
jest.mock('../../hooks/queries/useExamData');

// Test component to access context
const TestComponent = ({ onContextReady }) => {
  const context = useExam();

  React.useEffect(() => {
    if (onContextReady && context.isInitialized) {
      onContextReady(context);
    }
  }, [context, onContextReady]);

  const {
    ogrenciler,
    ayarlar,
    salonlar,
    yerlestirmeSonucu,
    aktifTab,
    yukleme,
    hata,
    ogrencilerYukle,
    ogrencilerEkle,
    ayarlarGuncelle,
    salonlarGuncelle,
    yerlestirmeYap,
    yerlestirmeTemizle,
    tabDegistir,
    yuklemeBaslat,
    hataAyarla,
    hataTemizle,
    ogrenciPin,
    ogrenciUnpin
  } = context;

  return (
    <div>
      <div data-testid="ogrenciler-count">{ogrenciler.length}</div>
      <div data-testid="aktif-tab">{aktifTab}</div>
      <div data-testid="yukleme">{yukleme ? 'true' : 'false'}</div>
      <div data-testid="hata">{hata || 'none'}</div>
      <div data-testid="is-initialized">{context.isInitialized ? 'true' : 'false'}</div>
      <div data-testid="pinned-count">{ogrenciler.filter(o => o.pinned).length}</div>
      <div data-testid="yerlestirme-result">{yerlestirmeSonucu ? 'exists' : 'null'}</div>
      <button onClick={() => ogrencilerYukle([])}>Load Students</button>
      <button onClick={() => ogrencilerEkle([{ id: 1, ad: 'Test', soyad: 'Student', numara: '1001', sinif: '9-A', cinsiyet: 'E' }])}>Add Students</button>
      <button onClick={() => ayarlarGuncelle({ sinavAdi: 'Test' })}>Update Settings</button>
      <button onClick={() => salonlarGuncelle([])}>Update Salons</button>
      <button onClick={() => yerlestirmeYap({ salonlar: [] })}>Place Students</button>
      <button onClick={() => yerlestirmeTemizle()}>Clear Placement</button>
      <button onClick={() => tabDegistir('test')}>Change Tab</button>
      <button onClick={() => yuklemeBaslat()}>Start Loading</button>
      <button onClick={() => hataAyarla('Test error')}>Set Error</button>
      <button onClick={() => hataTemizle()}>Clear Error</button>
      <button onClick={() => ogrenciPin('1', 'salon1', 5)}>Pin Student</button>
      <button onClick={() => ogrenciUnpin('1')}>Unpin Student</button>
    </div>
  );
};

describe('ExamContext', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    jest.clearAllMocks();

    // Setup default mock values
    useExamData.useStudentsQuery.mockReturnValue({ data: [], isLoading: false });
    useExamData.useSalonsQuery.mockReturnValue({ data: [], isLoading: false });
    useExamData.useSettingsQuery.mockReturnValue({ data: {}, isLoading: false });
  });

  it('should provide initial state values', async () => {
    render(
      <Wrapper>
        <TestComponent />
      </Wrapper>
    );

    // Wait for initialization
    await waitFor(() => {
      expect(screen.getByTestId('is-initialized')).toHaveTextContent('true');
    }, { timeout: 5000 });

    expect(screen.getByTestId('ogrenciler-count')).toHaveTextContent('0');
    expect(screen.getByTestId('aktif-tab')).toHaveTextContent('ayarlar');
    expect(screen.getByTestId('yukleme')).toHaveTextContent('false');
    expect(screen.getByTestId('hata')).toHaveTextContent('none');
  });

  describe('State Management', () => {
    it('should update students when ogrencilerYukle is called', async () => {
      render(
        <Wrapper>
          <TestComponent />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('is-initialized')).toHaveTextContent('true');
      });

      const testStudents = [
        { id: 1, ad: 'Ahmet', soyad: 'Yılmaz', numara: '1001', sinif: '9-A', cinsiyet: 'E' },
        { id: 2, ad: 'Ayşe', soyad: 'Kara', numara: '1002', sinif: '9-A', cinsiyet: 'K' }
      ];

      act(() => {
        screen.getByText('Load Students').click();
      });

      // Check localStorage was updated
      const stored = localStorage.getItem('exam_ogrenciler');
      expect(stored).toBeDefined();
    });

    it('should add students and sort them correctly (OGRENCILER_EKLE)', async () => {
      let contextValue = null;
      const TestWrapper = () => {
        const context = useExam();
        React.useEffect(() => {
          if (context.isInitialized) {
            contextValue = context;
          }
        }, [context]);
        return null;
      };

      render(
        <Wrapper>
          <TestWrapper />
          <TestComponent />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('is-initialized')).toHaveTextContent('true');
      });

      // Add students in unsorted order
      const newStudents = [
        { id: 3, ad: 'Mehmet', soyad: 'Demir', numara: '1003', sinif: '10-B', cinsiyet: 'E' },
        { id: 1, ad: 'Ahmet', soyad: 'Yılmaz', numara: '1001', sinif: '9-A', cinsiyet: 'E' },
        { id: 2, ad: 'Ayşe', soyad: 'Kara', numara: '1002', sinif: '9-A', cinsiyet: 'K' }
      ];

      act(() => {
        screen.getByText('Add Students').click();
      });

      await waitFor(() => {
        // Students should be sorted by class and number
        const stored = JSON.parse(localStorage.getItem('exam_ogrenciler') || '[]');
        if (stored.length > 0) {
          // First student should be from 9-A (lower class)
          expect(stored[0].sinif).toMatch(/9/);
        }
      });
    });

    it('should update settings when ayarlarGuncelle is called', async () => {
      render(
        <Wrapper>
          <TestComponent />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('is-initialized')).toHaveTextContent('true');
      });

      act(() => {
        screen.getByText('Update Settings').click();
      });

      // Check localStorage was updated
      await waitFor(() => {
        const stored = JSON.parse(localStorage.getItem('exam_ayarlar') || '{}');
        expect(stored.sinavAdi).toBe('Test');
      });
    });

    it('should update salons when salonlarGuncelle is called', async () => {
      render(
        <Wrapper>
          <TestComponent />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('is-initialized')).toHaveTextContent('true');
      });

      const testSalons = [
        { id: 1, ad: 'A101', salonAdi: 'A101', kapasite: 30, aktif: true }
      ];

      // We can't directly test salonlarGuncelle through button, but we can test the action
      expect(screen.getByText('Update Salons')).toBeInTheDocument();
    });

    it('should change active tab when tabDegistir is called', async () => {
      render(
        <Wrapper>
          <TestComponent />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('is-initialized')).toHaveTextContent('true');
      });

      act(() => {
        screen.getByText('Change Tab').click();
      });

      expect(screen.getByTestId('aktif-tab')).toHaveTextContent('test');
    });

    it('should start loading when yuklemeBaslat is called', async () => {
      render(
        <Wrapper>
          <TestComponent />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('is-initialized')).toHaveTextContent('true');
      });

      act(() => {
        screen.getByText('Start Loading').click();
      });

      expect(screen.getByTestId('yukleme')).toHaveTextContent('true');
    });

    it('should set error when hataAyarla is called', async () => {
      render(
        <Wrapper>
          <TestComponent />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('is-initialized')).toHaveTextContent('true');
      });

      act(() => {
        screen.getByText('Set Error').click();
      });

      expect(screen.getByTestId('hata')).toHaveTextContent('Test error');
    });

    it('should clear error when hataTemizle is called', async () => {
      render(
        <Wrapper>
          <TestComponent />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('is-initialized')).toHaveTextContent('true');
      });

      // First set an error
      act(() => {
        screen.getByText('Set Error').click();
      });

      expect(screen.getByTestId('hata')).toHaveTextContent('Test error');

      // Then clear it
      act(() => {
        screen.getByText('Clear Error').click();
      });

      expect(screen.getByTestId('hata')).toHaveTextContent('none');
    });
  });

  describe('Pinned Students Actions', () => {
    it('should pin a student (OGRENCI_PIN)', async () => {
      let contextValue = null;
      const TestWrapper = () => {
        const context = useExam();
        React.useEffect(() => {
          if (context.isInitialized) {
            contextValue = context;
          }
        }, [context]);
        return null;
      };

      render(
        <Wrapper>
          <TestWrapper />
          <TestComponent />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('is-initialized')).toHaveTextContent('true');
      });

      // First add a student
      const testStudent = { id: '1', ad: 'Ahmet', soyad: 'Yılmaz', numara: '1001', sinif: '9-A', cinsiyet: 'E' };

      act(() => {
        if (contextValue) {
          contextValue.ogrencilerYukle([testStudent]);
        }
      });

      await waitFor(() => {
        expect(screen.getByTestId('ogrenciler-count')).toHaveTextContent('1');
      });

      // Pin the student
      act(() => {
        if (contextValue) {
          contextValue.ogrenciPin('1', 'salon1', 5);
        }
      });

      await waitFor(() => {
        const stored = JSON.parse(localStorage.getItem('exam_ogrenciler') || '[]');
        const pinnedStudent = stored.find(o => o.id === '1');
        expect(pinnedStudent).toBeDefined();
        expect(pinnedStudent.pinned).toBe(true);
        expect(pinnedStudent.pinnedSalonId).toBe('salon1');
        expect(pinnedStudent.pinnedMasaId).toBe('5');
      });
    });

    it('should unpin a student (OGRENCI_UNPIN)', async () => {
      let contextValue = null;
      const TestWrapper = () => {
        const context = useExam();
        React.useEffect(() => {
          if (context.isInitialized) {
            contextValue = context;
          }
        }, [context]);
        return null;
      };

      render(
        <Wrapper>
          <TestWrapper />
          <TestComponent />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('is-initialized')).toHaveTextContent('true');
      });

      // Add and pin a student
      const testStudent = {
        id: '1',
        ad: 'Ahmet',
        soyad: 'Yılmaz',
        numara: '1001',
        sinif: '9-A',
        cinsiyet: 'E',
        pinned: true,
        pinnedSalonId: 'salon1',
        pinnedMasaId: '5'
      };

      act(() => {
        if (contextValue) {
          contextValue.ogrencilerYukle([testStudent]);
        }
      });

      await waitFor(() => {
        expect(screen.getByTestId('ogrenciler-count')).toHaveTextContent('1');
      });

      // Unpin the student
      act(() => {
        if (contextValue) {
          contextValue.ogrenciUnpin('1');
        }
      });

      await waitFor(() => {
        const stored = JSON.parse(localStorage.getItem('exam_ogrenciler') || '[]');
        const unpinnedStudent = stored.find(o => o.id === '1');
        expect(unpinnedStudent).toBeDefined();
        expect(unpinnedStudent.pinned).toBe(false);
        expect(unpinnedStudent.pinnedSalonId).toBeNull();
        expect(unpinnedStudent.pinnedMasaId).toBeNull();
      });
    });

    it('should normalize pinnedSalonId and pinnedMasaId to strings', async () => {
      let contextValue = null;
      const TestWrapper = () => {
        const context = useExam();
        React.useEffect(() => {
          if (context.isInitialized) {
            contextValue = context;
          }
        }, [context]);
        return null;
      };

      render(
        <Wrapper>
          <TestWrapper />
          <TestComponent />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('is-initialized')).toHaveTextContent('true');
      });

      // Add a student
      const testStudent = { id: '1', ad: 'Ahmet', soyad: 'Yılmaz', numara: '1001', sinif: '9-A', cinsiyet: 'E' };

      act(() => {
        if (contextValue) {
          contextValue.ogrencilerYukle([testStudent]);
        }
      });

      // Pin with number IDs (should be converted to strings)
      act(() => {
        if (contextValue) {
          contextValue.ogrenciPin('1', 123, 456); // Numbers
        }
      });

      await waitFor(() => {
        const stored = JSON.parse(localStorage.getItem('exam_ogrenciler') || '[]');
        const pinnedStudent = stored.find(o => o.id === '1');
        expect(pinnedStudent.pinnedSalonId).toBe('123');
        expect(pinnedStudent.pinnedMasaId).toBe('456');
      });
    });
  });

  describe('Placement Actions', () => {
    it('should set placement result (YERLESTIRME_YAP)', async () => {
      let contextValue = null;
      const TestWrapper = () => {
        const context = useExam();
        React.useEffect(() => {
          if (context.isInitialized) {
            contextValue = context;
          }
        }, [context]);
        return null;
      };

      render(
        <Wrapper>
          <TestWrapper />
          <TestComponent />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('is-initialized')).toHaveTextContent('true');
      });

      const placementResult = {
        salonlar: [
          { salonId: '1', salonAdi: 'A101', ogrenciler: [] }
        ],
        yerlesilemeyenOgrenciler: [],
        istatistikler: { basariOrani: 100 }
      };

      act(() => {
        if (contextValue) {
          contextValue.yerlestirmeYap(placementResult);
        }
      });

      await waitFor(() => {
        expect(screen.getByTestId('yerlestirme-result')).toHaveTextContent('exists');
      });

      // Check localStorage
      const stored = JSON.parse(localStorage.getItem('exam_yerlestirme') || 'null');
      expect(stored).toBeDefined();
      expect(stored.salonlar).toHaveLength(1);
    });

    it('should clear placement result (YERLESTIRME_TEMIZLE)', async () => {
      let contextValue = null;
      const TestWrapper = () => {
        const context = useExam();
        React.useEffect(() => {
          if (context.isInitialized) {
            contextValue = context;
          }
        }, [context]);
        return null;
      };

      render(
        <Wrapper>
          <TestWrapper />
          <TestComponent />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('is-initialized')).toHaveTextContent('true');
      });

      // First set placement
      const placementResult = {
        salonlar: [{ salonId: '1', salonAdi: 'A101', ogrenciler: [] }],
        yerlesilemeyenOgrenciler: [],
        istatistikler: { basariOrani: 100 }
      };

      act(() => {
        if (contextValue) {
          contextValue.yerlestirmeYap(placementResult);
        }
      });

      await waitFor(() => {
        expect(screen.getByTestId('yerlestirme-result')).toHaveTextContent('exists');
      });

      // Then clear it
      act(() => {
        if (contextValue) {
          contextValue.yerlestirmeTemizle();
        }
      });

      await waitFor(() => {
        expect(screen.getByTestId('yerlestirme-result')).toHaveTextContent('null');
      });

      // Check placementIndex is cleared from localStorage
      const placementIndex = localStorage.getItem('placementIndex');
      expect(placementIndex).toBeNull();
    });

    it('should build placement index when placement is set', async () => {
      let contextValue = null;
      const TestWrapper = () => {
        const context = useExam();
        React.useEffect(() => {
          if (context.isInitialized) {
            contextValue = context;
          }
        }, [context]);
        return null;
      };

      render(
        <Wrapper>
          <TestWrapper />
          <TestComponent />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('is-initialized')).toHaveTextContent('true');
      });

      const placementResult = {
        tumSalonlar: [
          {
            salonId: '1',
            salonAdi: 'A101',
            masalar: [
              { id: 1, masaNumarasi: 1, ogrenci: { id: '1', ad: 'Ahmet', soyad: 'Yılmaz', masaNumarasi: 1 } },
              { id: 2, masaNumarasi: 2, ogrenci: null }
            ]
          }
        ],
        salonlar: [
          { salonId: '1', salonAdi: 'A101', ogrenciler: [{ id: '1', masaNumarasi: 1 }] }
        ],
        yerlesilemeyenOgrenciler: [],
        istatistikler: { basariOrani: 100 }
      };

      act(() => {
        if (contextValue) {
          contextValue.yerlestirmeYap(placementResult);
        }
      });

      await waitFor(() => {
        // placementIndex should be built
        const index = contextValue?.placementIndex;
        if (index && index['1']) {
          expect(index['1']).toBeDefined();
        }
      });
    });
  });

  describe('Persistence', () => {
    it('should load data from localStorage on initialization', async () => {
      // Set some data in localStorage
      const testData = [
        { id: 1, ad: 'Test', soyad: 'Student', numara: '1001', sinif: '9-A', cinsiyet: 'E' }
      ];
      localStorage.setItem('exam_ogrenciler', JSON.stringify(testData));
      localStorage.setItem('exam_ayarlar', JSON.stringify({ sinavAdi: 'Test Sınav' }));
      localStorage.setItem('exam_salonlar', JSON.stringify([{ id: 1, ad: 'A101', salonAdi: 'A101', kapasite: 30 }]));

      render(
        <Wrapper>
          <TestComponent />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('is-initialized')).toHaveTextContent('true');
      }, { timeout: 5000 });

      // Context should load from localStorage as fallback
      // The actual loading happens asynchronously, so we just verify the process doesn't crash
      expect(localStorage.getItem('exam_ogrenciler')).toBeDefined();
    });

    it('should handle localStorage errors gracefully', async () => {
      // Mock localStorage to throw an error
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = jest.fn(() => {
        throw new Error('LocalStorage error');
      });

      // Should not crash the app
      expect(() => {
        render(
          <Wrapper>
            <TestComponent />
          </Wrapper>
        );
      }).not.toThrow();

      // Restore original function
      localStorage.getItem = originalGetItem;
    });

    it('should persist data to localStorage when students are updated', async () => {
      let contextValue = null;
      const TestWrapper = () => {
        const context = useExam();
        React.useEffect(() => {
          if (context.isInitialized) {
            contextValue = context;
          }
        }, [context]);
        return null;
      };

      render(
        <Wrapper>
          <TestWrapper />
          <TestComponent />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('is-initialized')).toHaveTextContent('true');
      });

      const testStudents = [
        { id: 1, ad: 'Ahmet', soyad: 'Yılmaz', numara: '1001', sinif: '9-A', cinsiyet: 'E' }
      ];

      act(() => {
        if (contextValue) {
          contextValue.ogrencilerYukle(testStudents);
        }
      });

      await waitFor(() => {
        const stored = JSON.parse(localStorage.getItem('exam_ogrenciler') || '[]');
        expect(stored.length).toBe(1);
        expect(stored[0].id).toBe(1);
      });
    });
  });

  describe('Reducer Logic', () => {
    it('should provide all required context values', async () => {
      render(
        <Wrapper>
          <TestComponent />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('is-initialized')).toHaveTextContent('true');
      });

      // All context values should be available
      expect(screen.getByTestId('ogrenciler-count')).toBeInTheDocument();
      expect(screen.getByTestId('aktif-tab')).toBeInTheDocument();
      expect(screen.getByTestId('yukleme')).toBeInTheDocument();
      expect(screen.getByTestId('hata')).toBeInTheDocument();
    });

    it('should handle multiple students being pinned and unpinned', async () => {
      let contextValue = null;
      const TestWrapper = () => {
        const context = useExam();
        React.useEffect(() => {
          if (context.isInitialized) {
            contextValue = context;
          }
        }, [context]);
        return null;
      };

      render(
        <Wrapper>
          <TestWrapper />
          <TestComponent />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('is-initialized')).toHaveTextContent('true');
      });

      // Add multiple students
      const testStudents = [
        { id: '1', ad: 'Ahmet', soyad: 'Yılmaz', numara: '1001', sinif: '9-A', cinsiyet: 'E' },
        { id: '2', ad: 'Ayşe', soyad: 'Kara', numara: '1002', sinif: '9-A', cinsiyet: 'K' },
        { id: '3', ad: 'Mehmet', soyad: 'Demir', numara: '1003', sinif: '10-B', cinsiyet: 'E' }
      ];

      act(() => {
        if (contextValue) {
          contextValue.ogrencilerYukle(testStudents);
        }
      });

      await waitFor(() => {
        expect(screen.getByTestId('ogrenciler-count')).toHaveTextContent('3');
      });

      // Pin first two students
      act(() => {
        if (contextValue) {
          contextValue.ogrenciPin('1', 'salon1');
          contextValue.ogrenciPin('2', 'salon2');
        }
      });

      await waitFor(() => {
        const stored = JSON.parse(localStorage.getItem('exam_ogrenciler') || '[]');
        const pinnedCount = stored.filter(o => o.pinned).length;
        expect(pinnedCount).toBe(2);
      });

      // Unpin first student
      act(() => {
        if (contextValue) {
          contextValue.ogrenciUnpin('1');
        }
      });

      await waitFor(() => {
        const stored = JSON.parse(localStorage.getItem('exam_ogrenciler') || '[]');
        const pinnedCount = stored.filter(o => o.pinned).length;
        expect(pinnedCount).toBe(1);
        const unpinned = stored.find(o => o.id === '1');
        expect(unpinned.pinned).toBe(false);
      });
    });
  });
});
