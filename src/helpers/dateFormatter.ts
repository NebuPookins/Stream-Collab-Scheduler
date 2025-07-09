import { DateFormatOption } from '../types';
import { formatDistanceToNow } from 'date-fns';

export function formatDate(date: Date, format: DateFormatOption): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // getMonth() is zero-based
  const day = date.getDate();

  const pad = (num: number) => num.toString().padStart(2, '0');

  switch (format) {
    case "YYYY-MM-DD":
      return `${year}-${pad(month)}-${pad(day)}`;
    case "MM/DD/YYYY":
      return `${pad(month)}/${pad(day)}/${year}`;
    case "DD/MM/YYYY":
      return `${pad(day)}/${pad(month)}/${year}`;
    case "Month Day, Year":
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    default:
      // Fallback to ISO format if something unexpected is passed
      return `${year}-${pad(month)}-${pad(day)}`;
  }
}

export function getDatePickerFormat(format: DateFormatOption): string {
  switch (format) {
    case "YYYY-MM-DD":
      return "yyyy-MM-dd";
    case "MM/DD/YYYY":
      return "MM/dd/yyyy";
    case "DD/MM/YYYY":
      return "dd/MM/yyyy";
    case "Month Day, Year":
      return "MMMM d, yyyy";
    default:
      return "yyyy-MM-dd"; // Default fallback
  }
}

export function formatScheduledTimes(scheduledTimes: Date[] | undefined, dateFormat: DateFormatOption): string {
  if (!scheduledTimes || scheduledTimes.length === 0) {
    return '';
  } else if (scheduledTimes.length === 1) {
    return `${formatDate(scheduledTimes[0], dateFormat)} (${formatDistanceToNow(scheduledTimes[0], { addSuffix: true })})`;
  } else {
    const maxDate = new Date(Math.max(...scheduledTimes.map(d => d.getTime())));
    return `${scheduledTimes.length} scheduled times, latest: ${formatDate(maxDate, dateFormat)} (${formatDistanceToNow(maxDate, { addSuffix: true })})`;
  }
}
