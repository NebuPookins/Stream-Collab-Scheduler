import { Store } from '../types';

export const getAllUniqueTags = (store: Store): string[] => {
  const allTags = new Set<string>();

  store.games.forEach(game => {
    game.tags?.forEach(tag => allTags.add(tag));
  });

  store.partners.forEach(partner => {
    partner.lovesTags?.forEach(tag => allTags.add(tag));
    partner.hatesTags?.forEach(tag => allTags.add(tag));
  });

  return Array.from(allTags).sort();
};
