// Domain-specific language for partner availability schedules
// Examples:
// "not friday" - Not available on Fridays
// "after 9pm" - Only available after 9 PM
// "weekends only" - Only available on weekends
// "not monday,wednesday" - Not available on Mondays and Wednesdays
// "before 5pm and not weekend" - Available before 5 PM but not on weekends
// "9am-5pm weekdays" - Available 9 AM to 5 PM on weekdays

export interface ScheduleRule {
  type: 'day' | 'time' | 'dayTime' | 'not' | 'and' | 'or';
  value?: string;
  rules?: ScheduleRule[];
}

export class ScheduleParser {
  private static dayMap: { [key: string]: number } = {
    'monday': 1, 'mondays': 1, 'mon': 1,
    'tuesday': 2, 'tuesdays': 2, 'tue': 2, 'tues': 2,
    'wednesday': 3, 'wednesdays': 3, 'wed': 3,
    'thursday': 4, 'thursdays': 4, 'thu': 4, 'thurs': 4,
    'friday': 5, 'fridays': 5, 'fri': 5,
    'saturday': 6, 'saturdays': 6, 'sat': 6,
    'sunday': 0, 'sundays': 0, 'sun': 0,
    'weekday': -1, 'weekdays': -1,
    'weekend': -2, 'weekends': -2
  };

  static parse(scheduleText: string): ScheduleRule | null {
    if (!scheduleText || scheduleText.trim() === '') {
      return null;
    }

    const tokens = this.tokenize(scheduleText.toLowerCase());
    return this.parseTokens(tokens);
  }

  // Words that read naturally but carry no meaning, e.g. "weekends only" or
  // "after 9pm on fridays".
  private static fillerWords = new Set(['only', 'on']);

  private static tokenize(text: string): string[] {
    // Collapse spaces around "-" so "9am - 5pm" becomes the single range token
    // "9am-5pm", then split by commas and whitespace.
    return text
      .replace(/\s*-\s*/g, '-')
      .split(/[,\s]+/)
      .filter(token => token.length > 0 && !this.fillerWords.has(token));
  }

  private static parseTokens(tokens: string[]): ScheduleRule | null {
    if (tokens.length === 0) return null;

    // Handle "and" expressions. The "and" in "between X and Y" is a range
    // separator, not a conjunction, so it doesn't split the expression.
    const andIndex = tokens.findIndex((token, i) => token === 'and' && tokens[i - 2] !== 'between');
    if (andIndex !== -1) {
      const leftTokens = tokens.slice(0, andIndex);
      const rightTokens = tokens.slice(andIndex + 1);
      const leftRule = this.parseTokens(leftTokens);
      const rightRule = this.parseTokens(rightTokens);
      if (leftRule && rightRule) {
        return { type: 'and', rules: [leftRule, rightRule] };
      }
    }

    // Handle "or" expressions
    const orIndex = tokens.findIndex(token => token === 'or');
    if (orIndex !== -1) {
      const leftTokens = tokens.slice(0, orIndex);
      const rightTokens = tokens.slice(orIndex + 1);
      const leftRule = this.parseTokens(leftTokens);
      const rightRule = this.parseTokens(rightTokens);
      if (leftRule && rightRule) {
        return { type: 'or', rules: [leftRule, rightRule] };
      }
    }

    // Handle "not" expressions. This is checked after "and"/"or" so that "not"
    // binds tightest: "not friday and after 9pm" means "(not friday) and after 9pm".
    if (tokens[0] === 'not') {
      const innerRule = this.parseTokens(tokens.slice(1));
      return innerRule ? { type: 'not', rules: [innerRule] } : null;
    }

    return this.parseDayTimeExpression(tokens);
  }

  private static parseDayExpression(dayTokens: string[]): ScheduleRule {
    const days = dayTokens.flatMap(token => {
      const dayValue = this.dayMap[token];
      if (dayValue === -1) return [1, 2, 3, 4, 5]; // weekdays
      if (dayValue === -2) return [0, 6]; // weekends
      return [dayValue];
    });

    return { type: 'day', value: days.join(',') };
  }

