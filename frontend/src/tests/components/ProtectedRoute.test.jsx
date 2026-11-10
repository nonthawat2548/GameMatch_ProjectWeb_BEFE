import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../../components/ProtectedRoute';
import { useAuth } from '../../auth/AuthContext';
jest.mock('../../auth/AuthContext', () => ({ useAuth: jest.fn() }));
function page(admin = false) {
  render(
    <MemoryRouter initialEntries={['/private']}>
      <Routes>
        <Route path="/login" element={<p>Login page</p>} />
        <Route element={<ProtectedRoute admin={admin} />}>
          <Route path="/private" element={<p>Private content</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}
test('guest redirects to login', () => {
  useAuth.mockReturnValue({ user: null, loading: false });
  page();
  expect(screen.getByText('Login page')).toBeInTheDocument();
});
test('member cannot access admin page', () => {
  useAuth.mockReturnValue({ user: { role: 'member' }, loading: false });
  page(true);
  expect(screen.getByRole('alert')).toHaveTextContent('403');
});
test('admin can access admin page', () => {
  useAuth.mockReturnValue({ user: { role: 'admin' }, loading: false });
  page(true);
  expect(screen.getByText('Private content')).toBeInTheDocument();
});
