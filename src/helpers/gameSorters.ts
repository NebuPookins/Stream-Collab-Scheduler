import { Game } from '../types';

export const sortUnmetGames = (games: Game[]): Game[] => {
  const gamesWithDeadline = games.filter(g => g.deadline);
  const gamesWithoutDeadline = games.filter(g => !g.deadline);

  gamesWithDeadline.sort((a, b) => {
    const t1 = a.deadline?.getTime() ?? Infinity;
    const t2 = b.deadline?.getTime() ?? Infinity;
    return t1 - t2;
  });

  gamesWithoutDeadline.sort((a, b) => b.asks.length - a.asks.length);

  return [...gamesWithDeadline, ...gamesWithoutDeadline];
};
