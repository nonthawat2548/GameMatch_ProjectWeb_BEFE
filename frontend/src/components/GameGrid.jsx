import GameCard from './GameCard';
export default function GameGrid({ games, action, emptyText }) {
  if (!games.length)
    return (
      <p className="empty">
        {emptyText || 'ยังไม่มีเกมที่ตรงเงื่อนไข ลองเปลี่ยนตัวเลือกหรือกลับมาดูใหม่'}
      </p>
    );
  return (
    <div className="game-grid">
      {games.map((game) => (
        <GameCard key={game.id} game={game} action={action?.(game)} />
      ))}
    </div>
  );
}
