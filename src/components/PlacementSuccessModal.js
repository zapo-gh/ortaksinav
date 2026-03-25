import React, { useEffect, useState } from 'react';
import {
    Dialog,
    DialogContent,
    Typography,
    Box,
    LinearProgress,
    Fade,
    useTheme
} from '@mui/material';
import {
    CheckCircle as CheckCircleIcon,
    People as PeopleIcon,
    Chair as ChairIcon,
    PersonOff as PersonOffIcon
} from '@mui/icons-material';

const PlacementSuccessModal = ({ open, onClose, statistics, title, message }) => {
    const theme = useTheme();
    const [progress, setProgress] = useState(100);
    const DURATION = 3000; // 3 saniye

    useEffect(() => {
        if (open) {
            setProgress(100);
            const startTime = Date.now();

            const timer = setInterval(() => {
                const elapsed = Date.now() - startTime;
                const remaining = Math.max(0, 100 - (elapsed / DURATION) * 100);

                setProgress(remaining);

                if (elapsed >= DURATION) {
                    clearInterval(timer);
                    onClose();
                }
            }, 50);

            return () => clearInterval(timer);
        }
    }, [open, onClose]);

    // if (!statistics) return null; // İstatistik olmasa da modal açılsın (başarı mesajı için)

    return (
        <Dialog
            open={open}
            onClose={onClose}
            PaperProps={{
                sx: {
                    borderRadius: 4,
                    minWidth: 320,
                    maxWidth: 400,
                    textAlign: 'center',
                    p: 2,
                    boxShadow: '0 12px 40px rgba(0,0,0,0.2)'
                }
            }}
            TransitionComponent={Fade}
            transitionDuration={400}
        >
            <DialogContent sx={{ p: 2 }}>
                <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
                    <CheckCircleIcon
                        sx={{
                            fontSize: 80,
                            color: 'success.main',
                            filter: 'drop-shadow(0 4px 6px rgba(46, 125, 50, 0.3))'
                        }}
                    />
                </Box>

                <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                    {title || "Yerleştirme Tamamlandı!"}
                </Typography>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                    {message || "Öğrenciler başarıyla salonlara yerleştirildi."}
                </Typography>

                {statistics && (
                    <Box sx={{
                        bgcolor: 'background.default',
                        borderRadius: 3,
                        p: 2,
                        mb: 3,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2
                    }}>
                        <StatRow
                            icon={<PeopleIcon color="primary" />}
                            label="Toplam Öğrenci"
                            value={statistics.toplamOgrenci || 0}
                        />
                        <StatRow
                            icon={<ChairIcon color="success" />}
                            label="Yerleşen"
                            value={statistics.yerlesenOgrenci || 0}
                        />
                        <StatRow
                            icon={<PersonOffIcon color="error" />}
                            label="Yerleşemeyen"
                            value={statistics.yerlesemeyenOgrenci || 0}
                            warning={statistics.yerlesemeyenOgrenci > 0}
                        />
                    </Box>
                )}

                <Box sx={{ width: '100%', mt: 2 }}>
                    <LinearProgress
                        variant="determinate"
                        value={progress}
                        sx={{
                            height: 6,
                            borderRadius: 3,
                            bgcolor: 'action.hover',
                            '& .MuiLinearProgress-bar': {
                                borderRadius: 3,
                                bgcolor: 'success.main'
                            }
                        }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        Salon planına yönlendiriliyorsunuz...
                    </Typography>
                </Box>
            </DialogContent>
        </Dialog>
    );
};

const StatRow = ({ icon, label, value, warning }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {icon}
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {label}
            </Typography>
        </Box>
        <Typography
            variant="body1"
            sx={{
                fontWeight: 'bold',
                color: warning ? 'error.main' : 'text.primary'
            }}
        >
            {value}
        </Typography>
    </Box>
);

export default PlacementSuccessModal;
