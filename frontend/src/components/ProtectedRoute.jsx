import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
export default function ProtectedRoute({ admin = false }) {
  const { user, loading, error, canRetrySession } = useAuth();
  const location = useLocation();
  if (loading) return <p role="status">กำลังตรวจสอบบัญชี…</p>;
  if (!user && error && canRetrySession)
    return <p className="muted">ยังตรวจสอบบัญชีไม่ได้ กรุณากดตรวจสอบบัญชีอีกครั้ง</p>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (admin && user.role !== 'admin') return <p role="alert">403 — สำหรับผู้ดูแลระบบเท่านั้น</p>;
  return <Outlet />;
}
