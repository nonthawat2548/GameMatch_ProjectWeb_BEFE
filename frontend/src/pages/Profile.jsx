import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { api } from '../api/backend';
import { passwordError, utf8Length } from '../utils/validation';
import { TOKEN_KEY } from '../auth/session';
export default function Profile() {
  const { user, refresh, logout } = useAuth(),
    [name, setName] = useState(user.displayName),
    [note, setNote] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    nav = useNavigate();
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setNote('');
    const displayName = name.trim();
    if (!displayName || utf8Length(displayName) > 100) {
      setError('กรุณาระบุชื่อที่แสดงไม่เกิน 100 ไบต์ ภาษาไทยนับหลายไบต์ต่อตัว');
      setBusy(false);
      return;
    }
    try {
      await api('/api/me', { method: 'PUT', body: { displayName } });
      await refresh();
      setNote('บันทึกชื่อแล้ว');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function password(e) {
    e.preventDefault();
    const f = new FormData(e.target);
    const token = localStorage.getItem(TOKEN_KEY);
    setBusy(true);
    setError('');
    setNote('');
    const validationError = passwordError(f.get('new'));
    if (validationError) {
      setError(validationError);
      setBusy(false);
      return;
    }
    try {
      await api('/api/me/password', {
        method: 'PUT',
        body: { currentPassword: f.get('current'), newPassword: f.get('new') },
      });
      // หากสลับบัญชีระหว่างรอ อย่าส่ง logout ของบัญชีใหม่จากคำขอเก่า
      if (localStorage.getItem(TOKEN_KEY) !== token) return;
      await logout().catch(() => {});
      nav('/login', {
        replace: true,
        state: {
          from: '/me/profile',
          notice: 'เปลี่ยนรหัสผ่านสำเร็จแล้ว กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่',
        },
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <h1>โปรไฟล์</h1>
      <p className="muted">
        {user.email} · {user.role === 'admin' ? 'ผู้ดูแลระบบ' : 'สมาชิก'}
      </p>
      <div className="profile-forms">
        <form className="panel" onSubmit={save} aria-busy={busy}>
          <fieldset disabled={busy}>
            <h2>ข้อมูลส่วนตัว</h2>
            <label>
              ชื่อที่แสดง
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
            <button disabled={busy}>บันทึกโปรไฟล์</button>
          </fieldset>
        </form>
        <form className="panel" onSubmit={password} aria-busy={busy}>
          <fieldset disabled={busy}>
            <h2>เปลี่ยนรหัสผ่าน</h2>
            <label>
              รหัสผ่านปัจจุบัน
              <input name="current" type="password" autoComplete="current-password" required />
            </label>
            <label>
              รหัสผ่านใหม่
              <input
                name="new"
                type="password"
                minLength={8}
                autoComplete="new-password"
                required
              />
            </label>
            <button disabled={busy}>เปลี่ยนและเข้าสู่ระบบใหม่</button>
            <p className="muted form-hint">การเปลี่ยนรหัสผ่านจะออกจากระบบในทุกอุปกรณ์</p>
          </fieldset>
        </form>
      </div>
      {note && <p role="status">{note}</p>}
      {error && <p role="alert">{error}</p>}
    </>
  );
}
