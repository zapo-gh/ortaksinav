import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  MenuItem,
  Button,
  Chip,
  Alert,
  Grid,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Tooltip,
  Badge
} from '@mui/material';
import { Check as CheckIcon, PushPin as PushPinIcon, PersonAdd as PersonAddIcon, HighlightOff as HighlightOffIcon } from '@mui/icons-material';
import { useExam } from '../context/ExamContext';

const SabitAtamalar = () => {
  const { ogrenciler, salonlar, ayarlar, ogrenciPin, ogrenciUnpin, isWriteAllowed } = useExam();
  const readOnly = !isWriteAllowed;
  const [query, setQuery] = React.useState('');
  const [selectedStudentIds, setSelectedStudentIds] = React.useState([]);
  const [selectedSalonId, setSelectedSalonId] = React.useState('');
  const [selectedClass, setSelectedClass] = React.useState('ALL');

  // Türkçe karakterleri normalize eden fonksiyon
  const normalizeText = React.useCallback((text) => {
    if (!text) return '';
    return text
      .toLowerCase()
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ı/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c');
  }, []);

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

  const normalizeClassCode = React.useCallback((value) => {
    if (!value) return '';
    const raw = String(value).trim().toUpperCase().replace(/\s+/g, '');
    const match = raw.match(/^(\d+)([-/.]?)([A-ZÇĞİÖŞÜ]+)?$/);
    if (!match) {
      return raw.replace(/[^\wÇĞİÖŞÜ]/g, '');
    }
    const grade = match[1];
    const section = match[3] ? match[3].replace(/[^A-ZÇĞİÖŞÜ0-9]/g, '') : '';
    return section ? `${grade}-${section}` : grade;
  }, []);

  const classOptions = React.useMemo(() => {
    const map = new Map();
    selectedClasses.forEach((cls) => {
      const normalized = normalizeClassCode(cls);
      if (normalized) map.set(normalized, normalized);
    });
    ogrenciler.forEach((o) => {
      const normalized = normalizeClassCode(o?.sinif);
      if (normalized) map.set(normalized, normalized);
    });
    const sorted = Array.from(map.keys()).sort((a, b) => {
      const parse = (value) => {
        const match = value.match(/^(\d+)(?:[-\s]?([A-ZÇĞİÖŞÜ0-9]+))?$/);
        return {
          grade: match ? parseInt(match[1], 10) || 0 : 0,
          section: match && match[2] ? match[2] : ''
        };
      };
      const aParsed = parse(a);
      const bParsed = parse(b);
      if (aParsed.grade !== bParsed.grade) {
        return aParsed.grade - bParsed.grade;
      }
      return aParsed.section.localeCompare(bParsed.section, 'tr-TR');
    });
    return ['ALL', ...sorted];
  }, [ogrenciler, selectedClasses, normalizeClassCode]);

  const normalizedSalons = React.useMemo(() => {
    return salonlar.map((s) => {
      const canonicalId = s?.id ?? s?.salonId ?? s?.salonAdi ?? s?.ad ?? '';
      return {
        ...s,
        canonicalId: String(canonicalId),
        label: s?.salonAdi || s?.ad || String(canonicalId),
        kapasite: Number.isFinite(s?.kapasite) ? s.kapasite : null
      };
    });
  }, [salonlar]);

  const activeSalonId = React.useMemo(() => {
    if (selectedSalonId) {
      return selectedSalonId;
    }
    if (normalizedSalons.length > 0) {
      return normalizedSalons[0].canonicalId;
    }
    return '';
  }, [normalizedSalons, selectedSalonId]);

  const activeSalon = React.useMemo(
    () => normalizedSalons.find((s) => s.canonicalId === String(activeSalonId)) || null,
    [normalizedSalons, activeSalonId]
  );

  const normalizedAllowedClasses = React.useMemo(() => {
    if (!selectedClasses || selectedClasses.length === 0) return null;
    const set = new Set();
    selectedClasses.forEach((cls) => {
      const normalized = normalizeClassCode(cls);
      if (normalized) set.add(normalized);
    });
    return set.size > 0 ? set : null;
  }, [selectedClasses, normalizeClassCode]);

  const filteredStudents = React.useMemo(() => {
    const q = query.trim();
    const targetClass = selectedClass === 'ALL' ? null : selectedClass;
    const base = ogrenciler.filter((o) => {
      const studentClass = normalizeClassCode(o?.sinif);
      if (targetClass) {
        return studentClass === targetClass;
      }
      if (!normalizedAllowedClasses) return true;
      return normalizedAllowedClasses.has(studentClass);
    });
    if (!q) return base;

    const normalizedQuery = normalizeText(q);
    const qLower = q.toLowerCase();

    return base.filter(o => {
      const ad = o.ad || '';
      const soyad = o.soyad || '';
      const numara = String(o.numara || '');

      // Normalize edilmiş metinlerle karşılaştır
      const normalizedAd = normalizeText(ad);
      const normalizedSoyad = normalizeText(soyad);

      // Hem normalize edilmiş hem de orijinal metinlerle arama yap
      return normalizedAd.includes(normalizedQuery) ||
        normalizedSoyad.includes(normalizedQuery) ||
        ad.toLowerCase().includes(qLower) ||
        soyad.toLowerCase().includes(qLower) ||
        numara.includes(q);
    });
  }, [ogrenciler, query, selectedClasses, selectedClass, normalizeText, normalizeClassCode, normalizedAllowedClasses]);

  const handlePin = React.useCallback(() => {
    if (readOnly) return;
    if (!selectedStudentIds || selectedStudentIds.length === 0 || !activeSalonId) return;
    selectedStudentIds.forEach((studentId) => {
      ogrenciPin(studentId, activeSalonId, null);
    });
    setSelectedStudentIds([]);
  }, [readOnly, selectedStudentIds, activeSalonId, ogrenciPin]);

  const handlePinStudent = React.useCallback(
    (studentId) => {
      if (readOnly || !studentId || !activeSalonId) return;
      ogrenciPin(studentId, activeSalonId, null);
    },
    [readOnly, activeSalonId, ogrenciPin]
  );

  const handleSalonSelect = (value) => {
    setSelectedSalonId(value);
  };

  const selectedStudent = React.useMemo(() => {
    if (!selectedStudentIds || selectedStudentIds.length === 0) return null;
    return ogrenciler.find((o) => o.id === selectedStudentIds[0]) || null;
  }, [selectedStudentIds, ogrenciler]);
  const getSalonAdi = (salonId) => {
    if (!salonId) return '-';
    const salonKey = String(salonId);
    const salonLookup = salonlar.find((x) => {
      const candidateId = x?.id != null ? String(x.id) : null;
      const candidateSalonId = x?.salonId != null ? String(x.salonId) : null;
      return candidateId === salonKey || candidateSalonId === salonKey;
    });

    if (salonLookup) {
      return salonLookup.salonAdi || salonLookup.ad || salonLookup.name || salonLookup.label || salonLookup.id || salonKey;
    }

    const fallbackSalon = salonlar.find((x) => (x?.salonAdi || x?.ad) && String(x?.salonAdi || x?.ad) === salonKey);
    if (fallbackSalon) {
      return fallbackSalon.salonAdi || fallbackSalon.ad;
    }

    return salonKey;
  };

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', mt: 2 }}>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <PushPinIcon sx={{ mr: 1, color: 'primary.main', fontSize: 24 }} />
              <Typography variant="h6" component="h2" sx={{ color: 'text.primary', fontWeight: 'bold' }}>
                Sabit Atamalar
              </Typography>
            </Box>
            {activeSalon && (
              <Badge
                color="primary"
                badgeContent={
                  ogrenciler.filter((o) => o.pinned && String(o.pinnedSalonId) === String(activeSalon.canonicalId)).length
                }
                showZero
              >
                <Chip
                  icon={<PushPinIcon fontSize="small" />}
                  label={`${activeSalon.label} • ${ogrenciler.filter((o) => o.pinned && String(o.pinnedSalonId) === String(activeSalon.canonicalId)).length
                    } sabit`}
                  color="primary"
                  variant="outlined"
                  size="small"
                />
              </Badge>
            )}
          </Box>
          {readOnly && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Bu bölüm görüntüleme modunda. Yönetici olarak giriş yapmadan sabit atama ekleyemez veya silemezsiniz.
            </Alert>
          )}
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', lg: 'row' },
              alignItems: 'flex-start',
              gap: 3
            }}
          >
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    md: 'minmax(180px, 240px) 140px minmax(140px, 160px)'
                  },
                  gap: 1.25,
                  mb: 2
                }}
              >
                <TextField
                  label="Öğrenci Ara (ad/numara)"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  size="small"
                  sx={{ width: '100%' }}
                  disabled={readOnly}
                  inputProps={{ 'aria-label': 'Öğrenci arama' }}
                />
                <TextField
                  select
                  label="Sınıf"
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  size="small"
                  sx={{ width: '100%' }}
                  disabled={readOnly && classOptions.length === 0}
                >
                  {classOptions.map((sinif) => (
                    <MenuItem key={`sinif-${sinif}`} value={sinif}>
                      {sinif === 'ALL' ? 'Tüm Sınıflar' : sinif}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label="Hedef Salon"
                  value={activeSalonId}
                  onChange={(e) => handleSalonSelect(e.target.value)}
                  size="small"
                  sx={{ width: '100%' }}
                  disabled={readOnly}
                >
                  {normalizedSalons.map((s) => (
                    <MenuItem key={`salon-${s.canonicalId}`} value={s.canonicalId}>
                      {s.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>

              <Card variant="outlined">
                <CardContent sx={{ p: 0 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      px: 2,
                      py: 1.5,
                      borderBottom: (theme) => `1px solid ${theme.palette.divider}`
                    }}
                  >
                    <Typography variant="subtitle2">
                      {filteredStudents.length} öğrenci bulundu
                    </Typography>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<PersonAddIcon />}
                      onClick={handlePin}
                      disabled={readOnly || !selectedStudentIds || selectedStudentIds.length === 0 || !activeSalonId}
                    >
                      Seçileni Ata
                    </Button>
                  </Box>
                  <List dense sx={{ maxHeight: 320, overflowY: 'auto' }} aria-label="Öğrenci sonuç listesi">
                    {filteredStudents.slice(0, 500).map((o) => {
                      const isPinnedHere = o.pinned && String(o.pinnedSalonId) === String(activeSalonId);
                      const isSelected = selectedStudentIds.includes(o.id);
                      return (
                        <ListItem
                          key={`ogrenci-${o.id}`}
                          button
                          selected={isSelected}
                          sx={{
                            bgcolor: isSelected ? 'action.selected' : undefined,
                            borderLeft: isSelected ? '4px solid' : undefined,
                            borderColor: isSelected ? 'primary.main' : 'transparent'
                          }}
                          onClick={() =>
                            setSelectedStudentIds((prev) =>
                              prev.includes(o.id) ? prev.filter((id) => id !== o.id) : [...prev, o.id]
                            )
                          }
                          onDoubleClick={() => {
                            handlePinStudent(o.id);
                            setSelectedStudentIds((prev) => prev.filter((id) => id !== o.id));
                          }}
                          disabled={readOnly}
                        >
                          <ListItemText
                            primary={`${o.ad} ${o.soyad}`}
                            secondary={`No: ${o.numara || '-'} • Sınıf: ${o.sinif || '-'}`}
                          />
                          <ListItemSecondaryAction>
                            {o.pinned ? (
                              <Tooltip title={`Şu anda ${getSalonAdi(o.pinnedSalonId)} salonunda sabit`}>
                                <Chip
                                  size="small"
                                  color={isPinnedHere ? 'primary' : 'default'}
                                  icon={isPinnedHere ? <CheckIcon /> : <PushPinIcon />}
                                  label={getSalonAdi(o.pinnedSalonId)}
                                />
                              </Tooltip>
                            ) : (
                              !readOnly && (
                                <Tooltip title="Bu salona sabitle">
                                  <IconButton
                                    edge="end"
                                    size="small"
                                    onClick={() => {
                                      handlePinStudent(o.id);
                                      setSelectedStudentIds((prev) => prev.filter((id) => id !== o.id));
                                    }}
                                    aria-label="Salona sabitle"
                                  >
                                    <PersonAddIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )
                            )}
                          </ListItemSecondaryAction>
                        </ListItem>
                      );
                    })}
                    {filteredStudents.length === 0 && (
                      <ListItem>
                        <ListItemText primary="Eşleşen öğrenci bulunamadı." />
                      </ListItem>
                    )}
                  </List>
                </CardContent>
              </Card>
            </Box>

            <Box
              sx={{
                width: { xs: '100%', lg: 340 },
                flexShrink: 0
              }}
            >
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" sx={{ mb: 1 }}>
                    Salon Durumu
                  </Typography>
                  {activeSalon ? (
                    <>
                      <Typography variant="body2" sx={{ mb: 0.5 }}>
                        Salon: <b>{activeSalon.label}</b>
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        Kapasite: {activeSalon.kapasite ?? '—'} • Sabit öğrenci:{' '}
                        {
                          ogrenciler.filter((o) => o.pinned && String(o.pinnedSalonId) === String(activeSalon.canonicalId))
                            .length
                        }
                      </Typography>
                    </>
                  ) : (
                    <Typography variant="body2" sx={{ mb: 2 }}>
                      Salon bulunamadı. Salon oluşturup tekrar deneyin.
                    </Typography>
                  )}
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Sabit Atamalar
                  </Typography>
                  <List dense disablePadding>
                    {ogrenciler
                      .filter((o) => o.pinned)
                      .map((o) => (
                        <ListItem
                          key={`pinned-${o.id}`}
                          secondaryAction={
                            readOnly ? null : (
                              <Tooltip title="Sabit atamayı kaldır">
                                <IconButton edge="end" size="small" onClick={() => ogrenciUnpin(o.id)}>
                                  <HighlightOffIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )
                          }
                        >
                          <ListItemText
                            primary={`${o.ad} ${o.soyad}`}
                            secondary={`Salon: ${getSalonAdi(o.pinnedSalonId)}${o.numara ? ` • No: ${o.numara}` : ''}`}
                          />
                        </ListItem>
                      ))}
                    {ogrenciler.filter((o) => o.pinned).length === 0 && (
                      <ListItem>
                        <ListItemText primary="Henüz sabit atama yok." />
                      </ListItem>
                    )}
                  </List>
                </CardContent>
              </Card>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default SabitAtamalar;


