// Посты «канала кампуса» для карусели на экране входа.
// Все каналы, имена и события вымышлены; обложки — кадры сгенерированного кампуса.

export interface CampusReaction {
  emoji: string;
  label: string;
  count: number;
}

export interface CampusPost {
  id: string;
  channel: string;
  handle: string;
  time: string;
  hashtag: string;
  title: string;
  text: string;
  cover: string;
  coverAlt: string;
  reactions: CampusReaction[];
}

export const CAMPUS_POSTS: CampusPost[] = [
  {
    id: 'pgas',
    channel: 'Деканат Live',
    handle: '@dekanat_live',
    time: '2 ч назад',
    hashtag: '#стипендия',
    title: 'ПГАС: заявка в один клик',
    text: 'Приём на повышенную стипендию открыт до 30 ноября. Всё в кабинете: баллы подтянутся сами.',
    cover: '/covers/pgas.jpg',
    coverAlt: 'Светлый холл университета с зоной ожидания',
    reactions: [
      { emoji: '🔥', label: 'полезно', count: 48 },
      { emoji: '👏', label: 'спасибо', count: 19 },
    ],
  },
  {
    id: 'hackathon',
    channel: 'Студсовет',
    handle: '@studsovet',
    time: '5 ч назад',
    hashtag: '#хакатон',
    title: 'Ночной хакатон в коворкинге',
    text: 'С пятницы на субботу: кофе, пицца и 12 часов на прототип. Команды по 3–4 человека, регистрация до среды.',
    cover: '/covers/hackathon.jpg',
    coverAlt: 'Студенты за столами в коворкинге с ноутбуками',
    reactions: [
      { emoji: '🔥', label: 'иду', count: 64 },
      { emoji: '☕️', label: 'за кофе', count: 12 },
    ],
  },
  {
    id: 'career',
    channel: 'Карьера и стажировки',
    handle: '@career_hub',
    time: 'вчера',
    hashtag: '#стажировка',
    title: 'Отбор в Лион и встреча с выпускниками',
    text: 'Два места в университете-партнёре на весну. В четверг — встреча с выпускниками, которые уже съездили.',
    cover: '/covers/career.jpg',
    coverAlt: 'Кирпичный корпус университета и площадь перед ним',
    reactions: [
      { emoji: '🎓', label: 'хочу', count: 31 },
      { emoji: '📌', label: 'сохранил', count: 9 },
    ],
  },
  {
    id: 'science',
    channel: 'Наука и проекты',
    handle: '@science_lab',
    time: '2 дня назад',
    hashtag: '#кампус',
    title: 'Диплом второй степени на конференции',
    text: 'Команда факультета взяла награду за доклад о региональных конфликтах. Тезисы выйдут в январе.',
    cover: '/covers/science.jpg',
    coverAlt: 'Студенты идут по кампусу вдоль учебного корпуса',
    reactions: [
      { emoji: '👏', label: 'гордимся', count: 57 },
      { emoji: '💡', label: 'интересно', count: 14 },
    ],
  },
];
