const genres = {
  action: 'แอ็กชัน',
  adventure: 'ผจญภัย',
  rpg: 'RPG',
  strategy: 'วางแผน',
  simulation: 'จำลองสถานการณ์',
  puzzle: 'พัซเซิล',
  sports: 'กีฬา',
  racing: 'แข่งรถ',
};

export function genreLabel(slug) {
  return genres[slug] || slug.replace(/-/g, ' ');
}
