/**
 * Formats seconds into MM:SS format.
 * Examples:
 * 65 -> "01:05"
 * 9  -> "00:09"
 * 120 -> "02:00"
 */
export function formatTime(totalSeconds: number): string {
  if (totalSeconds < 0) totalSeconds = 0;
  
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  
  const mStr = m < 10 ? `0${m}` : `${m}`;
  const sStr = s < 10 ? `0${s}` : `${s}`;
  
  return `${mStr}:${sStr}`;
}