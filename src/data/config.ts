/**
 * Chapter settings. Kindset is one brand with many city chapters; each chapter
 * only changes this block (later this comes from the database).
 */
export const CHAPTER = {
  slug: 'alanya',
  city: 'Alanya',
  venue: 'Mahmutlar',
  season: 1,
  week: 3,
  priceTry: 500,
  currency: '₺',
  capacity: 16,
  courts: 2,
  target: 21,
  /** ISO start of the next event, local time (Europe/Istanbul). */
  nextEvent: '2026-10-16T18:00:00+03:00',
  durationMin: 120,
  sponsor: 'Bereket',
  /** Charity raised this season, shown on the ranking screen. Example figure. */
  raisedTry: 12500,
};
