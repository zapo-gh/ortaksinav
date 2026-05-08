
/**
 * Masa numarasını hesaplar.
 * @param {Object} masa - Masa objesi
 * @param {Array} tumSalonlar - Tüm salonların listesi
 * @returns {number|string} Hesaplanan masa numarası
 */
export const calculateDeskNumberForMasa = (masa, tumSalonlar) => {
    if (!masa || !tumSalonlar) return masa?.id + 1 || 1;

    // Tüm salonları kontrol et
    for (const salon of tumSalonlar) {
        if (salon.masalar && Array.isArray(salon.masalar)) {
            const allMasalar = salon.masalar;

            // Masa bu salonda mı?
            const foundMasa = allMasalar.find(m => m.id === masa.id);
            if (!foundMasa) continue;

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
                const sortedGrupMasalar = grupMasalar.sort((a, b) => {
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
        }
    }

    return masa.id + 1; // Fallback
};

/**
 * Salon yerleşim sonucundan öğrenci ID'sine göre yerleşim haritası oluşturur.
 * @param {Array} tumSalonlar - Tüm salonların listesi
 * @returns {Map} Öğrenci ID (string) -> { salonAdi, salonId, koltukNo }
 */
export const getPlacementMap = (tumSalonlar) => {
    const map = new Map(); // ID (string) -> { salonAdi, salonId, koltukNo }

    if (!tumSalonlar || !Array.isArray(tumSalonlar)) return map;

    for (const salon of tumSalonlar) {
        const salonAdi = salon.salonAdi || salon.ad || salon.id;

        // 1. Masaları Tara (Öncelikli Kaynak)
        if (Array.isArray(salon.masalar)) {
            for (const masa of salon.masalar) {
                if (masa?.ogrenci?.id != null) {
                    const koltukNo = masa.masaNumarasi || calculateDeskNumberForMasa(masa, tumSalonlar);
                    const ogrId = String(masa.ogrenci.id);

                    const info = {
                        salonAdi,
                        salonId: salon.id,
                        koltukNo,
                        placedStudentId: masa.ogrenci.id, // ID kontrolü için
                        placedStudentName: masa.ogrenci.ad + ' ' + masa.ogrenci.soyad // İsim kontrolü için
                    };
                    // DUPLICATE PROTECTION: İlk gelen kazanır (First Wins)
                    // Eğer öğrenci zaten bir yere yerleşmişse, ikinci kaydı (duplicate) haritaya işleme.
                    // Bu sayede yerleşim sırasına (salon adına) göre ilk bulunan yer geçerli olur.
                    if (!map.has(ogrId)) {
                        map.set(ogrId, info);
                    }

                    // Numara ile de erişim için
                    if (masa.ogrenci.numara) {
                        const numKey = `NUM:${masa.ogrenci.numara}`;
                        // Numarayı da ezme
                        if (!map.has(numKey)) {
                            map.set(numKey, info);
                        }
                    }
                }
            }
        }
    }
    return map;
};

/**
 * Öğrenci için yerleşim bilgisini güvenli bir şekilde çözer.
 * ID ve Numara çakışmalarını yönetir.
 * Eğer ID değişmişse İsim kontrolü yapar.
 * @param {Map} placementMap - getPlacementMap’ten dönen harita
 * @param {Object} student - Öğrenci objesi (id, numara, ad, soyad içerir)
 * @returns {Object|null} Yerleşim bilgisi veya null
 */
export const resolveStudentPlacement = (placementMap, student) => {
    if (!placementMap || !student) return null;

    const strId = String(student.id);

    // Helper: İsim benzerliği kontrolü (SIKI KONTROL - STRICT CHECK)
    const checkNameSimilarity = (globalName, placedName) => {
        const gName = (globalName || '').toLowerCase().trim();
        const pName = (placedName || '').toLowerCase().trim();

        if (!gName || !pName) return true; // İsim verisi yoksa ID/Numara'ya güvenmek zorundayız

        // 1. Tam Eşleşme (En güvenli)
        if (gName === pName) return true;

        // 2. Kapsayıcılık Kontrolü (İsim değişikliği veya kısaltma durumu için)
        // Ancak bu kontrolü yaparken kelime sınırlarına dikkat etmeliyiz.
        // Örn: "Ahmet" == "Ahmet Yılmaz" (OK) ama "Ahmet" != "Ahmetcan" (NOK)

        const gParts = gName.split(/\s+/);
        const pParts = pName.split(/\s+/);

        // En az ilk isimler EŞİT olmalı
        if (gParts[0] !== pParts[0]) return false;

        // Geri kalan kelimelerin en azından biri tutmalı veya biri diğerini içermeli
        // Basit kapsama kontrolü (gName pName'in içinde veya tam tersi)
        // Boşlukları ekleyerek kontrol etmek "Ahmet" -> "Ahmetcan" hatasını önler (" Ahmet " vs " Ahmetcan ")
        // Ancak en doğrusu kelime bazlı kontrol yerine basit "startsWith" ile yetinmemektir.

        // Şimdilik daha güvenli bir yöntem:
        // İsimlerden biri diğerinin tamamını kapsıyor mu?
        if (gName.includes(pName) || pName.includes(gName)) {
            return true;
        }

        return false;
    };

    const globalFullName = student.ad + ' ' + student.soyad;

    // STRATEJİ DEĞİŞİKLİĞİ: Önce NUMARA kontrolü (Saved Plan uyumluluğu için)
    // Çünkü Saved Plan'larda ID'ler eski kalmış olabilir ama Numaralar sabittir.

    // 1. Numara ile Eşleşme (ÖNCELİKLİ)
    if (student.numara) {
        const byNum = placementMap.get(`NUM:${student.numara}`);
        if (byNum) {
            // İsim Kontrolü (Numara Reuse Protection)
            // Eğer numara tutuyor ama isim tamamen farklıysa (örn: numara devredilmiş veya hatalı giriş)
            // yanlış kişiyi göstermemek için eşleşmeyi reddet.
            if (byNum.placedStudentName) {
                if (checkNameSimilarity(globalFullName, byNum.placedStudentName)) {
                    return byNum; // Numara ve İsim Tutuyor -> KESİN EŞLEŞME
                }
                // İsim tutmadı -> ID kontrolüne düş (belki numara yanlış girildi ama ID doğru?)
            } else {
                return byNum; // İsim verisi yok, Numaraya güven -> KABUL
            }
        }
    }

    // 2. ID ile Eşleşme (Yedek / Fallback)
    // Eğer numara yoksa veya numara eşleşmesi isimden dolayı reddedildiyse buraya gelir.
    if (student.id != null) {
        const byId = placementMap.get(strId);
        if (byId) {
            // ID Tutuyor ama İsim Tutuyor mu? (ID Reuse Protection)
            if (byId.placedStudentName) {
                if (checkNameSimilarity(globalFullName, byId.placedStudentName)) {
                    return byId; // ID ve İsim tutuyor -> KABUL
                }
            } else {
                return byId; // İsim verisi yok, ID'ye güven -> KABUL
            }
        }
    }

    return null;
};
