export const FACE_API = {
  THRESHOLD: 0.65,
  DESCRIPTOR_LENGTH: 128,
  MATCH_STREAK: 3,
  CHECKIN_COOLDOWN_MS: 15 * 1000,
  STREAK_TIMEOUT_MS: 10 * 1000,
  DETECTION_INTERVAL_MS: 500,
  DETECTION_TIMEOUT_MS: 5000,
  GALLERY_STALE_MS: 30 * 1000,
  DETECTOR_INPUT_SIZE: 224,
  MODEL_URL: '/models',
  TF_BACKEND: 'webgl',
};

export const QUERY_KEYS = {
  students: ['students'],
  faceGallery: ['face-gallery'],
  attendanceToday: ['attendance-today'],
  dashboard: ['dashboard'],
};

export const FACE_THRESHOLD = FACE_API.THRESHOLD;
