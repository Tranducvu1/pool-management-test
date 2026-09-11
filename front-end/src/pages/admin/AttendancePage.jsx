import { useEffect, useMemo, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import toast from 'react-hot-toast';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Fade,
  FormControlLabel,
  Stack,
  Switch,
  Typography,
} from '@mui/material';
import { ShieldCheck, ShieldAlert, CheckCircle2, UserCheck, Camera } from 'lucide-react';
import { format } from 'date-fns';
import {
  useCheckin,
  useEnrollFace,
  useFaceGallery,
  useStudents,
  useTodayAttendance,
} from '@/services/queries';
import {
  analyzeLiveness,
  buildGallery,
  detectOverlay,
  FACE_THRESHOLD,
  getDescriptorFromDataUrl,
  loadFaceModels,
  matchDescriptor,
  playFeedbackSound,
} from '@/utils/face';

const AUTO_CHECKIN_COOLDOWN_MS = 15000;
const REQUIRED_SMILE_FRAMES = 2;

const SMILE_CHALLENGE = {
  type: 'SMILE',
  title: 'Cười tươi một cái nào! 😊',
  instruction: 'Hãy căn mặt vào giữa khung oval và nở một nụ cười rạng rỡ để chụp ảnh điểm danh',
  icon: '😊',
};

