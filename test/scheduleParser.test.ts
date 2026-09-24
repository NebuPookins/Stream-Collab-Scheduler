import { isPartnerAvailable, getScheduleDescription } from '../src/helpers/scheduleParser';

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

  it('should respect "between 9pm and 11pm"', () => {
    const schedule = 'between 9pm and 11pm';
    expect(isPartnerAvailable(schedule, new Date('2025-06-16T22:00:00'))).toBe(true);
    expect(isPartnerAvailable(schedule, new Date('2025-06-16T18:00:00'))).toBe(false);
  });

  it('should handle an overnight range like "between 10pm and 2am"', () => {
    const schedule = 'between 10pm and 2am';
    expect(isPartnerAvailable(schedule, new Date('2025-06-16T23:00:00'))).toBe(true);
    expect(isPartnerAvailable(schedule, new Date('2025-06-16T01:00:00'))).toBe(true);
    expect(isPartnerAvailable(schedule, new Date('2025-06-16T12:00:00'))).toBe(false);
  });

  it('should combine a "between" range with another condition via "and"', () => {
    const schedule = 'between 9pm and 11pm and not friday';
    // 2025-06-16 is a Monday, 2025-06-20 is a Friday
    expect(isPartnerAvailable(schedule, new Date('2025-06-16T22:00:00'))).toBe(true);
    expect(isPartnerAvailable(schedule, new Date('2025-06-20T22:00:00'))).toBe(false);
    expect(isPartnerAvailable(schedule, new Date('2025-06-16T18:00:00'))).toBe(false);
  });

  it('should apply a leading "not" only to its own operand of "and"', () => {
    const schedule = 'not friday and after 9pm';
    // 2025-06-16 is a Monday, 2025-06-20 is a Friday
    expect(isPartnerAvailable(schedule, new Date('2025-06-16T22:00:00'))).toBe(true);
    expect(isPartnerAvailable(schedule, new Date('2025-06-16T15:00:00'))).toBe(false);
    expect(isPartnerAvailable(schedule, new Date('2025-06-20T22:00:00'))).toBe(false);
  });

  it('should apply a leading "not" only to its own operand of "or"', () => {
    const schedule = 'not weekdays or after 9pm';
    // 2025-06-16 is a Monday, 2025-06-21 is a Saturday
    expect(isPartnerAvailable(schedule, new Date('2025-06-21T12:00:00'))).toBe(true);
    expect(isPartnerAvailable(schedule, new Date('2025-06-16T22:00:00'))).toBe(true);
    expect(isPartnerAvailable(schedule, new Date('2025-06-16T12:00:00'))).toBe(false);
  });

  it('should treat an incomplete "between 9pm" as an invalid schedule', () => {
    // Unparseable schedules mean always available rather than crashing
    expect(isPartnerAvailable('between 9pm', new Date('2025-06-16T12:00:00'))).toBe(true);
    expect(getScheduleDescription('between 9pm')).toBe('Invalid schedule format');
  });
});

describe('getScheduleDescription', () => {
  it('should describe a "between" schedule with both times', () => {
    expect(getScheduleDescription('between 9pm and 11pm')).toBe('between 9 PM and 11 PM');
  });
});
