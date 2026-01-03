import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import logger from '../utils/logger';
import { saveToStorage, normalizeSalonList } from '../utils/contextHelpers';

// Helper for sorting students
const sortOgrencilerBySinifVeNumara = (a, b) => {
    const parseSinif = (sinif) => {
        if (!sinif) return { numara: 0, sube: '' };
        const match = sinif.toString().match(/^(\d+)[-/]?([A-Za-z]+)?/);
        if (match) {
            return {
                numara: parseInt(match[1]) || 0,
                sube: (match[2] || '').toUpperCase()
            };
        }
        return { numara: 0, sube: sinif.toString().toUpperCase() };
    };

    const sinifA = parseSinif(a.sinif);
    const sinifB = parseSinif(b.sinif);

    if (sinifA.numara !== sinifB.numara) return sinifA.numara - sinifB.numara;
    if (sinifA.sube !== sinifB.sube) return sinifA.sube.localeCompare(sinifB.sube, 'tr-TR');

    const numaraA = parseInt(a.numara) || 0;
    const numaraB = parseInt(b.numara) || 0;
    return numaraA - numaraB;
};

// Helper for building placement index
const buildPlacementIndex = (yerlestirme) => {
    const index = {};
    if (!yerlestirme) return index;
    try {
        const tumSalonlar = yerlestirme.tumSalonlar;
        if (Array.isArray(tumSalonlar)) {
            tumSalonlar.forEach(salon => {
                const salonAdi = salon.salonAdi || salon.ad || String(salon.id || salon.salonId || '');
                const masalar = Array.isArray(salon.masalar) ? salon.masalar : [];
                masalar.forEach(m => {
                    if (m?.ogrenci?.id) {
                        const masaNo = m.masaNumarasi != null ? m.masaNumarasi : (typeof m.id === 'number' ? m.id + 1 : null);
                        index[m.ogrenci.id] = { salonId: salon.id || salon.salonId, salonAdi, masaNo };
                    }
                });
            });
        }
    } catch (e) {
        logger.debug('build placement index error:', e);
    }
    return index;
};

