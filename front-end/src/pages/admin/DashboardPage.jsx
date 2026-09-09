import { Card, CardContent, Grid, Stack, Typography } from '@mui/material';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { format } from 'date-fns';
import { useDashboard } from '@/services/queries';

export default function DashboardPage() {
  const { data, isLoading } = useDashboard();

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
            {data.recent.map((item) => (
              <Stack key={item.id} direction="row" justifyContent="space-between">
                <Typography fontWeight={600}>{item.student.name}</Typography>
                <Typography color="text.secondary">
                  {format(new Date(item.checkInTime), 'dd/MM HH:mm')} · {item.method}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
