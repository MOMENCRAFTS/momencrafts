/* sabha screen strings.
   English is the source of truth: add the key to `en`, then TypeScript
   forces the matching Arabic key in `ar`. */

export const en = {
  /* ── Nav ── */
  nav: {
    brandBold: 'MOMEN',
    brandRest: 'CRAFTS',
    philosophy: 'PHILOSOPHY',
    architecture: 'ARCHITECTURE',
    specs: 'SPECS',
    drawings: 'DRAWINGS',
  },

  /* ── Hero ── */
  hero: {
    label: 'HARDWARE DIVISION · PROTOTYPE',
    title: 'SABHA',
    titleAccent: 'سبحة',
    tagline: 'Ritual Precision · Hidden Intelligence',
    sub: 'A precision personal ritual object with hidden digital intelligence. Jewelry-grade threaded assembly, magnetic Hall-sensor counting, haptic confirmation — electronics that disappear into metal.',
    stats: [
      { val: '34.4', unit: 'mm', label: 'SHELL OD' },
      { val: '2×',   unit: '',   label: 'HALL SENSORS' },
      { val: '6',    unit: '',   label: 'CAD COMPONENTS' },
      { val: 'M30',  unit: '',   label: 'THREAD SYSTEM' },
    ],
    ctaDrawings: 'VIEW DRAWINGS',
    ctaSpecs: 'SPECIFICATIONS',
    imgAlt: 'SABHA device',
  },

  /* ── Philosophy ── */
  philosophy: {
    kicker: 'WHAT YOU FEEL FIRST',
    title: 'Electronics Disappear Into the Object',
    quote: 'The electronics are supposed to disappear into the object. What the user experiences first is metal, weight, rotation, precision, magnetism, haptics and craftsmanship. The intelligence is underneath.',
    bodyLead: 'The Talley Counter fuses four categories into one object: ',
    cat1: 'tasbeeh counter',
    cat1Note: ' (ritual dhikr counting),',
    cat2: ' precision fidget',
    cat2Note: ' (rotating magnetic mechanism),',
    cat3: ' jewelry',
    cat3Note: ' (precious-metal luxury),',
    cat4Pre: ' and ',
    cat4: 'smart device',
    cat4Note: ' (BLE, haptics, sensing, app).',
    bodyTail: ' Comparable to a premium watch or luxury writing instrument — not an electronic accessory.',
  },

  /* ── Interaction ── */
  interaction: {
    kicker: 'THE COUNTING LOOP',
    title: 'Dual-Hall Intelligence',
    desc: 'Two AK09973D Hall sensors validate every rotation — direction sensing, velocity tracking, and false-count rejection. No accidental counts.',
    flowSteps: [
      'finger movement',
      'magnetic sensation',
      'electronic detection',
      'validated count',
      'haptic confirmation',
    ],
  },

  /* ── Architecture ── */
  architecture: {
    kicker: '7-LAYER ARCHITECTURE',
    title: 'From Shell to Signal',
    desc: 'Every layer has a purpose — from the jewelry-grade exterior down to BLE connectivity.',
    layers: [
      { name: 'EXTERIOR',     desc: 'Jewelry-grade shell — M30×0.75 precision threaded, precious metal finish' },
      { name: 'MECHANICAL',   desc: 'Rotating fidget mechanism with magnetic detent feel — Inner Up / Inner Down assembly' },
      { name: 'SENSING',      desc: '2× AK09973D Hall sensors — dual-sensor motion validation, direction sensing, false-count rejection' },
      { name: 'INTELLIGENCE', desc: 'nRF52811 WLCSP — BLE 5.0 SoC on Ø33.5mm annular PCB' },
      { name: 'FEEDBACK',     desc: 'NFP-WS0625 haptic motor + 2× WS2812C-2020 RGB LEDs — tactile and visual confirmation' },
      { name: 'POWER',        desc: 'LiPo cell with pogo-pin magnetic charging dock' },
      { name: 'CONNECTIVITY', desc: 'BLE 5.0 → companion app for count history, goals, and dhikr programs' },
    ],
    explodedAlt: 'SABHA exploded assembly view',
  },

  /* ── Mechanical ── */
  mechanical: {
    kicker: 'PRECISION ASSEMBLY',
    title: 'Two Thread Families',
    desc: 'A precision threaded mechanical assembly — not a glued disposable housing. Fine pitches provide refined assembly feel and compression control.',
    items: [
      { name: 'M30 × 0.75', desc: 'Outer structural family — Shell, Middle, Base' },
      { name: 'M19 × 0.5',  desc: 'Internal mechanism family — Inner Up, Inner Down' },
      { name: 'WASHER',     desc: 'Ø29 × 0.30 mm — axial preload, rotational feel tuning, endplay control' },
    ],
  },

  /* ── Specs ── */
  specs: {
    kicker: 'SPECIFICATIONS',
    title: 'Engineering Details',
    rows: [
      { key: 'SHELL OD',      val: 'Ø34.4 mm' },
      { key: 'SHELL HEIGHT',  val: '19.1 mm' },
      { key: 'OUTER THREAD',  val: 'M30 × 0.75 (fine)' },
      { key: 'INNER THREAD',  val: 'M19 × 0.5 (fine)' },
      { key: 'WASHER',        val: 'Ø29 × 0.30 mm' },
      { key: 'COMPONENTS',    val: '6 STEP + 5 A3 drawings' },
      { key: 'MCU',           val: 'nRF52811 WLCSP' },
      { key: 'HALL SENSORS',  val: '2× AK09973D' },
      { key: 'RGB LEDs',      val: '2× WS2812C-2020' },
      { key: 'HAPTIC MOTOR',  val: 'NFP-WS0625' },
      { key: 'POWER',         val: 'LiPo + pogo-pin charging' },
      { key: 'CONNECTIVITY',  val: 'BLE 5.0' },
      { key: 'PCB GEOMETRY',  val: 'Ø33.5 / Ø22.5 mm annular' },
    ],
  },

  /* ── Drawings ── */
  drawings: {
    kicker: 'ENGINEERING DRAWINGS',
    title: 'A3 Manufacturing Documents',
    desc: 'CAD-verified engineering drawings for each manufactured component. Click to view PDF.',
    viewPdf: 'VIEW PDF ↗',
    names: ['SHELL', 'MIDDLE', 'INNER UP', 'INNER DOWN', 'BASE'],
  },

  /* ── CTA ── */
  cta: {
    kicker: 'PROTOTYPE STAGE',
    title: 'Contact the Founder',
    desc: 'Seeking manufacturing partner for precious-metal production. CAD package and engineering drawings available.',
    whatsapp: 'WHATSAPP',
    whatsappMsg: "I'm interested in SABHA — I'd like to know more.",
    investorRoom: 'INVESTOR ROOM',
  },

  /* ── Footer ── */
  footer: {
    copy: '© 2026 MOMENCRAFTS · RIYADH',
    tagline: 'SABHA · سبحة — PRECISION RITUAL, HIDDEN INTELLIGENCE',
  },
}

