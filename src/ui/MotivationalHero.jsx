import { useEffect, useMemo, useState } from 'react';
import { useT } from '@/hooks/useT.js';
import { cx } from './cx.js';
import styles from './MotivationalHero.module.css';

const line = (uz, ru, en) => ({ uz, ru, en });

const HERO_COPY = {
  work: [
    line(
      'Bugungi kichik qadam ertangi katta natijani yaratadi.',
      'Маленький шаг сегодня создаёт большой результат завтра.',
      'A small step today creates a bigger result tomorrow.',
    ),
    line(
      'Dars rejalashtirilganda, ishonch uchun joy ochiladi.',
      'Хороший план освобождает место для уверенности.',
      'A thoughtful plan makes room for confidence.',
    ),
    line(
      'Har bir aniq vazifa — yengilroq kun sari qadam.',
      'Каждая ясная задача делает день легче.',
      'Every clear task makes the day feel lighter.',
    ),
    line(
      'Diqqatni muhim narsaga qarating. Qolgani kutishi mumkin.',
      'Сосредоточьтесь на важном. Остальное может подождать.',
      'Focus on what matters. The rest can wait.',
    ),
    line(
      'Yaxshi ritm mukammal jadvaldan kuchliroq.',
      'Хороший ритм сильнее идеального расписания.',
      'A steady rhythm beats a perfect schedule.',
    ),
    line(
      'Bugun sinfda yaratgan energiyangiz uzoq yashaydi.',
      'Энергия, созданная сегодня в классе, останется надолго.',
      'The energy you create in class today lasts far beyond it.',
    ),
    line(
      'Tayyorgarlik — xotirjamlikning eng yaxshi shakli.',
      'Подготовка — лучшая форма спокойствия.',
      'Preparation is the most practical kind of calm.',
    ),
    line(
      'Bir yaxshi suhbat butun haftani o‘zgartirishi mumkin.',
      'Один хороший разговор может изменить всю неделю.',
      'One good conversation can change the whole week.',
    ),
    line(
      'Jadval sizga xizmat qilsin, siz jadvalga emas.',
      'Пусть расписание работает на вас, а не наоборот.',
      'Make the schedule work for you, not the other way around.',
    ),
    line(
      'Boshlash uchun mukammal vaqt kerak emas.',
      'Чтобы начать, идеальный момент не нужен.',
      'You do not need a perfect moment to begin.',
    ),
    line(
      'Eng muhim ishni birinchi bo‘lib yengillashtiring.',
      'Сначала упростите самую важную работу.',
      'Make the most important work easier first.',
    ),
    line(
      'Aniqlik vaqtni, energiyani va sabrni tejaydi.',
      'Ясность экономит время, силы и терпение.',
      'Clarity saves time, energy, and patience.',
    ),
  ],
  academic: [
    line(
      'Har bir o‘quvchining rivoji — ko‘rinishga loyiq hikoya.',
      'Рост каждого ученика — история, которую стоит увидеть.',
      'Every student’s growth is a story worth noticing.',
    ),
    line(
      'Ma’lumot savol beradi, o‘qituvchi esa ma’no topadi.',
      'Данные задают вопрос, а учитель находит смысл.',
      'Data asks the question; the teacher finds the meaning.',
    ),
    line(
      'Kichik yutuqlarni ko‘rsangiz, katta o‘zgarish boshlanadi.',
      'Замечая маленькие победы, мы запускаем большие перемены.',
      'Notice the small wins and bigger change begins.',
    ),
    line(
      'Qiziqish uyg‘ongan joyda o‘rganish tezlashadi.',
      'Там, где появляется любопытство, обучение ускоряется.',
      'Learning accelerates wherever curiosity appears.',
    ),
    line(
      'To‘g‘ri savol ba’zan tayyor javobdan kuchliroq.',
      'Правильный вопрос иногда сильнее готового ответа.',
      'The right question can be stronger than a ready answer.',
    ),
    line(
      'Taraqqiyotni faqat bahoda emas, ishonchda ham o‘lchang.',
      'Измеряйте прогресс не только оценками, но и уверенностью.',
      'Measure progress in confidence as well as scores.',
    ),
    line(
      'Har bir signal — yordamni aniqroq qilish imkoniyati.',
      'Каждый сигнал — возможность сделать помощь точнее.',
      'Every signal is a chance to make support more precise.',
    ),
    line(
      'Bugungi tushuncha ertangi mustaqillikka aylanadi.',
      'Понимание сегодня становится самостоятельностью завтра.',
      'Understanding today becomes independence tomorrow.',
    ),
    line(
      'Yaxshi fikr-mulohaza yo‘lni ko‘rsatadi.',
      'Хорошая обратная связь освещает путь вперёд.',
      'Great feedback lights the path forward.',
    ),
    line(
      'O‘quvchini raqam emas, butun hikoya sifatida ko‘ring.',
      'Смотрите на ученика как на историю, а не как на цифру.',
      'See the whole student, not just the number.',
    ),
    line(
      'Barqaror e’tibor barqaror natijani yaratadi.',
      'Постоянное внимание создаёт устойчивый результат.',
      'Consistent attention creates consistent growth.',
    ),
    line(
      'Rivojlanish jim boshlanishi mumkin — uni o‘tkazib yubormang.',
      'Рост может начаться тихо — не пропустите его.',
      'Growth can begin quietly—do not miss it.',
    ),
  ],
  operations: [
    line(
      'Tartibli tizim yaxshi ishni ko‘rinadigan qiladi.',
      'Налаженная система делает хорошую работу заметной.',
      'A well-run system makes good work visible.',
    ),
    line(
      'Har bir yopilgan masala — jamoaga qaytgan vaqt.',
      'Каждый закрытый вопрос возвращает команде время.',
      'Every resolved issue gives time back to the team.',
    ),
    line(
      'Aniq jarayonlar xotirjam ish kunini yaratadi.',
      'Ясные процессы создают спокойный рабочий день.',
      'Clear processes create calmer working days.',
    ),
    line(
      'Muammoni erta ko‘rish — uni yarim hal qilishdir.',
      'Рано увидеть проблему — значит наполовину её решить.',
      'Spotting an issue early is half the solution.',
    ),
    line(
      'Yaxshi operatsiya fonda jim ishlaydi.',
      'Хорошая операционная система тихо работает в фоне.',
      'Great operations work quietly in the background.',
    ),
    line(
      'Tezlik aniqlik bilan birga bo‘lsa foydali.',
      'Скорость полезна, когда она идёт вместе с точностью.',
      'Speed matters most when paired with accuracy.',
    ),
    line(
      'Bugungi tartib ertangi shoshilinchni kamaytiradi.',
      'Порядок сегодня уменьшает срочность завтра.',
      'Order today reduces tomorrow’s urgency.',
    ),
    line(
      'Jamoaga kerakli signalni kerakli vaqtda bering.',
      'Давайте команде нужный сигнал в нужный момент.',
      'Give the team the right signal at the right time.',
    ),
    line(
      'Kichik ishqalanishni olib tashlang — oqim tezlashadi.',
      'Уберите небольшое трение — и поток ускорится.',
      'Remove small friction and the whole flow improves.',
    ),
    line(
      'Ishonchlilik — har kuni bajariladigan kichik va’dalar.',
      'Надёжность — это маленькие обещания, выполненные каждый день.',
      'Reliability is built from small promises kept every day.',
    ),
    line(
      'Ko‘rinadigan holat tezroq va yaxshi qaror beradi.',
      'Прозрачный статус помогает принимать лучшие решения быстрее.',
      'Visible status leads to faster, better decisions.',
    ),
    line(
      'Jarayon oddiy bo‘lsa, odamlar muhim ishga e’tibor beradi.',
      'Когда процесс прост, люди сосредоточены на важном.',
      'Simple processes leave people free for meaningful work.',
    ),
  ],
  print: [
    line(
      'Tayyor material — xotirjam dars.',
      'Готовый материал — спокойный урок.',
      'Ready materials make calmer lessons.',
    ),
    line(
      'To‘g‘ri fayl, to‘g‘ri printer, o‘z vaqtida.',
      'Нужный файл, нужный принтер, вовремя.',
      'The right file, the right printer, right on time.',
    ),
    line(
      'Qog‘ozga tushgan g‘oya sinfda jonlanadi.',
      'Идея на бумаге оживает в классе.',
      'An idea on paper comes alive in the classroom.',
    ),
    line(
      'Bir marta tekshiring, ishonch bilan chop eting.',
      'Проверьте один раз и печатайте уверенно.',
      'Check once, then print with confidence.',
    ),
    line(
      'Kutubxonangiz — keyingi darsga qisqa yo‘l.',
      'Ваша библиотека — короткий путь к следующему уроку.',
      'Your library is the shortcut to the next lesson.',
    ),
    line(
      'Yaxshi tayyorgarlik tafsilotlardan boshlanadi.',
      'Хорошая подготовка начинается с деталей.',
      'Good preparation starts with the details.',
    ),
    line(
      'Navbat aniq, darsga tayyorgarlik oson.',
      'Очередь понятна — подготовка к уроку проще.',
      'A clear queue makes lesson prep easier.',
    ),
    line(
      'Materiallarni toping, tekshiring va tezroq boshlang.',
      'Найдите, проверьте и начинайте быстрее.',
      'Find it, check it, and get started faster.',
    ),
  ],
};