  /**
   * Parses a complete time expression: "before|after|until|from <time>",
   * "between <time> and <time>", or a range token like "9am-5pm". Returns null
   * if any token is left unaccounted for.
   */
  private static parseTimeExpression(tokens: string[]): ScheduleRule | null {
    const [keyword, first, and, second] = tokens;

    if (tokens.length === 1) {
      const [start, end, ...rest] = keyword.split('-');
      if (end === undefined || rest.length > 0) return null;
      return this.betweenRule(start, end);
    }

    if (keyword === 'between') {
      return tokens.length === 4 && and === 'and' ? this.betweenRule(first, second) : null;
    }

    if (tokens.length !== 2 || !['before', 'after', 'until', 'from'].includes(keyword)) {
      return null;
    }

    const time = this.parseTimeValue(first);
    return time === null ? null : { type: 'time', value: `${keyword}-${time}` };
  }

  private static betweenRule(startText: string, endText: string): ScheduleRule | null {
    const start = this.parseTimeValue(startText);
    const end = this.parseTimeValue(endText);
    return start === null || end === null ? null : { type: 'time', value: `between-${start}-${end}` };
  }

  /**
   * Parses day names, a time expression, or both in either order, e.g.
   * "weekends", "after 9pm", "9am-5pm weekdays" or "weekends after 9pm".
   * Every token must be accounted for, so "friday after 9pm" doesn't silently
   * drop "after 9pm".
   */
  private static parseDayTimeExpression(tokens: string[]): ScheduleRule | null {
    const dayTokens = tokens.filter(token => token in this.dayMap);
    const timeTokens = tokens.filter(token => !(token in this.dayMap));

    if (timeTokens.length === 0) {
      return dayTokens.length === 0 ? null : this.parseDayExpression(dayTokens);
    }

    const timeRule = this.parseTimeExpression(timeTokens);
    if (!timeRule || dayTokens.length === 0) return timeRule;

    return { type: 'dayTime', value: timeRule.value, rules: [this.parseDayExpression(dayTokens)] };
  }

  private static parseTimeValue(timeStr: string): string | null {
    // Handle formats like "9pm", "5am", "14:30", "9:30pm"
    const timeMatch = timeStr.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
    
    if (!timeMatch) return null;

    let hour = parseInt(timeMatch[1]);
    const minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
    const period = timeMatch[3];

    if (period === 'pm' && hour !== 12) {
      hour += 12;
    } else if (period === 'am' && hour === 12) {
      hour = 0;
    }

    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      return null;
    }

    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  }
}

export class ScheduleEvaluator {
  static evaluate(rule: ScheduleRule | null, date: Date): boolean {
    if (!rule) return true; // No schedule rule means always available

    switch (rule.type) {
      case 'day':
        return this.evaluateDayRule(rule, date);
      case 'time':
        return this.evaluateTimeRule(rule, date);
      case 'dayTime':
        return this.evaluateDayTimeRule(rule, date);
      case 'not':
        return !this.evaluate(rule.rules![0], date);
      case 'and':
        return rule.rules!.every(r => this.evaluate(r, date));
      case 'or':
        return rule.rules!.some(r => this.evaluate(r, date));
      default:
        return true;
    }
  }

  private static evaluateDayRule(rule: ScheduleRule, date: Date): boolean {
    if (!rule.value) return true;
    
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const allowedDays = rule.value.split(',').map(d => parseInt(d));
    
    return allowedDays.includes(dayOfWeek);
  }

