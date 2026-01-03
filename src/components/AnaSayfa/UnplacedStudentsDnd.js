import React from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { Box, Chip } from '@mui/material';

// Drag & Drop item types
export const ITEM_TYPES = {
    STUDENT: 'student'
};

// Unplaced Students Drop Zone Component
export const UnplacedStudentsDropZone = ({ children, onStudentMove }) => {
    const [{ isOver, canDrop }, drop] = useDrop({
        accept: ITEM_TYPES.STUDENT,
        drop: (item, monitor) => {
            if (item.masaId !== null && onStudentMove) { // Salon masasından geliyorsa
                onStudentMove(item.masaId, null, item.ogrenci);
            }
            return { dropped: true };
        },
        collect: (monitor) => ({
            isOver: monitor.isOver(),
            canDrop: monitor.canDrop(),
        }),
        options: {
            hoverOptions: {
                hoverDelay: 0,
            },
        },
    });

    const isActive = isOver && canDrop;
    let backgroundColor = 'grey.50';
    if (isActive) {
        backgroundColor = 'rgba(255, 193, 7, 0.1)'; // Sarı vurgu
    } else if (canDrop) {
        backgroundColor = 'rgba(255, 193, 7, 0.05)'; // Hafif sarı vurgu
    }

    return (
        <Box
            ref={drop}
            sx={{
                backgroundColor: backgroundColor,
                borderRadius: 2,
                border: '2px dashed',
                borderColor: isActive ? 'warning.main' : 'grey.300',
                transition: 'border-color 0.1s ease, background-color 0.1s ease',
                '&:hover': {
                    borderColor: 'warning.main',
                }
            }}
        >
            {children}
        </Box>
    );
};

// Draggable Unplaced Student Component
export const DraggableUnplacedStudent = ({ ogrenci }) => {
    const [{ isDragging }, drag] = useDrag({
        type: ITEM_TYPES.STUDENT,
        item: {
            masaId: null,
            ogrenci: ogrenci
        },
        collect: (monitor) => ({
            isDragging: monitor.isDragging()
        })
    });

    return (
        <Chip
            ref={drag}
            label={`${ogrenci.ad} (${ogrenci.sinif})`}
            variant="outlined"
            color="warning"
            sx={{
                cursor: 'grab',
                opacity: isDragging ? 0.5 : 1,
                '&:active': {
                    cursor: 'grabbing'
                }
            }}
            title={`${ogrenci.ad} - ${ogrenci.sinif} - ${ogrenci.cinsiyet || 'Cinsiyet belirtilmemiş'}`}
        />
    );
};
