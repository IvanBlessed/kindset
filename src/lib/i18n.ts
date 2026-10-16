export type Lang = 'ru' | 'tr' | 'en';
export const LANGS: Lang[] = ['ru', 'tr', 'en'];

const en = {
  events: 'Events', live: 'Live', ranking: 'Ranking', me: 'Me',
  tagline: 'Play padel. Do good.',
  next: 'Next padel night', spots: 'spots taken', join: 'Join this night', leave: 'Cancel my spot',
  joinWait: 'Join waitlist', youreIn: "You're in", onWait: "You're on the waitlist, #",
  players: 'Players', waitlist: 'Waitlist', round: 'Round', court: 'Court', resting: 'Resting this round',
  start: 'Start Mexicano', startHint: 'Needs at least 8 players. Round 1 pairs by level, then by points.',
  nextRound: 'Next round', finishHint: "Save every court's score to unlock the next round.",
  save: 'Save score', edit: 'Edit', saved: 'Saved', tonight: 'Tonight', pts: 'Pts', games: 'Games', wk: 'Wks',
  season: 'Season ranking', finals: 'Top 8 qualify for the season final',
  awards: "Last week's awards", winner: 'Winner', newbie: 'Best newbie', spirit: 'Spirit of the game',
  vote: 'Vote: spirit of tonight', voteHint: 'Tap one player. You can change your vote until the awards.',
  level: 'Level', languages: 'Languages', rank: 'Season rank', organizer: 'Organizer mode',
  organizerHint: 'Create rounds and enter scores', reset: "Reset tonight's event",
  resetAsk: 'Delete all rounds and scores for tonight?', yes: 'Yes, reset', no: 'Keep',
  notStarted: "Tonight's event hasn't started yet.", waitOrganizer: "The organizer starts the event. You'll see your court here.",
  yourCourt: 'Your court', youRest: 'You rest this round', sample: 'Example players',
  preview: 'Browser preview. Open in Telegram for your real account.',
  localNote: 'Data is saved on this phone until the shared server is connected.',
  raised: 'Raised for charity this season',
};
type Dict = typeof en;

const ru: Dict = {
  events: 'События', live: 'Игра', ranking: 'Рейтинг', me: 'Я',
  tagline: 'Играй в падел. Делай добро.',
  next: 'Следующий падел-вечер', spots: 'мест занято', join: 'Записаться', leave: 'Отменить запись',
  joinWait: 'В лист ожидания', youreIn: 'Вы записаны', onWait: 'Вы в листе ожидания, №',
  players: 'Игроки', waitlist: 'Лист ожидания', round: 'Раунд', court: 'Корт', resting: 'Отдыхают в этом раунде',
  start: 'Начать Mexicano', startHint: 'Нужно минимум 8 игроков. Раунд 1 — пары по уровню, дальше по очкам.',
  nextRound: 'Следующий раунд', finishHint: 'Сохраните счёт на всех кортах, чтобы открыть следующий раунд.',
  save: 'Сохранить счёт', edit: 'Изменить', saved: 'Сохранено', tonight: 'Сегодня', pts: 'Очки', games: 'Игры', wk: 'Нед',
  season: 'Рейтинг сезона', finals: 'Топ-8 выходят в финал сезона',
  awards: 'Награды прошлой недели', winner: 'Победитель', newbie: 'Лучший новичок', spirit: 'Дух игры',
  vote: 'Голосование: дух вечера', voteHint: 'Выберите одного игрока. Голос можно менять до награждения.',
  level: 'Уровень', languages: 'Языки', rank: 'Место в сезоне', organizer: 'Режим организатора',
  organizerHint: 'Создавать раунды и вносить счёт', reset: 'Сбросить сегодняшний вечер',
  resetAsk: 'Удалить все раунды и счёт за сегодня?', yes: 'Да, сбросить', no: 'Оставить',
  notStarted: 'Сегодняшний вечер ещё не начался.', waitOrganizer: 'Организатор запустит игру. Здесь появится ваш корт.',
  yourCourt: 'Ваш корт', youRest: 'Вы отдыхаете в этом раунде', sample: 'Пример игроков',
  preview: 'Просмотр в браузере. Откройте в Telegram для своего аккаунта.',
  localNote: 'Данные сохраняются на этом телефоне, пока не подключён общий сервер.',
  raised: 'Собрано на благотворительность за сезон',
};

const tr: Dict = {
  events: 'Etkinlik', live: 'Canlı', ranking: 'Sıralama', me: 'Ben',
  tagline: 'Padel oyna. İyilik yap.',
  next: 'Sıradaki padel gecesi', spots: 'yer dolu', join: 'Katıl', leave: 'Kaydımı iptal et',
  joinWait: 'Bekleme listesine gir', youreIn: 'Kayıtlısın', onWait: 'Bekleme listesindesin, #',
  players: 'Oyuncular', waitlist: 'Bekleme listesi', round: 'Tur', court: 'Kort', resting: 'Bu tur dinlenenler',
  start: "Mexicano'yu başlat", startHint: 'En az 8 oyuncu gerekir. 1. tur seviyeye, sonra puana göre eşleşir.',
  nextRound: 'Sonraki tur', finishHint: 'Sonraki tur için tüm kortların skorunu kaydet.',
  save: 'Skoru kaydet', edit: 'Düzenle', saved: 'Kaydedildi', tonight: 'Bu gece', pts: 'Puan', games: 'Maç', wk: 'Hft',
  season: 'Sezon sıralaması', finals: 'İlk 8 sezon finaline kalır',
  awards: 'Geçen haftanın ödülleri', winner: 'Kazanan', newbie: 'En iyi yeni oyuncu', spirit: 'Oyun ruhu',
  vote: 'Oy ver: gecenin oyun ruhu', voteHint: 'Bir oyuncuya dokun. Ödüllere kadar oyunu değiştirebilirsin.',
  level: 'Seviye', languages: 'Diller', rank: 'Sezon sırası', organizer: 'Organizatör modu',
  organizerHint: 'Tur oluştur ve skor gir', reset: 'Bu geceyi sıfırla',
  resetAsk: 'Bu gecenin tüm tur ve skorları silinsin mi?', yes: 'Evet, sıfırla', no: 'Vazgeç',
  notStarted: 'Bu gecenin etkinliği henüz başlamadı.', waitOrganizer: 'Organizatör oyunu başlatınca kortun burada görünecek.',
  yourCourt: 'Senin kortun', youRest: 'Bu tur dinleniyorsun', sample: 'Örnek oyuncular',
  preview: "Tarayıcı önizlemesi. Kendi hesabın için Telegram'da aç.",
  localNote: 'Ortak sunucu bağlanana kadar veriler bu telefonda saklanır.',
  raised: 'Bu sezon hayır için toplanan',
};

export const DICT: Record<Lang, Dict> = { en, ru, tr };
export type Key = keyof Dict;

export function detectLang(code?: string): Lang {
  const c = (code ?? '').slice(0, 2);
  if (c === 'tr') return 'tr';
  if (c === 'ru' || c === 'uk' || c === 'be' || c === 'kk') return 'ru';
  return 'en';
}