export const ar: typeof en = {
  nav: {
    brandBold: 'MOMEN',
    brandRest: 'CRAFTS',
    philosophy: 'الفلسفة',
    architecture: 'المعمارية',
    specs: 'المواصفات',
    drawings: 'الرسومات',
  },

  hero: {
    label: 'قسم الأجهزة · نموذج أولي',
    title: 'SABHA',
    titleAccent: 'سبحة',
    tagline: 'دقة الطقوس، ذكاء مخفي',
    sub: 'جسم طقسي شخصي عالي الدقة يخفي بداخله ذكاءً رقمياً. تجميعة ملولبة بمستوى المجوهرات، وعدّ مغناطيسي عبر مستشعرات هول، وتأكيد لمسي — إلكترونيات تختفي داخل المعدن.',
    stats: [
      { val: '34.4', unit: 'mm', label: 'القطر الخارجي' },
      { val: '2×',   unit: '',   label: 'مستشعرات هول' },
      { val: '6',    unit: '',   label: 'مكوّنات CAD' },
      { val: 'M30',  unit: '',   label: 'نظام اللولب' },
    ],
    ctaDrawings: 'عرض الرسومات',
    ctaSpecs: 'المواصفات',
    imgAlt: 'جهاز سبحة',
  },

  philosophy: {
    kicker: 'ما تشعر به أولاً',
    title: 'الإلكترونيات تختفي داخل الجسم',
    quote: 'المفروض أن تختفي الإلكترونيات داخل الجسم. أول ما يعيشه المستخدم هو المعدن والوزن والدوران والدقة والمغناطيسية واللمس والحِرفية. أما الذكاء فيبقى تحت ذلك كله.',
    bodyLead: 'يجمع Talley Counter أربع فئات في جسم واحد: ',
    cat1: 'عدّاد تسبيح',
    cat1Note: ' (عدّ الذكر)،',
    cat2: ' ألعوبة دقيقة',
    cat2Note: ' (آلية دوران مغناطيسية)،',
    cat3: ' قطعة مجوهرات',
    cat3Note: ' (فخامة المعادن الثمينة)،',
    cat4Pre: ' و',
    cat4: 'جهاز ذكي',
    cat4Note: ' (BLE، لمسيات، استشعار، تطبيق).',
    bodyTail: ' يُقارن بساعة راقية أو قلم فاخر — لا بملحق إلكتروني.',
  },

  interaction: {
    kicker: 'دورة العدّ',
    title: 'ذكاء مستشعرَي هول',
    desc: 'مستشعرا AK09973D يتحققان من كل دورة — استشعار الاتجاه، وتتبع السرعة، ورفض العدّات الخاطئة. لا عدّات عرضية.',
    flowSteps: [
      'حركة الإصبع',
      'إحساس مغناطيسي',
      'كشف إلكتروني',
      'عدّة موثّقة',
      'تأكيد لمسي',
    ],
  },

  architecture: {
    kicker: 'معمارية من ٧ طبقات',
    title: 'من الغلاف إلى الإشارة',
    desc: 'لكل طبقة دور — من الغلاف بمستوى المجوهرات وصولاً إلى اتصال BLE.',
    layers: [
      { name: 'الغلاف الخارجي', desc: 'غلاف بمستوى المجوهرات — قلاووظ دقيق M30×0.75 وتشطيب بمعدن ثمين' },
      { name: 'الميكانيكا',     desc: 'آلية دوران مع إحساس مغناطيسي متدرّج — تجميعة الداخلي العلوي والداخلي السفلي' },
      { name: 'الاستشعار',      desc: 'مستشعرا AK09973D — تحقق مزدوج من الحركة، واستشعار الاتجاه، ورفض العدّات الخاطئة' },
      { name: 'الذكاء',         desc: 'nRF52811 WLCSP — شريحة BLE 5.0 على لوحة حلقية بقطر Ø33.5 ملم' },
      { name: 'التغذية الراجعة', desc: 'محرك لمسي NFP-WS0625 + مصباحا WS2812C-2020 RGB — تأكيد لمسي وبصري' },
      { name: 'الطاقة',         desc: 'خلية ليثيوم مع قاعدة شحن مغناطيسية بأطراف بوجو' },
      { name: 'الاتصال',        desc: 'BLE 5.0 ← تطبيق مرافق لسجل العدّ والأهداف وبرامج الذكر' },
    ],
    explodedAlt: 'رسم تفكيكي لتجميعة سبحة',
  },

  mechanical: {
    kicker: 'تجميع دقيق',
    title: 'عائلتان من اللوالب',
    desc: 'تجميعة ميكانيكية ملولبة بدقة — وليست علبة ملصوقة قابلة للاستهلاك. الخطوات الناعمة تمنح إحساساً راقياً بالتجميع وتحكماً في الضغط.',
    items: [
      { name: 'M30 × 0.75',   desc: 'العائلة الإنشائية الخارجية — الغلاف، الوسط، القاعدة' },
      { name: 'M19 × 0.5',    desc: 'عائلة الآلية الداخلية — الداخلي العلوي، الداخلي السفلي' },
      { name: 'الحلقة الفاصلة', desc: 'Ø29 × 0.30 mm — تحميل محوري مسبق، وضبط إحساس الدوران، والتحكم في الخلوص' },
    ],
  },

  specs: {
    kicker: 'المواصفات',
    title: 'تفاصيل هندسية',
    rows: [
      { key: 'القطر الخارجي للغلاف', val: 'Ø34.4 mm' },
      { key: 'ارتفاع الغلاف',        val: '19.1 mm' },
      { key: 'اللولب الخارجي',       val: 'M30 × 0.75 (ناعم)' },
      { key: 'اللولب الداخلي',       val: 'M19 × 0.5 (ناعم)' },
      { key: 'الحلقة الفاصلة',       val: 'Ø29 × 0.30 mm' },
      { key: 'المكوّنات',            val: '6 STEP + 5 A3' },
      { key: 'المتحكم الدقيق',       val: 'nRF52811 WLCSP' },
      { key: 'مستشعرات هول',        val: '2× AK09973D' },
      { key: 'مصابيح RGB',          val: '2× WS2812C-2020' },
      { key: 'المحرك اللمسي',        val: 'NFP-WS0625' },
      { key: 'الطاقة',              val: 'LiPo + شحن بأطراف بوجو' },
      { key: 'الاتصال',             val: 'BLE 5.0' },
      { key: 'هندسة اللوحة',         val: 'Ø33.5 / Ø22.5 mm حلقية' },
    ],
  },

  drawings: {
    kicker: 'رسومات هندسية',
    title: 'وثائق تصنيع بمقاس A3',
    desc: 'رسومات هندسية موثّقة من ملفات الـ CAD لكل مكوّن مُصنّع. اضغط لعرض ملف PDF.',
    viewPdf: 'عرض PDF ↗',
    names: ['الغلاف', 'الوسط', 'الداخلي العلوي', 'الداخلي السفلي', 'القاعدة'],
  },

  cta: {
    kicker: 'مرحلة النموذج الأولي',
    title: 'تواصل مع المؤسس',
    desc: 'نبحث عن شريك تصنيع للإنتاج بالمعادن الثمينة. حزمة الـ CAD والرسومات الهندسية متوفرة.',
    whatsapp: 'واتساب',
    whatsappMsg: 'أهتم بمنتج SABHA · سبحة — أريد أعرف أكثر',
    investorRoom: 'غرفة المستثمرين',
  },

  footer: {
    copy: '© 2026 مومن كرافتس · الرياض',
    tagline: 'SABHA · سبحة — دقة الطقوس، ذكاء مخفي',
  },
}
