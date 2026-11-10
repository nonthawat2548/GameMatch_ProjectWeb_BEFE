import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/backend';
import GameGrid from '../components/GameGrid';
import { genreLabel } from '../utils/gameLabels';

export default function Discover() {
  const [q, setQ] = useState('');
  const [genre, setGenre] = useState('all');
  const [games, setGames] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError('');
    // ตามรูปแบบหน้ารายการ MovieHub: โหลดจาก Go แล้วกรองด้วย state ในเครื่อง
    api('/api/games')
      .then((list) => {
        if (!ignore) setGames(list);
      })
      .catch((e) => {
        if (!ignore) setError(e.message);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [retry]);

  const genres = [...new Set(games.flatMap((game) => game.genres))].sort();
  const query = q.trim().toLowerCase();
  const shown = games.filter(
    (game) =>
      (genre === 'all' || game.genres.includes(genre)) && game.title.toLowerCase().includes(query),
  );

  return (
    <>
      <section className="catalog-intro">
        <div>
          <h1>เกมทั้งหมด</h1>
          <p className="muted">ค้นหาเกมที่สนใจ แล้วเก็บไว้ในรายการเกมโปรดของคุณ</p>
        </div>
        <Link className="button" to="/match">
          ช่วยเลือกเกมให้หน่อย
        </Link>
      </section>
      <section aria-labelledby="discover-heading" aria-busy={loading}>
        <div className="catalog-toolbar">
          <h2 id="discover-heading">รายการเกม</h2>
          <label className="search-label">
            ค้นหาเกม
            <input
              type="search"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
              }}
              placeholder="พิมพ์ชื่อเกม…"
            />
          </label>
        </div>
        {!loading && !error && genres.length > 0 && (
          <div className="genre-filters" role="group" aria-label="เลือกแนวเกม">
            <button
              className="genre-filter"
              aria-pressed={genre === 'all'}
              onClick={() => setGenre('all')}
            >
              ทุกแนว
            </button>
            {genres.map((value) => (
              <button
                className="genre-filter"
                key={value}
                aria-pressed={genre === value}
                onClick={() => setGenre(value)}
              >
                {genreLabel(value)}
              </button>
            ))}
          </div>
        )}
        {loading ? (
          <p className="catalog-message" role="status">
            กำลังโหลดเกม…
          </p>
        ) : error ? (
          <div>
            <p role="alert">{error}</p>
            <button className="secondary" onClick={() => setRetry((n) => n + 1)}>
              ลองใหม่
            </button>
          </div>
        ) : (
          <>
            <p className="muted" role="status">
              พบ {shown.length} เกม
            </p>
            <GameGrid games={shown} />
          </>
        )}
      </section>
    </>
  );
}
