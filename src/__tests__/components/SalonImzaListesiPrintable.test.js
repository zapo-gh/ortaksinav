import React from 'react';
import { render, screen } from '@testing-library/react';
import { SalonImzaListesiPrintable } from '../../components/SalonImzaListesiPrintable';

describe('SalonImzaListesiPrintable', () => {
    const mockStudents = [
        { id: 1, ad: 'Ali', soyad: 'Veli', sinif: '9-A', dal: 'Ebe Yardımcılığı', masaNo: 1 },
        { id: 2, ad: 'Ayşe', soyad: 'Fatma', sinif: '9-B', dal: 'Hemşire Yardımcılığı', masaNo: 2 },
        { id: 3, ad: 'Mehmet', soyad: 'Can', sinif: '10-C', dal: 'Sağlık Bakım Teknisyenliği', masaNo: 3 },
        { id: 4, ad: 'Zeynep', soyad: 'Nur', sinif: '11-D', dal: 'Bilinmeyen Dal', masaNo: 4 },
        { id: 5, ad: 'Ahmet', soyad: 'Yılmaz', sinif: '12-E', dal: '', masaNo: 5 },
    ];

    const mockSalon = {
        id: 1,
        salonAdi: 'Salon A',
        ogrenciler: mockStudents,
        masalar: mockStudents.map(s => ({ ogrenci: s, masaNumarasi: s.masaNo })),
    };

    const mockYerlestirmeSonucu = {
        tumSalonlar: [mockSalon],
    };

    const mockAyarlar = {
        okulAdi: 'Test Okulu',
        egitimYili: '2025-2026',
        donem: '1',
        sinavDonemi: '1',
    };

    it('should render correct branch abbreviations', () => {
        render(
            <SalonImzaListesiPrintable
                yerlestirmeSonucu={mockYerlestirmeSonucu}
                ayarlar={mockAyarlar}
            />
        );

        // Check header
        expect(screen.getByText('Dal')).toBeInTheDocument();

        // Check content
        expect(screen.getByText('Ebe Yard.')).toBeInTheDocument();
        expect(screen.getByText('Hemş. Yard.')).toBeInTheDocument();
        expect(screen.getByText('Sağ. Bak. Tek.')).toBeInTheDocument();
    });

    it('should handle unknown and empty branches', () => {
        render(
            <SalonImzaListesiPrintable
                yerlestirmeSonucu={mockYerlestirmeSonucu}
                ayarlar={mockAyarlar}
            />
        );

        // Bilinmeyen dal (15 karaktere kadar gösterilmeli)
        // 'Bilinmeyen Dal' is 14 chars, so it should be shown as is
        expect(screen.getByText('Bilinmeyen Dal')).toBeInTheDocument();

        // Empty branch should show '-'
        const dashElements = screen.getAllByText('-');
        expect(dashElements.length).toBeGreaterThan(0);
    });

    it('should truncate long unknown branch names', () => {
        const longBranchStudent = [{ id: 6, ad: 'Uzun', soyad: 'Dal', sinif: '9-F', dal: 'Cok Uzun Bir Dal Ismi Bu', masaNo: 6 }];
        const mockSalon2 = { ...mockSalon, ogrenciler: longBranchStudent, masalar: [{ ogrenci: longBranchStudent[0], masaNumarasi: 6 }] };

        render(
            <SalonImzaListesiPrintable
                yerlestirmeSonucu={{ tumSalonlar: [mockSalon2] }}
                ayarlar={mockAyarlar}
            />
        );

        // "Cok Uzun Bir Dal Ismi Bu" -> "Cok Uzun Bir Da." (first 15 chars + .)
        // Cok Uzun Bir Da (15 chars)
        expect(screen.getByText('Cok Uzun Bir Da.')).toBeInTheDocument();
    });

    it('should fallback to tumOgrenciler for missing branch info', () => {
        // Öğrenci plan verisinde dal bilgisi yok
        const missingBranchStudent = [{ id: 7, ad: 'Eksik', soyad: 'Bilgi', sinif: '10-A', masaNo: 7 }];
        const mockSalon3 = { ...mockSalon, ogrenciler: missingBranchStudent, masalar: [{ ogrenci: missingBranchStudent[0], masaNumarasi: 7 }] };

        // Güncel öğrenci listesinde dal bilgisi var
        const currentStudents = [
            { id: 7, ad: 'Eksik', soyad: 'Bilgi', sinif: '10-A', dal: 'Ebe Yardımcılığı' }
        ];

        render(
            <SalonImzaListesiPrintable
                yerlestirmeSonucu={{ tumSalonlar: [mockSalon3] }}
                ayarlar={mockAyarlar}
                tumOgrenciler={currentStudents}
            />
        );

        // Güncel listeden "Ebe Yardımcılığı" -> "Ebe Yard." olarak gelmeli
        expect(screen.getByText('Ebe Yard.')).toBeInTheDocument();
    });

    it('should display branch statistics correctly', () => {
        render(
            <SalonImzaListesiPrintable
                yerlestirmeSonucu={mockYerlestirmeSonucu}
                ayarlar={mockAyarlar}
            />
        );

        // mockStudents verilerine göre:
        // Ebe Yardımcılığı (Ebe Yard.): 1
        // Hemşire Yardımcılığı (Hemş. Yard.): 1
        // Sağlık Bakım Teknisyenliği (Sağ. Bak. Tek.): 1
        // Bilinmeyen Dal: 1
        // Empty: 1

        // Ekranda "Dal Dağılımı:" textini bekle
        expect(screen.getByText(/Dal Dağılımı:/)).toBeInTheDocument();

        // Ebe Yard.: 1
        expect(screen.getByText(/Ebe Yard.: 1/)).toBeInTheDocument();
        // Hemş. Yard.: 1
        expect(screen.getByText(/Hemş. Yard.: 1/)).toBeInTheDocument();
        // Sağ. Bak. Tek.: 1
        expect(screen.getByText(/Sağ. Bak. Tek.: 1/)).toBeInTheDocument();
    });
});
