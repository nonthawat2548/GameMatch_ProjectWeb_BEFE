import { render, screen, fireEvent, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../auth/AuthContext';
import { api } from '../../api/backend';

jest.mock('../../api/backend', () => ({ api: jest.fn() }));
const member = { id: 1, displayName: 'Member A', email: 'a@example.com', role: 'member' };
function Consumer() {
  const { user, loading, login, logout, error, retrySession } = useAuth();
  return (
    <>
      <p>{loading ? 'Restoring session' : user?.displayName || 'Guest'}</p>
      {error && <p role="alert">{error}</p>}
      <button onClick={() => login('a@example.com', 'password123').catch(() => {})}>Login</button>
      <button onClick={() => logout().catch(() => {})}>Logout</button>
      <button onClick={retrySession}>Retry</button>
    </>
  );
}
function page() {
  render(
    <AuthProvider>
      <Consumer />
    </AuthProvider>,
  );
}
beforeEach(() => {
  jest.resetAllMocks();
  localStorage.clear();
});

test('restores the current database user after reload', async () => {
  localStorage.setItem('gamematch_token', 'saved-token');
  api.mockResolvedValue(member);
  page();
  expect(screen.getByText('Restoring session')).toBeInTheDocument();
  expect(await screen.findByText(member.displayName)).toBeInTheDocument();
  expect(api).toHaveBeenCalledWith('/api/me');
});

test('removes revoked tokens but retains tokens during temporary server failure', async () => {
  localStorage.setItem('gamematch_token', 'revoked');
  api.mockRejectedValue(Object.assign(new Error('Session expired'), { status: 401 }));
  page();
  expect(await screen.findByText('Guest')).toBeInTheDocument();
  expect(localStorage.getItem('gamematch_token')).toBeNull();
});

test('saves login token and clears local session even when remote logout fails', async () => {
  api.mockResolvedValueOnce({ token: 'new-token', user: member });
  page();
  fireEvent.click(screen.getByRole('button', { name: 'Login' }));
  expect(await screen.findByText(member.displayName)).toBeInTheDocument();
  expect(localStorage.getItem('gamematch_token')).toBe('new-token');
  api.mockRejectedValueOnce(new Error('Offline'));
  fireEvent.click(screen.getByRole('button', { name: 'Logout' }));
  expect(await screen.findByText('Guest')).toBeInTheDocument();
  expect(localStorage.getItem('gamematch_token')).toBeNull();
});

test('keeps a saved token when session restore receives a temporary 500', async () => {
  localStorage.setItem('gamematch_token', 'saved-token');
  api.mockRejectedValue(Object.assign(new Error('Database unavailable'), { status: 500 }));
  page();
  expect(await screen.findByRole('alert')).toHaveTextContent('Database unavailable');
  expect(localStorage.getItem('gamematch_token')).toBe('saved-token');
});

test('retries a temporary session restore failure without requiring a new login', async () => {
  localStorage.setItem('gamematch_token', 'saved-token');
  api
    .mockRejectedValueOnce(Object.assign(new Error('Database unavailable'), { status: 500 }))
    .mockResolvedValueOnce(member);
  page();
  expect(await screen.findByRole('alert')).toHaveTextContent('Database unavailable');
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  expect(await screen.findByText('Member A')).toBeInTheDocument();
  expect(localStorage.getItem('gamematch_token')).toBe('saved-token');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('a delayed restore response cannot log the member back in after logout', async () => {
  localStorage.setItem('gamematch_token', 'saved-token');
  let finish;
  api
    .mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    )
    .mockResolvedValueOnce({ ok: true });
  page();
  fireEvent.click(screen.getByRole('button', { name: 'Logout' }));
  expect(await screen.findByText('Guest')).toBeInTheDocument();
  await act(async () => {
    finish(member);
  });
  expect(screen.queryByText('Member A')).not.toBeInTheDocument();
  expect(localStorage.getItem('gamematch_token')).toBeNull();
});

test('logout in another tab immediately clears the visible account', async () => {
  localStorage.setItem('gamematch_token', 'saved-token');
  api.mockResolvedValue(member);
  page();
  await screen.findByText('Member A');
  localStorage.removeItem('gamematch_token');
  fireEvent(
    window,
    new StorageEvent('storage', {
      key: 'gamematch_token',
      storageArea: localStorage,
      newValue: null,
    }),
  );
  expect(await screen.findByText('Guest')).toBeInTheDocument();
  expect(api).toHaveBeenCalledTimes(1);
});

test('checks the new account when another tab changes its token', async () => {
  localStorage.setItem('gamematch_token', 'token-a');
  api
    .mockResolvedValueOnce(member)
    .mockResolvedValueOnce({ ...member, id: 2, displayName: 'Member B' });
  page();
  await screen.findByText('Member A');
  localStorage.setItem('gamematch_token', 'token-b');
  fireEvent(
    window,
    new StorageEvent('storage', {
      key: 'gamematch_token',
      storageArea: localStorage,
      newValue: 'token-b',
    }),
  );
  expect(screen.queryByText('Member A')).not.toBeInTheDocument();
  expect(await screen.findByText('Member B')).toBeInTheDocument();
});

test('a delayed logout cannot clear a session that logged in afterward', async () => {
  localStorage.setItem('gamematch_token', 'token-a');
  let finishLogout;
  api
    .mockResolvedValueOnce(member)
    .mockReturnValueOnce(
      new Promise((resolve) => {
        finishLogout = resolve;
      }),
    )
    .mockResolvedValueOnce({
      token: 'token-b',
      user: { ...member, id: 2, displayName: 'Member B' },
    });
  page();
  await screen.findByText('Member A');
  fireEvent.click(screen.getByRole('button', { name: 'Logout' }));
  fireEvent.click(screen.getByRole('button', { name: 'Login' }));
  await screen.findByText('Member B');
  await act(async () => {
    finishLogout({ ok: true });
  });
  expect(screen.getByText('Member B')).toBeInTheDocument();
  expect(localStorage.getItem('gamematch_token')).toBe('token-b');
});

test('an older pending login cannot replace an account selected in another tab', async () => {
  localStorage.setItem('gamematch_token', 'token-a');
  let finishLogin;
  api
    .mockResolvedValueOnce(member)
    .mockReturnValueOnce(
      new Promise((resolve) => {
        finishLogin = resolve;
      }),
    )
    .mockResolvedValueOnce({ ...member, id: 2, displayName: 'Member B' });
  page();
  await screen.findByText('Member A');
  fireEvent.click(screen.getByRole('button', { name: 'Login' }));
  localStorage.setItem('gamematch_token', 'token-b');
  fireEvent(
    window,
    new StorageEvent('storage', {
      key: 'gamematch_token',
      storageArea: localStorage,
      newValue: 'token-b',
    }),
  );
  await screen.findByText('Member B');
  await act(async () => {
    finishLogin({ token: 'old-login-result', user: member });
  });
  expect(screen.getByText('Member B')).toBeInTheDocument();
  expect(localStorage.getItem('gamematch_token')).toBe('token-b');
});
