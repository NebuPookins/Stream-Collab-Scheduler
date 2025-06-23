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

export const calculateGameScoreForPartner = (
  gameTags: string[] | undefined,
  partnerLovesTags: string[] | undefined,
  partnerHatesTags: string[] | undefined
): number => {
  if (!gameTags || gameTags.length === 0) return 0;
  let score = 0;
  gameTags.forEach(tag => {
    if (partnerLovesTags?.includes(tag)) score++;
    if (partnerHatesTags?.includes(tag)) score--;
  });
  return score;
};