export const useExamStore = create(
    persist(
        (set, get) => ({
            // State
            ogrenciler: [],
            seciliOgrenciler: [],
            siniflar: [],
            seciliSinif: null,
            salonlar: [],
            ayarlar: {
                sinavAdi: '',
                sinavTarihi: '',
                sinavSaati: '',
                dersler: []
            },
            yerlestirmeSonucu: null,
            placementIndex: {},
            aktifTab: 'ayarlar',
            yukleme: true,
            hata: null,
            role: 'public',
            authUser: null,

            // Actions
            setOgrenciler: (ogrenciler) => {
                set({ ogrenciler, yukleme: false });
            },

            addOgrenciler: (yeniOgrenciler) => {
                const { ogrenciler } = get();
                const tumOgrenciler = [...ogrenciler, ...yeniOgrenciler];
                const siraliOgrenciler = tumOgrenciler.sort(sortOgrencilerBySinifVeNumara);
                set({ ogrenciler: siraliOgrenciler, yukleme: false });
            },

            toggleOgrenciSec: (ogrenci) => {
                const { seciliOgrenciler } = get();
                const mevcutSecili = seciliOgrenciler.find(o => o.id === ogrenci.id);
                set({
                    seciliOgrenciler: mevcutSecili
                        ? seciliOgrenciler.filter(o => o.id !== ogrenci.id)
                        : [...seciliOgrenciler, ogrenci]
                });
            },

            clearSeciliOgrenciler: () => set({ seciliOgrenciler: [] }),

            deleteOgrenci: (ogrenciId) => {
                const { ogrenciler, yerlestirmeSonucu, placementIndex } = get();
                let updatedYerlestirmeSonucu = yerlestirmeSonucu;
                let updatedPlacementIndex = { ...placementIndex };

                if (updatedYerlestirmeSonucu && updatedYerlestirmeSonucu.isArchived !== true) {
                    const updatedTumSalonlar = (updatedYerlestirmeSonucu.tumSalonlar || []).map(salon => {
                        let salonMasalarDegisti = false;
                        const updatedMasalar = (salon.masalar || []).map(masa => {
                            if (masa.ogrenci && masa.ogrenci.id === ogrenciId) {
                                salonMasalarDegisti = true;
                                return { ...masa, ogrenci: null };
                            }
                            return masa;
                        });

                        if (salonMasalarDegisti) {
                            return {
                                ...salon,
                                masalar: updatedMasalar,
                                ogrenciler: updatedMasalar
                                    .filter(m => m.ogrenci)
                                    .map(m => ({ ...m.ogrenci, masaNumarasi: m.masaNumarasi }))
                            };
                        }
                        return salon;
                    });

                    const updatedYerlesilemeyenOgrenciler = (updatedYerlestirmeSonucu.yerlesilemeyenOgrenciler || [])
                        .filter(o => o.id !== ogrenciId);

                    const updatedSalon = updatedTumSalonlar.find(s =>
                        (s.id === updatedYerlestirmeSonucu.salon?.id || s.salonId === updatedYerlestirmeSonucu.salon?.salonId)
                    ) || updatedYerlestirmeSonucu.salon;

                    const wasPlaced = !!placementIndex[ogrenciId];
                    const wasUnplaced = (updatedYerlestirmeSonucu.yerlesilemeyenOgrenciler || []).length < (yerlestirmeSonucu?.yerlesilemeyenOgrenciler || []).length;

                    const mevcutIstatistikler = updatedYerlestirmeSonucu.istatistikler || {};
                    const updatedIstatistikler = {
                        ...mevcutIstatistikler,
                        toplamOgrenci: Math.max(0, (mevcutIstatistikler.toplamOgrenci || 0) - 1),
                        yerlesenOgrenci: wasPlaced ? Math.max(0, (mevcutIstatistikler.yerlesenOgrenci || 0) - 1) : (mevcutIstatistikler.yerlesenOgrenci || 0),
                        yerlesemeyenOgrenci: wasUnplaced ? Math.max(0, (mevcutIstatistikler.yerlesemeyenOgrenci || 0) - 1) : (mevcutIstatistikler.yerlesemeyenOgrenci || 0)
                    };

                    updatedYerlestirmeSonucu = {
                        ...updatedYerlestirmeSonucu,
                        salon: updatedSalon,
                        tumSalonlar: updatedTumSalonlar,
                        yerlesilemeyenOgrenciler: updatedYerlesilemeyenOgrenciler,
                        istatistikler: updatedIstatistikler
                    };

                    delete updatedPlacementIndex[ogrenciId];
                }

                const updatedOgrenciler = ogrenciler.filter(o => o.id !== ogrenciId);
                set({
                    ogrenciler: updatedOgrenciler,
                    yerlestirmeSonucu: updatedYerlestirmeSonucu,
                    placementIndex: updatedPlacementIndex
                });
            },

            clearOgrenciler: () => {
                set({ ogrenciler: [] });
            },

            pinOgrenci: (ogrenciId, pinnedSalonId, pinnedMasaId) => {
                const { ogrenciler } = get();
                const updatedOgrenciler = ogrenciler.map(o => o.id === ogrenciId ? {
                    ...o,
                    pinned: true,
                    pinnedSalonId: pinnedSalonId != null ? String(pinnedSalonId) : null,
                    pinnedMasaId: pinnedMasaId ?? null
                } : o);
                set({ ogrenciler: updatedOgrenciler });
            },

            unpinOgrenci: (ogrenciId) => {
                const { ogrenciler } = get();
                const updatedOgrenciler = ogrenciler.map(o => o.id === ogrenciId ? {
                    ...o,
                    pinned: false,
                    pinnedSalonId: null,
                    pinnedMasaId: null
                } : o);
                set({ ogrenciler: updatedOgrenciler });
            },

            setSiniflar: (siniflar) => set({ siniflar, yukleme: false }),
            setSeciliSinif: (seciliSinif) => set({ seciliSinif }),

            setSalonlar: (salonlar) => {
                set({ salonlar });
            },

            addSalon: (salon) => {
                const { salonlar } = get();
                const updatedSalonlar = [...salonlar, salon];
                set({ salonlar: updatedSalonlar });
            },

            deleteSalon: (salonId) => {
                const { salonlar } = get();
                const updatedSalonlar = salonlar.filter(salon => salon.id !== salonId);
                set({ salonlar: updatedSalonlar });
            },

            updateAyarlar: (yeniAyarlar) => {
                const { ayarlar } = get();
                const updatedAyarlar = { ...ayarlar, ...yeniAyarlar };
                set({ ayarlar: updatedAyarlar });
            },

            setYerlestirmeSonucu: (sonuc) => {
                let yerlestirmeSonucuWithSalon = sonuc;
                if (!yerlestirmeSonucuWithSalon.salon && yerlestirmeSonucuWithSalon.tumSalonlar?.length > 0) {
                    yerlestirmeSonucuWithSalon = {
                        ...yerlestirmeSonucuWithSalon,
                        salon: yerlestirmeSonucuWithSalon.tumSalonlar[0]
                    };
                }

                const updatedPlacementIndex = buildPlacementIndex(yerlestirmeSonucuWithSalon);
                set({
                    yerlestirmeSonucu: yerlestirmeSonucuWithSalon,
                    placementIndex: updatedPlacementIndex,
                    yukleme: false
                });
            },

            updateYerlestirmeSonucu: (incoming) => {
                const { yerlestirmeSonucu } = get();
                const incomingData = incoming || {};
                const normalizedTumSalonlar = incomingData.tumSalonlar
                    ? normalizeSalonList(incomingData.tumSalonlar)
                    : yerlestirmeSonucu?.tumSalonlar;

                const merged = {
                    ...(yerlestirmeSonucu || {}),
                    ...incomingData,
                    tumSalonlar: normalizedTumSalonlar
                };

                const updatedPlacementIndex = buildPlacementIndex(merged);
                set({
                    yerlestirmeSonucu: merged,
                    placementIndex: updatedPlacementIndex,
                    yukleme: false
                });
            },

            clearYerlestirme: () => {
                set({ yerlestirmeSonucu: null, placementIndex: {} });
            },

            setAktifTab: (aktifTab) => {
                set({ aktifTab });
            },

            startLoading: () => set({ yukleme: true, hata: null }),
            stopLoading: () => set({ yukleme: false }),
            setHata: (hata) => set({ hata, yukleme: false }),
            clearHata: () => set({ hata: null }),
            setRole: (role) => set({ role }),
            setAuthUser: (authUser) => set({ authUser }),

            // Reset State
            resetStore: () => set({
                ogrenciler: [],
                seciliOgrenciler: [],
                siniflar: [],
                seciliSinif: null,
                salonlar: [],
                ayarlar: {
                    sinavAdi: '',
                    sinavTarihi: '',
                    sinavSaati: '',
                    dersler: []
                },
                yerlestirmeSonucu: null,
                placementIndex: {},
                aktifTab: 'ayarlar',
                yukleme: false,
                hata: null,
                role: 'public',
                authUser: null
            })
        }),
        {
            name: 'exam-storage',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                aktifTab: state.aktifTab,
                role: state.role,
                ayarlar: state.ayarlar,
                authUser: state.authUser
            })
        }
    )
);
