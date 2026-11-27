import { isDeadlineApproaching } from '../src/helpers/dateFormatter';
import { DAY_MS } from '../src/helpers/storeUtils';

const now = new Date('2026-11-27T12:00:00.000Z');
const daysFromNow = (days: number) => new Date(now.getTime() + days * DAY_MS);

describe('isDeadlineApproaching', () => {
  it('is true when the deadline is less than the warning period away', () => {
    expect(isDeadlineApproaching({ deadline: daysFromNow(29) }, now, 30)).toBe(true);
  });

  it('is false when the deadline is at least the warning period away', () => {
    expect(isDeadlineApproaching({ deadline: daysFromNow(30) }, now, 30)).toBe(false);
    expect(isDeadlineApproaching({ deadline: daysFromNow(90) }, now, 30)).toBe(false);
  });

  it('is true when the deadline has already passed', () => {
    expect(isDeadlineApproaching({ deadline: daysFromNow(-5) }, now, 30)).toBe(true);
  });

  it('is false when there is no deadline and nothing scheduled', () => {
    expect(isDeadlineApproaching({}, now, 30)).toBe(false);
    expect(isDeadlineApproaching({ scheduledTimes: [] }, now, 30)).toBe(false);
  });

  it('uses the effective deadline: a stream scheduled soon makes a distant deadline approaching', () => {
    expect(isDeadlineApproaching({ deadline: daysFromNow(90), scheduledTimes: [daysFromNow(7)] }, now, 30)).toBe(true);
  });

  it('uses a scheduled time when there is no deadline', () => {
    expect(isDeadlineApproaching({ scheduledTimes: [daysFromNow(7)] }, now, 30)).toBe(true);
    expect(isDeadlineApproaching({ scheduledTimes: [daysFromNow(60)] }, now, 30)).toBe(false);
  });

  it('respects a custom warning period', () => {
    expect(isDeadlineApproaching({ deadline: daysFromNow(10) }, now, 7)).toBe(false);
    expect(isDeadlineApproaching({ deadline: daysFromNow(5) }, now, 7)).toBe(true);
  });
});
