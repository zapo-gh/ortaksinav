import logger from '../../utils/logger.js';

export const enforcePinnedStudents = (sonuclar, tumYerlesilemeyen, originalStudents) => {
    if (!Array.isArray(sonuclar) || sonuclar.length === 0) return;
    if (!Array.isArray(originalStudents) || originalStudents.length === 0) return;

    const normalizeId = (value) => (value != null ? String(value) : null);
    const pinnedStudents = originalStudents.filter(
        (student) => student && student.pinned && student.pinnedSalonId != null
    );
    if (pinnedStudents.length === 0) return;

    const ensureArray = (parent, key) => {
        if (!parent[key]) {
            parent[key] = [];
        } else if (!Array.isArray(parent[key])) {
            parent[key] = [];
        }
    };

    const cleanMasalarCollection = (collection, studentIdNorm) => {
        if (!Array.isArray(collection)) return;
        collection.forEach((masa) => {
            if (normalizeId(masa?.ogrenci?.id) === studentIdNorm) {
                masa.ogrenci = null;
            }
        });
    };

    const removeStudentFromSalon = (result, studentIdNorm) => {
        if (!result || !studentIdNorm) return;

        if (Array.isArray(result.ogrenciler)) {
            result.ogrenciler = result.ogrenciler.filter((ogr) => normalizeId(ogr?.id) !== studentIdNorm);
        }
        if (Array.isArray(result.yerlesilemeyenOgrenciler)) {
            result.yerlesilemeyenOgrenciler = result.yerlesilemeyenOgrenciler.filter(
                (ogr) => normalizeId(ogr?.id) !== studentIdNorm
            );
        }
        if (Array.isArray(result.plan)) {
            result.plan.forEach((cell) => {
                if (normalizeId(cell?.ogrenci?.id) === studentIdNorm) {
                    cell.ogrenci = null;
                }
            });
        }
        cleanMasalarCollection(result.masalar, studentIdNorm);
        if (result.koltukMatrisi) {
            cleanMasalarCollection(result.koltukMatrisi.masalar, studentIdNorm);
        }
        if (result.salon) {
            cleanMasalarCollection(result.salon.masalar, studentIdNorm);
        }
    };

    const matchSalon = (targetId, result) => {
        const normalizedTarget = normalizeId(targetId);
        if (!normalizedTarget) return false;
        const candidates = [
            result.salonId,
            result.id,
            result.salonAdi,
            result.salon?.id,
            result.salon?.salonId,
            result.salon?.ad
        ];
        return candidates.some((candidate) => normalizeId(candidate) === normalizedTarget);
    };

    const findSeatRefs = (result, seatId) => {
        const normalizedSeatId = normalizeId(seatId);
        if (!normalizedSeatId) return null;
        const findIn = (collection) =>
            Array.isArray(collection) ? collection.find((item) => normalizeId(item?.id) === normalizedSeatId) : null;
        return {
            planCell: findIn(result.plan),
            masaCell: findIn(result.masalar),
            matrixCell: findIn(result.koltukMatrisi?.masalar),
            salonCell: findIn(result.salon?.masalar)
        };
    };

    pinnedStudents.forEach((student) => {
        const studentIdNorm = normalizeId(student.id);
        if (!studentIdNorm) return;

        sonuclar.forEach((result) => removeStudentFromSalon(result, studentIdNorm));

        const targetSalon = sonuclar.find((result) => matchSalon(student.pinnedSalonId, result));
        if (!targetSalon) {
            logger.warn(`⚠️ Sabit öğrenci için hedef salon bulunamadı: ${student.ad || student.id} -> ${student.pinnedSalonId}`);
            return;
        }

        if (!targetSalon.koltukMatrisi || typeof targetSalon.koltukMatrisi !== 'object') {
            targetSalon.koltukMatrisi = { masalar: [] };
        }
        ensureArray(targetSalon.koltukMatrisi, 'masalar');
        ensureArray(targetSalon, 'plan');
        ensureArray(targetSalon, 'masalar');
        ensureArray(targetSalon, 'ogrenciler');
        if (!Array.isArray(targetSalon.yerlesilemeyenOgrenciler)) {
            targetSalon.yerlesilemeyenOgrenciler = [];
        }
        if (targetSalon.salon && typeof targetSalon.salon === 'object') {
            ensureArray(targetSalon.salon, 'masalar');
        }

        const seatId = normalizeId(student.pinnedMasaId);
        let seatRefs = findSeatRefs(targetSalon, seatId);

        const findFirstEmptySeat = () => {
            if (!Array.isArray(targetSalon.plan)) return null;
            const emptyCell = targetSalon.plan.find((cell) => !cell.ogrenci);
            if (!emptyCell) return null;
            const idNorm = normalizeId(emptyCell.id);
            const findById = (collection) =>
                Array.isArray(collection) ? collection.find((item) => normalizeId(item?.id) === idNorm) : null;
            return {
                planCell: emptyCell,
                masaCell: findById(targetSalon.masalar),
                matrixCell: findById(targetSalon.koltukMatrisi?.masalar),
                salonCell: findById(targetSalon.salon?.masalar)
            };
        };

        if (
            !seatRefs ||
            (!seatRefs.planCell && !seatRefs.masaCell && !seatRefs.matrixCell && !seatRefs.salonCell)
        ) {
            seatRefs = findFirstEmptySeat();
        }

        if (
            !seatRefs ||
            (!seatRefs.planCell && !seatRefs.masaCell && !seatRefs.matrixCell && !seatRefs.salonCell)
        ) {
            const template =
                (Array.isArray(targetSalon.masalar) && targetSalon.masalar[0]) ||
                (Array.isArray(targetSalon.plan) && targetSalon.plan[0]) ||
                (Array.isArray(targetSalon.koltukMatrisi?.masalar) && targetSalon.koltukMatrisi.masalar[0]) ||
                {};
            const newSeatId = seatId || `pinned-${studentIdNorm}-${Date.now()}`;
            const newSeat = {
                id: newSeatId,
                satir: template.satir ?? 0,
                sutun: template.sutun ?? 0,
                grup: template.grup ?? 1,
                koltukTipi: template.koltukTipi ?? 'standart',
                masaNumarasi:
                    template.masaNumarasi ??
                    (Array.isArray(targetSalon.masalar) ? targetSalon.masalar.length + 1 : 1)
            };

            targetSalon.plan.push({ ...newSeat, ogrenci: null });
            targetSalon.masalar.push({ ...newSeat, ogrenci: null });
            targetSalon.koltukMatrisi.masalar.push({ ...newSeat, ogrenci: null });
            if (targetSalon.salon?.masalar) {
                targetSalon.salon.masalar.push({ ...newSeat, ogrenci: null });
            }

            seatRefs = {
                planCell: targetSalon.plan[targetSalon.plan.length - 1],
                masaCell: targetSalon.masalar[targetSalon.masalar.length - 1],
                matrixCell: targetSalon.koltukMatrisi.masalar[targetSalon.koltukMatrisi.masalar.length - 1],
                salonCell: targetSalon.salon?.masalar
                    ? targetSalon.salon.masalar[targetSalon.salon.masalar.length - 1]
                    : null
            };
        }

        const existingOccupant = (() => {
            const cells = [seatRefs.planCell, seatRefs.masaCell, seatRefs.matrixCell, seatRefs.salonCell];
            for (const cell of cells) {
                if (cell?.ogrenci) {
                    const occId = normalizeId(cell.ogrenci.id);
                    if (occId && occId !== studentIdNorm) {
                        return cell.ogrenci;
                    }
                }
            }
            return null;
        })();

        if (existingOccupant) {
            const occupantIdNorm = normalizeId(existingOccupant.id);
            if (occupantIdNorm) {
                sonuclar.forEach((result) => removeStudentFromSalon(result, occupantIdNorm));
                if (Array.isArray(tumYerlesilemeyen)) {
                    const already = tumYerlesilemeyen.some((ogr) => normalizeId(ogr?.id) === occupantIdNorm);
                    if (!already) {
                        tumYerlesilemeyen.push({ ...existingOccupant, displacedByPinned: true });
                    }
                }
            }
        }

        const placedStudent = {
            ...student,
            pinned: true,
            salonId: targetSalon.salonId ?? targetSalon.salon?.id ?? student.pinnedSalonId,
            salonAdi:
                targetSalon.salonAdi ??
                targetSalon.salon?.salonAdi ??
                targetSalon.salon?.ad ??
                String(student.pinnedSalonId),
            masaNumarasi:
                seatRefs.planCell?.masaNumarasi ??
                seatRefs.masaCell?.masaNumarasi ??
                seatRefs.matrixCell?.masaNumarasi ??
                seatRefs.salonCell?.masaNumarasi ??
                undefined,
            satir:
                seatRefs.planCell?.satir ??
                seatRefs.masaCell?.satir ??
                seatRefs.matrixCell?.satir ??
                seatRefs.salonCell?.satir ??
                0,
            sutun:
                seatRefs.planCell?.sutun ??
                seatRefs.masaCell?.sutun ??
                seatRefs.matrixCell?.sutun ??
                seatRefs.salonCell?.sutun ??
                0,
            grup:
                seatRefs.planCell?.grup ??
                seatRefs.masaCell?.grup ??
                seatRefs.matrixCell?.grup ??
                seatRefs.salonCell?.grup ??
                1,
            koltukTipi:
                seatRefs.planCell?.koltukTipi ??
                seatRefs.masaCell?.koltukTipi ??
                seatRefs.matrixCell?.koltukTipi ??
                seatRefs.salonCell?.koltukTipi ??
                'standart'
        };

        [seatRefs.planCell, seatRefs.masaCell, seatRefs.matrixCell, seatRefs.salonCell].forEach((cell) => {
            if (cell) {
                cell.ogrenci = { ...placedStudent };
            }
        });

        const existingIndex = targetSalon.ogrenciler.findIndex((ogr) => normalizeId(ogr?.id) === studentIdNorm);
        if (existingIndex === -1) {
            targetSalon.ogrenciler.push(placedStudent);
        } else {
            targetSalon.ogrenciler[existingIndex] = placedStudent;
        }

        if (Array.isArray(tumYerlesilemeyen)) {
            for (let i = tumYerlesilemeyen.length - 1; i >= 0; i--) {
                if (normalizeId(tumYerlesilemeyen[i]?.id) === studentIdNorm) {
                    tumYerlesilemeyen.splice(i, 1);
                }
            }
        }
    });
};

