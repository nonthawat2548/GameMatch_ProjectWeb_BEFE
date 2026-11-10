import { SESSION_EXPIRED_EVENT, TOKEN_KEY } from '../auth/session';

// ทุกหน้าคุยกับ Go ผ่าน fetch ที่นี่ ไม่มี database/API secret ใน React
export async function api(path, { method = 'GET', body, signal } = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  const base = (process.env.REACT_APP_API_URL || 'http://localhost:8080').replace(/\/+$/, '');
  let response;
  try {
    response = await fetch(`${base}${path}`, {
      method,
      signal,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error('ติดต่อเซิร์ฟเวอร์ไม่ได้ กรุณาลองใหม่อีกครั้ง');
  }
  const protectedRequest =
    path === '/api/me' ||
    path.startsWith('/api/me/') ||
    path.startsWith('/api/admin/') ||
    path === '/api/auth/logout';
  // คำขอเก่าที่เพิ่งตอบ 401 ต้องไม่ล้าง session ใหม่ที่ล็อกอินไปแล้ว
  if (
    response.status === 401 &&
    protectedRequest &&
    token &&
    localStorage.getItem(TOKEN_KEY) === token
  ) {
    localStorage.removeItem(TOKEN_KEY);
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }
  let data;
  try {
    data = await response.json();
  } catch (cause) {
    if (cause.name === 'AbortError') throw cause;
    const error = new Error('เซิร์ฟเวอร์ตอบกลับในรูปแบบที่ไม่ถูกต้อง');
    error.status = response.status;
    throw error;
  }
  if (!response.ok) {
    const error = new Error(
      typeof data?.error === 'string' ? data.error : `HTTP ${response.status}`,
    );
    error.status = response.status;
    throw error;
  }
  return data;
}