export default function AttendancePage() {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [modelReady, setModelReady] = useState(false);
  const [hint, setHint] = useState('Đưa mặt vào khung hình');
  const [livenessEnabled, setLivenessEnabled] = useState(true);
  const [activeChallenge, setActiveChallenge] = useState(null);
  const [livenessSuccess, setLivenessSuccess] = useState(false);
  const [shutterFlash, setShutterFlash] = useState(false);
  const [spoofAlert, setSpoofAlert] = useState(false);
  const [liveStats, setLiveStats] = useState({ ear: null, smile: null, faceValidation: null });
  const [viewAttendancePhoto, setViewAttendancePhoto] = useState(null);

  const { data: students = [] } = useStudents();
  const { data: galleryRows = [] } = useFaceGallery();
  const { data: today = [] } = useTodayAttendance();
  const checkin = useCheckin();
  const enrollFace = useEnrollFace();
  const { mutateAsync: checkinAsync } = checkin;
  const { mutateAsync: enrollFaceAsync } = enrollFace;

  const backfilled = useRef(new Set());
  const autoCheckinRef = useRef(false);
  const checkedRecentlyRef = useRef(new Map());
  const galleryRef = useRef([]);
  const livenessTrackerRef = useRef({
    studentId: null,
    smileCount: 0,
    stableCenteredCount: 0,
    verified: false,
    history: [],
    spoofAlertPlayed: false,
  });

  const todayStudentIds = useMemo(() => new Set(today.map((item) => item.studentId)), [today]);
  const gallery = useMemo(() => buildGallery(galleryRows), [galleryRows]);

  useEffect(() => {
    galleryRef.current = gallery;
  }, [gallery]);

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
        (s) => s.photoUrl && !s.hasFaceEmbedding && !backfilled.current.has(s.id)
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

      // Hiệu ứng nháy đèn flash camera
      setShutterFlash(true);
      setTimeout(() => setShutterFlash(false), 250);

      const photoUrl = webcamRef.current?.getScreenshot() || undefined;

      try {
        const result = await checkinAsync({ faceDescriptor, photoUrl });
        if (!active) return;
        toast.success(`✅ ${result.message}`);
        setHint(`Đã điểm danh: ${result.data.student.name}`);
        setLivenessSuccess(true);
        setTimeout(() => {
          if (active) setLivenessSuccess(false);
        }, 3000);
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
          const tracker = livenessTrackerRef.current;
          let boxColor = '#38bdf8';
          let labelText = '';

          if (tracker.verified) {
            boxColor = '#22c55e';
            labelText = '😊 Nụ cười rạng rỡ! Điểm danh thành công!';
          } else if (tracker.studentId && livenessEnabled) {
            boxColor = '#f59e0b';
            labelText = '😊 Hãy cười tươi để điểm danh!';
          }

          const detectionResult = await detectOverlay(video, canvas, {
            boxColor,
            label: labelText,
            drawLandmarks: true,
          });

          if (detectionResult) {
            const { descriptor, ear, smile, faceValidation } = detectionResult;
            setLiveStats({ ear, smile, faceValidation });

            // 1. NẾU KHUÔN MẶT CHƯA CĂN GIỮA / BỊ CẮT MÉP / QUÁ XA HOẶC QUÁ GẦN:
            if (!faceValidation.valid) {
              setHint(`⚠️ ${faceValidation.message}`);
              tracker.smileCount = 0;
              tracker.stableCenteredCount = 0;
              tracker.history = [];
              tracker.spoofAlertPlayed = false;
              setSpoofAlert(false);
              setActiveChallenge({
                type: 'ADJUST',
                title: 'Căn chỉnh khuôn mặt',
                instruction: faceValidation.message,
                icon: '📐',
              });
            } else {
              // 2. KHUÔN MẶT ĐÃ CĂN CHUẨN XÁC VÀO GIỮA KHUNG OVAL
              const result = matchDescriptor(descriptor, galleryRef.current);
              if (result.matched) {
                const matchedStudent = result.student;

                if (todayStudentIds.has(matchedStudent.id)) {
                  setHint(`${matchedStudent.name} đã điểm danh hôm nay`);
                  tracker.studentId = null;
                  tracker.smileCount = 0;
                  tracker.stableCenteredCount = 0;
                  tracker.history = [];
                  tracker.spoofAlertPlayed = false;
                  setSpoofAlert(false);
                  setActiveChallenge(null);
                } else if (!livenessEnabled) {
                  // Chế độ không kiểm tra người thật: Vẫn phải căn giữa ổn định ít nhất 2 frames
                  tracker.stableCenteredCount += 1;
                  if (tracker.stableCenteredCount >= 2) {
                    setHint(`Khớp: ${matchedStudent.name} (${result.distance.toFixed(2)})`);
                    setActiveChallenge(null);
                    autoCheckin(matchedStudent, descriptor);
                  } else {
                    setHint(`Đã nhận diện: ${matchedStudent.name}. Giữ thẳng khuôn mặt...`);
                  }
                } else {
                  // Chế độ CHỐNG GIAN LẬN:
                  if (tracker.studentId !== matchedStudent.id) {
                    tracker.studentId = matchedStudent.id;
                    tracker.smileCount = 0;
                    tracker.stableCenteredCount = 0;
                    tracker.verified = false;
                    tracker.history = [];
                    tracker.spoofAlertPlayed = false;
                    setSpoofAlert(false);
                    setActiveChallenge(SMILE_CHALLENGE);
                  }

                  // Cập nhật lịch sử mốc cử động
                  tracker.history.push({
                    time: Date.now(),
                    smileRatio: smile?.ratio || 0,
                    ear: ear,
                  });
                  if (tracker.history.length > 12) {
                    tracker.history.shift();
                  }

                  const liveness = analyzeLiveness(tracker.history);

                  if (liveness.isSpoof) {
                    // PHÁT HIỆN GIAN LẬN (ẢNH TĨNH / MÀN HÌNH ĐIỆN THOẠI)
                    tracker.smileCount = 0;
                    tracker.verified = false;
                    setSpoofAlert(true);
                    if (!tracker.spoofAlertPlayed) {
                      playFeedbackSound('spoof');
                      toast.error(`🚫 ${liveness.message}`, {
                        id: 'spoof-detected',
                        duration: 4000,
                      });
                      tracker.spoofAlertPlayed = true;
                    }
                    setHint(`🚫 ${liveness.message}`);
                    setActiveChallenge({
                      type: 'SPOOF',
                      title: 'CẢNH BÁO GIAN LẬN: ẢNH TĨNH!',
                      instruction: liveness.message,
                      icon: '🚫',
                    });
                  } else if (liveness.isLive) {
                    // ĐÃ XÁC NHẬN NGƯỜI THẬT (CÓ CHUYỂN BIẾN NỤ CƯỜI HOẶC CHỚP MẮT)
                    setSpoofAlert(false);
                    tracker.spoofAlertPlayed = false;

                    if (!tracker.verified) {
                      if (smile && smile.isSmiling) {
                        tracker.smileCount += 1;
                        setHint(
                          `😊 Nụ cười người thật! Giữ nguyên để chụp ảnh (${tracker.smileCount}/${REQUIRED_SMILE_FRAMES})...`
                        );

                        if (tracker.smileCount >= REQUIRED_SMILE_FRAMES) {
                          tracker.verified = true;
                          playFeedbackSound('success');
                          setHint(`✅ Đã chụp nụ cười rạng rỡ của ${matchedStudent.name}!`);
                          toast.success(`Nụ cười thật tuyệt! Điểm danh thành công!`, {
                            id: 'liveness-success',
                          });
                          setActiveChallenge(null);
                          autoCheckin(matchedStudent, descriptor);
                        }
                      } else {
                        tracker.smileCount = 0;
                        setHint(
                          `Đã xác thực người thật: ${matchedStudent.name}. Hãy cười tươi để chụp ảnh điểm danh 😊`
                        );
                      }
                    }
                  } else {
                    // ĐANG CHỜ CỬ ĐỘNG
                    setSpoofAlert(false);
                    tracker.spoofAlertPlayed = false;
                    tracker.smileCount = 0;

                    if (
                      tracker.history.length >= 3 &&
                      tracker.history.every((h) => h.smileRatio >= 0.58)
                    ) {
                      setHint(
                        `⚠️ Phát hiện khuôn mặt có sẵn nụ cười tĩnh. Vui lòng thả lỏng mặt rồi cười lại để xác thực!`
                      );
                    } else {
                      setHint(
                        `Phát hiện: ${matchedStudent.name}. Hãy cười tươi để xác thực người thật 😊`
                      );
                    }
                  }
                }
              } else if (result.student) {
                setHint(
                  `Gần ${result.student.name} nhưng chưa đủ (${result.distance.toFixed(2)} > ${FACE_THRESHOLD})`
                );
                tracker.studentId = null;
                tracker.smileCount = 0;
                tracker.stableCenteredCount = 0;
                tracker.history = [];
                tracker.spoofAlertPlayed = false;
                setSpoofAlert(false);
                setActiveChallenge(null);
              } else {
                setHint('Thấy mặt, chưa có hồ sơ khuôn mặt trong hệ thống');
                tracker.studentId = null;
                tracker.smileCount = 0;
                tracker.stableCenteredCount = 0;
                tracker.history = [];
                tracker.spoofAlertPlayed = false;
                setSpoofAlert(false);
                setActiveChallenge(null);
              }
            }
          } else {
            setHint('Đưa mặt vào khung hình');
            setLiveStats({ ear: null, smile: null, faceValidation: null });
            tracker.studentId = null;
            tracker.smileCount = 0;
            tracker.stableCenteredCount = 0;
            tracker.history = [];
            tracker.spoofAlertPlayed = false;
            setSpoofAlert(false);
            setActiveChallenge(null);
          }
        } catch {
          setHint('Đang quét khuôn mặt...');
        }
      }
      window.setTimeout(tick, 300);
    };

    tick();
    return () => {
      active = false;
    };
  }, [checkinAsync, livenessEnabled, modelReady, students, todayStudentIds]);

  const onCheckin = async () => {
    if (liveStats.faceValidation && !liveStats.faceValidation.valid) {
      toast.error(liveStats.faceValidation.message);
      return;
    }
    const shot = webcamRef.current?.getScreenshot();
    if (!shot) {
      toast.error('Chưa có camera');
      return;
    }
    setShutterFlash(true);
    setTimeout(() => setShutterFlash(false), 250);
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
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap">
        <Typography variant="h4" fontWeight={800}>
          Điểm danh
        </Typography>
        <FormControlLabel
          control={
            <Switch
              checked={livenessEnabled}
              onChange={(e) => {
                setLivenessEnabled(e.target.checked);
                setActiveChallenge(null);
                livenessTrackerRef.current = {
                  studentId: null,
                  smileCount: 0,
                  verified: false,
                };
              }}
              color="success"
            />
          }
          label={
            <Stack direction="row" spacing={0.8} alignItems="center">
              {livenessEnabled ? (
                <ShieldCheck size={20} color="#16a34a" />
              ) : (
                <ShieldAlert size={20} color="#dc2626" />
              )}
              <Typography fontWeight={700} color={livenessEnabled ? 'success.main' : 'error.main'}>
                {livenessEnabled ? 'Chống gian lận: Đang bật' : 'Chống gian lận: Đã tắt'}
              </Typography>
            </Stack>
          }
        />
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <Card sx={{ flex: 1.2 }}>
          <CardContent>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mb: 1.5 }}
            >
              <Typography fontWeight={700}>Camera Kiosk</Typography>
              {livenessEnabled && (
                <Stack direction="row" spacing={1}>
                  <Chip
                    size="small"
                    variant="outlined"
                    label={
                      liveStats.smile?.isSmiling
                        ? `Đang cười tươi! 😊 (${liveStats.smile.score}%)`
                        : 'Hãy cười tươi... 😐'
                    }
                    color={liveStats.smile?.isSmiling ? 'success' : 'default'}
                  />
                </Stack>
              )}
            </Stack>

            <Box
              sx={{
                position: 'relative',
                overflow: 'hidden',
                borderRadius: 3,
                bgcolor: '#0b3b52',
                border: 3,
                borderColor: spoofAlert
                  ? '#ef4444'
                  : livenessSuccess
                    ? '#22c55e'
                    : liveStats.smile?.isSmiling
                      ? '#22c55e'
                      : activeChallenge
                        ? '#f59e0b'
                        : 'transparent',
                boxShadow: spoofAlert ? '0 0 35px rgba(239, 68, 68, 0.7)' : 'none',
                transition: 'all 0.3s ease',
              }}
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

              {/* Hiệu ứng flash khi chụp ảnh */}
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  bgcolor: '#ffffff',
                  opacity: shutterFlash ? 0.85 : 0,
                  transition: 'opacity 0.2s ease-out',
                  pointerEvents: 'none',
                  zIndex: 10,
                }}
              />

              {/* Khung định vị khuôn mặt để đảm bảo căn chuẩn giữa trước khi chụp */}
              <Box
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: { xs: 210, sm: 250 },
                  height: { xs: 270, sm: 320 },
                  borderRadius: '50%',
                  border: spoofAlert
                    ? '3px solid #ef4444'
                    : liveStats.faceValidation?.valid && liveStats.smile?.isSmiling
                      ? '3px solid #22c55e'
                      : liveStats.faceValidation?.valid
                        ? '2px solid #38bdf8'
                        : '2px dashed #f87171',
                  boxShadow: spoofAlert
                    ? '0 0 35px rgba(239, 68, 68, 0.8)'
                    : livenessSuccess ||
                        (liveStats.faceValidation?.valid && liveStats.smile?.isSmiling)
                      ? '0 0 30px rgba(34, 197, 94, 0.6)'
                      : liveStats.faceValidation?.valid
                        ? '0 0 20px rgba(56, 189, 248, 0.4)'
                        : '0 0 15px rgba(239, 68, 68, 0.3)',
                  pointerEvents: 'none',
                  transition: 'all 0.25s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  pt: 1.5,
                  zIndex: 5,
                }}
              >
                {spoofAlert ? (
                  <Chip
                    size="small"
                    icon={<ShieldAlert size={14} color="#ffffff" />}
                    label="🚫 PHÁT HIỆN GIAN LẬN: ẢNH TĨNH"
                    sx={{
                      bgcolor: '#dc2626',
                      color: 'white',
                      fontWeight: 800,
                      fontSize: 11,
                      boxShadow: '0 2px 10px rgba(220, 38, 38, 0.6)',
                    }}
                  />
                ) : !liveStats.faceValidation?.valid ? (
                  <Chip
                    size="small"
                    label={liveStats.faceValidation?.message || 'Căn mặt vào giữa khung oval'}
                    sx={{
                      bgcolor: 'rgba(220, 38, 38, 0.9)',
                      color: 'white',
                      fontWeight: 700,
                      fontSize: 11,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                    }}
                  />
                ) : liveStats.smile?.isSmiling ? (
                  <Chip
                    size="small"
                    icon={<Camera size={14} color="#ffffff" />}
                    label={
                      livenessTrackerRef.current.smileCount >= REQUIRED_SMILE_FRAMES
                        ? '📸 Đang chụp ảnh...'
                        : `📸 Giữ nụ cười tươi (${livenessTrackerRef.current.smileCount || 1}/${REQUIRED_SMILE_FRAMES})...`
                    }
                    sx={{
                      bgcolor: '#16a34a',
                      color: 'white',
                      fontWeight: 800,
                      fontSize: 11,
                      boxShadow: '0 2px 10px rgba(22, 163, 74, 0.6)',
                    }}
                  />
                ) : (
                  <Chip
                    size="small"
                    label="✓ Đã căn giữa · Hãy cười tươi! 😊"
                    sx={{
                      bgcolor: 'rgba(14, 165, 233, 0.9)',
                      color: 'white',
                      fontWeight: 700,
                      fontSize: 11,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                    }}
                  />
                )}
              </Box>

              {/* Challenge Banner khi đang yêu cầu xác thực người thật hoặc cảnh báo gian lận */}
              {activeChallenge && (
                <Fade in={Boolean(activeChallenge)}>
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 16,
                      left: 16,
                      right: 16,
                      bgcolor:
                        activeChallenge.type === 'SPOOF'
                          ? 'rgba(153, 27, 27, 0.95)'
                          : 'rgba(15, 23, 42, 0.88)',
                      backdropFilter: 'blur(8px)',
                      color: 'white',
                      p: 2,
                      borderRadius: 2,
                      border:
                        activeChallenge.type === 'SPOOF'
                          ? '2px solid #ef4444'
                          : '1px solid rgba(245, 158, 11, 0.4)',
                      boxShadow:
                        activeChallenge.type === 'SPOOF'
                          ? '0 8px 32px rgba(239, 68, 68, 0.5)'
                          : '0 8px 32px rgba(0,0,0,0.3)',
                    }}
                  >
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Typography fontSize={32}>{activeChallenge.icon}</Typography>
                      <Box sx={{ flex: 1 }}>
                        <Typography
                          variant="caption"
                          sx={{
                            color: activeChallenge.type === 'SPOOF' ? '#fca5a5' : '#fbbf24',
                            fontWeight: 800,
                          }}
                        >
                          {activeChallenge.type === 'SPOOF'
                            ? 'CẢNH BÁO GIAN LẬN'
                            : 'XÁC THỰC NGƯỜI THẬT'}
                        </Typography>
                        <Typography
                          fontWeight={700}
                          fontSize={16}
                          sx={{ color: activeChallenge.type === 'SPOOF' ? '#ffffff' : 'inherit' }}
                        >
                          {activeChallenge.title}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'grey.200', fontSize: 13 }}>
                          {activeChallenge.instruction}
                        </Typography>
                      </Box>
                    </Stack>
                  </Box>
                </Fade>
              )}

              {/* Banner khi xác thực thành công */}
              {livenessSuccess && (
                <Fade in={livenessSuccess}>
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 16,
                      left: 16,
                      right: 16,
                      bgcolor: 'rgba(22, 101, 52, 0.9)',
                      backdropFilter: 'blur(8px)',
                      color: 'white',
                      p: 2,
                      borderRadius: 2,
                      border: '1px solid rgba(34, 197, 94, 0.5)',
                      textAlign: 'center',
                    }}
                  >
                    <Stack direction="row" spacing={1} justifyContent="center" alignItems="center">
                      <CheckCircle2 size={24} color="#4ade80" />
                      <Typography fontWeight={800} fontSize={16}>
                        Xác thực người thật & Điểm danh thành công!
                      </Typography>
                    </Stack>
                  </Box>
                </Fade>
              )}
            </Box>

            <Alert
              severity={
                livenessSuccess
                  ? 'success'
                  : activeChallenge
                    ? 'warning'
                    : hint.startsWith('Khớp') || hint.startsWith('Đã điểm danh')
                      ? 'info'
                      : 'neutral'
              }
              icon={
                livenessSuccess ? (
                  <CheckCircle2 size={20} />
                ) : activeChallenge ? (
                  <ShieldAlert size={20} />
                ) : (
                  <UserCheck size={20} />
                )
              }
              sx={{ mt: 2, fontWeight: 600 }}
            >
              {hint}
            </Alert>

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
                  : 'Điểm danh thủ công bằng ảnh hiện tại'}
            </Button>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
              {livenessEnabled
                ? '🛡️ Chế độ chống gian lận đang BẬT: Học sinh nhìn thẳng vào camera và nở nụ cười tươi để chụp ảnh điểm danh (chống đưa ảnh in/màn hình điện thoại).'
                : '⚡ Chế độ chống gian lận đang TẮT: Hệ thống sẽ tự động điểm danh ngay lập tức khi phát hiện khuôn mặt trùng khớp.'}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mb: 2 }}
            >
              <Typography fontWeight={700}>Hôm nay ({today.length})</Typography>
              <Typography variant="caption" color="text.secondary">
                Bấm vào dòng để xem ảnh chụp
              </Typography>
            </Stack>
            <Stack spacing={1.5}>
              {today.length === 0 && (
                <Typography color="text.secondary">Chưa có lượt điểm danh.</Typography>
              )}
              {today.map((item) => {
                const displayPhoto = item.photoUrl || item.student.photoUrl;
                return (
                  <Stack
                    key={item.id}
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{
                      p: 1.25,
                      borderRadius: 2,
                      bgcolor: '#f8fafc',
                      cursor: displayPhoto ? 'pointer' : 'default',
                      transition: 'all 0.2s',
                      '&:hover': displayPhoto
                        ? { bgcolor: '#f1f5f9', transform: 'translateX(2px)' }
                        : {},
                    }}
                    onClick={() => displayPhoto && setViewAttendancePhoto(item)}
                  >
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Avatar
                        src={displayPhoto || undefined}
                        alt={item.student.name}
                        sx={{
                          width: 44,
                          height: 44,
                          border: '2px solid',
                          borderColor: item.photoUrl ? 'primary.main' : 'divider',
                        }}
                      />
                      <Box>
                        <Typography fontWeight={700} fontSize={15}>
                          {item.student.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" fontSize={13}>
                          Còn {item.student.remainingSessions} buổi ·{' '}
                          {item.method === 'FACE' ? 'Quét mặt 📸' : 'Thủ công ✍️'}
                        </Typography>
                      </Box>
                    </Stack>
                    <Stack alignItems="flex-end" spacing={0.5}>
                      <Typography variant="body2" fontWeight={700} color="primary.main">
                        {format(new Date(item.checkInTime), 'HH:mm')}
                      </Typography>
                      {item.photoUrl && (
                        <Chip
                          size="small"
                          variant="outlined"
                          color="info"
                          label="Xem ảnh chụp"
                          sx={{ height: 20, fontSize: 11 }}
                        />
                      )}
                    </Stack>
                  </Stack>
                );
              })}
            </Stack>
          </CardContent>
        </Card>
      </Stack>

      {/* Dialog phóng to ảnh chụp điểm danh */}
      <Dialog
        open={Boolean(viewAttendancePhoto)}
        onClose={() => setViewAttendancePhoto(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle fontWeight={700}>Ảnh chụp lúc điểm danh</DialogTitle>
        <DialogContent sx={{ textAlign: 'center' }}>
          {viewAttendancePhoto && (
            <Stack spacing={2} alignItems="center">
              <Box
                component="img"
                src={viewAttendancePhoto.photoUrl || viewAttendancePhoto.student.photoUrl}
                alt={viewAttendancePhoto.student.name}
                sx={{
                  width: '100%',
                  maxHeight: 360,
                  objectFit: 'cover',
                  borderRadius: 2,
                  border: '2px solid #0e7490',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                }}
              />
              <Box sx={{ width: '100%', bgcolor: '#f8fafc', p: 1.5, borderRadius: 2 }}>
                <Typography fontWeight={700} fontSize={16}>
                  {viewAttendancePhoto.student.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Thời gian:{' '}
                  {format(new Date(viewAttendancePhoto.checkInTime), 'HH:mm:ss - dd/MM/yyyy')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Phương thức:{' '}
                  {viewAttendancePhoto.method === 'FACE' ? 'Quét khuôn mặt' : 'Thủ công'}
                </Typography>
                {viewAttendancePhoto.note && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block', mt: 0.5 }}
                  >
                    {viewAttendancePhoto.note}
                  </Typography>
                )}
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setViewAttendancePhoto(null)} variant="outlined">
            Đóng
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
