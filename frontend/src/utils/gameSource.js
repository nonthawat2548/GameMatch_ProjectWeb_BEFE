export function gameSource(game) {
  if (Number.isSafeInteger(game.steamId) && game.steamId > 0)
    return { name: 'Steam', href: `https://store.steampowered.com/app/${game.steamId}/` };
  if (Number.isSafeInteger(game.rawgId) && game.rawgId > 0)
    return { name: 'RAWG', href: `https://rawg.io/games/${game.rawgId}` };
  return null;
}

export function gameDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return '';
  const date = new Date(value + 'T00:00:00Z');
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return '';
  return new Intl.DateTimeFormat('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}
