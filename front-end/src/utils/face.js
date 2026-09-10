import * as faceapi from '@vladmandic/face-api';

export const FACE_THRESHOLD = 0.65;
const MODEL_URL = '/models';

let loading = null;

const detectorOptions = () =>
  new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.3 });

export const loadFaceModels = async () => {
  if (!loading) {
    loading = (async () => {
      if (faceapi.tf?.setBackend) {
        await faceapi.tf.setBackend('webgl');
        await faceapi.tf.ready();
      }
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
    })();
  }
  return loading;
};

const descriptorFrom = async (input, validateBoundary = true) => {
  await loadFaceModels();
  const detection = await faceapi
    .detectSingleFace(input, detectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor();
  if (!detection) {
    throw new Error('Không thấy khuôn mặt. Chụp thẳng, đủ sáng, một người trong khung hình.');
  }

  if (validateBoundary) {
    const inputWidth = input.naturalWidth || input.videoWidth || input.width || 640;
    const inputHeight = input.naturalHeight || input.videoHeight || input.height || 480;
    const validation = validateFacePosition(
      detection.detection.box,
      { width: inputWidth, height: inputHeight },
      { strictCenter: false }
    );
    if (!validation.valid) {
      throw new Error(validation.message);
    }
  }

  return Array.from(detection.descriptor);
};

export const getDescriptorFromDataUrl = async (dataUrl) => {
  const img = await faceapi.fetchImage(dataUrl);
  return descriptorFrom(img);
};

export const averageDescriptors = (descriptors) => {
  const valid = descriptors.filter(
    (descriptor) => Array.isArray(descriptor) && descriptor.length === 128
  );
  if (!valid.length) return null;

  return valid[0].map((_, index) => {
    const sum = valid.reduce((total, descriptor) => total + Number(descriptor[index]), 0);
    return sum / valid.length;
  });
};

const dist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);

export const calculateEyeAspectRatio = (landmarks) => {
  if (!landmarks) return null;
  const leftEye = landmarks.getLeftEye();
  const rightEye = landmarks.getRightEye();

  const ear = (eye) => {
    if (!eye || eye.length < 6) return 0;
    const v1 = dist(eye[1], eye[5]);
    const v2 = dist(eye[2], eye[4]);
    const h = dist(eye[0], eye[3]);
    return h > 0 ? (v1 + v2) / (2.0 * h) : 0;
  };

  const leftEAR = ear(leftEye);
  const rightEAR = ear(rightEye);
  return Number(((leftEAR + rightEAR) / 2.0).toFixed(3));
};

export const calculateHeadPose = (landmarks) => {
  if (!landmarks || !landmarks.positions || landmarks.positions.length < 31) return 'CENTER';
  const leftJaw = landmarks.positions[0];
  const rightJaw = landmarks.positions[16];
  const noseTip = landmarks.positions[30];

  const dxLeft = Math.abs(noseTip.x - leftJaw.x);
  const dxRight = Math.abs(rightJaw.x - noseTip.x);

  const ratio = dxLeft / (dxRight + 0.0001);
  if (ratio < 0.6) return 'TURN_LEFT';
  if (ratio > 1.6) return 'TURN_RIGHT';
  return 'CENTER';
};

