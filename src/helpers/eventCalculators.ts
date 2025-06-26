// src/helpers/eventCalculators.ts
import { Partner, Game, AskRecord } from '../types';

export interface PendingEvent {
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
            pendingEvents.push({ gameName: game.name, status: 'Streaming' });
          } else if (!ask.response) { // Check for blank response
            pendingEvents.push({ gameName: game.name, status: 'Asking' });
          }
        }
      });
    }
  });

  return pendingEvents;
};
