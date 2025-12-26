import React from 'react';
import { Button, styled } from '@mui/material';

const StyledButton = styled(Button)(({ theme, rounded }) => ({
    borderRadius: rounded ? 99 : 8,
    padding: '8px 24px',
}));

const AppButton = ({ children, rounded, ...props }) => {
    return (
        <StyledButton rounded={rounded} {...props}>
            {children}
        </StyledButton>
    );
};

export default AppButton;
