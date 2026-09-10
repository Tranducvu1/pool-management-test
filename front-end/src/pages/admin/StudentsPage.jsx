import { useState } from 'react';
import {
  Avatar,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useDeleteStudent, useStudents } from '@/services/queries';

export default function StudentsPage() {
  const { data = [], isLoading } = useStudents();
  const deleteStudent = useDeleteStudent();
  const [deleteTarget, setDeleteTarget] = useState(null);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await deleteStudent.mutateAsync(deleteTarget.id);
      toast.success(res.message || `Đã xóa học sinh ${deleteTarget.name}`);
      setDeleteTarget(null);
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Xóa học sinh thất bại');
    }
  };

  const columns = [
    {
      field: 'photoUrl',
      headerName: 'Ảnh',
      width: 70,
      align: 'center',
      headerAlign: 'center',
      sortable: false,
      renderCell: (params) => (
        <Avatar
          src={params.value || undefined}
          alt={params.row.name}
          sx={{ width: 34, height: 34 }}
        />
      ),
    },
    { field: 'name', headerName: 'Học sinh', flex: 1.2, minWidth: 150 },
    { field: 'phone', headerName: 'SĐT phụ huynh', width: 130 },
    {
      field: 'dob',
      headerName: 'Ngày sinh',
      width: 110,
      align: 'center',
      headerAlign: 'center',
      valueFormatter: (value) => format(new Date(value), 'dd/MM/yyyy'),
    },
    { field: 'currentSwimStyle', headerName: 'Kiểu bơi', width: 120 },
    {
      field: 'remainingSessions',
      headerName: 'Còn lại',
      width: 90,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'totalSessions',
      headerName: 'Tổng buổi',
      width: 95,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'face',
      headerName: 'Khuôn mặt',
      width: 135,
      align: 'center',
      headerAlign: 'center',
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
      width: 120,
      align: 'center',
      headerAlign: 'center',
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
    {
      field: 'actions',
      headerName: 'Hành động',
      width: 95,
      align: 'center',
      headerAlign: 'center',
      sortable: false,
      renderCell: (params) => (
        <Tooltip title={`Xóa ${params.row.name}`}>
          <IconButton size="small" color="error" onClick={() => setDeleteTarget(params.row)}>
            <Trash2 size={18} />
          </IconButton>
        </Tooltip>
      ),
    },
  ];

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h4" fontWeight={800}>
          Học sinh
        </Typography>
        <Button component={Link} to="/students/register" variant="contained">
          Đăng ký bằng ảnh
        </Button>
      </Stack>
      <Card sx={{ width: '100%', p: 1, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
        <DataGrid
          rows={data}
          columns={columns}
          loading={isLoading}
          autoHeight
          pageSizeOptions={[5, 10, 20]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          disableRowSelectionOnClick
          sx={{
            border: 'none',
            '& .MuiDataGrid-columnHeaders': {
              bgcolor: '#f8fafc',
              fontWeight: 700,
            },
            '& .MuiDataGrid-cell:focus': { outline: 'none' },
            '& .MuiDataGrid-row:hover': { bgcolor: '#f1f5f9' },
          }}
        />
      </Card>

      {/* Dialog xác nhận xóa */}
      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => !deleteStudent.isPending && setDeleteTarget(null)}
      >
        <DialogTitle fontWeight={700}>Xác nhận xóa học sinh</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Bạn có chắc chắn muốn xóa học sinh <strong>{deleteTarget?.name}</strong>? Toàn bộ lịch
            sử điểm danh liên quan của học sinh này cũng sẽ bị xóa.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setDeleteTarget(null)}
            disabled={deleteStudent.isPending}
            variant="outlined"
          >
            Hủy
          </Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            disabled={deleteStudent.isPending}
          >
            {deleteStudent.isPending ? 'Đang xóa...' : 'Xóa học sinh'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
