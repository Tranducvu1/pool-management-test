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

const descriptorFrom = async (input) => {
  await loadFaceModels();
  const detection = await faceapi
    .detectSingleFace(input, detectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor();
  if (!detection) {
    throw new Error('Không thấy khuôn mặt. Chụp thẳng, đủ sáng, một người trong khung hình.');
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

export const detectOverlay = async (video, canvas) => {
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
  faceapi.draw.drawDetections(canvas, resized);
  faceapi.draw.drawFaceLandmarks(canvas, resized);
  return Array.from(detection.descriptor);
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
