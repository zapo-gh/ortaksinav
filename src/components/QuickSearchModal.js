import React from 'react';
import { Dialog, DialogTitle, DialogContent, TextField, List, ListItemButton, ListItemText, Box, Typography } from '@mui/material';
import { useExam } from '../context/ExamContext';

const QuickSearchModal = ({ open, onClose }) => {
  const { ogrenciler, placementIndex } = useExam();
  const [query, setQuery] = React.useState('');

  React.useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const results = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const base = ogrenciler || [];
    return base
      .filter(o => (
        `${o.ad} ${o.soyad}`.toLowerCase().includes(q) || String(o.numara || '').includes(q)
      ))
      .slice(0, 30)
      .map(o => {
        const plc = placementIndex?.[o.id] || {};
        return { id: o.id, ad: o.ad, soyad: o.soyad, numara: o.numara, sinif: o.sinif || o.sube, ...plc };
      });
  }, [query, ogrenciler, placementIndex]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Öğrenci Ara (Ctrl+K)</DialogTitle>
      <DialogContent>
        <TextField autoFocus fullWidth placeholder="Ad, Soyad veya Numara" value={query} onChange={e => setQuery(e.target.value)} size="small" />
        {query && (
          <List dense>
            {results.length === 0 ? (
              <Box sx={{ p: 2 }}>
                <Typography variant="body2" color="text.secondary">Sonuç yok</Typography>
              </Box>
            ) : results.map(r => (
              <ListItemButton key={r.id} onClick={onClose}>
                <ListItemText
                  primary={`${r.ad} ${r.soyad} ${r.numara ? `• ${r.numara}` : ''}`}
                  secondary={`${r.sinif || '-'} • ${r.salonAdi || 'Salon yok'} • Masa ${r.masaNo != null ? r.masaNo : '-'}`}
                />
              </ListItemButton>
            ))}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default QuickSearchModal;


