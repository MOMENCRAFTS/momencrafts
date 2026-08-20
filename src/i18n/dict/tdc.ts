/* Turbo Drone Circuit (TDC) product screen strings.
   English is the source of truth: add the key to `en`, then TypeScript
   forces the matching Arabic key in `ar`.

   Part numbers, net names, packages, voltages and currents stay in Latin
   script in both languages — only the surrounding prose is translated. */

export const en = {
  nav: {
    brandBold: 'MOMEN',
    brandRest: 'CRAFTS',
    how: 'HOW IT WORKS',
    specs: 'SPECS',
    sequence: 'SEQUENCE',
    bom: 'BOM',
    github: 'GITHUB ↗',
  },

  hero: {
    label: 'HARDWARE DIVISION · REV 1.1',
    titleTop: 'Turbo Drone',
    titleAccent: 'Circuit',
    sub: "A 25×25mm supercapacitor series injection board that boosts your FPV drone's voltage by 15% on-demand. One switch. 150 amps. Instant power.",
    stats: [
      { val: '25',   unit: 'mm', label: 'BOARD SIZE' },
      { val: '150',  unit: 'A',  label: 'BURST CURRENT' },
      { val: '19.3', unit: 'V',  label: 'PEAK OUTPUT' },
      { val: '4',    unit: 'oz', label: 'COPPER WEIGHT' },
    ],
    ctaSpecs: 'VIEW SPECS',
    ctaGithub: 'GITHUB',
  },

  board: {
    alt: 'TDC Rev 1.1 PCB',
  },

  features: {
    h3: 'WHAT IS IT',
    h2: "Raw Power in a Quarter's Footprint",
    lead: 'The TDC sits between your battery and ESC. Flip a switch — it adds a supercapacitor in series, instantly boosting voltage.',
    cards: [
      {
        icon: '⚡',
        title: '4-Switch Series Injection',
        desc: 'True series topology. V1 + V2 stacks to 19.3V. Not a parallel boost — actual voltage addition.',
      },
      {
        icon: '🔒',
        title: 'Galvanic Isolation',
        desc: 'FC trigger is optocoupled. Charger uses isolated DC-DC. Your flight controller never sees noise.',
      },
      {
        icon: '🔋',
        title: 'USB-C Charged',
        desc: 'Any USB-C cable. B0505S-2WR3 isolated converter + LM317 charges to 2.50V in under 3 minutes.',
      },
      {
        icon: '🏎️',
        title: '150A Through 19 MOSFETs',
        desc: 'Each bank: 3× IRLR7843 in parallel, back-to-back. Total path: 21mΩ. Bypass adds only 2.7mΩ.',
      },
      {
        icon: '🎯',
        title: 'Analog Sequencing',
        desc: 'No MCU. RC delays + Schmitt triggers sequence everything. Zero firmware risk.',
      },
    ],
  },

  how: {
    h3: 'HOW IT WORKS',
    h2: 'Two Modes, One Switch',
    lead: 'FC servo channel controls everything. Low = normal. High = turbo.',
    normal: {
      badge: 'NORMAL MODE',
      voltage: '16.8',
      unit: 'V',
      desc: 'Battery → bypass bank → ESC. Supercap floating. Only 2.7mΩ added.',
      path: 'V1+ → [BYPASS: 6× IRLR7843] → VL+',
    },
    turbo: {
      badge: 'TURBO MODE',
      voltage: '19.3',
      unit: 'V',
      boostTag: '+15%',
      desc: 'Bypass opens. Battery flows through supercap in series. More RPM. More thrust.',
      path: 'V1+ → [LOWER: 6×] → V2− → CAP → V2+ → [UPPER: 6×] → VL+',
    },
  },

  sequence: {
    h3: 'INJECTION SEQUENCE',
    h2: '9 Milliseconds to Turbo',
    lead: 'Cascaded RC delays ensure each stage engages in order — no shoot-through, no voltage gaps.',
    steps: [
      {
        time: 'T+0MS',
        label: 'TRIGGER',
        title: 'INJ_EN Goes High',
        desc: 'FC servo signal → optocoupler → RC filter → Schmitt trigger → clean digital edge.',
      },
      {
        time: 'T+0MS',
        label: 'PRECHARGE',
        title: 'Inrush Protection (~3ms)',
        desc: 'Differentiator fires a 3ms pulse through 8.2Ω (2A peak). Auto-off — no firmware.',
      },
      {
        time: 'T+5MS',
        label: 'LOWER',
        title: 'V1+ Connected to V2−',
        desc: '82kΩ delay → BSS84 P-ch ON → VG_RAIL (30V) drives lower bank. 6 MOSFETs engage.',
      },
      {
        time: 'T+7MS',
        label: 'UPPER',
        title: 'V2+ Connected to VL+',
        desc: '115kΩ delay → upper bank ON. Current flows V1+ → Cap → VL+. Series path complete.',
      },
      {
        time: 'T+9MS',
        label: 'BYPASS OFF',
        title: 'Direct Path Disconnected',
        desc: '150kΩ delay → 2N7002 pulls bypass gates. Opens last, after series is conducting.',
      },
    ],
  },

  specs: {
    h3: 'SPECIFICATIONS',
    h2: 'Engineering Details',
    rows: [
      ['BOARD SIZE',        '25 × 25 mm'],
      ['LAYERS',            '4 (4oz / 1oz / 1oz / 4oz)'],
      ['V1 INPUT',          '4S LiPo: 14.8–16.8V'],
      ['V2 SUPERCAP',       '≤ 2.5V'],
      ['VL NORMAL',         '14.8–16.8V'],
      ['VL INJECTION',      '17.3–19.3V (+15%)'],
      ['BURST CURRENT',     '150A (3× parallel per bank)'],
      ['PATH RESISTANCE',   '20.4mΩ (injection)'],
      ['BYPASS RESISTANCE', '2.7mΩ (normal)'],
      ['MOSFET',            'IRLR7843PbF × 19'],
      ['GATE DRIVE',        'TPS61041 boost → 30V'],
      ['GATE VGS',          '11–15V all banks'],
      ['CHARGING',          'USB-C 5V → ~150mA'],
      ['CHARGE TIME (10F)', '~2.8 min'],
      ['TRIGGER',           'FC servo (50Hz PWM)'],
      ['ISOLATION',         'Galvanic (opto + DC-DC)'],
      ['PROTECTION',        'TVS + Zener + snubber'],
      ['FABRICATION',       'JLCPCB 4-layer'],
    ],
  },

  bom: {
    h3: 'BILL OF MATERIALS',
    h2: '~95 Components, All LCSC',
    headers: { group: 'GROUP', qty: 'QTY', part: 'PART', pkg: 'PKG' },
    rows: [
      ['Power MOSFETs',    '19', 'IRLR7843PbF',   'SO-8'],
      ['Gate Switch N-ch', '4',  '2N7002',        'SOT-23'],
      ['Gate Switch P-ch', '3',  'BSS84',         'SOT-23'],
      ['Boost Converter',  '1',  'TPS61041DBV',   'SOT-23-5'],
      ['Buck Regulator',   '1',  'AP63205WU',     'SOT-23-6'],
      ['Isolated DC-DC',   '1',  'B0505S-2WR3',   'SIP-4'],
      ['Voltage Reg',      '1',  'LM317',         'SOT-223'],
      ['Comparator',       '1',  'LM393',         'SO-8'],
      ['Schmitt Triggers', '5',  'TC7S14F',       'SOT-353'],
      ['Optocoupler',      '1',  'EL357N-G',      'SOP-4'],
      ['TVS Diode',        '1',  'SMCJ24CA',      'SMC'],
      ['Zener Clamps',     '10', 'BZT52C15S',     'SOD-323'],
      ['Bulk Caps',        '4',  '47µF/25V MLCC', '1210'],
      ['Connectors',       '1',  'USB-C',         'SMD'],
      ['Edge Pads',        '8',  'Castellated',   '4mm/2mm'],
    ],
  },

  gallery: {
    h3: 'VISUALS',
    h2: 'Design Gallery',
    alt: (n: number) => `TDC visual ${n}`,
  },

  stackup: {
    h3: 'PCB STACKUP',
    h2: '4 Layers of Engineered Copper',
    /** One entry per rendered layer, in the same order as TDC_LAYERS. */
    layers: [
      { label: 'L1 · F.Cu · 4oz (140µm)',  desc: 'POWER MOSFETs' },
      { label: 'Prepreg · 0.2mm',          desc: '' },
      { label: 'L2 · In1.Cu · 1oz (35µm)', desc: 'V1+ POWER PLANE' },
      { label: 'Core · 0.8mm · FR4',       desc: '' },
      { label: 'L3 · In2.Cu · 1oz (35µm)', desc: 'GND PLANE (V1−)' },
      { label: 'Prepreg · 0.2mm',          desc: '' },
      { label: 'L4 · B.Cu · 4oz (140µm)',  desc: 'CHARGER + CONTROL' },
    ],
  },

  cta: {
    h3: 'OPEN SOURCE HARDWARE',
    h2: 'Build Your Own',
    lead: 'KiCad source, BOM, design notes — everything for JLCPCB.',
    github: 'VIEW ON GITHUB',
    back: '← INVESTOR ROOM',
  },

  footer: {
    copy: '© 2026 MOMENCRAFTS · RIYADH',
    tagline: 'TDC — TURBO DRONE CIRCUIT · REV 1.1 · DESIGNED IN SAUDI ARABIA',
  },
}

