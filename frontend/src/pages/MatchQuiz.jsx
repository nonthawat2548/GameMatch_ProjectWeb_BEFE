import { useEffect, useState } from 'react';
import { api } from '../api/backend';
import { useAuth } from '../auth/AuthContext';
import GameGrid from '../components/GameGrid';
import { Link } from 'react-router-dom';
import { genreLabel } from '../utils/gameLabels';
const fields = [
  [
    'genre',
    'แนวเกม',
    [
      ['rpg', 'RPG'],
      ['action', 'Action'],
      ['strategy', 'Strategy'],
      ['simulation', 'Simulation'],
      ['adventure', 'Adventure'],
    ],
  ],
  [
    'mode',
    'รูปแบบการเล่น',
    [
      ['solo', 'เล่นคนเดียว'],
      ['coop', 'ร่วมมือกับเพื่อน'],
      ['pvp', 'แข่งขันกับผู้เล่น'],
    ],
  ],
  [
    'style',
    'สไตล์การเล่น',
    [
      ['story', 'เนื้อเรื่อง'],
      ['competitive', 'แข่งขัน'],
      ['relax', 'ผ่อนคลาย'],
      ['challenge', 'ความท้าทาย'],
    ],
  ],
];
export default function MatchQuiz() {
  const { user, loading } = useAuth(),
    [p, setP] = useState({ genre: 'rpg', mode: 'solo', style: 'story' }),
    [games, setGames] = useState(null),
    [busy, setBusy] = useState(false),
    [saving, setSaving] = useState(false),
    [restoring, setRestoring] = useState(Boolean(user?.id)),
    [error, setError] = useState(''),
    [note, setNote] = useState('');
  const memberID = user?.id;
  const formBusy = loading || busy || saving || restoring;
  useEffect(() => {
    let active = true;
    setP({ genre: 'rpg', mode: 'solo', style: 'story' });
    setGames(null);
    setNote('');
    setError('');
    setRestoring(Boolean(memberID));
    if (memberID)
      api('/api/me/preferences')
        .then((d) => {
          if (active) setP(d);
        })
        .catch((e) => {
          if (active) setError(e.message);
        })
        .finally(() => {
          if (active) setRestoring(false);
        });
    return () => {
      active = false;
    };
  }, [memberID]);
  async function run(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setGames(null);
    setNote('');
    try {
      setGames(await api('/api/recommendations', { method: 'POST', body: p }));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    setSaving(true);
    setError('');
    setNote('');
    try {
      await api('/api/me/preferences', { method: 'PUT', body: p });
      setNote('บันทึกความชอบแล้ว');
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <h1>แนะนำเกม</h1>
      <p className="muted">
        เลือกแนวเกม วิธีเล่น และสิ่งที่คุณชอบ แล้วดูเกมที่ตรงกับตัวเลือกของคุณ
      </p>
      {loading && <p role="status">กำลังตรวจสอบบัญชี…</p>}
      {!loading && restoring && <p role="status">กำลังโหลดความชอบที่บันทึกไว้…</p>}
      <form onSubmit={run} className="panel" aria-busy={formBusy}>
        <div className="quiz-fields">
          {fields.map(([key, label, options]) => (
            <label key={key}>
              {label}
              <select
                disabled={formBusy}
                value={p[key]}
                onChange={(e) => {
                  setP({ ...p, [key]: e.target.value });
                  setNote('');
                  setGames(null);
                }}
              >
                {options.map(([v, text]) => (
                  <option key={v} value={v}>
                    {key === 'genre' ? genreLabel(v) : text}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <button disabled={formBusy}>{busy ? 'กำลังจับคู่…' : 'แนะนำเกมให้ฉัน'}</button>
        {user && (
          <button type="button" className="secondary" onClick={save} disabled={formBusy}>
            {saving ? 'กำลังบันทึก…' : 'บันทึกความชอบ'}
          </button>
        )}
      </form>
      {!loading && !user && (
        <p className="muted">
          <Link className="inline-link" to="/login" state={{ from: '/match' }}>
            เข้าสู่ระบบ
          </Link>{' '}
          เพื่อบันทึกความชอบไว้ใช้ครั้งต่อไป
        </p>
      )}
      <details className="match-explainer">
        <summary>คะแนนคิดอย่างไร?</summary>
        <p className="muted">
          เทียบกับข้อมูลเกม: แนวเกม 45 + รูปแบบการเล่น 25 + สไตล์ 30 คะแนน
          หากไม่มีข้อมูลที่ยืนยันได้จะไม่ได้คะแนนในส่วนนั้น
        </p>
      </details>
      {note && <p role="status">{note}</p>}
      {error && <p role="alert">{error}</p>}
      {games !== null && (
        <section className="match-results" aria-labelledby="match-results-heading">
          <h2 id="match-results-heading">ผลลัพธ์สำหรับคุณ</h2>
          <p className="muted">
            คะแนนแสดงความตรงกับตัวเลือกจากข้อมูลเกม ไม่ใช่การรับประกันว่าจะชอบเกม
          </p>
          <GameGrid games={games} />
        </section>
      )}
    </>
  );
}
