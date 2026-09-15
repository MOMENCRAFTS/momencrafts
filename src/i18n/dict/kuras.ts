/* KURAS product screen strings.
   English is the source of truth: add the key to `en`, then TypeScript
   forces the matching Arabic key in `ar`. */

export const en = {
  nav: {
    brand: '✦ MOMENCRAFTS',
    how: 'How it works',
    why: 'Why it is different',
    cta: 'Talk to the founder →',
    back: '← Investor Room',
    menuAria: 'Menu',
  },

  hero: {
    eyebrow: 'MOMENCRAFTS · EDUCATION',
    titleName: 'KURAS · كُرّاس',
    titleEm: 'A daily workbook,',
    titleRest: 'approved by the parent first.',
    sub: 'An Arabic learning workbook for children aged 6 to 9. Every question the child sees was approved by their parent first, drawn from a bank that was verified before any AI touched it. Built by a father, and tested at home before anywhere else.',
    badges: {
      stage: 'IN DEVELOPMENT',
      edu: 'EDUCATION · ARABIC',
      safety: 'PARENT-GATED',
    },
    ctaPrimary: 'Talk to the founder →',
    ctaSecondary: 'See how it works ↓',
    deviceAlt: 'Kurri, the KURAS notebook mascot',
  },

  facts: [
    { num: '500+', label: 'verified questions' },
    { num: '21',   label: 'question templates' },
    { num: '6–9',  label: 'years old' },
    { num: '1',    label: 'rule above all' },
  ],

  how: {
    label: 'HOW IT WORKS',
    title: 'Five minutes for the parent. One kuras for the child.',
    sub: 'No long lessons and no setup screens. A short daily routine where the parent stays in charge of every question.',
    steps: [
      { title: 'The engine prepares',  body: 'Each day the planner assembles a short kuras, about 25 to 30 questions, at the child’s current level in every skill.' },
      { title: 'The parent approves',  body: 'The parent reviews every question. One tap approves a verified item; anything doubtful is dropped or sent back.' },
      { title: 'The child solves',     body: 'On the phone behind a child PIN, or printed on paper. Instant right-or-wrong, or marked together at the end.' },
      { title: 'Progress in words',    body: 'No percentages. Which skill is strongest, which one is developing, and one note for the week ahead.' },
    ],
  },

  why: {
    label: 'WHY IT IS DIFFERENT',
    title: 'Select from verified. Never verify what was generated.',
    sub: 'One rule governs everything in KURAS: what reaches a child must be trusted before it is shown, not checked afterwards.',
    items: [
      { icon: '✓', title: 'Verified bank first',    body: 'More than 500 grade-4 questions reviewed by hand before entering the bank. AI may rephrase the wording of a math or logic problem inside a closed vocabulary. It never writes the substance.' },
      { icon: '▦', title: 'Questions that are drawn', body: 'Patterns, grids, rotations and mirror puzzles are rendered as pictures, and the engine solves every one itself before a child sees it. 21 templates so far.' },
      { icon: '↕', title: 'Adapts per skill',       body: 'Difficulty moves up or down for each child and each skill, based on the last six first tries. The parent can override the level at any time.' },
      { icon: '⚿', title: 'Safe by design',         body: 'Google sign-in for the parent, a PIN for the child, and an exit PIN to leave child mode. Export and full delete from Settings, with row-level security on every table.' },
    ],
  },

  cta: {
    overline: 'CO-BUILD',
    titlePre: 'Help bring ',
    titleEm: 'KURAS to every home',
    sub: 'In development. Web app built, family screens complete, admin console in progress, Android release planned. Educators, Arabic-curriculum experts and co-founders are welcome.',
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
    how: 'كيف يعمل',
    why: 'ما الفرق',
    cta: 'تحدث مع المؤسس ←',
    back: 'غرفة المستثمرين →',
    menuAria: 'القائمة',
  },

  hero: {
    eyebrow: 'مومن كرافتس · قسم التعليم',
    titleName: 'كُرّاس · KURAS',
    titleEm: 'كُرّاس يومي،',
    titleRest: 'يعتمده الوالد أولًا.',
    sub: 'كُرّاس تعلّم عربي للأطفال من ٦ إلى ٩ سنوات. كل سؤال يراه الطفل اعتمده والده أولًا، من بنك أسئلة رُوجع قبل أن يلمسه الذكاء الاصطناعي. بناه أب، وجرّبه في بيته قبل أي بيت آخر.',
    badges: {
      stage: 'قيد التطوير',
      edu: 'تعليم · عربي',
      safety: 'بإشراف الوالدين',
    },
    ctaPrimary: 'تحدث مع المؤسس ←',
    ctaSecondary: 'شاهد كيف يعمل ↓',
    deviceAlt: 'كُرّي، شخصية كُرّاس',
  },

  facts: [
    { num: '+٥٠٠', label: 'سؤال مُراجَع' },
    { num: '٢١',   label: 'قالب أسئلة' },
    { num: '٦–٩',  label: 'سنوات' },
    { num: '١',    label: 'قاعدة تحكم الكل' },
  ],

  how: {
    label: 'كيف يعمل',
    title: 'خمس دقائق من الوالد. كُرّاس واحد للطفل.',
    sub: 'لا حصص طويلة ولا شاشات إعداد. روتين يومي قصير يبقى فيه الوالد صاحب القرار في كل سؤال.',
    steps: [
      { title: 'المحرّك يجهّز',   body: 'كل يوم يجمّع المخطِّط كُرّاسًا قصيرًا، نحو ٢٥ إلى ٣٠ سؤالًا، على مستوى الطفل الحالي في كل مهارة.' },
      { title: 'الوالد يعتمد',    body: 'يراجع الوالد كل سؤال. لمسة واحدة تعتمد السؤال المُراجَع، وأي سؤال مشكوك فيه يُحذف أو يُعاد.' },
      { title: 'الطفل يحلّ',      body: 'على الهاتف خلف رقم سرّي للطفل، أو مطبوعًا على ورق. تصحيح فوري، أو «نصحّح معًا» في النهاية.' },
      { title: 'التقدّم بالكلمات', body: 'بلا نسب مئوية. أي مهارة هي الأقوى، وأيها في طور النمو، وملاحظة واحدة للأسبوع القادم.' },
    ],
  },

  why: {
    label: 'ما الفرق',
    title: 'نختار من المُراجَع. ولا نراجع ما وُلِّد.',
    sub: 'قاعدة واحدة تحكم كل شيء في كُرّاس: ما يصل إلى الطفل يجب أن يكون موثوقًا قبل عرضه، لا بعده.',
    items: [
      { icon: '✓', title: 'البنك المُراجَع أولًا', body: 'أكثر من ٥٠٠ سؤال للصف الرابع رُوجعت يدويًا قبل دخولها البنك. يجوز للذكاء الاصطناعي إعادة صياغة عبارة مسألة حسابية أو منطقية ضمن مفردات مغلقة، ولا يكتب المضمون أبدًا.' },
      { icon: '▦', title: 'أسئلة مرسومة',        body: 'الأنماط والشبكات والدوران والمرايا تُرسم صورًا، ويحلّها المحرّك بنفسه قبل أن يراها الطفل. ٢١ قالبًا حتى الآن.' },
      { icon: '↕', title: 'يتكيّف مع كل مهارة',   body: 'الصعوبة ترتفع أو تنخفض لكل طفل ولكل مهارة بحسب آخر ست محاولات أولى. وللوالد أن يغيّر المستوى متى شاء.' },
      { icon: '⚿', title: 'آمن بالتصميم',         body: 'دخول الوالد بحساب Google، رقم سرّي للطفل، ورقم خروج لمغادرة وضع الطفل. تصدير البيانات وحذفها بالكامل من الإعدادات، وحماية على مستوى الصف في كل جدول.' },
    ],
  },

  cta: {
    overline: 'شارك في البناء',
    titlePre: 'ساعد في إيصال ',
    titleEm: 'كُرّاس إلى كل بيت',
    sub: 'قيد التطوير. تطبيق الويب مبني، شاشات الأسرة مكتملة، لوحة الإدارة قيد العمل، وإصدار أندرويد مخطَّط. نرحّب بالتربويين وخبراء المناهج العربية والشركاء المؤسسين.',
    primary: 'تواصل مع المؤسس ←',
    back: 'غرفة المستثمرين →',
  },

  footer: {
    brand: '✦ MOMENCRAFTS',
    copy: '© 2026 مومن كرافتس · جميع الحقوق محفوظة',
    back: 'غرفة المستثمرين →',
  },
}
