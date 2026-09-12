const fs = require('fs');
const path = require('path');

const UPLOAD_ROOT = path.join(__dirname, '../../uploads');

const saveDataUrl = (dataUrl, folder = 'students') => {
  if (!dataUrl || typeof dataUrl !== 'string') {
    return null;
  }

  if (process.env.STORE_UPLOADS_IN_DB === 'true' && dataUrl.startsWith('data:image/')) {
    return dataUrl;
  }

  const match = dataUrl.match(/^data:(image\/[\w+.-]+);base64,(.+)$/);
  if (!match) {
    if (dataUrl.startsWith('/uploads/')) {
      return dataUrl;
    }
    return null;
  }

  const mime = match[1];
  const ext = mime.includes('png') ? 'png' : 'jpg';
  const dir = path.join(UPLOAD_ROOT, folder);
  fs.mkdirSync(dir, { recursive: true });
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  fs.writeFileSync(path.join(dir, filename), Buffer.from(match[2], 'base64'));
  return `/uploads/${folder}/${filename}`;
};

module.exports = { saveDataUrl, UPLOAD_ROOT };
