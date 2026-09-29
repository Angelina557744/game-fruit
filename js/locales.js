export const LOCALES = {
  ru: {
    title: 'Фруктовый сад',
    score: 'Счёт',
    best: 'Рекорд',
    gameOver: 'Игра окончена',
    scoreLabel: 'Счёт:',
    continue: 'Убрать 4 плитки за рекламу',
    continueHint: 'Будут удалены 4 самые младшие плитки',
    newGame: 'Новая игра',
    records: 'Рекорды',
    undo: 'Отменить',
    restart: 'Заново',
    hint: 'Подсказка',
    hintEmptyTitle: 'Подсказки закончились',
    hintEmptyText: 'Посмотрите короткую рекламу, чтобы получить ещё 2 подсказки.',
    watchAd: 'Смотреть рекламу',
    close: 'Закрыть',
    loading: 'Загрузка...',
    noResults: 'Пока нет результатов',
    leaderboardUnavailable: 'Лидерборд доступен только на платформе Яндекс Игр',
    you: 'Вы',
    player: 'Игрок',
  },
  en: {
    title: 'Fruit Garden',
    score: 'Score',
    best: 'Best',
    gameOver: 'Game Over',
    scoreLabel: 'Score:',
    continue: 'Continue for ad',
    newGame: 'New Game',
    records: 'Records',
    undo: 'Undo',
    restart: 'Restart',
    hint: 'Hint',
    hintEmptyTitle: 'No hints left',
    hintEmptyText: 'Watch a short ad to get 2 more hints.',
    watchAd: 'Watch ad',
    close: 'Close',
    loading: 'Loading...',
    noResults: 'No results yet',
    leaderboardUnavailable: 'Leaderboard is available only on Yandex Games platform',
    you: 'You',
    player: 'Player',
  },
  tr: {
    title: 'Meyve Bahçesi',
    score: 'Puan',
    best: 'En İyi',
    gameOver: 'Oyun Bitti',
    scoreLabel: 'Puan:',
    continue: 'Remove 4 tiles for ad',
    continueHint: 'The 4 lowest tiles will be removed',
    newGame: 'Yeni Oyun',
    records: 'Kayıtlar',
    undo: 'Geri Al',
    restart: 'Yeniden Başlat',
    hint: 'İpucu',
    hintEmptyTitle: 'İpucu kalmadı',
    hintEmptyText: '2 ipucu daha almak için kısa bir reklam izleyin.',
    watchAd: 'Reklam izle',
    close: 'Kapat',
    loading: 'Yükleniyor...',
    noResults: 'Henüz sonuç yok',
    leaderboardUnavailable: 'Liderlik tablosu yalnızca Yandex Games platformunda kullanılabilir',
    you: 'Siz',
    player: 'Oyuncu',
  },
};

let currentLang = 'ru';

export function setLang(lang) {
  currentLang = LOCALES[lang] ? lang : 'en';
  return currentLang;
}

export function t(key) {
  const dict = LOCALES[currentLang] || LOCALES.en;
  return dict[key] || key;
}

export function getLang() { return currentLang; }