/* Sahhaaab product screen strings.
   English is the source of truth: add the key to `en`, then TypeScript
   forces the matching Arabic key in `ar`.
   Facts come from the game repo (docs/DECISIONS.md, docs/RUN-LOG.md). The
   reference game of the genre is never named anywhere on this site. */

export const en = {
  nav: {
    brand: '✦ MOMENCRAFTS',
    how: 'How a duel works',
    why: 'Why it is different',
    cta: 'Talk to the founder →',
    back: '← Investor Room',
    menuAria: 'Menu',
  },

  hero: {
    eyebrow: 'MOMENCRAFTS STUDIOS · GAMES',
    titleName: 'SAHHAAAB · سحّاب',
    titleEm: 'Holster. Wait.',
    titleRest: 'Draw.',
    sub: 'A real-time one-on-one duel game for the phone, set in the alleys of Old Damascus. You holster the phone at your hip, wait for the buzz, draw, tilt to aim, and fire. An original world with its own art, its own words and its own rules.',
    badges: {
      stage: 'IN DEVELOPMENT',
      edu: 'MOBILE GAME · ARABIC FIRST',
      safety: 'ORIGINAL WORLD',
    },
    ctaPrimary: 'Talk to the founder →',
    ctaSecondary: 'See how a duel works ↓',
    deviceAlt: 'The opening scene of Sahhaaab: an alley in Old Damascus',
  },

  facts: [
    { num: '1 v 1',   label: 'real-time duels' },
    { num: '9',       label: 'places in Old Damascus' },
    { num: 'AR · EN', label: 'Arabic first' },
    { num: '6',       label: 'rounds in the cylinder' },
  ],

  how: {
    label: 'HOW A DUEL WORKS',
    title: 'Pick a rival. Holster. Wait for the buzz.',
    sub: 'No joystick and no countdown. The phone in your hand is the gun, and the duel is over in seconds.',
    steps: [
      { title: 'Pick a rival',   body: 'Walk the hub of Old Damascus: the coffeehouse, the notice board, the rivals known by name. Send a challenge, or answer one.' },
      { title: 'Holster',        body: 'Hold the phone at your hip and wait. There is no countdown; the buzz is the signal. Draw early and you pay in health before the first shot.' },
      { title: 'Draw and fire',  body: 'Raise the phone, tilt to aim, tap to fire. Six rounds in the cylinder, then a reload. A head shot ends it fast.' },
      { title: 'Reputation',     body: 'Win, and gold, bounty and level follow you into the alley. Lose, and the neighbourhood knows. Rematch is one tap away.' },
    ],
  },

  why: {
    label: 'WHY IT IS DIFFERENT',
    title: 'An original world, built for the Gulf.',
    sub: 'The phone-duel genre had millions of Gulf players before its classic died in 2016. Nothing credible replaced it. Sahhaaab is built from scratch to be that game, and to be obviously nobody else’s.',
    items: [
      { icon: '◈', title: 'An original world',   body: 'Old Damascus, drawn from scratch: rivals in tarboushes, a coffeehouse, a tailor, a gunsmith. Every picture, word and rule is the studio’s own.' },
      { icon: '⌖', title: 'The phone is the gun', body: 'Sensors read the holster and the tilt; haptics give the signal. No joystick on the screen, no buttons to learn.' },
      { icon: 'ع', title: 'Arabic first',         body: 'Arabic with Eastern numerals by default, English second, and one layout that holds in both. Built in Riyadh for players in the Gulf.' },
      { icon: '⚖', title: 'Fair fights',          body: 'Cosmetics, energy and flair are for sale. Anything that changes a duel is earned with gold. Never pay-to-win.' },
    ],
  },

  cta: {
    overline: 'CO-BUILD',
    titlePre: 'Help bring ',
    titleEm: 'Sahhaaab to the Gulf',
    sub: 'In development. The duel engine, the art pack and the duel scene are built; the first feel-test build on real phones is next, then online duels. Game designers, Arabic writers, artists and co-founders are welcome.',
    primary: 'Contact Founder →',
    back: '← Investor Room',
  },

  footer: {
    brand: '✦ MOMENCRAFTS',
    copy: '© 2026 MomenCrafts · All rights reserved',
    back: '← Investor Room',
  },
}

