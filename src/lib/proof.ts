/** URL the browser uses to show a proof screenshot (served behind login). */
export function proofUrl(key: string): string {
  return `/api/proof?key=${encodeURIComponent(key)}`;
}
