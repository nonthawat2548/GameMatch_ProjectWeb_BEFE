import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/backend';
import GameGrid from '../components/GameGrid';

export default function Home() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError('');
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

  return (
    <>
      <section className="home-intro">
        <h1>หาเกมที่อยากเล่น</h1>
        <p>เลือกดูเกมในคลัง หรือบอกแนวเกมและสไตล์ที่ชอบให้ GameMatch ช่วยเลือก</p>
        <div className="home-actions">
          <Link className="button" to="/discover">
            ดูเกมทั้งหมด
          </Link>
          <Link className="button secondary" to="/match">
            ลองจับคู่เกม
          </Link>
        </div>
      </section>
      <section aria-labelledby="home-games-heading" aria-busy={loading}>
        <div className="section-head">
          <div>
            <h2 id="home-games-heading">เลือกดูจากคลังเกม</h2>
            <p className="muted">ดูรายละเอียดก่อนเก็บเกมที่สนใจไว้ในรายการเกมโปรด</p>
          </div>
          <Link className="inline-link" to="/discover">
            ดูทั้งหมด
          </Link>
        </div>
        {loading ? (
          <p role="status" className="catalog-message">
            กำลังโหลดเกม…
          </p>
        ) : error ? (
          <>
            <p role="alert">{error}</p>
            <button className="secondary" onClick={() => setRetry((n) => n + 1)}>
              ลองใหม่
            </button>
          </>
        ) : (
          <GameGrid
            games={games.slice(0, 4)}
            emptyText="ยังไม่มีเกมในคลัง กลับมาดูใหม่ได้ภายหลัง"
          />
        )}
      </section>
    </>
  );
}
