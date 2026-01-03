/**
 * Masa numarası hesaplama yardımcı fonksiyonları
 */

/**
 * Belirli bir masanın tüm masalar içindeki numarasını hesaplar.
 * Gruplara, satırlara ve sütunlara göre sıralama yapar.
 * 
 * @param {Object} masa - Numarası hesaplanacak masa
 * @param {Array} allMasalar - Tüm masaların listesi
 * @returns {number} Hesaplanan masa numarası
 */
export const calculateDeskNumber = (masa, allMasalar) => {
    if (!masa || !allMasalar || !Array.isArray(allMasalar)) return masa?.id + 1 || 1;

    // Grup bazlı gruplandırma
    const gruplar = {};
    allMasalar.forEach(m => {
        const grup = m.grup || 1;
        if (!gruplar[grup]) gruplar[grup] = [];
        gruplar[grup].push(m);
    });

    let masaNumarasi = 1;
    const sortedGruplar = Object.keys(gruplar).sort((a, b) => parseInt(a) - parseInt(b));

    for (const grupId of sortedGruplar) {
        const grupMasalar = gruplar[grupId];

        // Grup içinde satır-sütun sıralaması
        const sortedGrupMasalar = [...grupMasalar].sort((a, b) => {
            if (a.satir !== b.satir) return a.satir - b.satir;
            return a.sutun - b.sutun;
        });

        for (const m of sortedGrupMasalar) {
            if (m.id === masa.id) {
                return masaNumarasi;
            }
            masaNumarasi++;
        }
    }

    return masa.id + 1; // Fallback
};

/**
 * Masa listesindeki tüm masaların numaralarını günceller.
 * 
 * @param {Array} masalar - Numaralandırılacak masalar
 * @returns {Array} Numaralandırılmış masalar
 */
export const calculateDeskNumbersForList = (masalar) => {
    if (!masalar || !Array.isArray(masalar)) return [];

    return masalar.map(m => ({
        ...m,
        masaNumarasi: calculateDeskNumber(m, masalar)
    }));
};
