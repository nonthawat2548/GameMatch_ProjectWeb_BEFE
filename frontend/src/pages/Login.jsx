import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api/backend';
import { useAuth } from '../auth/AuthContext';
import { passwordError, utf8Length } from '../utils/validation';
import { returnPath } from '../auth/returnPath';
import { TOKEN_KEY } from '../auth/session';
export default function Login({ register = false }) {
  const { login } = useAuth(),
    nav = useNavigate(),
    location = useLocation(),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const destination = returnPath(location.state?.from);
  async function submit(e) {
    e.preventDefault();
    setError('');
    const previousToken = localStorage.getItem(TOKEN_KEY);
    const f = new FormData(e.target),
      email = f.get('email').trim().toLowerCase(),
      password = f.get('password');
    const displayName = (f.get('name') || '').trim();
    if (register) {
      const validationError = passwordError(password);
      if (validationError) {
        setError(validationError);
        return;
      }
      if (!displayName || utf8Length(displayName) > 100) {
        setError('กรุณาระบุชื่อที่แสดงไม่เกิน 100 ไบต์ ภาษาไทยนับหลายไบต์ต่อตัว');
        return;
      }
    }
    setBusy(true);
    try {
      if (register) {
        await api('/api/auth/register', {
          method: 'POST',
          body: { email, password, displayName },
        });
        if (localStorage.getItem(TOKEN_KEY) !== previousToken) return;
        // สมัครสำเร็จแล้ว หาก auto-login ล้มเหลว ให้ลอง login แทนสมัครบัญชีซ้ำ
        try {
          await login(email, password);
        } catch {
          nav('/login', {
            replace: true,
            state: {
              notice: 'สมัครสมาชิกสำเร็จแล้ว กรุณาลองเข้าสู่ระบบอีกครั้ง',
              from: destination,
            },
          });
          return;
        }
      } else {
        await login(email, password);
      }
      nav(destination, { replace: true });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="panel narrow auth-form" onSubmit={submit} aria-busy={busy}>
      <h1>{register ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ'}</h1>
      <p className="muted">บันทึกเกมโปรดและเก็บความชอบของคุณไว้ใช้ครั้งต่อไป</p>
      {!register && location.state?.notice && <p role="status">{location.state.notice}</p>}
      <fieldset disabled={busy}>
        {register && (
          <label>
            ชื่อที่แสดง
            <input name="name" required maxLength={100} />
          </label>
        )}
        <label>
          อีเมล
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label>
          รหัสผ่าน
          <input
            name="password"
            type="password"
            minLength={8}
            autoComplete={register ? 'new-password' : 'current-password'}
            required
          />
        </label>
        {error && <p role="alert">{error}</p>}
        <button disabled={busy}>
          {busy ? 'กำลังดำเนินการ…' : register ? 'สมัครและเข้าสู่ระบบ' : 'เข้าสู่ระบบ'}
        </button>
      </fieldset>
      <p>
        <Link to={register ? '/login' : '/register'} state={{ from: destination }}>
          {register ? 'มีบัญชีแล้ว' : 'สร้างบัญชีใหม่'}
        </Link>
      </p>
    </form>
  );
}
