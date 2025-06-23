import { DateFormatOption } from '../types';

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
