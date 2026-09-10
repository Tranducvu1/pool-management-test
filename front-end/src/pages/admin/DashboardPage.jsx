import { useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { format } from 'date-fns';
import { useDashboard } from '@/services/queries';

export default function DashboardPage() {
  const { data, isLoading } = useDashboard();
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  if (isLoading || !data) {
    return <Typography>Đang tải thống kê...</Typography>;
  }

  const cards = [
    { label: 'Học sinh', value: data.studentCount },
    { label: 'Điểm danh hôm nay', value: data.todayCount },
    { label: 'Sắp hết buổi', value: data.lowSessions },
  ];

  return (
    <Stack spacing={3}>
      <Typography variant="h4" fontWeight={800}>
        Tổng quan
      </Typography>
      <Grid container spacing={2}>
        {cards.map((card) => (
          <Grid item xs={12} md={4} key={card.label}>
            <Card>
              <CardContent>
                <Typography color="text.secondary">{card.label}</Typography>
                <Typography variant="h3" fontWeight={800}>
                  {card.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      <Card>
        <CardContent>
          <Typography fontWeight={700} sx={{ mb: 2 }}>
            Điểm danh 7 ngày
          </Typography>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.byDay}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#0e7490" name="Lượt" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <Typography fontWeight={700} sx={{ mb: 2 }}>
            Điểm danh gần đây
          </Typography>
          <Stack spacing={1.25}>
            {data.recent.map((item) => {
              const displayPhoto = item.photoUrl || item.student?.photoUrl;
              return (
                <Stack
                  key={item.id}
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{
                    p: 1,
                    borderRadius: 2,
                    bgcolor: '#f8fafc',
                    cursor: displayPhoto ? 'pointer' : 'default',
                    '&:hover': displayPhoto ? { bgcolor: '#f1f5f9' } : {},
                  }}
                  onClick={() => displayPhoto && setSelectedPhoto(item)}
                >
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Avatar
                      src={displayPhoto || undefined}
                      alt={item.student?.name}
                      sx={{ width: 36, height: 36, border: '1px solid #e2e8f0' }}
                    />
                    <Box>
                      <Typography fontWeight={600}>{item.student?.name}</Typography>
                      <Typography variant="body2" color="text.secondary" fontSize={13}>
                        {item.method === 'FACE' ? 'Quét mặt 📸' : 'Thủ công ✍️'}
                      </Typography>
                    </Box>
                  </Stack>
                  <Typography color="text.secondary" variant="body2">
                    {format(new Date(item.checkInTime), 'dd/MM HH:mm')}
                  </Typography>
                </Stack>
              );
            })}
          </Stack>
        </CardContent>
      </Card>

      {/* Dialog xem ảnh chụp điểm danh */}
      <Dialog
        open={Boolean(selectedPhoto)}
        onClose={() => setSelectedPhoto(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle fontWeight={700}>Ảnh chụp lúc điểm danh</DialogTitle>
        <DialogContent sx={{ textAlign: 'center' }}>
          {selectedPhoto && (
            <Stack spacing={2} alignItems="center">
              <Box
                component="img"
                src={selectedPhoto.photoUrl || selectedPhoto.student?.photoUrl}
                alt={selectedPhoto.student?.name}
                sx={{
                  width: '100%',
                  maxHeight: 320,
                  objectFit: 'cover',
                  borderRadius: 2,
                  border: '2px solid #0e7490',
                }}
              />
              <Box sx={{ width: '100%', bgcolor: '#f8fafc', p: 1.5, borderRadius: 2 }}>
                <Typography fontWeight={700}>{selectedPhoto.student?.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Thời gian: {format(new Date(selectedPhoto.checkInTime), 'HH:mm:ss - dd/MM/yyyy')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Phương thức: {selectedPhoto.method}
                </Typography>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setSelectedPhoto(null)} variant="outlined">
            Đóng
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
