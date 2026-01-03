import React, { useMemo } from 'react';
import GenelAyarlarFormu from '../../../components/GenelAyarlarFormu';
import OgrenciListesi from '../../../components/OgrenciListesi';
import SalonFormu from '../../../components/SalonFormu';
import AyarlarFormu from '../../../components/AyarlarFormu';
import ErrorBoundary from '../../../components/ErrorBoundary';
import {
    SabitAtamalarLazy,
    KayitliPlanlarLazy,
    DatabaseTestLazy,
    TestDashboardLazy
} from '../../../components/LazyComponents';
import SalonPlaniTab from '../tabs/SalonPlaniTab';
import PlanlamaTab from '../tabs/PlanlamaTab';

const TabContentRenderer = ({
    aktifTab,
    exam,
    stateOps // All handlers from useAnaSayfaState
}) => {
    const {
        ogrenciler,
        ayarlar,
        salonlar,
        yerlestirmeSonucu,
        yukleme
    } = exam;

    const {
        readOnly,
        handleAyarlarDegistir,
        handleSalonlarDegistir,
        handleYerlestirmeYap,
        seciliSalonId,
        setSeciliSalonId,
        handleYerlestirmeTemizle,
        handleStudentMove,
        handleStudentTransfer,
        yerlestirmeGuncelle,
        activePlanMeta,
        handlePlanYukle
    } = stateOps;

    const currentPlanDisplayName = activePlanMeta?.name || '';

    const content = useMemo(() => {
        switch (aktifTab) {
            case 'genel-ayarlar':
                return (
                    <GenelAyarlarFormu
                        ayarlar={ayarlar}
                        onAyarlarDegistir={handleAyarlarDegistir}
                        readOnly={readOnly}
                    />
                );

            case 'ogrenciler':
                return (
                    <OgrenciListesi
                        ogrenciler={ogrenciler}
                        yerlestirmeSonucu={yerlestirmeSonucu}
                    />
                );

            case 'salonlar':
                return (
                    <SalonFormu
                        salonlar={salonlar}
                        onSalonlarDegistir={handleSalonlarDegistir}
                        yerlestirmeSonucu={yerlestirmeSonucu}
                        readOnly={readOnly}
                    />
                );

            case 'ayarlar':
                return (
                    <AyarlarFormu
                        ayarlar={ayarlar}
                        onAyarlarDegistir={handleAyarlarDegistir}
                        ogrenciler={ogrenciler}
                        yerlestirmeSonucu={yerlestirmeSonucu}
                        readOnly={readOnly}
                    />
                );

            case 'sabit-atamalar':
                return (
                    <ErrorBoundary componentName="SabitAtamalar">
                        <SabitAtamalarLazy />
                    </ErrorBoundary>
                );

            case 'planlama':
                return (
                    <PlanlamaTab
                        ogrenciler={ogrenciler}
                        ayarlar={ayarlar}
                        salonlar={salonlar}
                        onYerlestirmeYap={handleYerlestirmeYap}
                        yukleme={yukleme}
                    />
                );

            case 'salon-plani':
                return (
                    <SalonPlaniTab
                        yerlestirmeSonucu={yerlestirmeSonucu}
                        salonlar={salonlar}
                        seciliSalonId={seciliSalonId}
                        setSeciliSalonId={setSeciliSalonId}
                        handleYerlestirmeTemizle={handleYerlestirmeTemizle}
                        handleStudentMove={handleStudentMove}
                        handleStudentTransfer={handleStudentTransfer}
                        yerlestirmeGuncelle={yerlestirmeGuncelle}
                        currentPlanDisplayName={currentPlanDisplayName}
                        readOnly={readOnly}
                        ayarlar={ayarlar}
                        ogrenciler={ogrenciler}
                    />
                );

            case 'kayitli-planlar':
                return (
                    <ErrorBoundary componentName="KayitliPlanlar">
                        <KayitliPlanlarLazy onPlanYukle={handlePlanYukle} />
                    </ErrorBoundary>
                );

            case 'database-test':
                return <DatabaseTestLazy />;

            case 'test-dashboard':
                return <TestDashboardLazy />;

            default:
                return null;
        }
    }, [aktifTab, ayarlar, handleAyarlarDegistir, readOnly, ogrenciler, yerlestirmeSonucu, salonlar, handleSalonlarDegistir, handleYerlestirmeYap, yukleme, seciliSalonId, setSeciliSalonId, handleYerlestirmeTemizle, handleStudentMove, handleStudentTransfer, yerlestirmeGuncelle, currentPlanDisplayName, handlePlanYukle]);

    return content;
};

export default TabContentRenderer;
