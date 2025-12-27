import logger from '../../utils/logger.js';
import { getNeighbors } from './helpers.js';

/**
 * Masa numaralarını hesaplar - Grup bazlı sıralama
 * 1.grup: Sıra1-Sol(1), Sıra1-Sağ(2), Sıra2-Sol(3), Sıra2-Sağ(4)...
 * 2.grup: Sıra1-Sol(5), Sıra1-Sağ(6), Sıra2-Sol(7), Sıra2-Sağ(8)...
 */
export const calculateDeskNumbersForMasalar = (masalar) => {
    if (!Array.isArray(masalar)) return [];

    // Grup bazlı sıralama
    const gruplar = {};
    masalar.forEach(masa => {
        const grup = masa.grup || 1;
        if (!gruplar[grup]) gruplar[grup] = [];
        gruplar[grup].push(masa);
    });

    let masaNumarasi = 1;
    const guncellenmisMasalar = [];
    const sortedGruplar = Object.keys(gruplar).sort((a, b) => parseInt(a) - parseInt(b));

    for (const grupId of sortedGruplar) {
        const grupMasalar = gruplar[grupId];

        // Grup içinde satır-sütun sıralaması
        const sortedGrupMasalar = grupMasalar.sort((a, b) => {
            if (a.satir !== b.satir) return a.satir - b.satir;
            return a.sutun - b.sutun;
        });

        for (const masa of sortedGrupMasalar) {
            guncellenmisMasalar.push({
                ...masa,
                masaNumarasi
            });
            masaNumarasi++;
        }
    }

    return guncellenmisMasalar;
};

/**
 * Salon için koltuk matrisi oluşturur - GRUP BAZLI SIRALAMA İÇİN
 */
export const createSalonKoltukMatrisi = (salon) => {
    if (!salon || !salon.siraDizilimi) {
        return { masalar: [], satirSayisi: 0, sutunSayisi: 0 };
    }

    const { satir, sutun } = salon.siraDizilimi;
    const masalar = [];

    // Grupları gez
    if (salon.gruplar) {
        Object.entries(salon.gruplar).forEach(([grupId, grupMasalar]) => {
            if (Array.isArray(grupMasalar)) {
                grupMasalar.forEach(masa => {
                    masalar.push({
                        ...masa,
                        grup: parseInt(grupId)
                    });
                });
            }
        });
    } else if (salon.masalar) {
        // Masalar listesi varsa
        masalar.push(...salon.masalar);
    }

    return {
        masalar,
        satirSayisi: satir,
        sutunSayisi: sutun
    };
};

/**
 * Koltuk sırasını belirler - İSTENEN SIRALAMA
 * 1. ÖNCE SOL KOLTUKLAR: Grup1-Sıra1-Sol, Grup2-Sıra1-Sol, Grup3-Sıra1-Sol, Grup4-Sıra1-Sol
 * 2. SONRA Grup1-Sıra2-Sol, Grup2-Sıra2-Sol, Grup3-Sıra2-Sol, Grup4-Sıra2-Sol
 * 3. TÜM SOL KOLTUKLARDAN SONRA SAĞ KOLTUKLAR
 */
export const getKoltukSira = (salon, seed) => {
    const { masalar } = createSalonKoltukMatrisi(salon);

    // Masaları tiplerine göre ayır
    const solKoltuklar = masalar.filter(m => m.koltukTipi === 'ikili-sol' || m.koltukTipi === 'tekli');
    const sagKoltuklar = masalar.filter(m => m.koltukTipi === 'ikili-sag');

    // Sıralama fonksiyonu: Önce satır, sonra grup
    const arrangeFunction = (a, b) => {
        if (a.satir !== b.satir) return a.satir - b.satir;
        return (a.grup || 1) - (b.grup || 1);
    };

    const siraliSol = solKoltuklar.sort(arrangeFunction);
    const siraliSag = sagKoltuklar.sort(arrangeFunction);

    return [...siraliSol, ...siraliSag];
};
