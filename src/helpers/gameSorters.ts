import { Game } from '../types';
import { getEffectiveDeadline } from './dateFormatter';

// Sort unmet games by effective deadline, with fallback to ask count
export const sortUnmetGames = (games: Game[]): Game[] => {
  const filtered = games.filter((g: Game) => !g.trashed);

  const gamesWithEffectiveDeadline = filtered.filter((g: Game) => getEffectiveDeadline(g));
  const gamesWithoutEffectiveDeadline = filtered.filter((g: Game) => !getEffectiveDeadline(g));

  gamesWithEffectiveDeadline.sort((a: Game, b: Game) => {
    const t1 = getEffectiveDeadline(a)?.getTime() ?? Infinity;
    const t2 = getEffectiveDeadline(b)?.getTime() ?? Infinity;
    return t1 - t2;
  });

  gamesWithoutEffectiveDeadline.sort((a: Game, b: Game) => b.asks.length - a.asks.length);

  return [...gamesWithEffectiveDeadline, ...gamesWithoutEffectiveDeadline];
}; 