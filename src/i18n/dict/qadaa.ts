/* qadaa screen strings.
   English is the source of truth: add the key to `en`, then TypeScript
   forces the matching Arabic key in `ar`. */

export const en = {
  meta: {
    /** document.title */
    title: 'QADAA · قضاء — Legal. Reimagined.',
  },

  /* ── WhatsApp prefill ── */
  whatsappMsg: "I'm interested in the QADAA platform — I'd like to know more.",

  /* ── Hero ── */
  hero: {
    imgAlt: 'Riyadh skyline at golden hour',
    badge: 'An end-to-end legal platform',
    headlineTop: 'Law.',
    headlineBottom: 'Reimagined.',
    sub: 'qadaa.law — the platform that connects clients with lawyers and powers case and document analysis, delivered as a clear, refined Arabic-first experience across Saudi Arabia and the UAE.',
    ctaPrimary: 'Talk to the founder',
    ctaSecondary: 'Explore the platform',
    chips: [
      '⚖ Civil disputes',
      '🏢 Corporate & investment',
      '🔒 Complete confidentiality',
      '🌐 Saudi Arabia · UAE',
    ],
    floatValue: '5 apps',
    floatLabel: 'One complete legal ecosystem',
    scroll: 'Discover',
  },

  /* ── Platform overview ── */
  platform: {
    label: 'The Platform',
    title: 'An ecosystem of five apps',
    sub: 'Every app is purpose-built for a single role — together they create a legal experience with no equal in the region.',
    apps: [
      {
        name: 'Client App',
        desc: 'Reach accredited lawyers, follow your cases, and send documents securely from your phone.',
        tags: ['iOS', 'Android'],
      },
      {
        name: 'Lawyer App',
        desc: 'Case management, hearing schedules, and AI-assisted contract review.',
        tags: ['iOS', 'Android'],
      },
      {
        name: 'Law Firm Dashboard',
        desc: 'Run your team, your invoicing, and your reporting from one complete web console.',
        tags: ['Web'],
      },
      {
        name: 'Admin Console',
        desc: 'Platform oversight, lawyer accreditation, and full operational reporting.',
        tags: ['Web'],
      },
      {
        name: 'AI Agent',
        desc: 'Contract analysis, risk extraction, and automated drafting of legal documents.',
        tags: ['AI', 'API'],
      },
    ],
  },

  /* ── Why Qadaa ── */
  why: {
    label: 'Why QADAA?',
    title: 'Built for the region. End to end.',
    items: [
      {
        title: 'Arabic first',
        desc: 'RTL interfaces, standards-grade Arabic legal language, and full bilingual support.',
      },
      {
        title: 'Legal AI',
        desc: 'Review contracts, surface risk, and draft documents in seconds.',
      },
      {
        title: 'Confidential and secure',
        desc: 'End-to-end encryption, multi-factor authentication, and infrastructure aligned with data-protection regulation.',
      },
      {
        title: 'KSA and the UAE',
        desc: 'Built around Saudi and Emirati regulation from day one.',
      },
    ],
  },

  /* ── Early access CTA ── */
  cta: {
    label: 'Early access',
    titleTop: 'Be among the first law firms',
    titleBottom: 'to shape the future of legal practice.',
    sub: 'We are building qadaa.law alongside the leading law firms in the region. Speak with the founder directly.',
    button: 'Start the conversation on WhatsApp',
    trust: 'One complete platform · 5 apps · Arabic first · legal AI',
  },

  /* ── Back bar ── */
  back: {
    link: 'Back to the portfolio',
    brand: 'qadaa.law — Legal. Reimagined.',
  },
}

export const ar: typeof en = {
  meta: {
    title: 'قضاء · QADAA — قانون. مُعاد تصوره.',
  },

  whatsappMsg: 'أهتم بمنصة QADAA · قضاء — أريد أعرف أكثر',

  hero: {
    imgAlt: 'أفق الرياض في الساعة الذهبية',
    badge: 'منصة قانونية متكاملة',
    headlineTop: 'قانون.',
    headlineBottom: 'مُعاد تصوره.',
    sub: 'qadaa.law — منصة تربط العملاء بالمحامين وتدعم تحليل القضايا والمستندات بتجربة عربية واضحة وراقية في المملكة العربية السعودية والإمارات.',
    ctaPrimary: 'تحدث مع المؤسس',
    ctaSecondary: 'استعرض المنصة',
    chips: [
      '⚖ نزاعات مدنية',
      '🏢 شركات & استثمار',
      '🔒 سرية تامة',
      '🌐 السعودية · الإمارات',
    ],
    floatValue: '٥ تطبيقات',
    floatLabel: 'منظومة قانونية متكاملة',
    scroll: 'اكتشف',
  },

  platform: {
    label: 'المنصة',
    title: 'منظومة من ٥ تطبيقات',
    sub: 'كل تطبيق صُمم بعناية لدور محدد — معاً يشكّلون تجربة قانونية لا مثيل لها في المنطقة.',
    apps: [
      {
        name: 'تطبيق العميل',
        desc: 'تواصل مع محامين معتمدين، تتبع قضاياك، وأرسل مستنداتك بأمان من هاتفك.',
        tags: ['iOS', 'Android'],
      },
      {
        name: 'تطبيق المحامي',
        desc: 'إدارة القضايا، مواعيد الجلسات، وتحليل العقود بمساعدة الذكاء الاصطناعي.',
        tags: ['iOS', 'Android'],
      },
      {
        name: 'لوحة مكتب المحاماة',
        desc: 'إدارة الفريق، الفواتير، والتقارير من لوحة ويب متكاملة.',
        tags: ['Web'],
      },
      {
        name: 'لوحة الإدارة',
        desc: 'مراقبة المنصة، الموافقة على المحامين، والتقارير التشغيلية الشاملة.',
        tags: ['Web'],
      },
      {
        name: 'وكيل الذكاء الاصطناعي',
        desc: 'تحليل العقود، استخراج المخاطر، وصياغة المستندات القانونية آلياً.',
        tags: ['AI', 'API'],
      },
    ],
  },

  why: {
    label: 'لماذا قضاء؟',
    title: 'مصمم للمنطقة. من الألف إلى الياء.',
    items: [
      {
        title: 'عربي أولاً',
        desc: 'واجهات RTL، نصوص قانونية معيارية بالعربية، ودعم ثنائي اللغة.',
      },
      {
        title: 'ذكاء اصطناعي قانوني',
        desc: 'تحليل عقود، استخراج مخاطر، وصياغة مستندات في ثوانٍ.',
      },
      {
        title: 'سرية وأمان',
        desc: 'تشفير كامل، مصادقة متعددة، وبنية تحتية متوافقة مع أنظمة البيانات.',
      },
      {
        title: 'المملكة والإمارات',
        desc: 'مُكيَّف مع النظام السعودي والإماراتي من أول يوم.',
      },
    ],
  },

  cta: {
    label: 'وصول مبكر',
    titleTop: 'كن من أوائل مكاتب المحاماة',
    titleBottom: 'التي تشكّل المستقبل القانوني.',
    sub: 'نحن نبني qadaa.law بالتعاون مع مكاتب المحاماة الرائدة في المنطقة. تحدث مع المؤسس مباشرةً.',
    button: 'ابدأ المحادثة على واتساب',
    trust: 'منصة متكاملة · ٥ تطبيقات · عربي أولاً · ذكاء اصطناعي قانوني',
  },

  back: {
    link: 'العودة إلى المحفظة',
    brand: 'qadaa.law — قانون. مُعاد تصوره.',
  },
}
