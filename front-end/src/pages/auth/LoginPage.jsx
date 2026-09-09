import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Card, Stack, TextField, Typography } from '@mui/material';
import toast from 'react-hot-toast';
import { Waves } from 'lucide-react';
import { loginRequest } from '@/services/queries';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@pool.vn');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const onSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const data = await loginRequest({ email, password });
      login(data.token, data.user);
      toast.success('Đăng nhập thành công');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: 'linear-gradient(160deg, #083344 0%, #0e7490 55%, #67e8f9 140%)',
        p: 2,
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 420, p: 4, borderRadius: 4 }}>
        <Stack spacing={2} component="form" onSubmit={onSubmit}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Waves color="#0e7490" />
            <Typography variant="h5" fontWeight={800}>
              Aqua Check-in
            </Typography>
          </Stack>
          <Typography color="text.secondary">Tài khoản mẫu: admin@pool.vn / admin123</Typography>
          <TextField
            label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
          />
          <TextField
            label="Mật khẩu"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
          />
          <Button type="submit" variant="contained" size="large" disabled={loading}>
            {loading ? 'Đang vào...' : 'Đăng nhập'}
          </Button>
        </Stack>
      </Card>
    </Box>
  );
}
