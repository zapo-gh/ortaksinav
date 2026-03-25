import React from 'react';
import { Card, styled } from '@mui/material';

const StyledCard = styled(Card)(({ theme, variant }) => ({
    transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
    ...(variant === 'interactive' && {
        '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: theme.shadows[3],
        },
    }),
    ...(variant === 'glass' && {
        background: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
    }),
}));

const AppCard = ({ children, variant = 'default', ...props }) => {
    return (
        <StyledCard variant={variant} {...props}>
            {children}
        </StyledCard>
    );
};

export default AppCard;
