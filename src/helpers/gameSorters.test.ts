import { Game, AskRecord } from '../types';
import { sortUnmetGames } from './gameSorters';

const createMockAskRecord = (): AskRecord => ({
  partnerId: '', // Using empty string for simplicity, adjust if needed
  askedOn: new Date(),
  confirmed: false,
});

const createMockGame = (id: string, deadline?: Date, askCount: number = 0): Game => ({
  id,
  name: `Game ${id}`,
  deadline,
  asks: Array(askCount).fill(null).map(() => createMockAskRecord()),
  desiredPartners: askCount + 1, // Ensure it's an unmet game
});

describe('sortUnmetGames', () => {
  it('should sort games with deadlines before games without deadlines', () => {
    const gameA = createMockGame('A', new Date(Date.now() + 1000 * 60 * 60 * 24)); // Deadline in 1 day
    const gameB = createMockGame('B'); // No deadline
    const games = [gameB, gameA];
    const sortedGames = sortUnmetGames(games);
    expect(sortedGames.map(g => g.id)).toEqual(['A', 'B']);
  });

  it('should sort games with earlier deadlines first', () => {
    const gameA = createMockGame('A', new Date(Date.now() + 1000 * 60 * 60 * 24 * 2)); // Deadline in 2 days
    const gameB = createMockGame('B', new Date(Date.now() + 1000 * 60 * 60 * 24 * 1)); // Deadline in 1 day
    const games = [gameA, gameB];
    const sortedGames = sortUnmetGames(games);
    expect(sortedGames.map(g => g.id)).toEqual(['B', 'A']);
  });

  it('should sort games without deadlines by number of AskRecords in descending order', () => {
    const gameA = createMockGame('A', undefined, 1);
    const gameB = createMockGame('B', undefined, 3);
    const gameC = createMockGame('C', undefined, 2);
    const games = [gameA, gameB, gameC];
    const sortedGames = sortUnmetGames(games);
    expect(sortedGames.map(g => g.id)).toEqual(['B', 'C', 'A']);
  });

  it('should handle a mix of games with and without deadlines', () => {
    const gameA = createMockGame('A', undefined, 1);
    const gameB = createMockGame('B', new Date(Date.now() + 1000 * 60 * 60 * 24 * 1), 3); // Deadline in 1 day
    const gameC = createMockGame('C', undefined, 2);
    const gameD = createMockGame('D', new Date(Date.now() + 1000 * 60 * 60 * 24 * 2), 0); // Deadline in 2 days
    const gameE = createMockGame('E', undefined, 5);

    const games = [gameA, gameB, gameC, gameD, gameE];
    const sortedGames = sortUnmetGames(games);
    // Expected: B (deadline), D (deadline), E (no deadline, 5 asks), C (no deadline, 2 asks), A (no deadline, 1 ask)
    expect(sortedGames.map(g => g.id)).toEqual(['B', 'D', 'E', 'C', 'A']);
  });

  it('should maintain order for games without deadlines if ask counts are equal (original order)', () => {
    const gameA = createMockGame('A', undefined, 2);
    const gameB = createMockGame('B', undefined, 2);
    const games = [gameA, gameB];
    const sortedGames = sortUnmetGames(games);
    expect(sortedGames.map(g => g.id)).toEqual(['A', 'B']); // Or ['B', 'A'] - sort is stable
  });

  it('should handle games with no AskRecords', () => {
    const gameA = createMockGame('A', undefined, 0);
    const gameB = createMockGame('B', undefined, 2);
    const games = [gameA, gameB];
    const sortedGames = sortUnmetGames(games);
    expect(sortedGames.map(g => g.id)).toEqual(['B', 'A']);
  });

  it('should handle an empty array', () => {
    const games: Game[] = [];
    const sortedGames = sortUnmetGames(games);
    expect(sortedGames).toEqual([]);
  });

  it('should correctly sort games where some have deadlines and asks, others have no deadlines and asks', () => {
    const gameA = createMockGame('A', new Date(Date.now() + 1000 * 60 * 60 * 24 * 1), 2); // Deadline, 2 asks
    const gameB = createMockGame('B', undefined, 3); // No deadline, 3 asks
    const gameC = createMockGame('C', new Date(Date.now() + 1000 * 60 * 60 * 24 * 2), 1); // Deadline, 1 ask
    const gameD = createMockGame('D', undefined, 1); // No deadline, 1 ask
    const games = [gameA, gameB, gameC, gameD];
    const sortedGames = sortUnmetGames(games);
    // Expected: A (deadline), C (deadline), B (no deadline, 3 asks), D (no deadline, 1 ask)
    expect(sortedGames.map(g => g.id)).toEqual(['A', 'C', 'B', 'D']);
  });
});
