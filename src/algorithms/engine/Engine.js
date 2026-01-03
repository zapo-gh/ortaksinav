import logger from '../../utils/logger.js';
import { getNeighbors, getSinifSeviyesi } from '../utils/helpers.js';
import { createSalonKoltukMatrisi, getKoltukSira } from '../utils/layout.js';
import { isGenderValid, isClassLevelValid, isBackToBackClassLevelValid } from '../validation/constraints.js';

class GelismisYerlestirmeMotoru {
    constructor(salon, ogrenciler, ayarlar, seed, weightManager = null) {
        this.salon = salon;
        this.ogrenciler = [...ogrenciler];
        this.ayarlar = ayarlar;
        this.seed = seed;
        this.koltukMatrisi = createSalonKoltukMatrisi(salon);
        this.plan = this.initPlan();
        this.plan2D = this.init2DPlan();
        this.oncelikliKoltuklar = [];
        this.zorKoltuklar = new Set();
        this.weightManager = weightManager; // YENİ: WeightManager referansı
    }

    initPlan() {
        return this.koltukMatrisi.masalar.map(masa => ({
            id: masa.id,
            ogrenci: null,
            satir: masa.satir,
            sutun: masa.sutun,
            grup: masa.grup,
            koltukTipi: masa.koltukTipi,
            masaNumarasi: masa.masaNumarasi // masaNumarasi ekle
        }));
    }

    init2DPlan() {
        return Array(this.koltukMatrisi.satirSayisi)
            .fill(null)
            .map(() => Array(this.koltukMatrisi.sutunSayisi).fill(null));
    }

    /**
     * Akıllı koltuk önceliklendirme
     */
    calculateKoltukOncelikleri() {
        const koltukSirasi = getKoltukSira(this.salon, this.seed);

        // Koltuk sırasını masa numaralarıyla eşleştir
        const masalarMap = {};
        this.koltukMatrisi.masalar.forEach(masa => {
            masalarMap[masa.id] = masa;
        });

        // İSTENEN DÜZENİ KORU: Sıralamayı değiştirme, getKoltukSira'nın düzenini kullan
        this.oncelikliKoltuklar = koltukSirasi.map((koltuk, index) => {
            // Masadan masa numarasını al
            const masaWithNumber = masalarMap[koltuk.id] || koltuk;

            const komsular = getNeighbors(koltuk.satir, koltuk.sutun,
                this.koltukMatrisi.satirSayisi, this.koltukMatrisi.sutunSayisi);

            return {
                ...koltuk,
                masaNumarasi: masaWithNumber.masaNumarasi, // masaNumarasi ekle
                komsular,
                siraNo: index // Sıra numarasını koru
            };
        });
        // SIRALAMAYI DEĞİŞTİRME - getKoltukSira'nın düzenini kullan

        logger.debug(`🎯 Koltuk öncelikleri hesaplandı: ${this.oncelikliKoltuklar.length} koltuk`);
    }

    calculateZorlukSkoru(koltuk, komsular) {
        let skor = 0;

        // Komşu sayısı - daha fazla komşu = daha zor
        skor += komsular.length * 2;

        // Köşe koltukları daha kolay (daha az komşu)
        if (koltuk.satir === 0 || koltuk.satir === this.koltukMatrisi.satirSayisi - 1) {
            skor -= 1;
        }
        if (koltuk.sutun === 0 || koltuk.sutun === this.koltukMatrisi.sutunSayisi - 1) {
            skor -= 1;
        }

        // İkili koltuklarda sağ koltuk daha zor (sol komşu zorunlu)
        if (koltuk.koltukTipi === 'ikili-sag') {
            skor += 1;
        }

        return Math.max(skor, 0);
    }

