import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Profile from '../../pages/Profile';
import { api } from '../../api/backend';
import { useAuth } from '../../auth/AuthContext';

jest.mock('../../api/backend', () => ({ api: jest.fn() }));
jest.mock('../../auth/AuthContext', () => ({ useAuth: jest.fn() }));
const refresh = jest.fn();
const logout = jest.fn();
function page() {
  render(
    <MemoryRouter initialEntries={['/me/profile']}>
      <Routes>
        <Route path="/me/profile" element={<Profile />} />
        <Route path="/login" element={<p>Login page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}
beforeEach(() => {
  jest.resetAllMocks();
  localStorage.clear();
  useAuth.mockReturnValue({
    user: { displayName: 'Member A', email: 'a@example.com', role: 'member' },
    refresh,
    logout,
  });
  refresh.mockResolvedValue({});
  logout.mockResolvedValue();
});

test('saves the display name and refreshes auth context', async () => {
  api.mockResolvedValue({ ok: true });
  page();
  fireEvent.change(screen.getByLabelText('ชื่อที่แสดง'), { target: { value: 'New name' } });
  fireEvent.click(screen.getByRole('button', { name: 'บันทึกโปรไฟล์' }));
  expect(await screen.findByRole('status')).toHaveTextContent('บันทึกชื่อแล้ว');
  expect(api).toHaveBeenCalledWith('/api/me', { method: 'PUT', body: { displayName: 'New name' } });
  expect(refresh).toHaveBeenCalledTimes(1);
});

test('wrong current password keeps the member logged in', async () => {
  api.mockRejectedValue(new Error('Wrong current password'));
  page();
  fireEvent.change(screen.getByLabelText('รหัสผ่านปัจจุบัน'), { target: { value: 'wrongpass' } });
  fireEvent.change(screen.getByLabelText('รหัสผ่านใหม่'), { target: { value: 'newpassword123' } });
  fireEvent.click(screen.getByRole('button', { name: 'เปลี่ยนและเข้าสู่ระบบใหม่' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Wrong current password');
  expect(logout).not.toHaveBeenCalled();
});

test('successful password change clears the session and returns to login', async () => {
  api.mockResolvedValue({ ok: true });
  page();
  fireEvent.change(screen.getByLabelText('รหัสผ่านปัจจุบัน'), {
    target: { value: 'oldpassword123' },
  });
  fireEvent.change(screen.getByLabelText('รหัสผ่านใหม่'), { target: { value: 'newpassword123' } });
  fireEvent.click(screen.getByRole('button', { name: 'เปลี่ยนและเข้าสู่ระบบใหม่' }));
  expect(await screen.findByText('Login page')).toBeInTheDocument();
  await waitFor(() => expect(logout).toHaveBeenCalledTimes(1));
});

test('rejects an oversized Thai password without clearing the current session', async () => {
  page();
  fireEvent.change(screen.getByLabelText('รหัสผ่านปัจจุบัน'), { target: { value: 'password123' } });
  fireEvent.change(screen.getByLabelText('รหัสผ่านใหม่'), { target: { value: 'ก'.repeat(25) } });
  fireEvent.click(screen.getByRole('button', { name: 'เปลี่ยนและเข้าสู่ระบบใหม่' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('72 ไบต์');
  expect(api).not.toHaveBeenCalled();
  expect(logout).not.toHaveBeenCalled();
});

test('rejects whitespace-only profile names before sending a request', async () => {
  page();
  fireEvent.change(screen.getByLabelText('ชื่อที่แสดง'), { target: { value: '   ' } });
  fireEvent.click(screen.getByRole('button', { name: 'บันทึกโปรไฟล์' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('กรุณาระบุชื่อที่แสดง');
  expect(api).not.toHaveBeenCalled();
});

test('a password response for the previous account cannot log out a newly selected account', async () => {
  localStorage.setItem('gamematch_token', 'token-a');
  let finish;
  api.mockReturnValueOnce(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  page();
  fireEvent.change(screen.getByLabelText('รหัสผ่านปัจจุบัน'), {
    target: { value: 'oldpassword123' },
  });
  fireEvent.change(screen.getByLabelText('รหัสผ่านใหม่'), { target: { value: 'newpassword123' } });
  fireEvent.click(screen.getByRole('button', { name: 'เปลี่ยนและเข้าสู่ระบบใหม่' }));
  localStorage.setItem('gamematch_token', 'token-b');
  await act(async () => {
    finish({ ok: true });
  });
  expect(logout).not.toHaveBeenCalled();
  expect(localStorage.getItem('gamematch_token')).toBe('token-b');
  expect(screen.queryByText('Login page')).not.toBeInTheDocument();
});
