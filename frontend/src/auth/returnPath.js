const pages = ['/', '/discover', '/match', '/about', '/me/favorites', '/me/profile', '/admin'];

// กลับได้เฉพาะหน้าที่มีจริงในแอป ไม่รับ URL ภายนอกจาก navigation state
export function returnPath(value) {
  if (typeof value !== 'string') return '/';
  return pages.includes(value) || /^\/games\/[1-9]\d*$/.test(value) ? value : '/';
}
