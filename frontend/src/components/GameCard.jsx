import { useState } from 'react';
import { Link } from 'react-router-dom';
import { genreLabel } from '../utils/gameLabels';
import { gameSource, gameDate } from '../utils/gameSource';

export default function GameCard({ game, action }) {
  const [failedImage, setFailedImage] = useState('');
  const source = gameSource(game);
  const released = gameDate(game.releaseDate);
  return (
    <article className="game-card">
      <Link
        className="card-image-link"
        to={'/games/' + game.id}
        aria-label={'ดูรายละเอียด ' + game.title}
      >
        {game.imageUrl && failedImage !== game.imageUrl ? (
          <img
            src={game.imageUrl}
            alt={game.title}
            loading="lazy"
            onError={() => setFailedImage(game.imageUrl)}
          />
        ) : (
          <div className="placeholder" aria-label="ไม่มีภาพเกม">
            ไม่มีภาพเกม
          </div>
        )}
      </Link>
      <div className="card-body">
        <h2>
          <Link to={'/games/' + game.id}>{game.title}</Link>
        </h2>
        <p className="card-genres">{game.genres.map(genreLabel).join(' / ') || 'ไม่ระบุแนว'}</p>
        {game.matchScore > 0 && (
          <strong className="score">ตรงกับความชอบ {game.matchScore}/100</strong>
        )}
        {game.reasons?.map((x) => (
          <p className="reason" key={x}>
            {x}
          </p>
        ))}
        <p className="muted">{game.platforms.join(' · ') || 'ยังไม่มีข้อมูลแพลตฟอร์ม'}</p>
        {released && (
          <p className="muted">
            วางจำหน่าย <time dateTime={game.releaseDate}>{released}</time>
          </p>
        )}
        {source && (
          <a className="source-link" href={source.href} target="_blank" rel="noreferrer">
            ข้อมูลและภาพจาก {source.name} ↗
          </a>
        )}
        {action}
      </div>
    </article>
  );
}