export const validateFacePosition = (box, containerSize, options = {}) => {
  if (!box || !containerSize || !containerSize.width || !containerSize.height) {
    return { valid: false, isCentered: false, message: 'Đưa khuôn mặt vào khung hình' };
  }

  const { width: cWidth, height: cHeight } = containerSize;
  const { x, y, width, height } = box;
  const strictCenter = options.strictCenter !== false;

  // 1. Kiểm tra kích thước khuôn mặt:
  const minWidthRatio = strictCenter ? 0.25 : 0.16;
  const maxWidthRatio = strictCenter ? 0.62 : 0.85;

  if (width < cWidth * minWidthRatio) {
    return {
      valid: false,
      isCentered: false,
      reason: 'TOO_FAR',
      guideDirection: 'CLOSER',
      message: 'Vui lòng tiến lại gần camera hơn 🔍',
    };
  }

  if (width > cWidth * maxWidthRatio) {
    return {
      valid: false,
      isCentered: false,
      reason: 'TOO_CLOSE',
      guideDirection: 'FARTHER',
      message: 'Vui lòng lùi ra một chút để lấy trọn vẹn khuôn mặt 📐',
    };
  }

  // 2. Kiểm tra độ căn giữa (Face Centering):
  const faceCenterX = x + width / 2;
  const faceCenterY = y + height / 2;
  const frameCenterX = cWidth / 2;
  const frameCenterY = cHeight / 2;

  const dx = faceCenterX - frameCenterX;
  const dy = faceCenterY - frameCenterY;

  // Dung sai lệch tâm:
  // Chế độ Kiosk KHOÁ CHẶT: tối đa ±6.5% chiều rộng và ±8% chiều cao
  // Đảm bảo khuôn mặt nằm trọn vẹn và thẳng chính giữa khung oval
  const maxOffsetX = strictCenter ? cWidth * 0.065 : cWidth * 0.25;
  const maxOffsetY = strictCenter ? cHeight * 0.08 : cHeight * 0.25;

  if (dx < -maxOffsetX) {
    return {
      valid: false,
      isCentered: false,
      reason: 'OFF_LEFT',
      guideDirection: 'RIGHT',
      message: 'Khuôn mặt đang lệch trái, vui lòng di chuyển sang phải ➔',
    };
  }
  if (dx > maxOffsetX) {
    return {
      valid: false,
      isCentered: false,
      reason: 'OFF_RIGHT',
      guideDirection: 'LEFT',
      message: 'Khuôn mặt đang lệch phải, vui lòng di chuyển sang trái ⬅',
    };
  }

  if (dy < -maxOffsetY) {
    return {
      valid: false,
      isCentered: false,
      reason: 'OFF_TOP',
      guideDirection: 'DOWN',
      message: 'Khuôn mặt hơi cao, vui lòng hạ thấp xuống giữa khung oval ⬇',
    };
  }
  if (dy > maxOffsetY) {
    return {
      valid: false,
      isCentered: false,
      reason: 'OFF_BOTTOM',
      guideDirection: 'UP',
      message: 'Khuôn mặt hơi thấp, vui lòng nâng cằm lên giữa khung oval ⬆',
    };
  }

  // 3. Kiểm tra mép viền
  const marginX = strictCenter ? cWidth * 0.08 : cWidth * 0.02;
  const marginY = strictCenter ? cHeight * 0.07 : cHeight * 0.02;

  if (
    x < marginX ||
    x + width > cWidth - marginX ||
    y < marginY ||
    y + height > cHeight - marginY
  ) {
    return {
      valid: false,
      isCentered: false,
      reason: 'NEAR_EDGE',
      guideDirection: 'CENTER',
      message: 'Khuôn mặt sát mép khung hình, vui lòng căn vào giữa khung oval',
    };
  }

  return {
    valid: true,
    isCentered: true,
    reason: 'CENTERED',
    guideDirection: 'OK',
    message: 'Khuôn mặt đã căn giữa chuẩn xác',
    dx,
    dy,
  };
};

export const calculateSmileScore = (landmarks) => {
  if (!landmarks || !landmarks.positions || landmarks.positions.length < 68) {
    return { score: 0, isSmiling: false, ratio: 0 };
  }
  const p = landmarks.positions;

  // Khoảng cách giữa 2 đuôi mắt ngoài (điểm 36 và 45)
  const eyeDist = dist(p[36], p[45]);
  if (eyeDist <= 0) return { score: 0, isSmiling: false, ratio: 0 };

  // Khoảng cách giữa 2 khóe miệng (điểm 48 và 54)
  const mouthWidth = dist(p[48], p[54]);

  // Tỷ lệ độ rộng miệng so với khoảng cách mắt
  const ratio = Number((mouthWidth / eyeDist).toFixed(3));

  // Thang điểm nụ cười từ 0 đến 100
  // Bình thường: ratio ~0.46 - 0.53
  // Bắt đầu hé môi / nói: ratio ~0.54 - 0.57
  // Cười tươi rõ rệt: ratio >= 0.59
  let score = 0;
  if (ratio >= 0.54) {
    score = Math.min(100, Math.round(((ratio - 0.54) / 0.14) * 100));
  }

  const isSmiling = ratio >= 0.59 || score >= 40;

  return { score, isSmiling, ratio };
};

