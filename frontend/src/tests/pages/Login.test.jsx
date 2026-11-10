import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Login from '../../pages/Login';
import { api } from '../../api/backend';
import { useAuth } from '../../auth/AuthContext';

jest.mock('../../api/backend', () => ({ api: jest.fn() }));
jest.mock('../../auth/AuthContext', () => ({ useAuth: jest.fn() }));
const login = jest.fn();
beforeEach(() => {
  jest.resetAllMocks();
  localStorage.clear();
  useAuth.mockReturnValue({ login });
});
function page(register = false, from) {
  render(
    <MemoryRouter
      initialEntries={[{ pathname: register ? '/register' : '/login', state: { from } }]}
    >
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Login key="register" register />} />
        <Route path="/" element={<p>Discover page</p>} />
        <Route path="/games/:id" element={<p>Game detail page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}
function credentials() {
  fireEvent.change(screen.getByLabelText('อีเมล'), { target: { value: 'member@example.com' } });
  fireEvent.change(screen.getByLabelText('รหัสผ่าน'), { target: { value: 'password123' } });
}
test('registers without accepting a role and logs in', async () => {
  api.mockResolvedValue({ id: 1 });
  login.mockResolvedValue();
  page(true);
  credentials();
  fireEvent.change(screen.getByLabelText('ชื่อที่แสดง'), { target: { value: 'New member' } });
  fireEvent.click(screen.getByRole('button', { name: 'สมัครและเข้าสู่ระบบ' }));
  expect(await screen.findByText('Discover page')).toBeInTheDocument();
  expect(api).toHaveBeenCalledWith('/api/auth/register', {
    method: 'POST',
    body: { email: 'member@example.com', password: 'password123', displayName: 'New member' },
  });
  expect(login).toHaveBeenCalledWith('member@example.com', 'password123');
});
test('displays login failures and allows another attempt', async () => {
  login.mockRejectedValue(new Error('Wrong credentials'));
  page();
  credentials();
  fireEvent.click(screen.getByRole('button', { name: 'เข้าสู่ระบบ' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Wrong credentials');
  expect(screen.getByRole('button', { name: 'เข้าสู่ระบบ' })).toBeEnabled();
});

test('returns to the requested game after login', async () => {
  login.mockResolvedValue();
  page(false, '/games/7');
  credentials();
  fireEvent.click(screen.getByRole('button', { name: 'เข้าสู่ระบบ' }));
  expect(await screen.findByText('Game detail page')).toBeInTheDocument();
});

test('retains the requested game when switching from login to registration', async () => {
  login.mockResolvedValue();
  api.mockResolvedValue({ id: 1 });
  page(false, '/games/7');
  fireEvent.click(screen.getByRole('link', { name: 'สร้างบัญชีใหม่' }));
  credentials();
  fireEvent.change(screen.getByLabelText('ชื่อที่แสดง'), { target: { value: 'New member' } });
  fireEvent.click(screen.getByRole('button', { name: 'สมัครและเข้าสู่ระบบ' }));
  expect(await screen.findByText('Game detail page')).toBeInTheDocument();
});

test('a delayed signup response does not replace an account selected while waiting', async () => {
  let finish;
  api.mockReturnValueOnce(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  page(true);
  credentials();
  fireEvent.change(screen.getByLabelText('ชื่อที่แสดง'), { target: { value: 'New member' } });
  fireEvent.click(screen.getByRole('button', { name: 'สมัครและเข้าสู่ระบบ' }));
  localStorage.setItem('gamematch_token', 'another-account-token');
  await act(async () => {
    finish({ id: 1 });
  });
  expect(login).not.toHaveBeenCalled();
  expect(localStorage.getItem('gamematch_token')).toBe('another-account-token');
});

test.each([
  'https://outside.example',
  '//outside.example',
  '/\\outside.example',
  '/login',
  { path: '/games/7' },
])('falls back to the catalog for an invalid return destination: %p', async (from) => {
  login.mockResolvedValue();
  page(false, from);
  credentials();
  fireEvent.click(screen.getByRole('button', { name: 'เข้าสู่ระบบ' }));
  expect(await screen.findByText('Discover page')).toBeInTheDocument();
});

test('does not ask a registered member to register again if auto-login fails', async () => {
  api.mockResolvedValue({ id: 1 });
  login.mockRejectedValue(new Error('Temporary outage'));
  page(true);
  credentials();
  fireEvent.change(screen.getByLabelText('ชื่อที่แสดง'), { target: { value: 'New member' } });
  fireEvent.click(screen.getByRole('button', { name: 'สมัครและเข้าสู่ระบบ' }));
  expect(await screen.findByRole('status')).toHaveTextContent('สมัครสมาชิกสำเร็จแล้ว');
  expect(screen.getByRole('heading', { name: 'เข้าสู่ระบบ' })).toBeInTheDocument();
  expect(api).toHaveBeenCalledTimes(1);
});

test('rejects a Thai password exceeding bcrypt byte limit before registration', async () => {
  page(true);
  credentials();
  fireEvent.change(screen.getByLabelText('ชื่อที่แสดง'), { target: { value: 'Member' } });
  fireEvent.change(screen.getByLabelText('รหัสผ่าน'), { target: { value: 'ก'.repeat(25) } });
  fireEvent.click(screen.getByRole('button', { name: 'สมัครและเข้าสู่ระบบ' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('72 ไบต์');
  expect(api).not.toHaveBeenCalled();
  expect(login).not.toHaveBeenCalled();
});

test('rejects a Thai display name exceeding the backend byte limit', async () => {
  page(true);
  credentials();
  fireEvent.change(screen.getByLabelText('ชื่อที่แสดง'), { target: { value: 'ก'.repeat(34) } });
  fireEvent.click(screen.getByRole('button', { name: 'สมัครและเข้าสู่ระบบ' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('100 ไบต์');
  expect(api).not.toHaveBeenCalled();
});
