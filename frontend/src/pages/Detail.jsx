import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/backend';
import { useAuth } from '../auth/AuthContext';
import { genreLabel } from '../utils/gameLabels';
import { gameSource, gameDate } from '../utils/gameSource';
export default function Detail() {
  const { id } = useParams();
  // เปลี่ยนเกมแล้วสร้าง state ใหม่ ป้องกันผลคำขอของเกมก่อนหน้าค้างในหน้าใหม่
  return <DetailContent key={id} id={id} />;
}
function DetailContent({ id }) {
  const { user } = useAuth(),
    [game, setGame] = useState(null),
    [error, setError] = useState(''),
    [note, setNote] = useState(''),
    [saving, setSaving] = useState(false),
    [imageFailed, setImageFailed] = useState(false),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    const c = new AbortController();
    setGame(null);
    setError('');
    setNote('');
    api('/api/games/' + id, { signal: c.signal })
      .then((data) => {
        if (!c.signal.aborted) setGame(data);
      })
      .catch((e) => {
        if (!c.signal.aborted && e.name !== 'AbortError') setError(e.message);
      });
    return () => c.abort();
  }, [id, retry]);
  async function save() {
    setSaving(true);
    setError('');
    setNote('');
    try {
      await api('/api/me/favorites/' + id, { method: 'PUT' });
      setNote('เพิ่มในเกมโปรดแล้ว');
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }
  if (!game)
    return (
      <>
        <p role={error ? 'alert' : 'status'}>{error || 'กำลังโหลด…'}</p>
        {error && <button onClick={() => setRetry((n) => n + 1)}>ลองใหม่</button>}
      </>
    );
  const source = gameSource(game);
  const released = gameDate(game.releaseDate);
  return (
    <>
      <Link className="back-link" to="/discover">
        ← กลับไปรายการเกม
      </Link>
      <article className="detail-layout">
        <div className="detail-media">
          {game.imageUrl && !imageFailed ? (
            <img
              className="detail-image"
              src={game.imageUrl}
              alt={game.title}
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div className="placeholder detail-placeholder" aria-label="ไม่มีภาพเกม">
              ไม่มีภาพเกม
            </div>
          )}
        </div>
        <div className="detail-content">
          <h1>{game.title}</h1>
          <p className="detail-description">{game.description || 'ยังไม่มีคำอธิบายเพิ่มเติม'}</p>
          <dl className="game-facts">
            {released && (
              <div>
                <dt>วางจำหน่าย</dt>
                <dd>
                  <time dateTime={game.releaseDate}>{released}</time>
                </dd>
              </div>
            )}
            <div>
              <dt>แนวเกม</dt>
              <dd>{game.genres.map(genreLabel).join(' / ') || 'ยังไม่มีข้อมูล'}</dd>
            </div>
            <div>
              <dt>แพลตฟอร์ม</dt>
              <dd>{game.platforms.join(' / ') || 'ยังไม่มีข้อมูล'}</dd>
            </div>
          </dl>
          <div className="game-tags" aria-label="แท็กเกม">
            {game.tags.length ? (
              game.tags.map((tag) => <span key={tag}>{tag}</span>)
            ) : (
              <p className="muted">ยังไม่มีข้อมูลแท็ก</p>
            )}
          </div>
          {user ? (
            <button onClick={save} disabled={saving}>
              {saving ? 'กำลังบันทึก…' : 'เพิ่มในเกมโปรด'}
            </button>
          ) : (
            <Link className="button" to="/login" state={{ from: '/games/' + id }}>
              เข้าสู่ระบบเพื่อบันทึกเกม
            </Link>
          )}
          {source && (
            <p className="detail-source">
              ข้อมูลและภาพจาก{' '}
              <a href={source.href} target="_blank" rel="noreferrer">
                {source.name}
              </a>
            </p>
          )}
          {note && <p role="status">{note}</p>}
          {error && <p role="alert">{error}</p>}
        </div>
      </article>
    </>
  );
}
