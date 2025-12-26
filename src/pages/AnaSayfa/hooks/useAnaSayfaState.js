import { useState, useEffect, useCallback, useRef } from 'react';
import { useExam } from '../../../context/ExamContext';
import { useNotifications } from '../../../components/NotificationSystem';
import planManager from '../../../utils/planManager';
import logger from '../../../utils/logger';
import transferManager from '../../../utils/transferManager';
import gelismisYerlestirme, { calculateDeskNumbersForMasalar } from '../../../algorithms/gelismisYerlestirmeAlgoritmasi';
import { useReactToPrint } from 'react-to-print';

export const useAnaSayfaState = () => {
    const { showSuccess, showError, showInfo } = useNotifications();
    const exam = useExam();

    const [seciliSalonId, setSeciliSalonId] = useState(null);
    const [showFirstTimeLoader, setShowFirstTimeLoader] = useState(false);
    const [printMenuAnchor, setPrintMenuAnchor] = useState(null);
    const [saveDialogOpen, setSaveDialogOpen] = useState(false);
    const [activePlanMeta, setActivePlanMeta] = useState(null);

    const ilkSalonSecildiRef = useRef(false);
    const salonPlaniPrintRef = useRef();
    const sinifListesiPrintRef = useRef();
    const salonImzaListesiPrintRef = useRef();

    const {
        ogrenciler,
        ayarlar,
        salonlar,
        yerlestirmeSonucu,
        aktifTab,
        isWriteAllowed,
        ogrencilerYukle,
        ayarlarGuncelle,
        salonlarGuncelle,
        yerlestirmeYap,
        yerlestirmeGuncelle,
        yerlestirmeTemizle,
        tabDegistir,
        yuklemeBaslat,
        hataAyarla,
        ogrenciPin,
        ogrenciUnpin
    } = exam;

    const readOnly = !isWriteAllowed;

    // Initial redirection logic - Sadece bir kez mount olduğunda çalışır
    useEffect(() => {
        try {
            const hasVisited = localStorage.getItem('hasVisited');
            const isFirstVisit = !hasVisited || hasVisited !== 'true';

            if (isFirstVisit) {
                setShowFirstTimeLoader(true);
                localStorage.setItem('hasVisited', 'true');
                tabDegistir('genel-ayarlar');
            }
        } catch (error) {
            console.error('❌ localStorage check error:', error);
        }
    }, [tabDegistir]); // Sadece tabDegistir değiştiğinde veya mount'ta çalışır (aktifTab bağımlılığını kaldır)

    useEffect(() => {
        if (showFirstTimeLoader) {
            const timer = setTimeout(() => setShowFirstTimeLoader(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [showFirstTimeLoader]);

    // Auto-select first salon
    useEffect(() => {
        if (yerlestirmeSonucu?.tumSalonlar?.length > 0) {
            if (ilkSalonSecildiRef.current) return;

            const aktifTumSalonlar = yerlestirmeSonucu.tumSalonlar.filter(salon => salon.aktif !== false);
            if (aktifTumSalonlar.length > 0) {
                const seciliSalonMevcutMu = seciliSalonId && aktifTumSalonlar.some(salon =>
                    salon.salonId === seciliSalonId || salon.id === seciliSalonId
                );

                if (!seciliSalonMevcutMu) {
                    const ilkSalon = aktifTumSalonlar[0];
                    const ilkSalonId = ilkSalon.salonId || ilkSalon.id;
                    if (ilkSalonId) {
                        ilkSalonSecildiRef.current = true;
                        setSeciliSalonId(ilkSalonId);
                        if (yerlestirmeGuncelle && !yerlestirmeSonucu.salon) {
                            yerlestirmeGuncelle({ salon: ilkSalon });
                        }
                    }
                } else {
                    ilkSalonSecildiRef.current = true;
                }
            }
        } else {
            ilkSalonSecildiRef.current = false;
        }
    }, [yerlestirmeSonucu?.tumSalonlar?.length, seciliSalonId, yerlestirmeSonucu, yerlestirmeGuncelle]);

    // Keyboard shortcut
    useEffect(() => {
        const handler = (e) => {
            try {
                const isToggle = (e.ctrlKey || e.metaKey) && e.altKey && (e.key === 'd' || e.key === 'D');
                if (isToggle) {
                    const enabled = localStorage.getItem('enable_db_test') === '1';
                    const next = enabled ? '0' : '1';
                    localStorage.setItem('enable_db_test', next);
                    if (next === '1') {
                        tabDegistir('database-test');
                        showSuccess('Veritabanı Test paneli etkinleştirildi (Ctrl+Alt+D)');
                    } else {
                        showSuccess('Veritabanı Test paneli devre dışı bırakıldı');
                        if (aktifTab === 'database-test') tabDegistir('genel-ayarlar');
                    }
                }
            } catch (err) {
                logger.debug('Shortcut handler error:', err);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [tabDegistir, showSuccess, aktifTab]);

    // Print logic
    const handleSalonPlaniPrint = useReactToPrint({
        contentRef: salonPlaniPrintRef,
        documentTitle: 'Salon Planı',
        pageStyle: `@media print { body { -webkit-print-color-adjust: exact; } .no-print { display: none !important; } @page { size: A4 landscape !important; margin: 0.5in !important; } }`
    });

    const handleSinifListesiPrint = useReactToPrint({
        contentRef: sinifListesiPrintRef,
        documentTitle: 'Sınıf Listesi',
        pageStyle: `@media print { body { -webkit-print-color-adjust: exact; } .no-print { display: none !important; } .page-break { page-break-before: always; } .page-break-after { page-break-after: always; } @page { size: A4 portrait !important; margin: 0 !important; } }`
    });

    const handleSalonImzaListesiPrint = useReactToPrint({
        contentRef: salonImzaListesiPrintRef,
        documentTitle: 'Salon İmza Listesi',
        pageStyle: `@media print { body { -webkit-print-color-adjust: exact; } .no-print { display: none !important; } .page-break { page-break-before: always; } .page-break-after { page-break-after: always; } @page { size: A4 portrait !important; margin: 0 !important; } }`
    });

    const handlePrintMenuOpen = useCallback((event) => setPrintMenuAnchor(event.currentTarget), []);
    const handlePrintMenuClose = useCallback(() => setPrintMenuAnchor(null), []);

    const handlePrintAction = useCallback((printFn) => {
        printFn();
        handlePrintMenuClose();
    }, [handlePrintMenuClose]);

    const handleSaveDialogClose = useCallback(() => setSaveDialogOpen(false), []);

    // Plan Management Logic
    const handleSavePlan = useCallback(async (planAdi, options) => {
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

        if (onCloseCallback) onCloseCallback();
        setSaveDialogOpen(false);

        try {
            const ayarlarKopya = JSON.parse(JSON.stringify(ayarlar || {}));
            const { kayitliSalonlar, ...ayarlarKopyaTemiz } = ayarlarKopya;

            const planData = {
                salon: yerlestirmeSonucu.salon,
                tumSalonlar: yerlestirmeSonucu.tumSalonlar,
                kalanOgrenciler: yerlestirmeSonucu.kalanOgrenciler || [],
                yerlesilemeyenOgrenciler: yerlestirmeSonucu.yerlesilemeyenOgrenciler,
                istatistikler: yerlestirmeSonucu.istatistikler,
                ayarlar: ayarlarKopyaTemiz
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

            if (!planId) throw new Error('Plan kaydedilemedi.');

            showSuccess(`Plan "${trimmedPlanName}" başarıyla ${isUpdate ? 'güncellendi' : 'kaydedildi'}!`);
            setActivePlanMeta({ id: planId, name: trimmedPlanName });

        } catch (error) {
            logger.error('❌ Plan kaydetme hatası:', error);
            showError(`Plan kaydedilirken hata oluştu: ${error.message}`);
        }
    }, [yerlestirmeSonucu, ayarlar, showError, showSuccess, showInfo, activePlanMeta]);

    const handleSaveClick = useCallback(() => {
        if (readOnly) {
            showError('Bu işlem için yönetici girişi gereklidir.');
            return;
        }
        if (activePlanMeta?.id && activePlanMeta?.name) {
            handleSavePlan(activePlanMeta.name, { planId: activePlanMeta.id });
            return;
        }
        if (planManager.isCurrentPlanActive()) {
            const currentPlanName = planManager.getCurrentPlanName();
            if (currentPlanName) {
                handleSavePlan(currentPlanName, { planId: planManager.getCurrentPlanId() });
                return;
            }
        }
        setSaveDialogOpen(true);
    }, [handleSavePlan, activePlanMeta, readOnly, showError]);

    const handleYerlestirmeTemizle = useCallback(() => {
        yerlestirmeTemizle();
        tabDegistir('planlama');
        planManager.clearCurrentPlan();
        setActivePlanMeta(null);
    }, [yerlestirmeTemizle, tabDegistir]);

    const handlePlanYukle = async (plan) => {
        try {
            let planMeta = null;
            let planData = null;

            if (plan && plan.data) {
                planMeta = plan;
                planData = plan.data;
                if (planMeta.id) {
                    planManager.setCurrentPlan({ id: planMeta.id, name: planMeta.name || planData?.ayarlar?.planAdi || '' });
                } else {
                    planManager.clearCurrentPlan();
                }
            } else if (plan && plan.id) {
                const loadedPlan = await planManager.loadPlan(plan.id);
                if (!loadedPlan || !loadedPlan.data) {
                    showError('Plan verisi bulunamadı!');
                    return;
                }
                planMeta = loadedPlan;
                planData = loadedPlan.data;
                planManager.setCurrentPlan({ id: loadedPlan.id, name: loadedPlan.name || loadedPlan.data?.ayarlar?.planAdi || '' });
            } else if (plan && (plan.tumSalonlar || plan.salon)) {
                planData = plan;
                planManager.clearCurrentPlan();
            } else {
                showError('Plan verisi geçersiz!');
                return;
            }

            const resolvedPlanId = planMeta?.id ?? plan?.id ?? null;
            const resolvedPlanName = (planMeta?.name || planData?.ayarlar?.planAdi || plan?.name || '').trim();

            setActivePlanMeta(resolvedPlanId ? { id: resolvedPlanId, name: resolvedPlanName } : null);

            let tumSalonlarSirali = planData.tumSalonlar || [];
            if (tumSalonlarSirali.length > 0) {
                tumSalonlarSirali = [...tumSalonlarSirali].sort((a, b) =>
                    parseInt(a.id || a.salonId || 0, 10) - parseInt(b.id || b.salonId || 0, 10));
            }

            const yerlestirmeFormatinda = {
                salon: planData.salon,
                tumSalonlar: tumSalonlarSirali.map(salon => {
                    if (!salon.siraDizilimi || !salon.siraDizilimi.satir) {
                        const kapasite = salon.kapasite || 30;
                        const satir = Math.ceil(Math.sqrt(kapasite)) || 6;
                        const sutun = Math.ceil(kapasite / satir) || 5;
                        salon.siraDizilimi = { satir, sutun };
                    }
                    if (salon.masalar) {
                        salon.masalar = calculateDeskNumbersForMasalar(salon.masalar);
                    }
                    return salon;
                }),
                kalanOgrenciler: planData.kalanOgrenciler,
                yerlesilemeyenOgrenciler: planData.yerlesilemeyenOgrenciler,
                istatistikler: planData.istatistikler
            };

            if (planData.ayarlar) {
                const { kayitliSalonlar, ...ayarlarTemiz } = planData.ayarlar;
                ayarlarGuncelle(ayarlarTemiz);
            }

            yerlestirmeGuncelle(yerlestirmeFormatinda);

            // Sync pinned status
            if (planData.ogrenciler) {
                planData.ogrenciler.forEach(o => {
                    if (o.pinned) ogrenciPin(o.id, o.pinnedSalonId, o.pinnedMasaId);
                    else ogrenciUnpin(o.id);
                });
            }

            showSuccess('Plan başarıyla yüklendi.');
        } catch (error) {
            console.error('Plan yükleme hatası:', error);
            showError('Plan yüklenirken bir hata oluştu.');
        }
    };

    const calculateDeskNumberForMasa = useCallback((masa) => {
        if (!masa || !yerlestirmeSonucu?.salon?.masalar) return masa?.id + 1 || 1;
        const allMasalar = yerlestirmeSonucu.salon.masalar;
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
            const sortedGrupMasalar = grupMasalar.sort((a, b) => {
                if (a.satir !== b.satir) return a.satir - b.satir;
                return a.sutun - b.sutun;
            });
            for (const m of sortedGrupMasalar) {
                if (m.id === masa.id) return masaNumarasi;
                masaNumarasi++;
            }
        }
        return masa.id + 1;
    }, [yerlestirmeSonucu]);

    const handleStudentMove = useCallback((action, data) => {
        if (readOnly) {
            showError('Yerleşim planını değiştirmek için yönetici olarak giriş yapmalısınız.');
            return;
        }

        if (action === 'update_desk_number') {
            const updatedOgrenciler = ogrenciler.map(o => o.id === data.studentId ? { ...o, masaNumarasi: data.deskNumber } : o);
            ogrencilerYukle(updatedOgrenciler);
            return;
        }

        const { from, to, draggedStudent } = data || {};
        if (!yerlestirmeSonucu?.salon) return;

        const currentSalon = yerlestirmeSonucu.salon;
        const fromMasa = currentSalon.masalar?.find(m => m.id === from);
        const toMasa = currentSalon.masalar?.find(m => m.id === to);

        if (from === null && toMasa) {
            const ogrenciToMove = draggedStudent || yerlestirmeSonucu.yerlesilemeyenOgrenciler?.[0];
            if (ogrenciToMove && !toMasa.ogrenci) {
                const updatedYerlesilemeyen = yerlestirmeSonucu.yerlesilemeyenOgrenciler.filter(o => o.id !== ogrenciToMove.id);
                const updatedSalonMasalar = currentSalon.masalar.map(m =>
                    m.id === toMasa.id ? { ...m, ogrenci: { ...ogrenciToMove, masaNumarasi: toMasa.masaNumarasi || calculateDeskNumberForMasa(toMasa) } } : m
                );
                const updatedSalonOgrenciler = [...currentSalon.ogrenciler, { ...ogrenciToMove, masaNumarasi: toMasa.masaNumarasi || calculateDeskNumberForMasa(toMasa) }];
                const updatedSalon = { ...currentSalon, masalar: updatedSalonMasalar, ogrenciler: updatedSalonOgrenciler };
                const updatedTumSalonlar = yerlestirmeSonucu.tumSalonlar.map(s => s.id === currentSalon.id ? updatedSalon : s);
                yerlestirmeGuncelle({ ...yerlestirmeSonucu, salon: updatedSalon, tumSalonlar: updatedTumSalonlar, yerlesilemeyenOgrenciler: updatedYerlesilemeyen });
            }
            return;
        }

        if (fromMasa?.ogrenci && to === null) {
            const cikarilanOgrenci = fromMasa.ogrenci;
            fromMasa.ogrenci = null;
            const updatedYerlesilemeyen = [...(yerlestirmeSonucu.yerlesilemeyenOgrenciler || []), cikarilanOgrenci];
            const updatedSalonOgrenciler = currentSalon.ogrenciler.filter(o => o.id !== cikarilanOgrenci.id);
            const updatedSalon = { ...currentSalon, ogrenciler: updatedSalonOgrenciler };
            const updatedTumSalonlar = yerlestirmeSonucu.tumSalonlar.map(s => s.id === currentSalon.id ? updatedSalon : s);
            yerlestirmeGuncelle({ ...yerlestirmeSonucu, salon: updatedSalon, tumSalonlar: updatedTumSalonlar, yerlesilemeyenOgrenciler: updatedYerlesilemeyen });
            return;
        }

        if (fromMasa?.ogrenci && toMasa) {
            const fromOgrenci = fromMasa.ogrenci;
            const toOgrenci = toMasa.ogrenci;
            fromMasa.ogrenci = toOgrenci;
            toMasa.ogrenci = fromOgrenci;
            const updatedSalonOgrenciler = currentSalon.ogrenciler.map(o => {
                if (o.id === fromOgrenci.id) return { ...o, masaNumarasi: toMasa.masaNumarasi || calculateDeskNumberForMasa(toMasa) };
                if (toOgrenci && o.id === toOgrenci.id) return { ...o, masaNumarasi: fromMasa.masaNumarasi || calculateDeskNumberForMasa(fromMasa) };
                return o;
            });
            const updatedSalon = { ...currentSalon, ogrenciler: updatedSalonOgrenciler };
            const updatedTumSalonlar = yerlestirmeSonucu.tumSalonlar.map(s => s.id === currentSalon.id ? updatedSalon : s);
            yerlestirmeGuncelle({ ...yerlestirmeSonucu, salon: updatedSalon, tumSalonlar: updatedTumSalonlar });
        }
    }, [yerlestirmeSonucu, yerlestirmeGuncelle, ogrenciler, ogrencilerYukle, readOnly, showError, calculateDeskNumberForMasa]);

    const handleStudentTransfer = useCallback(async (transferData) => {
        if (readOnly) {
            showError('Öğrenci transferi yapmak için yönetici olarak giriş yapmalısınız.');
            return;
        }
        try {
            const result = await transferManager.executeTransfer(transferData);
            const updatedTumSalonlar = (yerlestirmeSonucu.tumSalonlar || []).map(s => {
                if (s.id === result.fromSalon.id || s.salonId === result.fromSalon.id || s.id === result.fromSalon.salonId) return result.fromSalon;
                if (s.id === result.toSalon.id || s.salonId === result.toSalon.id || s.id === result.toSalon.salonId) return result.toSalon;
                return s;
            });

            let updatedCurrentSalon = yerlestirmeSonucu.salon;
            if (updatedCurrentSalon?.id === result.fromSalon.id || updatedCurrentSalon?.salonId === result.fromSalon.salonId) updatedCurrentSalon = result.fromSalon;
            else if (updatedCurrentSalon?.id === result.toSalon.id || updatedCurrentSalon?.salonId === result.toSalon.salonId) updatedCurrentSalon = result.toSalon;

            const yerlesenOgrenciSayisi = updatedTumSalonlar.reduce((acc, s) => acc + (s.masalar?.filter(m => m.ogrenci).length || 0), 0);
            const updatedIstatistikler = {
                ...yerlestirmeSonucu.istatistikler,
                yerlesenOgrenci: yerlesenOgrenciSayisi,
                yerlesemeyenOgrenci: (yerlestirmeSonucu.istatistikler?.toplamOgrenci || ogrenciler.length) - yerlesenOgrenciSayisi
            };

            yerlestirmeGuncelle({ ...yerlestirmeSonucu, salon: updatedCurrentSalon, tumSalonlar: updatedTumSalonlar, istatistikler: updatedIstatistikler });
            showSuccess(`✅ ${result.student.ad} ${result.student.soyad} başarıyla transfer edildi!`);
        } catch (error) {
            showError(`❌ Transfer hatası: ${error.message}`);
        }
    }, [yerlestirmeSonucu, yerlestirmeGuncelle, ogrenciler.length, readOnly, showError, showSuccess]);

    const handleYerlestirmeYap = useCallback(() => {
        if (readOnly) {
            showError('Yerleştirme yapmak için yönetici olarak giriş yapmalısınız.');
            return;
        }
        if (ogrenciler.length === 0) {
            hataAyarla('Lütfen öğrenci ekleyin!');
            return;
        }
        if (!salonlar?.length) {
            hataAyarla('Lütfen salon ekleyin!');
            return;
        }
        if (!ayarlar.dersler?.length) {
            hataAyarla('Lütfen ders ekleyin!');
            return;
        }

        planManager.invalidateCurrentPlan('yerlestirme_yap');
        setActivePlanMeta(null);

        try {
            yuklemeBaslat();
            setTimeout(() => {
                try {
                    const aktifSalonlar = salonlar.filter(s => s.aktif !== false);
                    if (aktifSalonlar.length === 0) throw new Error('Aktif salon bulunamadı!');

                    const seciliSiniflar = [...new Set(ayarlar.dersler.flatMap(d => d.siniflar || []))];
                    const seciliSinifOgrencileri = ogrenciler.filter(o => seciliSiniflar.includes(o.sinif));

                    if (seciliSinifOgrencileri.length === 0) throw new Error('Seçili sınıflarda öğrenci bulunamadı!');

                    const sonuc = gelismisYerlestirme(seciliSinifOgrencileri, aktifSalonlar, ayarlar);
                    if (sonuc.istatistikler) {
                        sonuc.istatistikler.toplamOgrenci = ogrenciler.length;
                        sonuc.istatistikler.yerlesemeyenOgrenci = ogrenciler.length - sonuc.istatistikler.yerlesenOgrenci;
                    }

                    const formatlanmisSonuc = {
                        salon: sonuc.salonlar[0],
                        tumSalonlar: sonuc.salonlar,
                        kalanOgrenciler: sonuc.yerlesilemeyenOgrenciler,
                        yerlesilemeyenOgrenciler: sonuc.yerlesilemeyenOgrenciler,
                        istatistikler: sonuc.istatistikler
                    };

                    yerlestirmeYap(formatlanmisSonuc);
                    tabDegistir('salon-plani');
                } catch (error) {
                    hataAyarla(`Yerleştirme hatası: ${error.message}`);
                }
            }, 50);
        } catch (error) {
            hataAyarla(`Yerleştirme başlatılamadı: ${error.message}`);
        }
    }, [readOnly, ogrenciler, salonlar, ayarlar, showError, hataAyarla, yuklemeBaslat, yerlestirmeYap, tabDegistir]);

    return {
        seciliSalonId,
        setSeciliSalonId,
        showFirstTimeLoader,
        printMenuAnchor,
        saveDialogOpen,
        activePlanMeta,
        readOnly,
        salonPlaniPrintRef,
        sinifListesiPrintRef,
        salonImzaListesiPrintRef,
        exam,
        handlePrintMenuOpen,
        handlePrintMenuClose,
        handlePrintAction,
        handleSalonPlaniPrint,
        handleSinifListesiPrint,
        handleSalonImzaListesiPrint,
        handleSaveClick,
        handleSaveDialogClose,
        handleSavePlan,
        handleYerlestirmeTemizle,
        handlePlanYukle,
        handleStudentMove,
        handleStudentTransfer,
        handleYerlestirmeYap,
        handleAyarlarDegistir: (yeni) => {
            if (readOnly) showError('Düzenleme yetkisi gerekli.');
            else {
                ayarlarGuncelle(yeni);
                localStorage.setItem('exam_ayarlar', JSON.stringify(yeni));
            }
        },
        handleSalonlarDegistir: (yeni) => {
            if (readOnly) showError('Düzenleme yetkisi gerekli.');
            else {
                salonlarGuncelle(yeni);
                localStorage.setItem('exam_salonlar', JSON.stringify(yeni));
            }
        }
    };
};