function pickNext(length, current = -1) {
  if (length <= 1) return 0;
  if (current < 0) return Math.floor(Math.random() * length);
  const candidate = Math.floor(Math.random() * (length - 1));
  return candidate >= current ? candidate + 1 : candidate;
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(() =>
    typeof window === 'undefined'
      ? false
      : window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(media.matches);
    media.addEventListener?.('change', onChange);
    return () => media.removeEventListener?.('change', onChange);
  }, []);
  return reduced;
}

export function MotivationalHero({
  context = 'work',
  eyebrow,
  title,
  meta,
  actions,
  compact = false,
  refreshKey = 0,
  className,
  children,
}) {
  const { locale } = useT();
  const entries = HERO_COPY[context] ?? HERO_COPY.work;
  const [index, setIndex] = useState(() => pickNext(entries.length));
  const [typed, setTyped] = useState('');
  const reducedMotion = useReducedMotion();
  const phrase = useMemo(
    () => entries[index]?.[locale] ?? entries[index]?.en ?? '',
    [entries, index, locale],
  );

  useEffect(() => {
    if (!refreshKey) return;
    setIndex((current) => pickNext(entries.length, current));
  }, [entries.length, refreshKey]);

  useEffect(() => {
    if (reducedMotion) {
      setTyped(phrase);
      return undefined;
    }
    setTyped('');
    let position = 0;
    let rotateTimer;
    const typeTimer = window.setInterval(() => {
      position += 1;
      setTyped(phrase.slice(0, position));
      if (position >= phrase.length) {
        window.clearInterval(typeTimer);
        rotateTimer = window.setTimeout(
          () => setIndex((current) => pickNext(entries.length, current)),
          6500,
        );
      }
    }, 34);
    return () => {
      window.clearInterval(typeTimer);
      window.clearTimeout(rotateTimer);
    };
  }, [entries.length, phrase, reducedMotion]);

  return (
    <section className={cx(styles.hero, compact && styles.compact, className)}>
      <div className={styles.glow} aria-hidden="true" />
      <div className={styles.content}>
        {eyebrow && <div className={styles.eyebrow}>{eyebrow}</div>}
        {title && <h1 className={styles.title}>{title}</h1>}
        <p className={styles.phrase} aria-label={phrase}>
          <span aria-hidden="true">{typed}</span>
          {!reducedMotion && <span className={styles.cursor} aria-hidden="true" />}
        </p>
        {meta && <div className={styles.meta}>{meta}</div>}
        {children}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </section>
  );
}
