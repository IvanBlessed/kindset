import type { Player } from '@/data/types';

/** Example players for the browser preview. Inside Telegram the app shows real players. */

export const SAMPLE_PLAYERS: Player[] = [
  { id: 'p1', name: 'Emre Kaya', level: 4.4, langs: 'TR EN' },
  { id: 'p2', name: 'Anna Sokolova', level: 3.8, langs: 'RU EN' },
  { id: 'p3', name: 'Mert Yıldız', level: 3.6, langs: 'TR' },
  { id: 'p4', name: 'Oleh Bondar', level: 4.1, langs: 'UA RU' },
  { id: 'p5', name: 'Selin Aydın', level: 2.9, langs: 'TR EN' },
  { id: 'p6', name: 'Jake Morgan', level: 3.3, langs: 'EN' },
  { id: 'p7', name: 'Dmitry Volkov', level: 4.6, langs: 'RU' },
  { id: 'p8', name: 'Zeynep Arslan', level: 2.4, langs: 'TR EN' },
  { id: 'p9', name: 'Kateryna Melnyk', level: 3.0, langs: 'UA EN' },
  { id: 'p10', name: 'Burak Şahin', level: 3.9, langs: 'TR' },
  { id: 'p11', name: 'Sophie Clarke', level: 2.7, langs: 'EN' },
  { id: 'p12', name: 'Artem Lebedev', level: 3.4, langs: 'RU EN' },
  { id: 'p13', name: 'Elif Demir', level: 2.2, langs: 'TR RU' },
  { id: 'p14', name: 'Maksym Koval', level: 3.7, langs: 'UA RU' },
  { id: 'p15', name: 'Lena Fischer', level: 3.2, langs: 'EN' },
];

/** Season points and weeks attended before tonight (weeks 1–2). */
export const PAST_SEASON: Record<string, { points: number; weeks: number }> = {
  p7: { points: 58, weeks: 2 }, p1: { points: 55, weeks: 2 }, p4: { points: 51, weeks: 2 },
  p2: { points: 47, weeks: 2 }, p10: { points: 44, weeks: 2 }, p14: { points: 43, weeks: 2 },
  p3: { points: 40, weeks: 2 }, p12: { points: 38, weeks: 2 }, me: { points: 36, weeks: 2 },
  p6: { points: 33, weeks: 2 }, p15: { points: 31, weeks: 2 }, p9: { points: 29, weeks: 2 },
  p5: { points: 26, weeks: 2 }, p11: { points: 22, weeks: 1 }, p8: { points: 18, weeks: 1 },
  p13: { points: 15, weeks: 1 },
};

export const LAST_AWARDS = { winner: 'p7', newbie: 'p11', spirit: 'p9' };
