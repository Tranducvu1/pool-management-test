import { Avatar, Button, Card, Chip, Stack, Typography } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { useStudents } from '@/services/queries';

export default function StudentsPage() {
  const { data = [], isLoading } = useStudents();

  const columns = [
    {
      field: 'photoUrl',
      headerName: 'Ảnh',
      width: 80,
      sortable: false,
      renderCell: (params) => (
        <Avatar
          src={params.value || undefined}
          alt={params.row.name}
          sx={{ width: 36, height: 36 }}
        />
      ),
    },
    { field: 'name', headerName: 'Học sinh', flex: 1, minWidth: 160 },
    { field: 'phone', headerName: 'SĐT phụ huynh', width: 140 },
    {
      field: 'dob',
      headerName: 'Ngày sinh',
      width: 120,
      valueFormatter: (value) => format(new Date(value), 'dd/MM/yyyy'),
    },
    { field: 'currentSwimStyle', headerName: 'Kiểu bơi', width: 140 },
    { field: 'remainingSessions', headerName: 'Còn lại', width: 100 },
    { field: 'totalSessions', headerName: 'Tổng buổi', width: 110 },
    {
      field: 'face',
      headerName: 'Khuôn mặt',
      width: 170,
      sortable: false,
      renderCell: (params) =>
        params.row.faceEmbeddingJson ? (
          <Chip size="small" color="success" label="Đã gắn" />
        ) : (
          <Button size="small" component={Link} to={`/students/register?id=${params.row.id}`}>
            Gắn khuôn mặt
          </Button>
        ),
    },
    {
      field: 'status',
      headerName: 'Trạng thái',
      width: 140,
      renderCell: (params) => {
        const low = params.row.remainingSessions <= 5;
        return (
          <Chip
            size="small"
            color={low ? 'warning' : 'success'}
            label={low ? 'Sắp hết buổi' : 'Còn buổi'}
          />
        );
      },
    },
  ];

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h4" fontWeight={800}>
          Học sinh
        </Typography>
        <Button component={Link} to="/students/register" variant="contained">
          Đăng ký bằng ảnh
        </Button>
      </Stack>
      <Card sx={{ height: 560, p: 1 }}>
        <DataGrid
          rows={data}
          columns={columns}
          loading={isLoading}
          pageSizeOptions={[5, 10]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          disableRowSelectionOnClick
        />
      </Card>
    </Stack>
  );
}
