import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  TextField,
  Button,
  Alert,
  Box
} from '@mui/material';
import CircularProgress from '@mui/material/CircularProgress';
import { useExam } from '../../context/ExamContext';

const LoginDialog = ({ open, onClose, onSuccess }) => {
  const { login } = useExam();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  const handleClose = () => {
    if (loading) return;
    setError(null);
    setPassword('');
    onClose?.();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    setError(null);

    const result = await login(email, password);
    setLoading(false);

    if (result?.success) {
      setPassword('');
      setEmail('');
      setError(null);
      onSuccess?.();
      onClose?.();
    } else {
      const message =
        result?.error?.message ||
        'Giriş yapılamadı. Lütfen bilgilerinizi kontrol edin ve tekrar deneyin.';
      setError(message);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Yönetici Girişi</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Admin yetkileri ile işlem yapabilmek için giriş yapmanız gerekir.
          </DialogContentText>
          {error ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          ) : null}
          <TextField
            label="E-posta"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            fullWidth
            required
            size="small"
            margin="dense"
            autoComplete="email"
          />
          <TextField
            label="Şifre"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            fullWidth
            required
            size="small"
            margin="dense"
            autoComplete="current-password"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} disabled={loading}>
            Vazgeç
          </Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={18} thickness={5} />
                Giriş yapılıyor...
              </Box>
            ) : (
              'Giriş Yap'
            )}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default LoginDialog;