  private static evaluateTimeRule(rule: ScheduleRule, date: Date): boolean {
    if (!rule.value) return true;

    const currentTime = date.getHours() * 60 + date.getMinutes(); // minutes since midnight
    const [operator, startTime, endTime] = rule.value.split('-');

    if (operator === 'between') {
      const startMinutes = this.timeStringToMinutes(startTime);
      const endMinutes = this.timeStringToMinutes(endTime);
      
      if (startMinutes <= endMinutes) {
        return currentTime >= startMinutes && currentTime <= endMinutes;
      } else {
        // Handles cases like "between 10pm and 2am"
        return currentTime >= startMinutes || currentTime <= endMinutes;
      }
    }

    const targetMinutes = this.timeStringToMinutes(startTime);

    switch (operator) {
      case 'before':
        return currentTime < targetMinutes;
      case 'after':
        return currentTime >= targetMinutes;
      case 'until':
        return currentTime <= targetMinutes;
      case 'from':
        return currentTime >= targetMinutes;
      default:
        return true;
    }
  }

  private static evaluateDayTimeRule(rule: ScheduleRule, date: Date): boolean {
    if (!rule.rules || rule.rules.length === 0) return true;
    
    // Check if the day rule matches
    const dayMatches = this.evaluate(rule.rules[0], date);
    if (!dayMatches) return false;
    
    // Check if the time rule matches
    return this.evaluateTimeRule(rule, date);
  }

  private static timeStringToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(s => parseInt(s));
    return hours * 60 + (minutes || 0);
  }
}

// Helper function to check if a partner is available at a given time
export function isPartnerAvailable(scheduleText: string, date: Date): boolean {
  const rule = ScheduleParser.parse(scheduleText);
  return ScheduleEvaluator.evaluate(rule, date);
}

// Helper function to get a human-readable description of the schedule
export function getScheduleDescription(scheduleText: string): string {
  if (!scheduleText || scheduleText.trim() === '') {
    return 'Always available';
  }

  const rule = ScheduleParser.parse(scheduleText);
  if (!rule) {
    return 'Invalid schedule format';
  }

  return describeRule(rule);
}

function describeRule(rule: ScheduleRule): string {
  switch (rule.type) {
    case 'day':
      return describeDayRule(rule);
    case 'time':
      return describeTimeRule(rule);
    case 'dayTime':
      return describeDayTimeRule(rule);
    case 'not':
      return `Not ${describeRule(rule.rules![0])}`;
    case 'and':
      return rule.rules!.map(r => describeRule(r)).join(' and ');
    case 'or':
      return rule.rules!.map(r => describeRule(r)).join(' or ');
    default:
      return 'Unknown rule';
  }
}

function describeDayRule(rule: ScheduleRule): string {
  if (!rule.value) return 'any day';
  
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const days = rule.value.split(',').map(d => {
    const dayNum = parseInt(d);
    if (dayNum === -1) return 'weekdays';
    if (dayNum === -2) return 'weekends';
    return dayNames[dayNum];
  });
  
  return days.join(', ');
}

function describeTimeRule(rule: ScheduleRule): string {
  if (!rule.value) return 'any time';
  
  const [operator, startTime, endTime] = rule.value.split('-');

  if (operator === 'between') {
    return `between ${formatTimeForDisplay(startTime)} and ${formatTimeForDisplay(endTime)}`;
  }

  const timeDisplay = formatTimeForDisplay(startTime);
  
  switch (operator) {
    case 'before':
      return `before ${timeDisplay}`;
    case 'after':
      return `after ${timeDisplay}`;
    case 'until':
      return `until ${timeDisplay}`;
    case 'from':
      return `from ${timeDisplay}`;
    default:
      return timeDisplay;
  }
}

function describeDayTimeRule(rule: ScheduleRule): string {
  if (!rule.rules || rule.rules.length === 0) return 'any time';
  
  const dayDesc = describeRule(rule.rules[0]);
  const timeDesc = describeTimeRule(rule);
  
  return `${timeDesc} on ${dayDesc}`;
}

function formatTimeForDisplay(timeStr: string): string {
  const [hours, minutes] = timeStr.split(':').map(s => parseInt(s));
  const hour = hours % 12 || 12;
  const period = hours >= 12 ? 'PM' : 'AM';
  const minuteStr = minutes > 0 ? `:${minutes.toString().padStart(2, '0')}` : '';
  
  return `${hour}${minuteStr} ${period}`;
} 