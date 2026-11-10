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
