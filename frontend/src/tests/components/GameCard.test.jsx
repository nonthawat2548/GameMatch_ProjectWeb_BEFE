import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import GameCard from '../../components/GameCard';

test('keeps an accessible placeholder and RAWG source link when an image fails', () => {
  render(
    <MemoryRouter>
      <GameCard
        game={{
          id: 1,
          rawgId: 123,
          title: 'Demo: Card',
          imageUrl: 'https://example.com/broken.jpg',
          genres: [],
          platforms: [],
        }}
      />
    </MemoryRouter>,
  );
  fireEvent.error(screen.getByRole('img', { name: 'Demo: Card' }));
  expect(screen.getByLabelText('ไม่มีภาพเกม')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /ข้อมูลและภาพจาก RAWG/ })).toHaveAttribute(
    'href',
    'https://rawg.io/games/123',
  );
});

test('shows the supplied Steam image, source and verified release date', () => {
  render(
    <MemoryRouter>
      <GameCard
        game={{
          id: 2,
          steamId: 5427130,
          title: 'Demo: Steam fixture',
          imageUrl: 'https://cdn.steamstatic.com/cover.jpg',
          releaseDate: '2026-11-09',
          genres: ['action'],
          platforms: ['Windows'],
        }}
      />
    </MemoryRouter>,
  );
  expect(screen.getByRole('img', { name: 'Demo: Steam fixture' })).toHaveAttribute(
    'src',
    'https://cdn.steamstatic.com/cover.jpg',
  );
  expect(screen.getByRole('link', { name: /ข้อมูลและภาพจาก Steam/ })).toHaveAttribute(
    'href',
    'https://store.steampowered.com/app/5427130/',
  );
  expect(document.querySelector('time')).toHaveAttribute('datetime', '2026-11-09');
  expect(screen.queryByRole('link', { name: /ข้อมูลและภาพจาก RAWG/ })).not.toBeInTheDocument();
});
