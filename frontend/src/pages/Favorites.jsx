import { useEffect, useState } from 'react';
import { api } from '../api/backend';
import GameGrid from '../components/GameGrid';
import { Link } from 'react-router-dom';
export default function Favorites() {
  const [games, setGames] = useState(null),
    [error, setError] = useState(''),
    [removing, setRemoving] = useState(null),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    const c = new AbortController();
    setError('');
    api('/api/me/favorites', { signal: c.signal })
      .then(setGames)
      .catch((e) => {
        if (e.name !== 'AbortError') setError(e.message);
      });
    return () => c.abort();
  }, [retry]);
  async function remove(id) {
    setError('');
    setRemoving(id);
    try {
      await api('/api/me/favorites/' + id, { method: 'DELETE' });
      setGames((g) => g.filter((x) => x.id !== id));
    } catch (e) {
      setError(e.message);
    } finally {
      setRemoving(null);
    }
  }
  return (
    <>
      <h1>เกมโปรดของฉัน</h1>
      {error && <p role="alert">{error}</p>}
      {error && !games && (
        <button className="secondary" onClick={() => setRetry((n) => n + 1)}>
          ลองใหม่
        </button>
      )}
      {games ? (
        <GameGrid
          games={games}
          emptyText="ยังไม่มีเกมโปรด เริ่มจากค้นหาเกมที่คุณสนใจแล้วกดบันทึก"
          action={(g) => (
            <button
              className="secondary"
              disabled={removing !== null}
              onClick={() => remove(g.id)}
              aria-label={'นำ ' + g.title + ' ออกจากเกมโปรด'}
            >
              {removing === g.id ? 'กำลังนำออก…' : 'นำออก'}
            </button>
          )}
        />
      ) : (
        !error && <p role="status">กำลังโหลด…</p>
      )}
      {games?.length === 0 && (
        <Link className="button" to="/discover">
          ค้นหาเกม
        </Link>
      )}
    </>
  );
}
