import { BrowserRouter, Routes, Route, Link, NavLink } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Discover from './pages/Discover';
import MatchQuiz from './pages/MatchQuiz';
import Login from './pages/Login';
import Detail from './pages/Detail';
import Favorites from './pages/Favorites';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import Home from './pages/Home';
import About from './pages/About';
function Shell() {
  const { user, logout, error, retrySession, canRetrySession } = useAuth();
  return (
    <>
      <a className="skip-link" href="#main-content">
        ข้ามไปเนื้อหา
      </a>
      <header className="site-header">
        <div className="header-inner">
          <Link className="brand" to="/">
            GameMatch
          </Link>
          <nav aria-label="เมนูหลัก">
            <div className="primary-links">
              <NavLink to="/" end>
                หน้าแรก
              </NavLink>
              <NavLink to="/discover">เกมทั้งหมด</NavLink>
              <NavLink to="/match">แนะนำเกม</NavLink>
              <NavLink to="/about">เกี่ยวกับ</NavLink>
              {user && <NavLink to="/me/favorites">เกมโปรด</NavLink>}
              {user?.role === 'admin' && <NavLink to="/admin">จัดการเกม</NavLink>}
            </div>
            <div className="account-links">
              {user ? (
                <>
                  <NavLink to="/me/profile">{user.displayName}</NavLink>
                  <button
                    className="text-button"
                    onClick={() =>
                      logout().catch(() =>
                        window.alert(
                          'ล้างข้อมูลในเครื่องแล้ว แต่ติดต่อ Server เพื่อยกเลิก Token ไม่สำเร็จ',
                        ),
                      )
                    }
                  >
                    ออกจากระบบ
                  </button>
                </>
              ) : (
                <NavLink className="login-link" to="/login">
                  เข้าสู่ระบบ
                </NavLink>
              )}
            </div>
          </nav>
        </div>
      </header>
      <main id="main-content" tabIndex={-1}>
        {error && (
          <div>
            <p role="alert">{error}</p>
            {canRetrySession && (
              <button className="secondary" onClick={retrySession}>
                ตรวจสอบบัญชีอีกครั้ง
              </button>
            )}
          </div>
        )}
        <Routes key={user?.id || 'guest'}>
          <Route path="/" element={<Home />} />
          <Route path="/discover" element={<Discover />} />
          <Route path="/match" element={<MatchQuiz />} />
          <Route path="/about" element={<About />} />
          <Route path="/games/:id" element={<Detail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Login key="register" register />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/me/favorites" element={<Favorites />} />
            <Route path="/me/profile" element={<Profile />} />
          </Route>
          <Route element={<ProtectedRoute admin />}>
            <Route path="/admin" element={<Admin />} />
          </Route>
          <Route
            path="*"
            element={
              <section>
                <h1>404 — ไม่พบหน้านี้</h1>
                <p className="muted">
                  ลิงก์อาจไม่ถูกต้อง เลือกกลับไปดูเกมหรือเริ่มจากหน้าแรกได้เลย
                </p>
                <div className="home-actions">
                  <Link className="button" to="/discover">
                    ดูเกมทั้งหมด
                  </Link>
                  <Link className="button secondary" to="/">
                    กลับหน้าแรก
                  </Link>
                </div>
              </section>
            }
          />
        </Routes>
      </main>
      <footer>
        <div className="footer-inner">
          <span>GameMatch</span>
          <p>
            แหล่งข้อมูล{' '}
            <a href="https://store.steampowered.com/explore/new/" target="_blank" rel="noreferrer">
              Steam
            </a>
            {' · '}
            <a href="https://rawg.io" target="_blank" rel="noreferrer">
              RAWG
            </a>
          </p>
          <small>รายการที่ขึ้นต้นด้วย Demo: เป็นข้อมูลตัวอย่าง</small>
        </div>
      </footer>
    </>
  );
}
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </BrowserRouter>
  );
}
