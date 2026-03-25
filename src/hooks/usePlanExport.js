import { useState, useCallback } from 'react';
import { useReactToPrint } from 'react-to-print';

export const usePlanExport = (
    salonPlaniPrintRef,
    sinifListesiPrintRef,
    salonImzaListesiPrintRef,
    ayarlar = {}
) => {
    // Dosya adı için tarih-saat verisini hazırla
    const getFileSuffix = () => {
        const tarih = ayarlar.sinavTarihi ? new Date(ayarlar.sinavTarihi).toLocaleDateString('tr-TR') : '';
        const saat = ayarlar.sinavSaati || '';
        return `${tarih} ${saat}`.trim();
    };
    const [printMenuAnchor, setPrintMenuAnchor] = useState(null);

    const handlePrintMenuOpen = (event) => {
        setPrintMenuAnchor(event.currentTarget);
    };

    const handlePrintMenuClose = () => {
        setPrintMenuAnchor(null);
    };

    const handleSalonPlaniPrint = useReactToPrint({
        contentRef: salonPlaniPrintRef,
        documentTitle: `Salon Planı ${getFileSuffix()}`,
        pageStyle: `
            @page {
                size: A4 landscape;
                margin: 10mm;
            }
            @media print {
                body {
                    -webkit-print-color-adjust: exact;
                }
            }
        `
    });

    const handleSinifListesiPrint = useReactToPrint({
        contentRef: sinifListesiPrintRef,
        documentTitle: `Sınıf Listesi ${getFileSuffix()}`,
        pageStyle: `
            @page {
                size: A4 portrait;
                margin: 10mm;
            }
            @media print {
                body {
                    -webkit-print-color-adjust: exact;
                }
            }
        `
    });

    const handleSalonImzaListesiPrint = useReactToPrint({
        contentRef: salonImzaListesiPrintRef,
        documentTitle: `Salon Öğrenci Listesi ${getFileSuffix()}`,
        pageStyle: `
            @page {
                size: A4 portrait;
                margin: 10mm;
            }
            @media print {
                body {
                    -webkit-print-color-adjust: exact;
                }
            }
        `
    });

    const handleSalonPlaniPrintClick = useCallback(() => {
        handleSalonPlaniPrint();
        handlePrintMenuClose();
    }, [handleSalonPlaniPrint]);

    const handleSinifListesiPrintClick = useCallback(() => {
        handleSinifListesiPrint();
        handlePrintMenuClose();
    }, [handleSinifListesiPrint]);

    const handleSalonImzaListesiPrintClick = useCallback(() => {
        handleSalonImzaListesiPrint();
        handlePrintMenuClose();
    }, [handleSalonImzaListesiPrint]);

    return {
        printMenuAnchor,
        handlePrintMenuOpen,
        handlePrintMenuClose,
        handleSalonPlaniPrintClick,
        handleSinifListesiPrintClick,
        handleSalonImzaListesiPrintClick
    };
};
