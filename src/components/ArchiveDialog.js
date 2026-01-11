import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Grid,
    Typography,
    Box
} from '@mui/material';

const ArchiveDialog = ({ open, onClose, onConfirm, planName, defaultYear, defaultTerm }) => {
    const currentYear = new Date().getFullYear();
    const fallbackYear = `${currentYear}-${currentYear + 1}`;

    const [metadata, setMetadata] = useState({
        yil: defaultYear || fallbackYear,
        donem: defaultTerm ? `${defaultTerm}. Dönem` : '1. Dönem',
        sinavNo: '1. Sınav'
    });

    // Reset state when dialog opens or defaults change
    React.useEffect(() => {
        if (open) {
            setMetadata(prev => ({
                ...prev,
                yil: defaultYear || fallbackYear,
                donem: defaultTerm ? `${defaultTerm}. Dönem` : '1. Dönem'
            }));
        }
    }, [open, defaultYear, defaultTerm, fallbackYear]);

    const handleChange = (field) => (event) => {
        setMetadata(prev => ({
            ...prev,
            [field]: event.target.value
        }));
    };

    const handleConfirm = () => {
        onConfirm(metadata);
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle sx={{ pb: 1 }}>Planı Arşivle</DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    <strong>"{planName}"</strong> planını arşivlemek için kategori bilgilerini seçin.
                </Typography>

                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="Eğitim Yılı"
                            value={metadata.yil}
                            onChange={handleChange('yil')}
                            placeholder="Örn: 2024-2025"
                            variant="outlined"
                            size="small"
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Dönem</InputLabel>
                            <Select
                                value={metadata.donem}
                                label="Dönem"
                                onChange={handleChange('donem')}
                            >
                                <MenuItem value="1. Dönem">1. Dönem</MenuItem>
                                <MenuItem value="2. Dönem">2. Dönem</MenuItem>
                                <MenuItem value="Yaz Okulu">Yaz Okulu</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>

                    <Grid item xs={12}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Sınav Numarası</InputLabel>
                            <Select
                                value={metadata.sinavNo}
                                label="Sınav Numarası"
                                onChange={handleChange('sinavNo')}
                            >
                                <MenuItem value="1. Sınav">1. Sınav</MenuItem>
                                <MenuItem value="2. Sınav">2. Sınav</MenuItem>
                                <MenuItem value="3. Sınav">3. Sınav</MenuItem>
                                <MenuItem value="Telafi Sınavı">Telafi Sınavı</MenuItem>
                                <MenuItem value="Sorumluluk Sınavı">Sorumluluk Sınavı</MenuItem>
                                <MenuItem value="Diğer">Diğer</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions sx={{ p: 2, pt: 1 }}>
                <Button onClick={onClose} color="inherit">İptal</Button>
                <Button
                    onClick={handleConfirm}
                    variant="contained"
                    color="primary"
                    disabled={!metadata.yil || !metadata.donem || !metadata.sinavNo}
                >
                    Arşivle
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ArchiveDialog;
