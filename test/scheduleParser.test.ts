import { isPartnerAvailable } from '../src/helpers/scheduleParser';

describe('isPartnerAvailable', () => {
  it('should return false for a partner only available on mon or sun when checking a Friday', () => {
    // 2025-06-20 is a Friday
    const schedule = 'mon or sun';
    const date = new Date('2025-06-20T18:00:00');
    expect(isPartnerAvailable(schedule, date)).toBe(false);
  });

  it('should return true for a partner available on mon or sun when checking a Monday', () => {
    // 2025-06-16 is a Monday
    const schedule = 'mon or sun';
    const date = new Date('2025-06-16T18:00:00');
    expect(isPartnerAvailable(schedule, date)).toBe(true);
  });

  it('should return true for a partner available on mon or sun when checking a Sunday', () => {
    // 2025-07-20 is a Sunday
    const schedule = 'mon or sun';
    const date = new Date('2025-07-20T18:00:00');
    expect(isPartnerAvailable(schedule, date)).toBe(true);
  });
}); 