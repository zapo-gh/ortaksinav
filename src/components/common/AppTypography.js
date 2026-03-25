import React from 'react';
import { Typography, styled } from '@mui/material';

const StyledTypography = styled(Typography)(({ theme, gradient }) => ({
    ...(gradient && {
        background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
    }),
}));

const AppTypography = ({ children, gradient, ...props }) => {
    return (
        <StyledTypography gradient={gradient} {...props}>
            {children}
        </StyledTypography>
    );
};

export default AppTypography;
