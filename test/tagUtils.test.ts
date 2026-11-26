import { calculateGameScoreForPartner, getConflictingTags } from '../src/helpers/tagUtils';

describe('getConflictingTags', () => {
  it('returns tags present in both lists', () => {
    expect([...getConflictingTags(['A', 'B', 'C'], ['C', 'B', 'D'])].sort()).toEqual(['B', 'C']);
  });

  it('returns each conflicting tag once', () => {
    expect([...getConflictingTags(['B', 'A', 'B'], ['A', 'B', 'A'])].sort()).toEqual(['A', 'B']);
  });

  it('returns empty when there is no overlap', () => {
    expect(getConflictingTags(['A'], ['B'])).toEqual([]);
  });

  it('returns empty when either list is undefined or empty', () => {
    expect(getConflictingTags(undefined, ['A'])).toEqual([]);
    expect(getConflictingTags(['A'], undefined)).toEqual([]);
    expect(getConflictingTags(undefined, undefined)).toEqual([]);
    expect(getConflictingTags([], ['A'])).toEqual([]);
    expect(getConflictingTags(['A'], [])).toEqual([]);
  });
});

describe('calculateGameScoreForPartner with conflicting tags', () => {
  it('treats a tag in both loves and hates as in neither', () => {
    expect(calculateGameScoreForPartner(['A', 'B'], ['A', 'B'], ['B']))
      .toBe(calculateGameScoreForPartner(['A', 'B'], ['A'], []));
  });

  it('scores a game whose only tag is conflicting as zero', () => {
    expect(calculateGameScoreForPartner(['A'], ['A'], ['A'])).toBe(0);
  });
});
