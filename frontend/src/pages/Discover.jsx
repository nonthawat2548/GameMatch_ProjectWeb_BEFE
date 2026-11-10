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
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('popular');
  const pageSize = 24;

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
  if (sort === 'newest')
    shown.sort(
      (a, b) =>
        (b.releaseDate || '').localeCompare(a.releaseDate || '') || a.title.localeCompare(b.title),
    );
  if (sort === 'name') shown.sort((a, b) => a.title.localeCompare(b.title));
  const totalPages = Math.max(1, Math.ceil(shown.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageGames = shown.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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
          <label className="sort-label">
            เรียงตาม
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(1);
              }}
            >
              <option value="popular">ยอดนิยมก่อน</option>
              <option value="newest">ใหม่ล่าสุด</option>
              <option value="name">ชื่อเกม A–Z</option>
            </select>
          </label>
          <label className="search-label">
            ค้นหาเกม
            <input
              type="search"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
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
              onClick={() => {
                setGenre('all');
                setPage(1);
              }}
            >
              ทุกแนว
            </button>
            {genres.map((value) => (
              <button
                className="genre-filter"
                key={value}
                aria-pressed={genre === value}
                onClick={() => {
                  setGenre(value);
                  setPage(1);
                }}
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
            <GameGrid games={pageGames} />
            {totalPages > 1 && (
              <nav className="pagination" aria-label="หน้ารายการเกม">
                <button
                  className="secondary"
                  disabled={currentPage === 1}
                  onClick={() => setPage(currentPage - 1)}
                >
                  ก่อนหน้า
                </button>
                <span>
                  หน้า {currentPage} / {totalPages} · ครั้งละ {pageSize} เกม
                </span>
                <button
                  className="secondary"
                  disabled={currentPage === totalPages}
                  onClick={() => setPage(currentPage + 1)}
                >
                  ถัดไป
                </button>
              </nav>
            )}
          </>
        )}
      </section>
    </>
  );
}
