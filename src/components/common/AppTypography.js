import React from 'react';
import { Typography, styled } from '@mui/material';

const StyledTypography = styled(Typography)(({ theme, gradient }) => ({
    ...(gradient && {
        background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.primary.light} 90%)`,
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
