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
    'monday': 1, 'mon': 1,
    'tuesday': 2, 'tue': 2, 'tues': 2,
    'wednesday': 3, 'wed': 3,
    'thursday': 4, 'thu': 4, 'thurs': 4,
    'friday': 5, 'fri': 5,
    'saturday': 6, 'sat': 6,
    'sunday': 0, 'sun': 0,
    'weekday': -1, 'weekdays': -1,
    'weekend': -2, 'weekends': -2
  };

  private static timeKeywords: { [key: string]: string } = {
    'before': 'before',
    'after': 'after',
    'until': 'until',
    'from': 'from',
    'between': 'between',
    'am': 'am',
    'pm': 'pm'
  };

  static parse(scheduleText: string): ScheduleRule | null {
    if (!scheduleText || scheduleText.trim() === '') {
      return null;
    }

    const tokens = this.tokenize(scheduleText.toLowerCase());
    return this.parseTokens(tokens);
  }

  private static tokenize(text: string): string[] {
    // Split by commas, spaces, and other delimiters while preserving quoted strings
    return text
      .split(/[,\s]+/)
      .map(token => token.trim())
      .filter(token => token.length > 0);
  }

  private static parseTokens(tokens: string[]): ScheduleRule | null {
    if (tokens.length === 0) return null;

    // Handle "not" expressions
    if (tokens[0] === 'not') {
      const remainingTokens = tokens.slice(1);
      const innerRule = this.parseTokens(remainingTokens);
      if (innerRule) {
        return { type: 'not', rules: [innerRule] };
      }
    }

    // Handle "and" expressions
    const andIndex = tokens.findIndex(token => token === 'and');
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

    // Handle day expressions
    const dayRule = this.parseDayExpression(tokens);
    if (dayRule) return dayRule;

    // Handle time expressions
    const timeRule = this.parseTimeExpression(tokens);
    if (timeRule) return timeRule;

    // Handle day-time combinations
    const dayTimeRule = this.parseDayTimeExpression(tokens);
    if (dayTimeRule) return dayTimeRule;

    return null;
  }

  private static parseDayExpression(tokens: string[]): ScheduleRule | null {
    const days: number[] = [];
    
    for (const token of tokens) {
      if (token in this.dayMap) {
        const dayValue = this.dayMap[token];
        if (dayValue === -1) {
          // weekdays
          days.push(1, 2, 3, 4, 5);
        } else if (dayValue === -2) {
          // weekends
          days.push(0, 6);
        } else {
          days.push(dayValue);
        }
      }
    }

    if (days.length > 0) {
      return { type: 'day', value: days.join(',') };
    }

    return null;
  }

  private static parseTimeExpression(tokens: string[]): ScheduleRule | null {
    if (tokens.length < 2) return null;

    const timeKeywords = ['before', 'after', 'until', 'from', 'between'];
    const timeKeyword = tokens.find(token => timeKeywords.includes(token));
    
    if (!timeKeyword) return null;

    const timeIndex = tokens.indexOf(timeKeyword);
    const timeValue = tokens[timeIndex + 1];
    
    if (!timeValue) return null;

    // Parse time value (e.g., "9pm", "5am", "14:30")
    const parsedTime = this.parseTimeValue(timeValue);
    if (parsedTime === null) return null;

    if (timeKeyword === 'between' && tokens[timeIndex + 2] === 'and') {
      const endTimeValue = tokens[timeIndex + 3];
      if (!endTimeValue) return null;
      
      const endTime = this.parseTimeValue(endTimeValue);
      if (endTime === null) return null;

      return {
        type: 'time',
        value: `between-${parsedTime}-${endTime}`
      };
    }

    return {
      type: 'time',
      value: `${timeKeyword}-${parsedTime}`
    };
  }

  private static parseDayTimeExpression(tokens: string[]): ScheduleRule | null {
    // Look for patterns like "9am-5pm weekdays" or "weekends after 9pm"
    const timeRangeMatch = tokens.join(' ').match(/(\d{1,2}(?::\d{2})?(?:am|pm)?)\s*-\s*(\d{1,2}(?::\d{2})?(?:am|pm)?)/);
    
    if (timeRangeMatch) {
      const startTime = this.parseTimeValue(timeRangeMatch[1]);
      const endTime = this.parseTimeValue(timeRangeMatch[2]);
      
      if (startTime !== null && endTime !== null) {
        const remainingTokens = tokens.filter(token => 
          !timeRangeMatch[0].includes(token)
        );
        
        const dayRule = this.parseDayExpression(remainingTokens);
        if (dayRule) {
          return {
            type: 'dayTime',
            value: `${startTime}-${endTime}`,
            rules: [dayRule]
          };
        }
      }
    }

    return null;
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
    const [operator, timeStr] = rule.value.split('-', 2);
    
    if (operator === 'between') {
      const [startTime, endTime] = timeStr.split('-');
      const startMinutes = this.timeStringToMinutes(startTime);
      const endMinutes = this.timeStringToMinutes(endTime);
      
      if (startMinutes <= endMinutes) {
        return currentTime >= startMinutes && currentTime <= endMinutes;
      } else {
        // Handles cases like "between 10pm and 2am"
        return currentTime >= startMinutes || currentTime <= endMinutes;
      }
    }

    const targetMinutes = this.timeStringToMinutes(timeStr);
    
    switch (operator) {
      case 'before':
        return currentTime < targetMinutes;
      case 'after':
        return currentTime > targetMinutes;
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
  
  const [operator, timeStr] = rule.value.split('-', 2);
  
  if (operator === 'between') {
    const [startTime, endTime] = timeStr.split('-');
    return `between ${formatTimeForDisplay(startTime)} and ${formatTimeForDisplay(endTime)}`;
  }
  
  const timeDisplay = formatTimeForDisplay(timeStr);
  
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