export const ar: typeof en = {
  nav: {
    brand: '✦ MOMENCRAFTS',
    how: 'كيف تجري المبارزة',
    why: 'ما الفرق',
    cta: 'تحدث مع المؤسس ←',
    back: 'غرفة المستثمرين →',
    menuAria: 'القائمة',
  },

  hero: {
    eyebrow: 'مومن كرافتس ستوديوز · الألعاب',
    titleName: 'سحّاب · SAHHAAAB',
    titleEm: 'ضعه على خصرك. انتظر.',
    titleRest: 'اسحب.',
    sub: 'لعبة مبارزة فردية لحظية على الجوال، تدور في أزقة دمشق القديمة. تضع الجوال على خصرك، تنتظر الاهتزاز، تسحب، تميل الجوال للتصويب، وتطلق. عالم أصيل برسومه وكلماته وقواعده.',
    badges: {
      stage: 'قيد التطوير',
      edu: 'لعبة جوال · العربية أولًا',
      safety: 'عالم أصيل',
    },
    ctaPrimary: 'تحدث مع المؤسس ←',
    ctaSecondary: 'شاهد كيف تجري المبارزة ↓',
    deviceAlt: 'المشهد الافتتاحي في سحّاب: زقاق في دمشق القديمة',
  },

  facts: [
    { num: '١ ضد ١',  label: 'مبارزات لحظية' },
    { num: '٩',       label: 'أماكن في دمشق القديمة' },
    { num: 'AR · EN', label: 'العربية أولًا' },
    { num: '٦',       label: 'طلقات في الأسطوانة' },
  ],

  how: {
    label: 'كيف تجري المبارزة',
    title: 'اختر خصمك. ضع الجوال على خصرك. انتظر الاهتزاز.',
    sub: 'لا عصا تحكم ولا عدّ تنازلي. الجوال في يدك هو المسدس، والمبارزة تنتهي في ثوانٍ.',
    steps: [
      { title: 'اختر خصمك',   body: 'تجوّل في حارة دمشق القديمة: المقهى، لوحة الإعلانات، والخصوم المعروفون بأسمائهم. أرسل تحدّيًا، أو أجب عن تحدٍّ.' },
      { title: 'على الخصر',   body: 'أمسك الجوال عند خصرك وانتظر. لا عدّ تنازلي؛ الاهتزاز هو الإشارة. من يسحب قبلها يدفع من صحته قبل أول طلقة.' },
      { title: 'اسحب وأطلق',  body: 'ارفع الجوال، مِله للتصويب، واضغط لتطلق. ست طلقات في الأسطوانة ثم إعادة تعبئة. إصابة الرأس تنهيها سريعًا.' },
      { title: 'السمعة',      body: 'إن فزت تبعك الذهب والجائزة والمستوى إلى الزقاق. وإن خسرت عرفت الحارة. وإعادة المبارزة على بُعد لمسة.' },
    ],
  },

  why: {
    label: 'ما الفرق',
    title: 'عالم أصيل، مبني للخليج.',
    sub: 'كان لهذا النوع من الألعاب ملايين اللاعبين في الخليج قبل أن تتوقف لعبته الكلاسيكية عام ٢٠١٦، ولم يعوّضها شيء جدير. سحّاب مبني من الصفر ليكون تلك اللعبة، وليكون بوضوح لعبة لا تشبه غيرها.',
    items: [
      { icon: '◈', title: 'عالم أصيل',        body: 'دمشق القديمة مرسومة من الصفر: خصوم بالطرابيش، مقهى، خياط، وصانع أسلحة. كل صورة وكلمة وقاعدة من صنع الاستوديو.' },
      { icon: '⌖', title: 'الجوال هو المسدس', body: 'المستشعرات تقرأ وضع الخصر والميل، والاهتزاز يعطي الإشارة. لا عصا تحكم على الشاشة، ولا أزرار تتعلّمها.' },
      { icon: 'ع', title: 'العربية أولًا',    body: 'العربية بالأرقام المشرقية افتراضيًا، والإنجليزية ثانيًا، وتخطيط واحد يثبت في اللغتين. بُني في الرياض للاعبين في الخليج.' },
      { icon: '⚖', title: 'مبارزات عادلة',    body: 'المظاهر والطاقة والزينة للبيع. وكل ما يغيّر نتيجة المبارزة يُكسب بالذهب. لا دفع مقابل الفوز، أبدًا.' },
    ],
  },

  cta: {
    overline: 'شارك في البناء',
    titlePre: 'ساعد في إيصال ',
    titleEm: 'سحّاب إلى الخليج',
    sub: 'قيد التطوير. محرك المبارزة وحزمة الرسوم ومشهد المبارزة مبنية؛ والتالي نسخة اختبار الإحساس على هواتف حقيقية، ثم المبارزات عبر الإنترنت. نرحّب بمصممي الألعاب وكتّاب العربية والرسامين والشركاء المؤسسين.',
    primary: 'تواصل مع المؤسس ←',
    back: 'غرفة المستثمرين →',
  },

  footer: {
    brand: '✦ MOMENCRAFTS',
    copy: '© 2026 مومن كرافتس · جميع الحقوق محفوظة',
    back: 'غرفة المستثمرين →',
  },
}
