import readingTime from "reading-time";

export function getReadingTime(content: string): number {
  return Math.ceil(readingTime(content).minutes);
}
