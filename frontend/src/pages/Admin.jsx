import { useEffect, useState } from 'react';
import { api } from '../api/backend';
import { utf8Length } from '../utils/validation';
const blank = {
  title: '',
  description: '',
  imageUrl: '',
  genres: [],
  tags: [],
  platforms: ['PC'],
  isPublished: true,
};
export default function Admin() {
  const [games, setGames] = useState(null),
    [g, setG] = useState(blank),
    [error, setError] = useState(''),
    [note, setNote] = useState(''),
    [busy, setBusy] = useState(false);
  async function load() {
    setGames(await api('/api/admin/games'));
  }
  useEffect(() => {
    const controller = new AbortController();
    api('/api/admin/games', { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setGames(data);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, []);
  async function task(fn) {
    setBusy(true);
    setError('');
    setNote('');
    let completed = false;
    try {
      if (fn) {
        await fn();
        completed = true;
      }
      await load();
    } catch (e) {
      setError(
        completed ? 'ดำเนินการสำเร็จแล้ว แต่โหลดรายการล่าสุดไม่ได้: ' + e.message : e.message,
      );
    } finally {
      setBusy(false);
    }
  }
  async function save(e) {
    e.preventDefault();
    const title = g.title.trim();
    if (!title || utf8Length(title) > 250) {
      setNote('');
      setError('กรุณาระบุชื่อเกมไม่เกิน 250 ไบต์ ภาษาไทยนับหลายไบต์ต่อตัว');
      return;
    }
    const imageUrl = g.imageUrl.trim();
    if (imageUrl) {
      try {
        const url = new URL(imageUrl);
        if (url.protocol !== 'https:' || !url.hostname) throw new Error();
      } catch {
        setNote('');
        setError('รูปต้องเป็น HTTPS URL');
        return;
      }
    }
    // ทำความสะอาดตอน submit เสมอ แม้ผู้ใช้กด Enter โดยไม่ blur ช่องข้อมูล
    const list = (values) => values.map((value) => value.trim()).filter(Boolean);
    const body = {
      title,
      description: g.description,
      imageUrl,
      genres: list(g.genres),
      tags: list(g.tags),
      platforms: list(g.platforms),
      isPublished: g.isPublished,
    };
    await task(async () => {
      await api('/api/admin/games' + (g.id ? '/' + g.id : ''), {
        method: g.id ? 'PUT' : 'POST',
        body,
      });
      setG(blank);
      setNote('บันทึกข้อมูลแล้ว');
    });
  }
  function edit(game) {
    const { matchScore, reasons, ...data } = game;
    setG(data);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  return (
    <>
      <div className="section-head">
        <div>
          <h1>จัดการคลังเกม</h1>
        </div>
        <div className="admin-sync-actions">
          <button
            disabled={busy || games === null}
            onClick={() =>
              task(async () => {
                const d = await api('/api/admin/sync/steam', { method: 'POST' });
                setNote(`อัปเดตจาก Steam ${d.imported} เกมแล้ว`);
              })
            }
          >
            อัปเดตเกมออกใหม่ Steam
          </button>
          <button
            className="secondary"
            disabled={busy || games === null}
            onClick={() =>
              task(async () => {
                const d = await api('/api/admin/sync', { method: 'POST' });
                setNote(`Sync ${d.imported} เกมแล้ว`);
              })
            }
          >
            Sync RAWG (40 เกม)
          </button>
        </div>
      </div>
      <p className="muted">
        Steam นำเข้ารายการ New Releases พร้อมภาพสูงสุด 12 เกมต่อครั้ง
        โดยคงสถานะเผยแพร่และคำอธิบายที่ผู้ดูแลแก้ไว้ ส่วน RAWG ต้องตั้ง API key บน backend ก่อนใช้
      </p>
      {error && <p role="alert">{error}</p>}
      {error && (
        <button className="secondary" disabled={busy} onClick={() => task()}>
          โหลดรายการอีกครั้ง
        </button>
      )}
      {note && <p role="status">{note}</p>}
      <form className="panel" onSubmit={save} aria-busy={busy}>
        <fieldset disabled={busy || games === null}>
          <h2>{g.id ? 'แก้ไขเกม #' + g.id : 'เพิ่มเกม'}</h2>
          <div className="quiz-fields">
            <label>
              ชื่อเกม
              <input
                value={g.title}
                onChange={(e) => setG({ ...g, title: e.target.value })}
                required
                maxLength={250}
              />
            </label>
            <label>
              รูป HTTPS URL
              <input
                type="url"
                value={g.imageUrl}
                onChange={(e) => setG({ ...g, imageUrl: e.target.value })}
              />
            </label>
            {[
              ['genres', 'Genres เช่น rpg, action'],
              ['tags', 'Tags เช่น singleplayer, story-rich'],
              ['platforms', 'Platforms เช่น PC'],
            ].map(([key, label]) => (
              <label key={key}>
                {label}
                <input
                  value={g[key].join(',')}
                  onChange={(e) => setG({ ...g, [key]: e.target.value.split(',') })}
                  onBlur={() => setG({ ...g, [key]: g[key].map((x) => x.trim()).filter(Boolean) })}
                />
              </label>
            ))}
          </div>
          <label>
            คำอธิบาย
            <textarea
              value={g.description}
              onChange={(e) => setG({ ...g, description: e.target.value })}
            />
          </label>
          <label className="inline">
            <input
              type="checkbox"
              checked={g.isPublished}
              onChange={(e) => setG({ ...g, isPublished: e.target.checked })}
            />
            เผยแพร่
          </label>
          <button disabled={busy}>บันทึกเกม</button>
          <button type="button" className="secondary" disabled={busy} onClick={() => setG(blank)}>
            ล้างฟอร์ม
          </button>
        </fieldset>
      </form>
      {games ? (
        <div className="panel table-wrap">
          <table>
            <thead>
              <tr>
                <th>เกม</th>
                <th>สถานะ</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {games.map((game) => (
                <tr key={game.id}>
                  <td>{game.title}</td>
                  <td>{game.isPublished ? 'เผยแพร่' : 'ซ่อน'}</td>
                  <td>
                    <button disabled={busy} onClick={() => edit(game)}>
                      แก้ไข
                    </button>
                    <button
                      className="danger"
                      disabled={busy}
                      onClick={() => {
                        if (window.confirm(`ลบ ${game.title}?`))
                          task(async () => {
                            await api('/api/admin/games/' + game.id, { method: 'DELETE' });
                            if (g.id === game.id) setG(blank);
                            setNote('ลบเกมแล้ว');
                          });
                      }}
                    >
                      ลบ
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!games.length && <p>ยังไม่มีเกม กด Sync หรือเพิ่มข้อมูลด้านบน</p>}
        </div>
      ) : (
        !error && <p role="status">กำลังโหลด…</p>
      )}
    </>
  );
}