export const findEnBosSalonlar = (yerlesilemeyenOgrenciler, salonlar, ayarlar) => {
    logger.info('🔍 Yerleşemeyen öğrenciler için en boş salonlar aranıyor...');

    if (!yerlesilemeyenOgrenciler || yerlesilemeyenOgrenciler.length === 0) {
        return {
            enBosSalonlar: [],
            yerlesilemeyenOgrenciler: [],
            oneriler: []
        };
    }

    const aktifSalonlar = salonlar.filter(salon => salon.aktif);

    const salonBoslukAnalizi = aktifSalonlar.map(salon => {
        let toplamKoltuk = 0;
        let mevcutDoluluk = 0;

        if (salon.koltukMatrisi?.masalar) {
            toplamKoltuk = salon.koltukMatrisi.masalar.length;
            mevcutDoluluk = salon.koltukMatrisi.masalar.filter(m => m.ogrenci).length;
        } else if (salon.masalar) {
            toplamKoltuk = salon.masalar.length;
            mevcutDoluluk = salon.masalar.filter(m => m.ogrenci).length;
        }

        return {
            salonId: salon.id,
            salonAdi: salon.salonAdi,
            bosKoltuk: toplamKoltuk - mevcutDoluluk,
            toplamKoltuk,
            mevcutDoluluk
        };
    }).sort((a, b) => b.bosKoltuk - a.bosKoltuk);

    return {
        enBosSalonlar: salonBoslukAnalizi,
        yerlesilemeyenOgrenciler,
        oneriler: salonBoslukAnalizi.length > 0 ?
            [`En çok boş yeri olan salon: ${salonBoslukAnalizi[0].salonAdi} (${salonBoslukAnalizi[0].bosKoltuk} boş koltuk)`] :
            ['Boş salon bulunamadı']
    };
};
