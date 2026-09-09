import { useEffect, useMemo, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import toast from 'react-hot-toast';
import { Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import { format } from 'date-fns';
import { useCheckin, useEnrollFace, useStudents, useTodayAttendance } from '@/services/queries';
import {
  detectOverlay,
  FACE_THRESHOLD,
  getDescriptorFromDataUrl,
  loadFaceModels,
  matchDescriptor,
} from '@/utils/face';

const AUTO_CHECKIN_COOLDOWN_MS = 15000;

export default function AttendancePage() {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [modelReady, setModelReady] = useState(false);
  const [hint, setHint] = useState('Đưa mặt vào khung hình');
  const { data: students = [] } = useStudents();
  const { data: today = [] } = useTodayAttendance();
  const checkin = useCheckin();
  const enrollFace = useEnrollFace();
  const { mutateAsync: checkinAsync } = checkin;
  const { mutateAsync: enrollFaceAsync } = enrollFace;
  const backfilled = useRef(new Set());
  const autoCheckinRef = useRef(false);
  const checkedRecentlyRef = useRef(new Map());
  const todayStudentIds = useMemo(() => new Set(today.map((item) => item.studentId)), [today]);

  useEffect(() => {
    loadFaceModels()
      .then(() => setModelReady(true))
      .catch(() => toast.error('Không tải được model nhận diện mặt'));
  }, []);

  useEffect(() => {
    if (!modelReady || !students.length) return undefined;
    let cancelled = false;
    const backfill = async () => {
      const missing = students.filter(
        (s) => s.photoUrl && !s.faceEmbeddingJson && !backfilled.current.has(s.id)
      );
      for (const student of missing) {
        backfilled.current.add(student.id);
        try {
          const faceDescriptor = await getDescriptorFromDataUrl(student.photoUrl);
          if (cancelled) return;
          await enrollFaceAsync({
            id: student.id,
            photoUrl: student.photoUrl,
            faceDescriptor,
          });
        } catch {
          /* ảnh cũ không có mặt rõ thì bỏ qua */
        }
      }
    };
    backfill();
    return () => {
      cancelled = true;
    };
  }, [enrollFaceAsync, modelReady, students]);

  useEffect(() => {
    if (!modelReady) return undefined;
    let active = true;

    const autoCheckin = async (student, faceDescriptor) => {
      const lastChecked = checkedRecentlyRef.current.get(student.id) || 0;
      if (
        autoCheckinRef.current ||
        todayStudentIds.has(student.id) ||
        Date.now() - lastChecked < AUTO_CHECKIN_COOLDOWN_MS
      ) {
        return;
      }

      autoCheckinRef.current = true;
      checkedRecentlyRef.current.set(student.id, Date.now());
      const photoUrl = webcamRef.current?.getScreenshot() || undefined;

      try {
        const result = await checkinAsync({ faceDescriptor, photoUrl });
        if (!active) return;
        toast.success(result.message);
        setHint(`Đã tự điểm danh: ${result.data.student.name}`);
      } catch (error) {
        if (!active) return;
        toast.error(
          error.response?.data?.message || error.message || `Không điểm danh được ${student.name}`
        );
      } finally {
        autoCheckinRef.current = false;
      }
    };

    const tick = async () => {
      if (!active) return;
      const video = webcamRef.current?.video;
      const canvas = canvasRef.current;
      if (video && canvas) {
        try {
          const descriptor = await detectOverlay(video, canvas);
          if (descriptor) {
            const result = matchDescriptor(descriptor, students);
            if (result.matched) {
              if (todayStudentIds.has(result.student.id)) {
                setHint(`${result.student.name} đã điểm danh hôm nay`);
              } else {
                setHint(`Khớp: ${result.student.name} (${result.distance.toFixed(2)})`);
                autoCheckin(result.student, descriptor);
              }
            } else if (result.student) {
              setHint(
                `Gần ${result.student.name} nhưng chưa đủ (${result.distance.toFixed(2)} > ${FACE_THRESHOLD})`
              );
            } else {
              setHint('Thấy mặt, chưa có hồ sơ khuôn mặt trong hệ thống');
            }
          } else {
            setHint('Đưa mặt vào khung hình');
          }
        } catch {
          setHint('Đang quét khuôn mặt...');
        }
      }
      window.setTimeout(tick, 400);
    };
    tick();
    return () => {
      active = false;
    };
  }, [checkinAsync, modelReady, students, todayStudentIds]);

  const onCheckin = async () => {
    const shot = webcamRef.current?.getScreenshot();
    if (!shot) {
      toast.error('Chưa có camera');
      return;
    }
    try {
      const faceDescriptor = await getDescriptorFromDataUrl(shot);
      const preview = matchDescriptor(faceDescriptor, students);
      if (!preview.matched) {
        const extra = preview.student
          ? ` Gần nhất: ${preview.student.name} (${preview.distance.toFixed(2)}).`
          : ' Ảnh đăng ký chưa trích được vector mặt — vào Học sinh bấm Gắn khuôn mặt.';
        throw new Error(`Không khớp khuôn mặt đã đăng ký.${extra}`);
      }
      const result = await checkinAsync({ faceDescriptor, photoUrl: shot });
      toast.success(result.message);
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Điểm danh thất bại');
    }
  };

  return (
    <Stack spacing={3}>
      <Typography variant="h4" fontWeight={800}>
        Điểm danh
      </Typography>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography fontWeight={700} sx={{ mb: 2 }}>
              Camera kiosk
            </Typography>
            <Box
              sx={{ position: 'relative', overflow: 'hidden', borderRadius: 3, bgcolor: '#0b3b52' }}
            >
              <Webcam
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                screenshotQuality={0.92}
                audio={false}
                mirrored={false}
                videoConstraints={{ facingMode: 'user', width: 640, height: 480 }}
                style={{ width: '100%', display: 'block' }}
              />
              <canvas
                ref={canvasRef}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
              />
            </Box>
            <Typography fontWeight={700} sx={{ mt: 2 }}>
              {hint}
            </Typography>
            <Button
              fullWidth
              size="large"
              variant="contained"
              sx={{ mt: 2 }}
              onClick={onCheckin}
              disabled={checkin.isPending || !modelReady}
            >
              {!modelReady
                ? 'Đang tải nhận diện mặt...'
                : checkin.isPending
                  ? 'Đang điểm danh...'
                  : 'Điểm danh lại bằng khuôn mặt'}
            </Button>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
              Camera sẽ tự điểm danh khi khuôn mặt khớp với học sinh đã đăng ký. Nút bên trên dùng
              để thử lại thủ công.
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography fontWeight={700} sx={{ mb: 2 }}>
              Hôm nay ({today.length})
            </Typography>
            <Stack spacing={1.5}>
              {today.length === 0 && (
                <Typography color="text.secondary">Chưa có lượt điểm danh.</Typography>
              )}
              {today.map((item) => (
                <Stack
                  key={item.id}
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Box>
                    <Typography fontWeight={700}>{item.student.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Còn {item.student.remainingSessions} buổi · {item.method}
                    </Typography>
                  </Box>
                  <Typography variant="body2">
                    {format(new Date(item.checkInTime), 'HH:mm')}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Stack>
  );
}
