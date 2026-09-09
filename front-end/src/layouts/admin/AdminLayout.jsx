import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Box, Button, Stack, Typography } from '@mui/material';
import { LayoutDashboard, Users, Camera, LogOut, Waves, UserPlus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const links = [
  { to: '/dashboard', label: 'Tổng quan', icon: LayoutDashboard },
  { to: '/attendance', label: 'Điểm danh', icon: Camera },
  { to: '/students', label: 'Học sinh', icon: Users },
  { to: '/students/register', label: 'Đăng ký', icon: UserPlus },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '240px 1fr' },
        minHeight: '100vh',
      }}
    >
      <Box
        component="aside"
        sx={{
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          p: 2.5,
          bgcolor: '#0b3b52',
          color: '#fff',
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 4 }}>
          <Waves size={28} />
          <Box>
            <Typography fontWeight={800}>Aqua Check-in</Typography>
            <Typography variant="caption" sx={{ opacity: 0.75 }}>
              Hồ bơi điểm danh
            </Typography>
          </Box>
        </Stack>
        <Stack spacing={0.5} sx={{ flex: 1 }}>
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink key={link.to} to={link.to} style={{ textDecoration: 'none' }}>
                {({ isActive }) => (
                  <Stack
                    direction="row"
                    spacing={1.25}
                    alignItems="center"
                    sx={{
                      px: 1.5,
                      py: 1.1,
                      borderRadius: 2,
                      color: '#fff',
                      bgcolor: isActive ? 'rgba(255,255,255,0.14)' : 'transparent',
                    }}
                  >
                    <Icon size={18} />
                    <Typography fontWeight={600}>{link.label}</Typography>
                  </Stack>
                )}
              </NavLink>
            );
          })}
        </Stack>
        <Typography variant="body2" sx={{ mb: 1, opacity: 0.8 }}>
          {user?.name}
        </Typography>
        <Button
          color="inherit"
          startIcon={<LogOut size={16} />}
          onClick={() => {
            logout();
            navigate('/login');
          }}
        >
          Đăng xuất
        </Button>
      </Box>
      <Box sx={{ bgcolor: '#f4f8fb', minHeight: '100vh' }}>
        <Box
          sx={{
            display: { xs: 'flex', md: 'none' },
            gap: 1,
            p: 1.5,
            bgcolor: '#0b3b52',
            overflowX: 'auto',
          }}
        >
          {links.map((link) => (
            <Button
              key={link.to}
              component={NavLink}
              to={link.to}
              size="small"
              sx={{ color: '#fff', whiteSpace: 'nowrap' }}
            >
              {link.label}
            </Button>
          ))}
        </Box>
        <Box sx={{ p: { xs: 2, md: 3.5 }, maxWidth: 1200, mx: 'auto' }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