    /**
     * Çok katmanlı kısıt kontrolü - KADEMELİ AZALAN KONTROL SİSTEMİ
     */
    checkKisitlar(ogrenci, koltuk, komsular, katmanSeviyesi = 0) {
        const tempOgrenci = { ...ogrenci, satir: koltuk.satir };

        // Katman 0: TÜM KISITLAR AKTİF (En sıkı kontrol)
        if (katmanSeviyesi === 0) {
            const cinsiyetOK = isGenderValid(tempOgrenci, komsular, this.plan2D, koltuk.grup);
            const sinifOK = isClassLevelValid(tempOgrenci, komsular, this.plan2D, koltuk.grup);
            const arkaArkayaOK = isBackToBackClassLevelValid(tempOgrenci, koltuk, this.plan2D, koltuk.grup);

            logger.debug(`🔍 Katman 0 kontrolü: Cinsiyet=${cinsiyetOK}, Sınıf=${sinifOK}, ArkaArkaya=${arkaArkayaOK}`);
            return cinsiyetOK && sinifOK && arkaArkayaOK;
        }

        // Katman 1: ARKA ARKAYA KISITI KALDIRILDI (Cinsiyet + Yan yana sınıf)
        if (katmanSeviyesi === 1) {
            const cinsiyetOK = isGenderValid(tempOgrenci, komsular, this.plan2D, koltuk.grup);
            const sinifOK = isClassLevelValid(tempOgrenci, komsular, this.plan2D, koltuk.grup);
            // Arka arkaya kontrol kaldırıldı

            logger.debug(`🔍 Katman 1 kontrolü: Cinsiyet=${cinsiyetOK}, Sınıf=${sinifOK}, ArkaArkaya=ATLANDI`);
            return cinsiyetOK && sinifOK;
        }

        // Katman 2: SADECE CİNSİYET KISITI (En gevşek kontrol)
        if (katmanSeviyesi === 2) {
            const cinsiyetOK = isGenderValid(tempOgrenci, komsular, this.plan2D, koltuk.grup);
            // Sınıf seviyesi ve arka arkaya kontrolleri kaldırıldı

            logger.debug(`🔍 Katman 2 kontrolü: Cinsiyet=${cinsiyetOK}, Sınıf=ATLANDI, ArkaArkaya=ATLANDI`);
            return cinsiyetOK;
        }

        return true;
    }

    /**
     * Uygun öğrenci bulma (optimize) - İYİLEŞTİRİLMİŞ: AI Destekli Skorlama
     */
    findUygunOgrenci(koltuk, komsular, katmanSeviyesi) {
        // YENİ: AI destekli gelişmiş skorlama (weightManager varsa)
        const skorluOgrenciler = this.ogrenciler.map(ogrenci => {
            let skor;

            if (this.weightManager) {
                // AI destekli gelişmiş skorlama
                skor = this.weightManager.calculateAIEnhancedScore(ogrenci, koltuk, komsular, this.plan2D);
            } else {
                // Mevcut tahminsel skorlama
                skor = this.calculatePredictiveScore(ogrenci, koltuk, komsular);
            }

            return { ogrenci, skor };
        }).sort((a, b) => b.skor - a.skor);

        // En iyi 3 adayı logla (debug için)
        if (skorluOgrenciler.length > 0) {
            logger.debug(`🎯 En iyi 3 aday (Sıra${koltuk.satir + 1}-Grup${koltuk.grup}):`);
            skorluOgrenciler.slice(0, 3).forEach((c, i) => {
                logger.debug(`   ${i + 1}. ${c.ogrenci.ad} - Skor: ${c.skor.toFixed(3)}`);
            });
        }

        for (const { ogrenci } of skorluOgrenciler) {
            if (this.checkKisitlar(ogrenci, koltuk, komsular, katmanSeviyesi)) {
                return ogrenci;
            }
        }
        return null;
    }

    /**
     * YENİ: Tahminsel skor hesaplama
     */
    calculatePredictiveScore(ogrenci, koltuk, komsular) {
        // Temel uygunluk skoru
        const baseScore = this.calculateUygunlukSkoru(ogrenci, koltuk, komsular);

        // Tahminsel faktör ekle (DynamicWeightManager'dan)
        const predictiveBonus = this.weightManager ?
            this.weightManager.predictiveFactor(ogrenci) : 0;

        // Komşu analizi bonusu
        const neighborBonus = this.calculateNeighborBonus(ogrenci, komsular, koltuk);

        // Final skor
        const finalScore = baseScore + predictiveBonus + neighborBonus;

        return Math.max(0, Math.min(1, finalScore)); // 0-1 aralığında sınırla
    }

    /**
     * YENİ: Komşu analizi bonusu
     */
    calculateNeighborBonus(ogrenci, komsular, koltuk) {
        let bonus = 0;

        // Boş komşu sayısı
        const emptyNeighbors = komsular.filter(([satir, sutun]) => {
            if (satir !== koltuk.satir) return false;
            const cell = this.plan2D[satir]?.[sutun];
            if (!cell || cell.grup !== koltuk.grup) return false;
            return !cell?.ogrenci;
        }).length;
        bonus += emptyNeighbors * 0.05; // Her boş komşu için +0.05

        // Cinsiyet çeşitliliği bonusu
        const genderDiversity = this.calculateGenderDiversity(ogrenci, komsular, koltuk);
        bonus += genderDiversity * 0.1;

        // Sınıf çeşitliliği bonusu
        const classDiversity = this.calculateClassDiversity(ogrenci, komsular, koltuk);
        bonus += classDiversity * 0.05;

        return bonus;
    }

