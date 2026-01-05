import { useCallback } from 'react';
import { useExam } from '../context/ExamContext';
import { useNotifications } from '../components/NotificationSystem';
import planManager from '../utils/planManager';
import logger from '../utils/logger';
import { calculateDeskNumbersForMasalar } from '../algorithms/gelismisYerlestirmeAlgoritmasi';

export const usePlanPersistence = (activePlanMeta, setActivePlanMeta, onLoadSuccess) => {
    const {
        ogrenciler,
        ayarlar,
        salonlar,
        yerlestirmeSonucu,
        ayarlarGuncelle,
        yerlestirmeGuncelle,
        tabDegistir,
        ogrenciPin,
        ogrenciUnpin,
        yuklemeBaslat,
        yuklemeBitir
    } = useExam();

    const { showSuccess, showError, showInfo } = useNotifications();

    const handleSavePlan = useCallback(async (planAdi, options) => {
        // ... (handleSavePlan içeriği değişmedi)
        let onCloseCallback = undefined;
        let targetPlanId = null;

        if (typeof options === 'function') {
            onCloseCallback = options;
        } else if (options && typeof options === 'object') {
            onCloseCallback = options.onCloseCallback;
            targetPlanId = options.planId ?? null;
        }

        const trimmedPlanName = (planAdi || '').trim();

        if (!trimmedPlanName) {
            showError('Lütfen plan adı giriniz.');
            return;
        }

        if (!yerlestirmeSonucu) {
            showError('Kaydedilecek plan bulunamadı.');
            return;
        }

        if (onCloseCallback) {
            onCloseCallback();
        }

        try {
            yuklemeBaslat(`Plan "${trimmedPlanName}" kaydediliyor, lütfen bekleyiniz...`);

            const ayarlarKopya = JSON.parse(JSON.stringify(ayarlar || {}));
            const { kayitliSalonlar, ...ayarlarKopyaTemiz } = ayarlarKopya;

            // Metadata eşleşme riskini önlemek için bu bloğu devre dışı bıraktık.
            // Sadece yerleştirme sonucundaki veriyi koruyoruz.
            const guncelTumSalonlar = (yerlestirmeSonucu.tumSalonlar || []).map(salon => {
                // Sadece temel temizlik
                return salon;
            });

            const guncelSalon = guncelTumSalonlar.find(s =>
                String(s.id) === String(yerlestirmeSonucu.salon?.id) ||
                String(s.salonId) === String(yerlestirmeSonucu.salon?.salonId)
            ) || yerlestirmeSonucu.salon;

            const mevcutOgrenciIdleri = new Set(ogrenciler.map(o => o.id));
            const guncelYerlesilemeyenOgrenciler = (yerlestirmeSonucu.yerlesilemeyenOgrenciler || [])
                .filter(ogrenci => mevcutOgrenciIdleri.has(ogrenci.id));

            const guncelSalonMasalar = (guncelSalon?.masalar || []).map(masa => {
                if (masa.ogrenci && !mevcutOgrenciIdleri.has(masa.ogrenci.id)) {
                    return { ...masa, ogrenci: null };
                }
                return masa;
            });

            const guncelSalonFinal = guncelSalon ? {
                ...guncelSalon,
                masalar: guncelSalonMasalar,
                ogrenciler: guncelSalonMasalar
                    .filter(m => m.ogrenci)
                    .map(m => ({ ...m.ogrenci, masaNumarasi: m.masaNumarasi }))
            } : guncelSalon;

            const guncelTumSalonlarFinal = guncelTumSalonlar.map(salon => {
                if (String(salon.id) === String(guncelSalonFinal?.id) || String(salon.salonId) === String(guncelSalonFinal?.salonId)) {
                    return guncelSalonFinal;
                }
                const guncelMasalar = (salon.masalar || []).map(masa => {
                    if (masa.ogrenci && !mevcutOgrenciIdleri.has(masa.ogrenci.id)) {
                        return { ...masa, ogrenci: null };
                    }
                    return masa;
                });
                return {
                    ...salon,
                    masalar: guncelMasalar,
                    ogrenciler: guncelMasalar
                        .filter(m => m.ogrenci)
                        .map(m => ({ ...m.ogrenci, masaNumarasi: m.masaNumarasi }))
                };
            });

            const planData = {
                salon: guncelSalonFinal,
                tumSalonlar: guncelTumSalonlarFinal,
                kalanOgrenciler: yerlestirmeSonucu.kalanOgrenciler || [],
                yerlesilemeyenOgrenciler: guncelYerlesilemeyenOgrenciler,
                istatistikler: yerlestirmeSonucu.istatistikler,
                ayarlar: ayarlarKopyaTemiz,
                sabitOgrenciler: ogrenciler.filter(o => o.pinned)
            };

            showInfo(`Plan "${trimmedPlanName}" kaydediliyor...`);

            const resolvedPlanId = targetPlanId ?? activePlanMeta?.id ?? planManager.getCurrentPlanId();
            let planId = null;
            let isUpdate = false;

            if (resolvedPlanId) {
                isUpdate = true;
                planId = await planManager.updatePlan(resolvedPlanId, trimmedPlanName, planData);
            } else {
                planId = await planManager.savePlan(trimmedPlanName, planData);
            }

            if (!planId) {
                throw new Error('Plan kaydedilemedi. Plan ID alınamadı. Firestore aktif mi kontrol edin.');
            }

            setTimeout(() => {
                showSuccess(`Plan "${trimmedPlanName}" başarıyla veritabanına ${isUpdate ? 'güncellendi' : 'kaydedildi'}!`);
            }, 500);

            setActivePlanMeta({
                id: planId,
                name: trimmedPlanName
            });

            return planId;
        } catch (error) {
            logger.error('❌ Plan kaydetme hatası:', error);
            showError(`Plan kaydedilirken hata oluştu: ${error.message}`);
            throw error;
        } finally {
            yuklemeBitir();
        }
    }, [yerlestirmeSonucu, salonlar, ayarlar, ogrenciler, showError, showSuccess, showInfo, activePlanMeta, setActivePlanMeta, yuklemeBaslat, yuklemeBitir]);


    const handlePlanYukle = useCallback(async (plan) => {
        yuklemeBaslat('Plan yükleniyor, lütfen bekleyiniz...');

        try {
            let planMeta = null;
            let planData = null;

            if (plan && plan.data) {
                planMeta = plan;
                planData = plan.data;
                if (planMeta.id) {
                    const activeName = planMeta.name || planData?.ayarlar?.planAdi || '';
                    planManager.setCurrentPlan({
                        id: planMeta.id,
                        name: activeName
                    });
                }
            } else if (plan && !plan.id && (plan.tumSalonlar || plan.salon)) {
                planData = plan;
                planManager.clearCurrentPlan();
            } else if (plan && plan.id) {
                const loadedPlan = await planManager.loadPlan(plan.id);
                if (!loadedPlan || !loadedPlan.data) {
                    showError('Plan verisi bulunamadı!');
                    return;
                }
                planMeta = loadedPlan;
                planData = loadedPlan.data;
                planManager.setCurrentPlan({
                    id: loadedPlan.id,
                    name: loadedPlan.name || loadedPlan.data?.ayarlar?.planAdi || ''
                });
            } else {
                showError('Plan verisi geçersiz!');
                return;
            }

            const resolvedPlanId = planMeta?.id ?? plan?.id ?? null;
            const resolvedPlanName = (planMeta?.name || planData?.ayarlar?.planAdi || plan?.name || '').trim();
            if (resolvedPlanId) {
                setActivePlanMeta({
                    id: resolvedPlanId,
                    name: resolvedPlanName || planMeta?.name || plan?.name || ''
                });
            } else {
                setActivePlanMeta(null);
            }

            let tumSalonlarSirali = planData.tumSalonlar;

            const yerlestirmeFormatinda = {
                id: resolvedPlanId,
                isArchived: planMeta?.isArchived || false,
                salon: planData.salon,
                tumSalonlar: tumSalonlarSirali,
                kalanOgrenciler: planData.kalanOgrenciler,
                yerlesilemeyenOgrenciler: planData.yerlesilemeyenOgrenciler,
                istatistikler: planData.istatistikler
            };

            if (yerlestirmeFormatinda.salon && (!yerlestirmeFormatinda.salon.siraDizilimi || !yerlestirmeFormatinda.salon.siraDizilimi.satir)) {
                yerlestirmeFormatinda.salon.siraDizilimi = yerlestirmeFormatinda.salon.siraDizilimi || {};
                const kapasite = yerlestirmeFormatinda.salon.kapasite || 30;
                yerlestirmeFormatinda.salon.siraDizilimi.satir = yerlestirmeFormatinda.salon.siraDizilimi.satir || Math.ceil(Math.sqrt(kapasite)) || 6;
                yerlestirmeFormatinda.salon.siraDizilimi.sutun = yerlestirmeFormatinda.salon.siraDizilimi.sutun || Math.ceil(kapasite / yerlestirmeFormatinda.salon.siraDizilimi.satir) || 5;
            }

            if (yerlestirmeFormatinda.tumSalonlar && Array.isArray(yerlestirmeFormatinda.tumSalonlar)) {
                yerlestirmeFormatinda.tumSalonlar = yerlestirmeFormatinda.tumSalonlar.map(salon => {
                    if (!salon.siraDizilimi || !salon.siraDizilimi.satir || !salon.siraDizilimi.sutun) {
                        salon.siraDizilimi = salon.siraDizilimi || {};
                        const kapasite = salon.kapasite || 30;
                        salon.siraDizilimi.satir = salon.siraDizilimi.satir || Math.ceil(Math.sqrt(kapasite)) || 6;
                        salon.siraDizilimi.sutun = salon.siraDizilimi.sutun || Math.ceil(kapasite / salon.siraDizilimi.satir) || 5;
                    }
                    return salon;
                });
            }

            if (planData.ayarlar) {
                const { kayitliSalonlar, ...ayarlarTemiz } = planData.ayarlar;
                ayarlarGuncelle(ayarlarTemiz);
            } else if (planMeta) {
                const metaFallback = {
                    sinavTarihi: planMeta.sinavTarihi || ayarlar.sinavTarihi || '',
                    sinavSaati: planMeta.sinavSaati || ayarlar.sinavSaati || '',
                    sinavDonemi: planMeta.sinavDonemi || ayarlar.sinavDonemi || '1',
                    donem: planMeta.donem || ayarlar.donem || '1',
                    dersler: planData?.dersler || ayarlar.dersler || []
                };
                ayarlarGuncelle(metaFallback);
            }

            const ogrenciMapByNumara = new Map(ogrenciler.map(o => [String(o.numara).trim(), o]));

            if (yerlestirmeFormatinda.tumSalonlar && yerlestirmeFormatinda.tumSalonlar.length > 0) {
                yerlestirmeFormatinda.tumSalonlar = yerlestirmeFormatinda.tumSalonlar.map(salon => {
                    if (salon.masalar && Array.isArray(salon.masalar)) {
                        const masalarWithNumbers = calculateDeskNumbersForMasalar(salon.masalar.map(masa => {
                            if (masa.ogrenci) {
                                // ID yerine Numara ile eşleştirme yap
                                const ogrenciNumara = String(masa.ogrenci.numara || '').trim();
                                const guncelOgrenci = ogrenciMapByNumara.get(ogrenciNumara);

                                if (guncelOgrenci) {
                                    masa.ogrenci = {
                                        ...masa.ogrenci,
                                        ...guncelOgrenci,
                                        masaNumarasi: masa.ogrenci.masaNumarasi || masa.masaNumarasi
                                    };
                                } else {
                                    // Eğer öğrenci güncel listede yoksa...
                                    logger.warn(`⚠️ Öğrenci Bulunamadı: Plan'daki Numara:${ogrenciNumara} (${masa.ogrenci.ad}) güncel listede yok.`);
                                }
                            }
                            return masa;
                        }));
                        return {
                            ...salon,
                            masalar: masalarWithNumbers
                        };
                    }
                    return salon;
                });
                if (yerlestirmeFormatinda.salon && yerlestirmeFormatinda.salon.masalar) {
                    yerlestirmeFormatinda.salon.masalar = yerlestirmeFormatinda.tumSalonlar[0]?.masalar || yerlestirmeFormatinda.salon.masalar;
                }
            }

            if (yerlestirmeFormatinda.yerlesilemeyenOgrenciler && Array.isArray(yerlestirmeFormatinda.yerlesilemeyenOgrenciler)) {
                yerlestirmeFormatinda.yerlesilemeyenOgrenciler = yerlestirmeFormatinda.yerlesilemeyenOgrenciler.map(ogrenci => {
                    if (ogrenci) {
                        const ogrenciNumara = String(ogrenci.numara || '').trim();
                        const guncelOgrenci = ogrenciMapByNumara.get(ogrenciNumara);

                        if (guncelOgrenci) {
                            return {
                                ...ogrenci,
                                ...guncelOgrenci
                            };
                        }
                    }
                    return ogrenci;
                });
            }

            yerlestirmeGuncelle(yerlestirmeFormatinda);

            const hasExplicitSabit = planData.sabitOgrenciler && Array.isArray(planData.sabitOgrenciler);
            if (hasExplicitSabit) {
                const currentSalonMapById = new Map(salonlar.map(s => [String(s.id), s]));
                const currentSalonMapByName = new Map(salonlar.map(s => [s.ad?.trim(), s]));
                const savedSalonMapById = new Map((yerlestirmeFormatinda.tumSalonlar || []).map(s => [String(s.id), s]));

                ogrenciler.forEach(ogrenci => {
                    // Sabit öğrenciyi de Numaraya göre bul
                    const planSabit = planData.sabitOgrenciler.find(ps =>
                        ps.numara && String(ps.numara).trim() === String(ogrenci.numara).trim()
                    );

                    if (planSabit) {
                        let targetSalonId = planSabit.pinnedSalonId;
                        let targetMasaId = planSabit.pinnedMasaId;

                        let currentTargetSalon = currentSalonMapById.get(String(targetSalonId));
                        if (!currentTargetSalon) {
                            const savedSalon = savedSalonMapById.get(String(targetSalonId));
                            if (savedSalon) {
                                currentTargetSalon = currentSalonMapByName.get(savedSalon.ad?.trim());
                                if (currentTargetSalon) {
                                    targetSalonId = currentTargetSalon.id;
                                }
                            }
                        }

                        if (currentTargetSalon) {
                            const masaExists = (currentTargetSalon.masalar || []).some(m => String(m.id) === String(targetMasaId));
                            if (!masaExists) {
                                const savedSalon = savedSalonMapById.get(String(planSabit.pinnedSalonId));
                                const savedMasa = (savedSalon?.masalar || []).find(m => String(m.id) === String(planSabit.pinnedMasaId));

                                if (savedMasa) {
                                    const matchingCurrentMasa = (currentTargetSalon.masalar || []).find(m => m.masaNumarasi === savedMasa.masaNumarasi);
                                    if (matchingCurrentMasa) {
                                        targetMasaId = matchingCurrentMasa.id;
                                    }
                                }
                            }
                            ogrenciPin(ogrenci.id, targetSalonId, targetMasaId);
                        } else {
                            logger.warn(`⚠️ Sabit Atama Hatası: Salon bulunamadı. OrijinalID: ${planSabit.pinnedSalonId}`);
                        }
                    } else if (ogrenci.pinned) {
                        ogrenciUnpin(ogrenci.id);
                    }
                });
            } else {
                // Eski sistem sabitleme (implicit)
                const planOgrencileri = new Map();
                const planOgrencileriByNumara = new Map();

                if (yerlestirmeFormatinda.tumSalonlar && Array.isArray(yerlestirmeFormatinda.tumSalonlar)) {
                    yerlestirmeFormatinda.tumSalonlar.forEach(salon => {
                        if (salon.masalar && Array.isArray(salon.masalar)) {
                            salon.masalar.forEach(masa => {
                                if (masa.ogrenci && masa.ogrenci.id) {
                                    const ogrenciData = {
                                        ...masa.ogrenci,
                                        pinned: masa.ogrenci.pinned || false,
                                        pinnedSalonId: masa.ogrenci.pinnedSalonId || null,
                                        pinnedMasaId: masa.ogrenci.pinnedMasaId || null
                                    };
                                    planOgrencileri.set(masa.ogrenci.id.toString(), ogrenciData);
                                    if (masa.ogrenci.numara) {
                                        planOgrencileriByNumara.set(String(masa.ogrenci.numara).trim(), ogrenciData);
                                    }
                                }
                            });
                        }
                    });
                }
                if (yerlestirmeFormatinda.yerlesilemeyenOgrenciler && Array.isArray(yerlestirmeFormatinda.yerlesilemeyenOgrenciler)) {
                    yerlestirmeFormatinda.yerlesilemeyenOgrenciler.forEach(ogrenci => {
                        if (ogrenci && ogrenci.id) {
                            const ogrenciData = {
                                ...ogrenci,
                                pinned: ogrenci.pinned || false,
                                pinnedSalonId: ogrenci.pinnedSalonId || null,
                                pinnedMasaId: ogrenci.pinnedMasaId || null
                            };
                            planOgrencileri.set(ogrenci.id.toString(), ogrenciData);
                            if (ogrenci.numara) {
                                planOgrencileriByNumara.set(String(ogrenci.numara).trim(), ogrenciData);
                            }
                        }
                    });
                }
                if (planOgrencileriByNumara.size > 0) {
                    ogrenciler.forEach(ogrenci => {
                        const planOgrenci = planOgrencileriByNumara.get(String(ogrenci.numara).trim());

                        if (planOgrenci && (planOgrenci.pinned || planOgrenci.pinnedSalonId || planOgrenci.pinnedMasaId)) {
                            ogrenciPin(ogrenci.id, planOgrenci.pinnedSalonId, planOgrenci.pinnedMasaId);
                        } else if (ogrenci.pinned) {
                            ogrenciUnpin(ogrenci.id);
                        }
                    });
                }
            }

            // Eğer onLoadSuccess callback'i varsa çağır
            if (onLoadSuccess) {
                // Modal açılacağı için showSuccess kapatılabilir veya kalabilir, modal daha iyi
                onLoadSuccess(planData.istatistikler || yerlestirmeFormatinda.istatistikler);
            } else {
                // showSuccess mesajı (Geri uyumluluk için, eğer callback yoksa)
                setTimeout(() => {
                    showSuccess('Plan başarıyla yüklendi!');
                    tabDegistir('salon-plani');
                }, 500);
            }

        } catch (error) {
            console.error('❌ Plan yükleme hatası:', error);
            showError(`Plan yüklenirken hata oluştu: ${error.message}`);
        } finally {
            yuklemeBitir();
        }
    }, [
        ogrenciler,
        ayarlar.sinavTarihi,
        ayarlar.sinavSaati,
        ayarlar.sinavDonemi,
        ayarlar.donem,
        ayarlar.dersler,
        showError,
        showSuccess,
        ayarlarGuncelle,
        yerlestirmeGuncelle,
        tabDegistir,
        ogrenciPin,
        ogrenciUnpin,
        setActivePlanMeta,
        onLoadSuccess,
        yuklemeBaslat,
        yuklemeBitir,
        salonlar
    ]);

    return { handleSavePlan, handlePlanYukle };
};
