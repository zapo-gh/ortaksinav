import React from 'react';
import {
  IconButton,
  Tooltip
} from '@mui/material';
import {
  SwapHoriz as TransferIcon
} from '@mui/icons-material';

const TransferButton = ({
  student,
  currentSalon,
  allSalons,
  onTransferClick,
  disabled = false
}) => {
  const handleClick = (event) => {
    if (disabled) return;
    event.stopPropagation(); // Event bubbling'i durdur
    // Doğrudan transfer modalını aç
    onTransferClick(student, currentSalon, null);
  };

  return (
    <Tooltip title="Salonlar Arası Transfer">
      <IconButton
        onClick={handleClick}
        disabled={disabled}
        size="small"
        sx={{
          color: 'primary.main',
          '&:hover': {
            backgroundColor: 'secondary.100', // Daha belirgin bir arka plan
            transform: 'scale(1.15)', // Biraz büyüme efekti
            boxShadow: 2 // Hafif gölge
          }
        }}
      >
        <TransferIcon />
      </IconButton>
    </Tooltip>
  );
};

export default TransferButton;