    /**
     * YENİ: Cinsiyet çeşitliliği hesapla
     */
    calculateGenderDiversity(ogrenci, komsular, koltuk) {
        if (!ogrenci.cinsiyet) return 0;

        const neighborGenders = komsular
            .map(([satir, sutun]) => {
                if (satir !== koltuk.satir) return null;
                const cell = this.plan2D[satir]?.[sutun];
                if (cell?.grup !== koltuk.grup) return null;
                return cell?.ogrenci?.cinsiyet || null;
            })
            .filter(Boolean);

        if (neighborGenders.length === 0) return 0.5; // Boş komşular için orta bonus

        const differentGenders = neighborGenders.filter(gender =>
            gender !== ogrenci.cinsiyet
        ).length;

        return differentGenders / neighborGenders.length; // 0-1 arası çeşitlilik
    }

    /**
     * YENİ: Sınıf çeşitliliği hesapla
     */
    calculateClassDiversity(ogrenci, komsular, koltuk) {
        if (!ogrenci.sinif) return 0;

        const neighborClasses = komsular
            .map(([satir, sutun]) => {
                if (satir !== koltuk.satir) return null;
                const cell = this.plan2D[satir]?.[sutun];
                if (cell?.grup !== koltuk.grup) return null;
                return cell?.ogrenci?.sinif || null;
            })
            .filter(Boolean);

        if (neighborClasses.length === 0) return 0.3; // Boş komşular için düşük bonus

        const differentClasses = neighborClasses.filter(sinif =>
            sinif !== ogrenci.sinif
        ).length;

        return differentClasses / neighborClasses.length; // 0-1 arası çeşitlilik
    }

    calculateUygunlukSkoru(ogrenci, koltuk, komsular) {
        let skor = 0;

        // Mevcut komşularla uyum
        for (const [satir, sutun] of komsular) {
            const cell = this.plan2D[satir] && this.plan2D[satir][sutun];
            if (satir !== koltuk.satir || cell?.grup !== koltuk.grup) continue;
            const komsuOgrenci = cell?.ogrenci;
            if (komsuOgrenci) {
                // Farklı cinsiyet + puan
                if (komsuOgrenci.cinsiyet !== ogrenci.cinsiyet) {
                    skor += 2;
                }
                // Farklı sınıf + puan
                if (getSinifSeviyesi(komsuOgrenci.sinif) !== getSinifSeviyesi(ogrenci.sinif)) {
                    skor += 1;
                }
            } else {
                // Boş komşu + puan (daha esnek)
                skor += 1;
            }
        }

        return skor;
    }

    /**
     * Yerleştirme işlemini çalıştır (ana entry point)
     */
    run() {
        // Orijinal öğrenci listesini sakla
        const orijinalOgrenciler = [...this.ogrenciler];

        // Yerleştirme yap
        const yerlesenOgrenciler = this.executeYerlestirme();

        // KRİTİK DÜZELTME: Plan'dan gerçek yerleşen öğrencileri çıkar (koltuk bilgileriyle birlikte)
        const planOgrencileri = this.plan
            .filter(p => p.ogrenci !== null)
            .map(p => p.ogrenci);

        // Yerleştirilemeyen öğrencileri bul
        const yerlesenIdler = new Set(planOgrencileri.map(o => o.id));
        const yerlesilemeyenOgrenciler = orijinalOgrenciler.filter(o => !yerlesenIdler.has(o.id));

        const basariOrani = orijinalOgrenciler.length > 0
            ? (planOgrencileri.length / orijinalOgrenciler.length) * 100
            : 100;

        // GÜVENLİK: yerlesenOgrenciler ve planOgrencileri sayıları eşit mi kontrol et
        if (yerlesenOgrenciler.length !== planOgrencileri.length) {
            logger.warn(`⚠️ UYARI: yerlesenOgrenciler (${yerlesenOgrenciler.length}) ve planOgrencileri (${planOgrencileri.length}) sayıları farklı!`);

            const planOgrenciIdleri = new Set(planOgrencileri.map(o => o.id));
            const eksikOgrenciler = yerlesenOgrenciler.filter(o => !planOgrenciIdleri.has(o.id));

            if (eksikOgrenciler.length > 0) {
                logger.error(`   ❌ Plan'da olmayan öğrenciler:`);
                eksikOgrenciler.forEach(o => {
                    logger.error(`      - ${o.ad} ${o.soyad} (ID: ${o.id})`);
                });
            }
        }

        return {
            ogrenciler: planOgrencileri,
            yerlesilemeyenOgrenciler,
            plan: this.plan,
            basariOrani
        };
    }

