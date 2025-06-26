// src/helpers/eventCalculators.ts
import { Partner, Game, AskRecord } from '../types';

export interface PendingEvent {
  gameId: string; // Added gameId
  gameName: string;
  status: 'Streaming' | 'Asking';
}

export const calculatePendingEvents = (partner: Partner, games: Game[]): PendingEvent[] => {
  const pendingEvents: PendingEvent[] = [];

  games.forEach((game) => {
    if (!game.done) {
      game.asks.forEach((ask) => {
        if (ask.partnerId === partner.id) {
          if (ask.confirmed) {
            pendingEvents.push({ gameId: game.id, gameName: game.name, status: 'Streaming' }); // Added game.id
          } else if (!ask.response) { // Check for blank response
            pendingEvents.push({ gameId: game.id, gameName: game.name, status: 'Asking' }); // Added game.id
          }
        }
      });
    }
  });

  return pendingEvents;
};
