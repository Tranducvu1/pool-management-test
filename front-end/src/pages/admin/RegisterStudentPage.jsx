import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Webcam from 'react-webcam';
import toast from 'react-hot-toast';
import {
  Box,
  Button,
  Card,
  CardContent,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useCreateStudent, useEnrollFace } from '@/services/queries';
import { averageDescriptors, getDescriptorFromDataUrl, loadFaceModels } from '@/utils/face';

const styles = ['Freestyle', 'Breaststroke', 'Backstroke', 'Butterfly'];

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export default function RegisterStudentPage() {
  const webcamRef = useRef(null);
  const fileRef = useRef(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const enrollId = searchParams.get('id');
  const createStudent = useCreateStudent();
  const enrollFace = useEnrollFace();
  const [modelReady, setModelReady] = useState(false);
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoCount, setPhotoCount] = useState(0);
  const [faceDescriptor, setFaceDescriptor] = useState(null);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    dob: '',
    currentSwimStyle: 'Freestyle',
    totalSessions: 20,
  });

  useEffect(() => {
    loadFaceModels()
      .then(() => setModelReady(true))
      .catch(() => toast.error('Không tải được model nhận diện mặt'));
  }, []);

  const setField = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const acceptPhoto = async (dataUrl) => {
    try {
      const descriptor = await getDescriptorFromDataUrl(dataUrl);
      setPhotoUrl(dataUrl);
      setPhotoCount(1);
      setFaceDescriptor(descriptor);
      toast.success('Đã nhận diện khuôn mặt trong ảnh');
    } catch (error) {
      setPhotoUrl('');
      setPhotoCount(0);
      setFaceDescriptor(null);
      toast.error(error.message);
    }
  };

  const acceptPhotos = async (files) => {
    const picked = Array.from(files || []);
    if (!picked.length) return;

    const accepted = [];
    const descriptors = [];
    for (const file of picked) {
      try {
        const dataUrl = await fileToDataUrl(file);
        const descriptor = await getDescriptorFromDataUrl(dataUrl);
        accepted.push(dataUrl);
        descriptors.push(descriptor);
      } catch {
        /* bỏ qua ảnh không thấy đúng 1 khuôn mặt */
      }
    }

    const averaged = averageDescriptors(descriptors);
    if (!averaged) {
      setPhotoUrl('');
      setPhotoCount(0);
      setFaceDescriptor(null);
      toast.error('Không ảnh nào có khuôn mặt hợp lệ. Chọn ảnh thẳng mặt, đủ sáng.');
      return;
    }

    setPhotoUrl(accepted[0]);
    setPhotoCount(accepted.length);
    setFaceDescriptor(averaged);
    toast.success(`Đã lấy mẫu khuôn mặt từ ${accepted.length}/${picked.length} ảnh`);
  };

  const capture = async () => {
    const shot = webcamRef.current?.getScreenshot();
    if (!shot) {
      toast.error('Không chụp được ảnh. Cho phép camera hoặc tải ảnh lên.');
      return;
    }
    await acceptPhoto(shot);
  };

  const onPickFile = async (event) => {
    await acceptPhotos(event.target.files);
    event.target.value = '';
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    if (!photoUrl || !faceDescriptor) {
      toast.error('Cần ảnh có khuôn mặt hợp lệ');
      return;
    }
    try {
      if (enrollId) {
        const result = await enrollFace.mutateAsync({
          id: enrollId,
          photoUrl,
          faceDescriptor,
        });
        toast.success(result.message);
      } else {
        const result = await createStudent.mutateAsync({ ...form, photoUrl, faceDescriptor });
        toast.success(result.message);
      }
      navigate('/students');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Đăng ký thất bại');
    }
  };

  const pending = createStudent.isPending || enrollFace.isPending;

  return (
    <Stack spacing={3} component="form" onSubmit={onSubmit}>
      <Typography variant="h4" fontWeight={800}>
        {enrollId ? 'Gắn khuôn mặt cho hồ sơ có sẵn' : 'Đăng ký học sinh'}
      </Typography>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography fontWeight={700} sx={{ mb: 2 }}>
              Ảnh khuôn mặt
            </Typography>
            {photoUrl ? (
              <Box
                component="img"
                src={photoUrl}
                alt="Ảnh đăng ký học sinh"
                sx={{ width: '100%', borderRadius: 3, display: 'block', mb: 2 }}
              />
            ) : (
              <Box sx={{ overflow: 'hidden', borderRadius: 3, bgcolor: '#0b3b52', mb: 2 }}>
                <Webcam
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  audio={false}
                  videoConstraints={{ facingMode: 'user' }}
                  style={{ width: '100%', display: 'block' }}
                />
              </Box>
            )}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Button
                variant="contained"
                onClick={capture}
                disabled={Boolean(photoUrl) || !modelReady}
              >
                {modelReady ? 'Chụp ảnh' : 'Đang tải model...'}
              </Button>
              <Button
                variant="outlined"
                onClick={() => fileRef.current?.click()}
                disabled={!modelReady}
              >
                Tải ảnh lên
              </Button>
              {photoUrl && (
                <Button
                  color="inherit"
                  onClick={() => {
                    setPhotoUrl('');
                    setPhotoCount(0);
                    setFaceDescriptor(null);
                  }}
                >
                  Chọn lại
                </Button>
              )}
            </Stack>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={onPickFile}
            />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
              Có thể chọn nhiều ảnh của cùng một người. Hệ thống sẽ lấy các ảnh nhận diện được khuôn
              mặt để tạo mẫu quét.
              {photoCount > 1 ? ` Đang dùng ${photoCount} ảnh hợp lệ.` : ''}
            </Typography>
          </CardContent>
        </Card>
        {!enrollId && (
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Stack spacing={2}>
                <TextField
                  label="Họ tên"
                  value={form.name}
                  onChange={setField('name')}
                  required
                  fullWidth
                />
                <TextField
                  label="SĐT phụ huynh"
                  value={form.phone}
                  onChange={setField('phone')}
                  required
                  fullWidth
                />
                <TextField
                  label="Ngày sinh"
                  type="date"
                  value={form.dob}
                  onChange={setField('dob')}
                  required
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  select
                  label="Kiểu bơi"
                  value={form.currentSwimStyle}
                  onChange={setField('currentSwimStyle')}
                >
                  {styles.map((style) => (
                    <MenuItem key={style} value={style}>
                      {style}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Số buổi khóa học"
                  type="number"
                  value={form.totalSessions}
                  onChange={setField('totalSessions')}
                  inputProps={{ min: 1 }}
                  required
                />
                <Button type="submit" size="large" variant="contained" disabled={pending}>
                  {pending ? 'Đang lưu...' : 'Đăng ký'}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        )}
        {enrollId && (
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Typography sx={{ mb: 2 }}>
                Chụp lại khuôn mặt cho hồ sơ #{enrollId}, rồi lưu.
              </Typography>
              <Button type="submit" size="large" variant="contained" disabled={pending}>
                {pending ? 'Đang lưu...' : 'Lưu khuôn mặt'}
              </Button>
            </CardContent>
          </Card>
        )}
      </Stack>
    </Stack>
  );
}
