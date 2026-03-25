import { useCallback } from 'react';
import transferManager from '../utils/transferManager';
import { useNotifications } from '../components/NotificationSystem';
import { calculateDeskNumber } from '../utils/deskUtils';

export const useStudentPlacement = (
    yerlestirmeSonucu,
    yerlestirmeGuncelle,
    ogrenciler,
    ogrencilerYukle,
    readOnly
) => {
    const { showSuccess, showError } = useNotifications();

    // Masa numarası hesaplama fonksiyonu
    const calculateDeskNumberForMasa = useCallback((masa) => {
        return calculateDeskNumber(masa, yerlestirmeSonucu?.salon?.masalar);
    }, [yerlestirmeSonucu?.salon?.masalar]);

    const handleStudentMove = useCallback((action, data) => {
        if (readOnly) {
            showError('Yerleşim planını değiştirmek için yönetici olarak giriş yapmalısınız.');
            return;
        }

        if (action === 'update_desk_number') {
            const updatedOgrenciler = ogrenciler.map(ogrenci =>
                ogrenci.id === data.studentId
                    ? { ...ogrenci, masaNumarasi: data.deskNumber }
                    : ogrenci
            );
            ogrencilerYukle(updatedOgrenciler);
            return;
        }

        const { from, to, draggedStudent } = data || {};
        const fromMasaId = from;
        const toMasaId = to;

        if (!yerlestirmeSonucu || !yerlestirmeSonucu.salon) {
            return;
        }

        const currentSalon = yerlestirmeSonucu.salon;
        const fromMasa = currentSalon.masalar?.find(m => m.id === fromMasaId);
        const toMasa = currentSalon.masalar?.find(m => m.id === toMasaId);

        // Yerleşmeyen öğrenciden salona taşıma
        if (fromMasaId === null && toMasa) {
            const ogrenciToMove = draggedStudent || yerlestirmeSonucu.yerlesilemeyenOgrenciler?.[0];
            if (ogrenciToMove && !toMasa.ogrenci) {
                const updatedYerlesilemeyen = (yerlestirmeSonucu.yerlesilemeyenOgrenciler || []).filter(o => o.id !== ogrenciToMove.id);
                const updatedSalonMasalar = currentSalon.masalar.map(m =>
                    m.id === toMasa.id ? { ...m, ogrenci: { ...ogrenciToMove, masaNumarasi: toMasa.masaNumarasi || calculateDeskNumberForMasa(toMasa) } } : m
                );
                const updatedSalonOgrenciler = [...(currentSalon.ogrenciler || []), { ...ogrenciToMove, masaNumarasi: toMasa.masaNumarasi || calculateDeskNumberForMasa(toMasa) }];

                const updatedSalon = { ...currentSalon, masalar: updatedSalonMasalar, ogrenciler: updatedSalonOgrenciler };
                const updatedTumSalonlar = (yerlestirmeSonucu.tumSalonlar || []).map(salon =>
                    (salon.id === currentSalon.id || salon.salonId === currentSalon.salonId) ? updatedSalon : salon
                );

                const mevcutIstatistikler = yerlestirmeSonucu.istatistikler || {};
                const updatedIstatistikler = {
                    ...mevcutIstatistikler,
                    yerlesenOgrenci: (mevcutIstatistikler.yerlesenOgrenci || 0) + 1,
                    yerlesemeyenOgrenci: Math.max(0, (mevcutIstatistikler.yerlesemeyenOgrenci || 0) - 1)
                };

                yerlestirmeGuncelle({
                    ...yerlestirmeSonucu,
                    salon: updatedSalon,
                    tumSalonlar: updatedTumSalonlar,
                    yerlesilemeyenOgrenciler: updatedYerlesilemeyen,
                    istatistikler: updatedIstatistikler
                });
            }
            return;
        }

        // Öğrenciyi salondan çıkarma
        if (fromMasa && fromMasa.ogrenci && toMasaId === null) {
            const cikarilanOgrenci = fromMasa.ogrenci;
            const updatedSalonMasalar = currentSalon.masalar.map(m =>
                m.id === fromMasa.id ? { ...m, ogrenci: null } : m
            );
            const updatedSalonOgrenciler = (currentSalon.ogrenciler || []).filter(o => o.id !== cikarilanOgrenci.id);

            const updatedSalon = { ...currentSalon, masalar: updatedSalonMasalar, ogrenciler: updatedSalonOgrenciler };
            const updatedTumSalonlar = (yerlestirmeSonucu.tumSalonlar || []).map(salon =>
                (salon.id === currentSalon.id || salon.salonId === currentSalon.salonId) ? updatedSalon : salon
            );

            const updatedYerlesilemeyen = [...(yerlestirmeSonucu.yerlesilemeyenOgrenciler || []), cikarilanOgrenci];

            const mevcutIstatistikler = yerlestirmeSonucu.istatistikler || {};
            const updatedIstatistikler = {
                ...mevcutIstatistikler,
                yerlesenOgrenci: Math.max(0, (mevcutIstatistikler.yerlesenOgrenci || 0) - 1),
                yerlesemeyenOgrenci: (mevcutIstatistikler.yerlesemeyenOgrenci || 0) + 1
            };

            yerlestirmeGuncelle({
                ...yerlestirmeSonucu,
                salon: updatedSalon,
                tumSalonlar: updatedTumSalonlar,
                yerlesilemeyenOgrenciler: updatedYerlesilemeyen,
                istatistikler: updatedIstatistikler
            });
            return;
        }

        if (!fromMasa || !toMasa || !fromMasa.ogrenci) {
            return;
        }

        // Yer değiştirme mantığı
        const fromOgrenci = { ...fromMasa.ogrenci };
        const toOgrenci = toMasa.ogrenci ? { ...toMasa.ogrenci } : null;

        const updatedSalonMasalar = currentSalon.masalar.map(m => {
            if (m.id === fromMasa.id) return { ...m, ogrenci: toOgrenci };
            if (m.id === toMasa.id) return { ...m, ogrenci: fromOgrenci };
            return m;
        });

        const updatedSalonOgrenciler = (currentSalon.ogrenciler || []).map(ogrenci => {
            if (ogrenci.id === fromOgrenci.id) {
                return { ...ogrenci, masaNumarasi: toMasa.masaNumarasi || calculateDeskNumberForMasa(toMasa) };
            } else if (toOgrenci && ogrenci.id === toOgrenci.id) {
                return { ...ogrenci, masaNumarasi: fromMasa.masaNumarasi || calculateDeskNumberForMasa(fromMasa) };
            }
            return ogrenci;
        });

        const updatedSalon = { ...currentSalon, masalar: updatedSalonMasalar, ogrenciler: updatedSalonOgrenciler };
        const updatedTumSalonlar = (yerlestirmeSonucu.tumSalonlar || []).map(salon =>
            (salon.id === currentSalon.id || salon.salonId === currentSalon.salonId) ? updatedSalon : salon
        );

        yerlestirmeGuncelle({
            ...yerlestirmeSonucu,
            salon: updatedSalon,
            tumSalonlar: updatedTumSalonlar
        });
    }, [yerlestirmeSonucu, yerlestirmeGuncelle, ogrenciler, ogrencilerYukle, readOnly, showError, calculateDeskNumberForMasa]);

    const handleStudentTransfer = useCallback(async (transferData) => {
        if (readOnly) {
            showError('Öğrenci transferi yapmak için yönetici olarak giriş yapmalısınız.');
            return;
        }
        try {
            const result = await transferManager.executeTransfer(transferData);

            const updatedTumSalonlar = (yerlestirmeSonucu.tumSalonlar || []).map(salon => {
                if (salon.id === result.fromSalon.id || salon.salonId === result.fromSalon.salonId ||
                    salon.id === result.fromSalon.salonId || salon.salonId === result.fromSalon.id) {
                    return result.fromSalon;
                }
                if (salon.id === result.toSalon.id || salon.salonId === result.toSalon.salonId ||
                    salon.id === result.toSalon.salonId || salon.salonId === result.toSalon.id) {
                    return result.toSalon;
                }
                return salon;
            });

            let updatedCurrentSalon = yerlestirmeSonucu.salon;
            const currentSalonId = yerlestirmeSonucu.salon?.id || yerlestirmeSonucu.salon?.salonId;
            const fromSalonId = result.fromSalon.id || result.fromSalon.salonId;
            const toSalonId = result.toSalon.id || result.toSalon.salonId;

            if (currentSalonId === fromSalonId || yerlestirmeSonucu.salon?.id === result.fromSalon.id || yerlestirmeSonucu.salon?.salonId === result.fromSalon.salonId) {
                updatedCurrentSalon = result.fromSalon;
            } else if (currentSalonId === toSalonId || yerlestirmeSonucu.salon?.id === result.toSalon.id || yerlestirmeSonucu.salon?.salonId === result.toSalon.salonId) {
                updatedCurrentSalon = result.toSalon;
            }

            const calculateTotalPlaced = (salonlar) => {
                const uniqueIds = new Set();
                salonlar.forEach(salon => {
                    if (salon.masalar && Array.isArray(salon.masalar)) {
                        salon.masalar.forEach(masa => {
                            if (masa.ogrenci && masa.ogrenci.id != null) {
                                uniqueIds.add(String(masa.ogrenci.id));
                            }
                        });
                    }
                });
                return uniqueIds.size;
            };

            const yerlesenOgrenciSayisi = calculateTotalPlaced(updatedTumSalonlar);
            const mevcutIstatistikler = yerlestirmeSonucu.istatistikler || {};

            const updatedIstatistikler = {
                ...mevcutIstatistikler,
                yerlesenOgrenci: yerlesenOgrenciSayisi,
                toplamOgrenci: mevcutIstatistikler.toplamOgrenci || ogrenciler.length,
                yerlesemeyenOgrenci: Math.max(0, (mevcutIstatistikler.toplamOgrenci || ogrenciler.length) - yerlesenOgrenciSayisi)
            };

            yerlestirmeGuncelle({
                ...yerlestirmeSonucu,
                salon: updatedCurrentSalon,
                tumSalonlar: updatedTumSalonlar,
                istatistikler: updatedIstatistikler
            });

            showSuccess(`✅ ${result.student.ad} ${result.student.soyad} başarıyla transfer edildi!`);
        } catch (error) {
            showError(`❌ Transfer hatası: ${error.message}`);
            throw error;
        }
    }, [yerlestirmeSonucu, yerlestirmeGuncelle, ogrenciler.length, readOnly, showError, showSuccess]);

    return {
        handleStudentMove,
        handleStudentTransfer,
        calculateDeskNumberForMasa
    };
};
