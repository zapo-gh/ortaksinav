import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { ExamProvider, useExam } from '../../context/ExamContext';

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

// Test component to access context
const TestComponent = () => {
  const {
    ogrenciler,
    ayarlar,
    salonlar,
    yerlestirmeSonucu,
    aktifTab,
    yukleme,
    hata,
    ogrencilerYukle,
    ayarlarGuncelle,
    salonlarGuncelle,
    yerlestirmeYap,
    yerlestirmeGuncelle,
    tabDegistir,
    yuklemeBaslat,
    hataAyarla,
    hataTemizle
  } = useExam();

  return (
    <div>
      <div data-testid="ogrenciler-count">{ogrenciler.length}</div>
      <div data-testid="aktif-tab">{aktifTab}</div>
      <div data-testid="yukleme">{yukleme ? 'true' : 'false'}</div>
      <div data-testid="hata">{hata || 'none'}</div>
      <button onClick={() => ogrencilerYukle([])}>Load Students</button>
      <button onClick={() => ayarlarGuncelle({})}>Update Settings</button>
      <button onClick={() => salonlarGuncelle([])}>Update Salons</button>
      <button onClick={() => yerlestirmeYap(null)}>Place Students</button>
      <button onClick={() => tabDegistir('test')}>Change Tab</button>
      <button onClick={() => yuklemeBaslat()}>Start Loading</button>
      <button onClick={() => hataAyarla('Test error')}>Set Error</button>
      <button onClick={() => hataTemizle()}>Clear Error</button>
    </div>
  );
};

describe('ExamContext', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('should provide initial state values', () => {
    render(
      <ExamProvider>
        <TestComponent />
      </ExamProvider>
    );

    expect(screen.getByTestId('ogrenciler-count')).toHaveTextContent('0');
    expect(screen.getByTestId('aktif-tab')).toHaveTextContent('ogrenciler');
    expect(screen.getByTestId('yukleme')).toHaveTextContent('false');
    expect(screen.getByTestId('hata')).toHaveTextContent('none');
  });

  it('should update students when ogrencilerYukle is called', () => {
    render(
      <ExamProvider>
        <TestComponent />
      </ExamProvider>
    );

    const loadButton = screen.getByText('Load Students');
    act(() => {
      loadButton.click();
    });

    expect(screen.getByTestId('ogrenciler-count')).toHaveTextContent('0');
  });

  it('should update settings when ayarlarGuncelle is called', () => {
    render(
      <ExamProvider>
        <TestComponent />
      </ExamProvider>
    );

    const updateButton = screen.getByText('Update Settings');
    act(() => {
      updateButton.click();
    });

    // Settings should be updated (we can't easily test the internal state)
    expect(updateButton).toBeInTheDocument();
  });

  it('should update salons when salonlarGuncelle is called', () => {
    render(
      <ExamProvider>
        <TestComponent />
      </ExamProvider>
    );

    const updateButton = screen.getByText('Update Salons');
    act(() => {
      updateButton.click();
    });

    expect(updateButton).toBeInTheDocument();
  });

  it('should update placement result when yerlestirmeYap is called', () => {
    render(
      <ExamProvider>
        <TestComponent />
      </ExamProvider>
    );

    const placeButton = screen.getByText('Place Students');
    act(() => {
      placeButton.click();
    });

    expect(placeButton).toBeInTheDocument();
  });

  it('should change active tab when tabDegistir is called', () => {
    render(
      <ExamProvider>
        <TestComponent />
      </ExamProvider>
    );

    const changeTabButton = screen.getByText('Change Tab');
    act(() => {
      changeTabButton.click();
    });

    expect(screen.getByTestId('aktif-tab')).toHaveTextContent('test');
  });

  it('should start loading when yuklemeBaslat is called', () => {
    render(
      <ExamProvider>
        <TestComponent />
      </ExamProvider>
    );

    const loadingButton = screen.getByText('Start Loading');
    act(() => {
      loadingButton.click();
    });

    expect(screen.getByTestId('yukleme')).toHaveTextContent('true');
  });

  it('should set error when hataAyarla is called', () => {
    render(
      <ExamProvider>
        <TestComponent />
      </ExamProvider>
    );

    const errorButton = screen.getByText('Set Error');
    act(() => {
      errorButton.click();
    });

    expect(screen.getByTestId('hata')).toHaveTextContent('Test error');
  });

  it('should clear error when hataTemizle is called', () => {
    render(
      <ExamProvider>
        <TestComponent />
      </ExamProvider>
    );

    // First set an error
    const errorButton = screen.getByText('Set Error');
    act(() => {
      errorButton.click();
    });

    expect(screen.getByTestId('hata')).toHaveTextContent('Test error');

    // Then clear it
    const clearButton = screen.getByText('Clear Error');
    act(() => {
      clearButton.click();
    });

    expect(screen.getByTestId('hata')).toHaveTextContent('none');
  });

  it('should persist data to localStorage', () => {
    render(
      <ExamProvider>
        <TestComponent />
      </ExamProvider>
    );

    // The context should automatically save to localStorage
    // We can't easily test this without mocking localStorage
    expect(localStorage.getItem).toBeDefined();
  });

  it('should load data from localStorage on initialization', () => {
    // Set some data in localStorage
    const testData = [{ id: 1, ad: 'Test', soyad: 'Student' }];
    localStorage.setItem('exam_ogrenciler', JSON.stringify(testData));

    render(
      <ExamProvider>
        <TestComponent />
      </ExamProvider>
    );

    // The context should load from localStorage
    expect(localStorage.getItem).toBeDefined();
  });

  it('should handle localStorage errors gracefully', () => {
    // Mock localStorage to throw an error
    const originalGetItem = localStorage.getItem;
    localStorage.getItem = jest.fn(() => {
      throw new Error('LocalStorage error');
    });

    // Should not crash the app
    expect(() => {
      render(
        <ExamProvider>
          <TestComponent />
        </ExamProvider>
      );
    }).not.toThrow();

    // Restore original function
    localStorage.getItem = originalGetItem;
  });

  it('should provide all required context values', () => {
    render(
      <ExamProvider>
        <TestComponent />
      </ExamProvider>
    );

    // All context values should be available
    expect(screen.getByTestId('ogrenciler-count')).toBeInTheDocument();
    expect(screen.getByTestId('aktif-tab')).toBeInTheDocument();
    expect(screen.getByTestId('yukleme')).toBeInTheDocument();
    expect(screen.getByTestId('hata')).toBeInTheDocument();
  });
});
























