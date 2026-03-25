import React from 'react';
import ErrorBoundary from '../../../components/ErrorBoundary';
import { PlanlamaYapLazy } from '../../../components/LazyComponents';

const PlanlamaTab = ({
    ogrenciler,
    ayarlar,
    salonlar,
    onYerlestirmeYap,
    yukleme
}) => {
    return (
        <ErrorBoundary componentName="PlanlamaYap">
            <PlanlamaYapLazy
                ogrenciler={ogrenciler}
                ayarlar={ayarlar}
                salonlar={salonlar}
                onYerlestirmeYap={onYerlestirmeYap}
                yukleme={yukleme}
            />
        </ErrorBoundary>
    );
};

export default PlanlamaTab;
