import React from 'react';
import { Box, Chip } from '@mui/material';
import { useDrag, useDrop } from 'react-dnd';

const ITEM_TYPES = {
    STUDENT: 'student'
};

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

export const UnplacedStudentsDropZone = ({ children, onStudentMove }) => {
    const [{ isOver, canDrop }, drop] = useDrop({
        accept: ITEM_TYPES.STUDENT,
        drop: (item) => {
            if (item.masaId !== null && onStudentMove) {
                onStudentMove(item.masaId, null, item.ogrenci);
            }
            return { dropped: true };
        },
        collect: (monitor) => ({
            isOver: monitor.isOver(),
            canDrop: monitor.canDrop(),
        })
    });

    const isActive = isOver && canDrop;
    let backgroundColor = 'grey.50';
    if (isActive) backgroundColor = 'rgba(255, 193, 7, 0.1)';
    else if (canDrop) backgroundColor = 'rgba(255, 193, 7, 0.05)';

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