    /**
     * Yerleştirme işlemi
     */
    executeYerlestirme() {
        const ogrenciHavuzu = [...this.ogrenciler];
        const yerlesen = [];
        const kullanilanOgrenciler = new Set();

        // 3 katmanlı deneme sistemi
        for (let katman = 0; katman < 3; katman++) {
            logger.info(`🔄 Yerleştirme katmanı ${katman + 1}/3`);

            for (const koltuk of this.oncelikliKoltuklar) {
                const planItem = this.plan.find(p => p.id === koltuk.id);
                if (planItem && planItem.ogrenci) {
                    continue;
                }

                const uygunOgrenci = this.findUygunOgrenciFromPool(koltuk, koltuk.komsular, katman, ogrenciHavuzu);

                if (uygunOgrenci && !kullanilanOgrenciler.has(uygunOgrenci.id)) {
                    const placementSuccess = this.placeOgrenci(koltuk, uygunOgrenci);

                    if (placementSuccess) {
                        yerlesen.push(uygunOgrenci);
                        kullanilanOgrenciler.add(uygunOgrenci.id);

                        const index = ogrenciHavuzu.findIndex(o => o.id === uygunOgrenci.id);
                        if (index > -1) {
                            ogrenciHavuzu.splice(index, 1);
                        }
                    }
                }
            }

            if (yerlesen.length === this.ogrenciler.length || ogrenciHavuzu.length === 0) {
                break;
            }
        }

        return yerlesen;
    }

    findUygunOgrenciFromPool(koltuk, komsular, katmanSeviyesi, ogrenciHavuzu) {
        const skorluOgrenciler = ogrenciHavuzu.map(ogrenci => {
            let skor;

            if (this.weightManager) {
                skor = this.weightManager.calculateAIEnhancedScore(ogrenci, koltuk, komsular, this.plan2D);
            } else {
                skor = this.calculatePredictiveScore(ogrenci, koltuk, komsular);
            }

            return { ogrenci, skor };
        }).sort((a, b) => b.skor - a.skor);

        for (const { ogrenci } of skorluOgrenciler) {
            if (this.checkKisitlar(ogrenci, koltuk, komsular, katmanSeviyesi)) {
                return ogrenci;
            }
        }
        return null;
    }

    placeOgrenci(koltuk, ogrenci) {
        const planItem = this.plan.find(p => p.id === koltuk.id);

        if (!planItem) {
            logger.error(`❌ KRİTİK HATA: placeOgrenci - Plan item bulunamadı!`);
            return false;
        }

        if (planItem.ogrenci) {
            return false;
        }

        const hucre = this.plan2D[koltuk.satir]?.[koltuk.sutun];
        if (hucre?.ogrenci) {
            return false;
        }

        planItem.ogrenci = {
            ...ogrenci,
            masaNumarasi: koltuk.masaNumarasi || this.calculateDeskNumber(koltuk),
            satir: koltuk.satir,
            sutun: koltuk.sutun,
            grup: koltuk.grup,
            koltukTipi: koltuk.koltukTipi
        };

        this.plan2D[koltuk.satir][koltuk.sutun] = { ogrenci: planItem.ogrenci, grup: koltuk.grup };

        return true;
    }

    calculateDeskNumber(koltuk) {
        const allKoltuklar = this.koltukMatrisi.masalar;
        const gruplar = {};
        allKoltuklar.forEach(k => {
            const grup = k.grup || 1;
            if (!gruplar[grup]) gruplar[grup] = [];
            gruplar[grup].push(k);
        });

        let masaNumarasi = 1;
        const sortedGruplar = Object.keys(gruplar).sort((a, b) => parseInt(a) - parseInt(b));

        for (const grupId of sortedGruplar) {
            const grupMasalar = gruplar[grupId];
            const sortedGrupMasalar = grupMasalar.sort((a, b) => {
                if (a.satir !== b.satir) return a.satir - b.satir;
                return a.sutun - b.sutun;
            });

            for (const masa of sortedGrupMasalar) {
                if (masa.id === koltuk.id) {
                    return masaNumarasi;
                }
                masaNumarasi++;
            }
        }

        return koltuk.id + 1;
    }
}

export default GelismisYerlestirmeMotoru;
