import React, { useState, useCallback } from 'react';
import {
    Button,
    TextField,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions
} from '@mui/material';

const PlanKaydetmeDialog = React.memo(({
    open,
    onClose,
    onSave
}) => {
    const [planAdi, setPlanAdi] = useState('');

    const handlePlanAdiChange = useCallback((e) => {
        setPlanAdi(e.target.value);
    }, []);

    const handleClose = useCallback(() => {
        setPlanAdi('');
        onClose();
    }, [onClose]);

    const handleSave = useCallback(async () => {
        if (!planAdi.trim()) return;
        try {
            await onSave(planAdi);
            setPlanAdi('');
            onClose();
        } catch (error) {
            console.error('Plan kaydetme hatası:', error);
            setPlanAdi('');
            onClose();
        }
    }, [onSave, onClose, planAdi]);

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>Planı Kaydet</DialogTitle>
            <DialogContent>
                <TextField
                    autoFocus
                    margin="dense"
                    label="Plan Adı"
                    fullWidth
                    variant="outlined"
                    value={planAdi}
                    onChange={handlePlanAdiChange}
                    placeholder="Örn: 2025-2026 1. Dönem Sınav Planı"
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>İptal</Button>
                <Button onClick={handleSave} variant="contained" color="primary">
                    Kaydet
                </Button>
            </DialogActions>
        </Dialog>
    );
});

export default PlanKaydetmeDialog;
