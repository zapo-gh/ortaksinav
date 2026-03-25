import React from 'react';
import {
    Box,
    Typography,
    Button,
    CircularProgress
} from '@mui/material';
import {
    School,
    FactCheck,
    PlayArrow as PlayIcon
} from '@mui/icons-material';

const FirstTimeLoader = ({ onContinue }) => {
    return (
        <Box
            onClick={onContinue}
            sx={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                bgcolor: 'background.default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                cursor: 'pointer',
            }}
        >
            <Box
                onClick={(e) => e.stopPropagation()}
                sx={{
                    textAlign: 'center',
                    color: 'white',
                    animation: 'fadeIn 0.8s ease-in'
                }}
            >
                <Box
                    sx={{
                        width: 120,
                        height: 120,
                        mx: 'auto',
                        mb: 4,
                        position: 'relative',
                        animation: 'pulse 2s ease-in-out infinite'
                    }}
                >
                    <Box
                        sx={{
                            width: '100%',
                            height: '100%',
                            borderRadius: '50%',
                            background: 'linear-gradient(45deg, rgba(255,255,255,0.3), rgba(255,255,255,0.1))',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backdropFilter: 'blur(10px)',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                            border: '2px solid rgba(255,255,255,0.2)'
                        }}
                    >
                        <School sx={{ fontSize: 60, color: 'white' }} />
                    </Box>
                    <Box
                        sx={{
                            position: 'absolute',
                            top: -10,
                            right: -10,
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            animation: 'rotate 2s linear infinite'
                        }}
                    >
                        <FactCheck sx={{ fontSize: 20, color: 'white' }} />
                    </Box>
                </Box>

                <Typography
                    variant="h5"
                    sx={{
                        fontWeight: 600,
                        mb: 1,
                        textShadow: '0 2px 10px rgba(0,0,0,0.3)',
                        animation: 'slideUp 0.8s ease-out 0.2s both',
                        fontSize: { xs: '1rem', sm: '1.25rem', md: '1.5rem' },
                        px: 2
                    }}
                >
                    Akhisar Farabi Mesleki ve Teknik Anadolu Lisesi
                </Typography>

                <Typography
                    variant="h4"
                    sx={{
                        fontWeight: 700,
                        mb: 2,
                        textShadow: '0 2px 10px rgba(0,0,0,0.3)',
                        animation: 'slideUp 0.8s ease-out 0.3s both',
                        fontSize: { xs: '1.25rem', sm: '1.5rem', md: '2rem' }
                    }}
                >
                    Ortak Sınav Yerleştirme Sistemi
                </Typography>

                <Typography
                    variant="h6"
                    sx={{ opacity: 0.9, mb: 4, fontWeight: 300, animation: 'slideUp 0.8s ease-out 0.4s both' }}
                >
                    Hoş geldiniz
                </Typography>

                <Box
                    sx={{
                        width: 200,
                        height: 4,
                        mx: 'auto',
                        background: 'rgba(255,255,255,0.3)',
                        borderRadius: 2,
                        overflow: 'hidden',
                        animation: 'slideUp 0.8s ease-out 0.6s both',
                        mb: 3
                    }}
                >
                    <Box
                        sx={{
                            width: '100%',
                            height: '100%',
                            background: 'white',
                            borderRadius: 2,
                            animation: 'loading 3s ease-in-out'
                        }}
                    />
                </Box>

                <Button
                    variant="contained"
                    onClick={onContinue}
                    sx={{
                        mt: 2,
                        px: 4,
                        py: 1.5,
                        background: 'rgba(255,255,255,0.2)',
                        backdropFilter: 'blur(10px)',
                        border: '2px solid rgba(255,255,255,0.3)',
                        color: 'white',
                        fontWeight: 600,
                        textTransform: 'none',
                        fontSize: '1rem',
                        '&:hover': {
                            background: 'rgba(255,255,255,0.3)',
                            border: '2px solid rgba(255,255,255,0.5)',
                        },
                        animation: 'slideUp 0.8s ease-out 0.8s both'
                    }}
                >
                    Devam Et
                </Button>
            </Box>

            <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
        @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes loading { from { transform: translateX(-100%); } to { transform: translateX(0); } }
      `}</style>
        </Box>
    );
};

export default FirstTimeLoader;