export const ar: typeof en = {
  nav: {
    brandBold: 'MOMEN',
    brandRest: 'CRAFTS',
    how: 'كيف تعمل',
    specs: 'المواصفات',
    sequence: 'التسلسل',
    bom: 'قائمة المواد',
    github: 'GITHUB ↗',
  },

  hero: {
    label: 'قسم العتاد · الإصدار 1.1',
    titleTop: 'Turbo Drone',
    titleAccent: 'Circuit',
    sub: 'لوحة حقن تسلسلي بمكثّف فائق قياس 25×25 مم ترفع جهد طائرة FPV لديك بنسبة 15% عند الطلب. مفتاح واحد. 150 أمبير. قدرة فورية.',
    stats: [
      { val: '25',   unit: 'mm', label: 'مقاس اللوحة' },
      { val: '150',  unit: 'A',  label: 'تيار الذروة' },
      { val: '19.3', unit: 'V',  label: 'أقصى خرج' },
      { val: '4',    unit: 'oz', label: 'وزن النحاس' },
    ],
    ctaSpecs: 'عرض المواصفات',
    ctaGithub: 'GITHUB',
  },

  board: {
    alt: 'لوحة TDC الإصدار 1.1',
  },

  features: {
    h3: 'ما هي',
    h2: 'قدرة خام بمساحة قطعة نقدية',
    lead: 'تُركَّب TDC بين البطارية ووحدة ESC. اقلب المفتاح — فتضيف مكثّفاً فائقاً على التوالي ويرتفع الجهد فوراً.',
    cards: [
      {
        icon: '⚡',
        title: 'حقن تسلسلي بأربعة مفاتيح',
        desc: 'طوبولوجيا تسلسلية حقيقية. يتراكم V1 + V2 حتى 19.3V. ليس تعزيزاً على التوازي — بل جمع فعلي للجهد.',
      },
      {
        icon: '🔒',
        title: 'عزل كلفاني',
        desc: 'إشارة الإطلاق من متحكّم الطيران معزولة ضوئياً، والشاحن يستخدم محوّل DC-DC معزولاً. لا تصل أي ضوضاء إلى متحكّم الطيران.',
      },
      {
        icon: '🔋',
        title: 'شحن عبر USB-C',
        desc: 'أي كابل USB-C. محوّل B0505S-2WR3 المعزول مع LM317 يشحن حتى 2.50V في أقل من 3 دقائق.',
      },
      {
        icon: '🏎️',
        title: '150A عبر 19 ترانزستور MOSFET',
        desc: 'كل مجموعة: 3× IRLR7843 على التوازي، ظهراً لظهر. إجمالي المسار: 21mΩ. ولا يضيف مسار التجاوز سوى 2.7mΩ.',
      },
      {
        icon: '🎯',
        title: 'تسلسل تناظري',
        desc: 'بلا متحكّم دقيق. تأخيرات RC ومشغّلات شميت تتولّى الترتيب بالكامل. ولا مخاطر برمجية إطلاقاً.',
      },
    ],
  },

  how: {
    h3: 'كيف تعمل',
    h2: 'وضعان، ومفتاح واحد',
    lead: 'قناة سيرفو متحكّم الطيران تتحكّم بكل شيء. منخفض = عادي. مرتفع = توربو.',
    normal: {
      badge: 'الوضع العادي',
      voltage: '16.8',
      unit: 'V',
      desc: 'البطارية ← مجموعة التجاوز ← ESC. المكثّف الفائق خارج المسار. لا تُضاف سوى 2.7mΩ.',
      path: 'V1+ → [BYPASS: 6× IRLR7843] → VL+',
    },
    turbo: {
      badge: 'وضع التوربو',
      voltage: '19.3',
      unit: 'V',
      boostTag: '+15%',
      desc: 'يُفتح مسار التجاوز، فيمر تيار البطارية عبر المكثّف الفائق على التوالي. دورات أعلى. ودفع أكبر.',
      path: 'V1+ → [LOWER: 6×] → V2− → CAP → V2+ → [UPPER: 6×] → VL+',
    },
  },

  sequence: {
    h3: 'تسلسل الحقن',
    h2: '9 ميلي ثانية حتى التوربو',
    lead: 'تأخيرات RC المتتالية تضمن دخول كل مرحلة في ترتيبها — بلا تيار عابر ولا فجوات في الجهد.',
    steps: [
      {
        time: 'T+0MS',
        label: 'الإطلاق',
        title: 'ارتفاع إشارة INJ_EN',
        desc: 'إشارة سيرفو متحكّم الطيران ← عازل ضوئي ← مرشّح RC ← مشغّل شميت ← حافة رقمية نظيفة.',
      },
      {
        time: 'T+0MS',
        label: 'الشحن المسبق',
        title: 'حماية من تيار الاندفاع (~3ms)',
        desc: 'تُطلق دائرة التفاضل نبضة مدتها 3ms عبر 8.2Ω (ذروة 2A). تتوقف ذاتياً — بلا برمجيات.',
      },
      {
        time: 'T+5MS',
        label: 'المجموعة السفلى',
        title: 'توصيل V1+ بـ V2−',
        desc: 'تأخير 82kΩ ← تشغيل BSS84 من نوع P ← خط VG_RAIL (30V) يقود المجموعة السفلى. تدخل 6 ترانزستورات MOSFET.',
      },
      {
        time: 'T+7MS',
        label: 'المجموعة العليا',
        title: 'توصيل V2+ بـ VL+',
        desc: 'تأخير 115kΩ ← تشغيل المجموعة العليا. يسري التيار V1+ ← المكثّف ← VL+. اكتمل المسار التسلسلي.',
      },
      {
        time: 'T+9MS',
        label: 'إيقاف التجاوز',
        title: 'فصل المسار المباشر',
        desc: 'تأخير 150kΩ ← يسحب 2N7002 بوابات التجاوز. يُفتح أخيراً بعد أن يبدأ المسار التسلسلي بالتوصيل.',
      },
    ],
  },

  specs: {
    h3: 'المواصفات',
    h2: 'التفاصيل الهندسية',
    rows: [
      ['مقاس اللوحة',        '25 × 25 مم'],
      ['الطبقات',            '4 (4oz / 1oz / 1oz / 4oz)'],
      ['دخل V1',             '4S LiPo: 14.8–16.8V'],
      ['المكثّف الفائق V2',   '≤ 2.5V'],
      ['VL في الوضع العادي',  '14.8–16.8V'],
      ['VL أثناء الحقن',      '17.3–19.3V (+15%)'],
      ['تيار الذروة',         '150A (3× على التوازي لكل مجموعة)'],
      ['مقاومة المسار',       '20.4mΩ (أثناء الحقن)'],
      ['مقاومة التجاوز',      '2.7mΩ (الوضع العادي)'],
      ['ترانزستورات MOSFET',  'IRLR7843PbF × 19'],
      ['قيادة البوابات',       'معزّز TPS61041 ← 30V'],
      ['جهد البوابة VGS',     '11–15V لجميع المجموعات'],
      ['الشحن',              'USB-C 5V ← ~150mA'],
      ['زمن الشحن (10F)',     '~2.8 دقيقة'],
      ['الإطلاق',             'سيرفو متحكّم الطيران (PWM بتردد 50Hz)'],
      ['العزل',               'كلفاني (عازل ضوئي + DC-DC)'],
      ['الحماية',             'TVS + زينر + دائرة إخماد'],
      ['التصنيع',             'JLCPCB بأربع طبقات'],
    ],
  },

  bom: {
    h3: 'قائمة المواد',
    h2: '~95 مكوّناً، جميعها من LCSC',
    headers: { group: 'المجموعة', qty: 'العدد', part: 'القطعة', pkg: 'الحزمة' },
    rows: [
      ['ترانزستورات القدرة', '19', 'IRLR7843PbF',   'SO-8'],
      ['مفتاح بوابة نوع N',  '4',  '2N7002',        'SOT-23'],
      ['مفتاح بوابة نوع P',  '3',  'BSS84',         'SOT-23'],
      ['محوّل رافع للجهد',    '1',  'TPS61041DBV',   'SOT-23-5'],
      ['منظّم خافض للجهد',    '1',  'AP63205WU',     'SOT-23-6'],
      ['محوّل DC-DC معزول',  '1',  'B0505S-2WR3',   'SIP-4'],
      ['منظّم جهد',          '1',  'LM317',         'SOT-223'],
      ['مقارن تناظري',       '1',  'LM393',         'SO-8'],
      ['مشغّلات شميت',       '5',  'TC7S14F',       'SOT-353'],
      ['عازل ضوئي',         '1',  'EL357N-G',      'SOP-4'],
      ['ثنائي حماية TVS',    '1',  'SMCJ24CA',      'SMC'],
      ['مثبّتات زينر',        '10', 'BZT52C15S',     'SOD-323'],
      ['مكثّفات تخزين',      '4',  '47µF/25V MLCC', '1210'],
      ['الموصّلات',          '1',  'USB-C',         'SMD'],
      ['وسائد الحافة',       '8',  'حواف مسنّنة',    '4mm/2mm'],
    ],
  },

  gallery: {
    h3: 'صور ومخططات',
    h2: 'معرض التصميم',
    alt: (n: number) => `صورة TDC رقم ${n}`,
  },

  stackup: {
    h3: 'تركيب طبقات اللوحة',
    h2: 'أربع طبقات من النحاس المُهندَس',
    layers: [
      { label: 'L1 · F.Cu · 4oz (140µm)',  desc: 'ترانزستورات القدرة' },
      { label: 'Prepreg · 0.2mm',          desc: '' },
      { label: 'L2 · In1.Cu · 1oz (35µm)', desc: 'مستوى قدرة V1+' },
      { label: 'Core · 0.8mm · FR4',       desc: '' },
      { label: 'L3 · In2.Cu · 1oz (35µm)', desc: 'مستوى الأرضي (V1−)' },
      { label: 'Prepreg · 0.2mm',          desc: '' },
      { label: 'L4 · B.Cu · 4oz (140µm)',  desc: 'الشاحن + التحكّم' },
    ],
  },

  cta: {
    h3: 'عتاد مفتوح المصدر',
    h2: 'اصنع نسختك',
    lead: 'ملفات KiCad وقائمة المواد وملاحظات التصميم — كل ما يلزم للتصنيع لدى JLCPCB.',
    github: 'اعرضها على GITHUB',
    back: 'غرفة المستثمرين →',
  },

  footer: {
    copy: '© 2026 مومن كرافتس · الرياض',
    tagline: 'TDC — TURBO DRONE CIRCUIT · الإصدار 1.1 · صُمّمت في السعودية',
  },
}