export const analyzeLiveness = (history) => {
  if (!history || history.length < 4) {
    return {
      status: 'COLLECTING',
      isLive: false,
      isSpoof: false,
      message: 'Đang phân tích cử động sống của khuôn mặt...',
    };
  }

  const ratios = history.map((h) => h.smileRatio).filter((r) => r != null && !isNaN(r));
  const ears = history.map((h) => h.ear).filter((e) => e != null && !isNaN(e));

  const minRatio = Math.min(...ratios);
  const maxRatio = Math.max(...ratios);
  const deltaRatio = maxRatio - minRatio;

  const minEar = ears.length ? Math.min(...ears) : 0.3;
  const maxEar = ears.length ? Math.max(...ears) : 0.3;
  const deltaEar = maxEar - minEar;

  const latest = history[history.length - 1];

  // 1. KIỂM TRA CỬ ĐỘNG NGƯỜI THẬT (Liveness Signals):
  // a) Nụ cười chuyển biến thực: Bắt đầu từ nét mặt bình thường (< 0.56) và chuyển sang cười tươi (>= 0.59) với biên độ delta >= 0.055
  const hasSmileTransition = minRatio < 0.56 && latest.smileRatio >= 0.59 && deltaRatio >= 0.055;

  // b) Chớp mắt tự nhiên: Mắt nhắm <= 0.20 và mở lại >= 0.24 (delta >= 0.05)
  const hasBlink = minEar <= 0.2 && maxEar >= 0.24 && deltaEar >= 0.05;

  if (hasSmileTransition || hasBlink) {
    return {
      status: 'VERIFIED_LIVE',
      isLive: true,
      isSpoof: false,
      reason: hasSmileTransition ? 'SMILE_TRANSITION' : 'BLINK',
      message: hasSmileTransition ? 'Nụ cười thật tự nhiên!' : 'Chớp mắt người thật!',
    };
  }

  // 2. PHÁT HIỆN GIAN LẬN BẰNG ẢNH (Photo Spoof Detection):
  // Khi mặt đã xuất hiện liên tục từ 6 frames trở lên (~1.8s - 2.4s)
  if (history.length >= 6) {
    // Nếu tỷ lệ môi và mắt hoàn toàn bất động / không có biến thiên cơ mặt (delta < 0.035)
    if (deltaRatio < 0.035 && deltaEar < 0.035) {
      const isStaticSmile = latest.smileRatio >= 0.58;
      return {
        status: 'SPOOF_DETECTED',
        isLive: false,
        isSpoof: true,
        reason: isStaticSmile ? 'STATIC_SMILE_PHOTO' : 'STATIC_PHOTO',
        message: isStaticSmile
          ? 'Cảnh báo gian lận: Phát hiện ảnh tĩnh có sẵn nụ cười!'
          : 'Cảnh báo gian lận: Phát hiện ảnh tĩnh / không có cử động người thật!',
      };
    }
  }

  return {
    status: 'WAITING_ACTION',
    isLive: false,
    isSpoof: false,
    message: 'Hãy nở nụ cười tươi hoặc chớp mắt để xác thực người thật',
  };
};

export const playFeedbackSound = (type = 'success') => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (type === 'spoof') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.setValueAtTime(160, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } else if (type === 'success') {
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0.15, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.3);
      });
    }
  } catch {
    /* AudioContext fallback */
  }
};

export const detectOverlay = async (video, canvas, options = {}) => {
  await loadFaceModels();
  if (!video || video.readyState < 2) return null;
  const displaySize = { width: video.clientWidth, height: video.clientHeight };
  if (!displaySize.width || !displaySize.height) return null;
  faceapi.matchDimensions(canvas, displaySize);

  const detection = await faceapi
    .detectSingleFace(video, detectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor();

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!detection) return null;

  const resized = faceapi.resizeResults(detection, displaySize);
  const faceValidation = validateFacePosition(resized.detection.box, displaySize, {
    strictCenter: options.strictCenter !== false,
  });

  let boxColor = options.boxColor || '#38bdf8';
  if (!faceValidation.valid) {
    boxColor = '#ef4444'; // Đỏ cảnh báo khi chưa căn giữa hoặc lệch
  }

  const customBox = new faceapi.draw.DrawBox(resized.detection.box, {
    boxColor,
    lineWidth: 2,
    label: options.label || (faceValidation.valid ? undefined : faceValidation.message),
  });
  customBox.draw(canvas);

  if (options.drawLandmarks !== false) {
    faceapi.draw.drawFaceLandmarks(canvas, resized);
  }

  const landmarks = resized.landmarks;
  const ear = calculateEyeAspectRatio(landmarks);
  const headPose = calculateHeadPose(landmarks);
  const smile = calculateSmileScore(landmarks);

  return {
    descriptor: Array.from(detection.descriptor),
    landmarks,
    detection: resized.detection,
    ear,
    headPose,
    faceValidation,
    smile,
  };
};

export const parseEmbedding = (raw) => {
  if (!raw) return null;
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  const values = Array.isArray(parsed) ? parsed : Object.values(parsed);
  return values.length === 128 ? values.map(Number) : null;
};

export const distanceOf = (a, b) => {
  if (!a || !b || a.length !== b.length) return Number.POSITIVE_INFINITY;
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
};

export const matchDescriptor = (descriptor, students) => {
  let best = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  students.forEach((student) => {
    const stored = parseEmbedding(student.faceEmbeddingJson);
    if (!stored) return;
    const distance = distanceOf(descriptor, stored);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = student;
    }
  });
  if (!best) return { student: null, distance: null, matched: false };
  return {
    student: best,
    distance: bestDistance,
    matched: bestDistance <= FACE_THRESHOLD,
  };
};
