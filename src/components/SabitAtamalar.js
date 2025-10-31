import React from 'react';
import { Box, Card, CardContent, Typography, TextField, MenuItem, Button, Chip } from '@mui/material';
import { useExam } from '../context/ExamContext';

const SabitAtamalar = () => {
  const { ogrenciler, salonlar, ayarlar, ogrenciPin, ogrenciUnpin } = useExam();
  const [query, setQuery] = React.useState('');
  const [selectedStudentId, setSelectedStudentId] = React.useState('');
  const [selectedSalonId, setSelectedSalonId] = React.useState('');

  const selectedClasses = React.useMemo(() => {
    try {
      const dersler = Array.isArray(ayarlar?.dersler) ? ayarlar.dersler : [];
      const siniflar = [];
      dersler.forEach(d => {
        if (Array.isArray(d.siniflar)) siniflar.push(...d.siniflar);
      });
      return Array.from(new Set(siniflar));
    } catch (_) {
      return [];
    }
  }, [ayarlar]);

  const filteredStudents = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = (!selectedClasses || selectedClasses.length === 0)
      ? ogrenciler
      : ogrenciler.filter(o => selectedClasses.includes(o.sinif));
    if (!q) return base;
    return base.filter(o => `${o.ad} ${o.soyad}`.toLowerCase().includes(q) || String(o.numara || '').includes(q));
  }, [ogrenciler, query, selectedClasses]);

  const handlePin = () => {
    if (!selectedStudentId || !selectedSalonId) return;
    ogrenciPin(selectedStudentId, selectedSalonId, null);
  };

  const selectedStudent = ogrenciler.find(o => o.id === selectedStudentId);
  const getSalonAdi = (salonId) => {
    if (!salonId) return '-';
    const s = salonlar.find(x => String(x.id) === String(salonId) || String(x.salonId) === String(salonId));
    return s ? (s.salonAdi || s.ad || String(salonId)) : String(salonId);
  };

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', mt: 2 }}>
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>Sabit Atamalar</Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField
              label="Öğrenci Ara (ad/numara)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              size="small"
              sx={{ minWidth: 260 }}
            />
            <TextField
              select
              label="Öğrenci Seç"
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              size="small"
              sx={{ minWidth: 260 }}
            >
              {filteredStudents.slice(0, 300).map(o => (
                <MenuItem key={o.id} value={o.id}>
                  {o.ad} {o.soyad} ({o.numara || '-'}) {o.pinned ? '📌' : ''}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Hedef Salon"
              value={selectedSalonId}
              onChange={(e) => setSelectedSalonId(e.target.value)}
              size="small"
              sx={{ minWidth: 220 }}
            >
              {salonlar.map(s => (
                <MenuItem key={s.id} value={String(s.id)}>{s.salonAdi || s.ad || s.id}</MenuItem>
              ))}
            </TextField>
            <Button variant="contained" onClick={handlePin}>Sabit Ata</Button>
          </Box>

          {selectedStudent && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2">
                Seçili: <b>{selectedStudent.ad} {selectedStudent.soyad}</b> {selectedStudent.pinned && (<Chip size="small" label="Sabit" sx={{ ml: 1 }} />)}
              </Typography>
              {selectedStudent.pinned && (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Hedef salon: {getSalonAdi(selectedStudent.pinnedSalonId)}
                </Typography>
              )}
            </Box>
          )}

          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Sabitlenen Öğrenciler</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {ogrenciler.filter(o => o.pinned && (selectedClasses.length === 0 || selectedClasses.includes(o.sinif))).map(o => (
                <Chip key={o.id} label={`${o.ad} ${o.soyad} • ${getSalonAdi(o.pinnedSalonId)}`} onDelete={() => ogrenciUnpin(o.id)} />
              ))}
              {ogrenciler.filter(o => o.pinned).length === 0 && (
                <Typography variant="body2" color="text.secondary">Henüz sabit atama yok.</Typography>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default SabitAtamalar;


