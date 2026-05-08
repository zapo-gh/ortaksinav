import React from 'react';
import { Box, Card, CardContent, Typography, Chip } from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorBoundary from '../../../components/ErrorBoundary';
import { SalonPlaniLazy } from '../../../components/LazyComponents';

const SalonPlaniTab = ({
    yerlestirmeSonucu,
    salonlar,
    seciliSalonId,
    setSeciliSalonId,
    handleYerlestirmeTemizle,
    handleStudentMove,
    handleStudentTransfer,
    yerlestirmeGuncelle,
    currentPlanDisplayName,
    readOnly,
    ayarlar,
    ogrenciler
}) => {
    const aktifSalonlar = salonlar?.filter(salon => salon.aktif !== false) || [];

    if (aktifSalonlar.length > 0 && !yerlestirmeSonucu) {
        const seciliSalon = aktifSalonlar.find(salon => salon.id === seciliSalonId) || aktifSalonlar[0];
        const salonKapasite = seciliSalon.capacity || 30; // Assuming capacity or kapasite
        const defaultSatir = seciliSalon.satir || Math.ceil(Math.sqrt(salonKapasite)) || 6;
        const defaultSutun = seciliSalon.sutun || Math.ceil(salonKapasite / defaultSatir) || 5;

        return (
            <ErrorBoundary componentName="SalonPlani">
                <Box sx={{ position: 'relative' }}>
                    <SalonPlaniLazy
                        sinif={{
                            id: seciliSalon.id,
                            salonAdi: seciliSalon.salonAdi || seciliSalon.ad,
                            kapasite: salonKapasite,
                            siraTipi: seciliSalon.siraTipi || 'ikili',
                            gruplar: seciliSalon.gruplar || [],
                            masalar: [],
                            ogrenciler: [],
                            siraDizilimi: { satir: defaultSatir, sutun: defaultSutun }
                        }}
                        ogrenciler={[]}
                        ayarlar={ayarlar}
                        salonlar={aktifSalonlar}
                        seciliSalonId={seciliSalonId}
                        onSeciliSalonDegistir={setSeciliSalonId}
                        aktifPlanAdi={currentPlanDisplayName}
                    />
                </Box>
            </ErrorBoundary>
        );
    }

    return (
        <ErrorBoundary componentName="SalonPlani">
            <Box sx={{ position: 'relative' }}>
                {yerlestirmeSonucu && (
                    <>
                        <SalonPlaniLazy
                            sinif={yerlestirmeSonucu?.salon || {}}
                            ogrenciler={yerlestirmeSonucu?.salon?.ogrenciler || []}
                            ayarlar={ayarlar}
                            onOgrenciSec={(action, data) => {
                                if (action === 'clear') handleYerlestirmeTemizle();
                                else if (action === 'move') handleStudentMove('move', data);
                            }}
                            tumSalonlar={yerlestirmeSonucu?.tumSalonlar?.filter(s => s.aktif !== false) || []}
                            onSalonDegistir={(salon) => {
                                const formatlanmis = yerlestirmeSonucu.tumSalonlar.find(s => s.salonId === salon.salonId);
                                if (formatlanmis) yerlestirmeGuncelle({ salon: formatlanmis });
                            }}
                            salonlar={aktifSalonlar}
                            seciliSalonId={seciliSalonId}
                            onSeciliSalonDegistir={setSeciliSalonId}
                            onStudentTransfer={handleStudentTransfer}
                            yerlestirmeSonucu={yerlestirmeSonucu}
                            aktifPlanAdi={currentPlanDisplayName}
                            readOnly={readOnly}
                        />

                        {yerlestirmeSonucu.yerlesilemeyenOgrenciler?.length > 0 && (
                            <Card sx={{ mt: 1, border: '2px solid', borderColor: 'warning.main' }}>
                                <CardContent>
                                    <Typography variant="h6" sx={{ color: 'warning.main', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <WarningIcon />
                                        Yerleşmeyen Öğrenciler ({yerlestirmeSonucu.yerlesilemeyenOgrenciler.length})
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                        {yerlestirmeSonucu.yerlesilemeyenOgrenciler.map((o, i) => (
                                            <Chip key={i} label={`${o.ad} (${o.sinif})`} variant="outlined" color="warning" size="small" />
                                        ))}
                                    </Box>
                                </CardContent>
                            </Card>
                        )}
                    </>
                )}
            </Box>
        </ErrorBoundary>
    );
};

export default SalonPlaniTab;
