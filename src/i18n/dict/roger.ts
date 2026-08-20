/* ROGER·AI product screen strings.
   English is the source of truth: add the key to `en`, then TypeScript
   forces the matching Arabic key in `ar`. */

export const en = {
  nav: {
    brand: '✦ MOMENCRAFTS',
    modes: 'Modes',
    hardware: 'Hardware',
    flow: 'How It Works',
    roadmap: 'Roadmap',
    cta: 'Request Access →',
    back: '← Investor Room',
    menuAria: 'Menu',
  },

  hero: {
    eyebrow: 'MOMENCRAFTS · HARDWARE DIVISION · RIYADH, KSA',
    titleName: 'ROGER·AI',
    titleEm: 'Voice of Intelligence',
    /** Accent line rendered in the opposite script, under the title. */
    titleAccent: 'صوت الذكاء',
    sub: 'A purpose-built handheld AI assistant — combining hardware engineering, voice AI, and radio integration into a single device designed for executives, field operators, and bilingual Arabic/English power users.',
    badges: {
      prototype: '🧪 PROTOTYPE · SPIN 1',
      mcu: 'ESP32-S3 · 240MHz',
      wireless: 'WiFi + BLE 5.0',
      pcb: '✓ PCB DESIGNED',
    },
    ctaPrimary: 'Request Access →',
    ctaSecondary: 'View Hardware ↓',
    deviceAlt: 'RogerAI Device',
    specTags: [
      'TFT Display',
      'PTT Button',
      'EC11 Encoder',
      'WS2812B × 8',
      'USB-C',
      '3W Speaker',
    ],
  },

  modes: {
    label: '02 · OPERATING MODES',
    title: 'Four Modes. One Device.',
    items: [
      {
        name: 'MODE 01',
        title: 'Voice',
        desc: 'Press PTT, speak, release. Roger processes your command in real time over WiFi — executive briefings, reminders, decisions.',
      },
      {
        name: 'MODE 02',
        title: 'Chat',
        desc: 'Persistent conversation thread on the TFT display. Navigate with the rotary encoder. Full Arabic/English bilingual.',
      },
      {
        name: 'MODE 03',
        title: 'AI Mode',
        desc: 'Autonomous intelligence layer — proactive reports, calendar awareness, decision support. Roger surfaces what you need before you ask.',
      },
      {
        name: 'MODE 04',
        title: 'Settings',
        desc: 'Configure WiFi, language, voice speed, LED brightness, radio PTT mode, and cloud sync from the device screen.',
      },
    ],
  },

  hardware: {
    label: '03 · HARDWARE ARCHITECTURE',
    title: '7-Block PCB Design',
    netsLabel: 'NETS: ',
    /** One name per HW_BLOCKS entry, in the same order. */
    blockNames: [
      'Power System',
      'MCU Core',
      'Audio System',
      'Display',
      'Controls',
      'Sensors',
      'Radio Expansion',
    ],
  },

  flow: {
    label: '04 · AI PROCESSING PIPELINE',
    title: 'From Voice to Intelligence',
    /** One label per FLOW_NODES entry; "\n" splits the label onto two lines. */
    nodes: [
      'PTT Press\nVoice Capture',
      'ES8388 Codec\nADC 24-bit',
      'ESP32-S3\n240MHz',
      'Gemini API\nCloud AI',
      'Supabase\nMemory',
      'MAX98357A\nAudio Out',
    ],
  },

  led: {
    label: '07 · LED STATUS RING',
    title: 'WS2812B × 8 — Live Demo',
    /** One entry per LED_MODES entry, in the same order. */
    modes: [
      { state: 'Listening', label: 'PTT held — capturing voice' },
      { state: 'Thinking',  label: 'AI processing request' },
      { state: 'Ready',     label: 'Response complete' },
      { state: 'Muted',     label: 'Microphone off' },
      { state: 'Idle',      label: 'Standby mode' },
    ],
  },

  cta: {
    overline: 'REQUEST ACCESS',
    titlePre: 'Ready to meet ',
    titleEm: 'ROGER·AI',
    titlePost: '?',
    sub: 'Join the private beta. Limited to 12 strategic partners and field operators.',
    primary: 'Request Access →',
    back: '← Investor Room',
    note: 'Hardware prototype · Riyadh, KSA · 2026',
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
    modes: 'الأوضاع',
    hardware: 'العتاد',
    flow: 'كيف يعمل',
    roadmap: 'خارطة الطريق',
    cta: 'طلب وصول ←',
    back: 'غرفة المستثمرين →',
    menuAria: 'القائمة',
  },

  hero: {
    eyebrow: 'مومن كرافتس · قسم العتاد · الرياض، السعودية',
    titleName: 'ROGER·AI',
    titleEm: 'صوت الذكاء',
    titleAccent: 'Voice of Intelligence',
    sub: 'مساعد ذكاء اصطناعي محمول مصمَّم لغرض واحد — يجمع هندسة العتاد والذكاء الصوتي وتكامل الاتصال اللاسلكي في جهاز واحد موجَّه للتنفيذيين ومشغّلي الميدان والمستخدمين المتقدّمين ثنائيي اللغة عربي/إنجليزي.',
    badges: {
      prototype: '🧪 نموذج أولي · الإصدار 1',
      mcu: 'ESP32-S3 · 240MHz',
      wireless: 'WiFi + BLE 5.0',
      pcb: '✓ اللوحة مُصمَّمة',
    },
    ctaPrimary: 'طلب وصول ←',
    ctaSecondary: 'استعرض العتاد ↓',
    deviceAlt: 'جهاز RogerAI',
    specTags: [
      'شاشة TFT',
      'زر PTT',
      'مُشفّر EC11',
      'WS2812B × 8',
      'USB-C',
      'سمّاعة 3W',
    ],
  },

  modes: {
    label: '٠٢ · أوضاع التشغيل',
    title: 'أربعة أوضاع. جهاز واحد.',
    items: [
      {
        name: 'الوضع ٠١',
        title: 'الصوت',
        desc: 'اضغط زر PTT، تكلّم، ثم أفلته. يعالج «روجر» أمرك لحظياً عبر WiFi — إحاطات تنفيذية وتذكيرات وقرارات.',
      },
      {
        name: 'الوضع ٠٢',
        title: 'المحادثة',
        desc: 'سلسلة محادثة متصلة على شاشة TFT، تتنقّل بينها عبر المُشفّر الدوّار. دعم كامل ثنائي اللغة عربي/إنجليزي.',
      },
      {
        name: 'الوضع ٠٣',
        title: 'وضع الذكاء',
        desc: 'طبقة ذكاء مستقلة — تقارير استباقية ووعي بالتقويم ودعم للقرار. يقدّم «روجر» ما تحتاجه قبل أن تطلبه.',
      },
      {
        name: 'الوضع ٠٤',
        title: 'الإعدادات',
        desc: 'اضبط WiFi واللغة وسرعة الصوت وسطوع مؤشرات LED ووضع PTT اللاسلكي والمزامنة السحابية من شاشة الجهاز.',
      },
    ],
  },

  hardware: {
    label: '٠٣ · معمارية العتاد',
    title: 'تصميم لوحة من ٧ كتل',
    netsLabel: 'المسارات: ',
    blockNames: [
      'نظام الطاقة',
      'نواة المتحكّم',
      'النظام الصوتي',
      'الشاشة',
      'عناصر التحكّم',
      'المستشعرات',
      'توسعة الاتصال اللاسلكي',
    ],
  },

  flow: {
    label: '٠٤ · مسار معالجة الذكاء الاصطناعي',
    title: 'من الصوت إلى الذكاء',
    nodes: [
      'ضغط زر PTT\nالتقاط الصوت',
      'مرمِّز ES8388\nتحويل ADC 24-bit',
      'ESP32-S3\n240MHz',
      'واجهة Gemini\nذكاء سحابي',
      'Supabase\nالذاكرة',
      'MAX98357A\nخرج الصوت',
    ],
  },

  led: {
    label: '٠٧ · حلقة مؤشّرات الحالة',
    title: 'WS2812B × 8 — عرض حي',
    modes: [
      { state: 'إنصات', label: 'زر PTT مضغوط — يلتقط الصوت' },
      { state: 'تفكير', label: 'الذكاء الاصطناعي يعالج الطلب' },
      { state: 'جاهز',  label: 'اكتمل الرد' },
      { state: 'كتم',   label: 'الميكروفون مغلق' },
      { state: 'خمول',  label: 'وضع الاستعداد' },
    ],
  },

  cta: {
    overline: 'طلب وصول',
    titlePre: 'هل أنت مستعد للقاء ',
    titleEm: 'ROGER·AI',
    titlePost: '؟',
    sub: 'انضم إلى النسخة التجريبية الخاصة. مقتصرة على ١٢ شريكاً استراتيجياً ومشغّلاً ميدانياً.',
    primary: 'طلب وصول ←',
    back: 'غرفة المستثمرين →',
    note: 'نموذج عتاد أولي · الرياض، السعودية · 2026',
  },

  footer: {
    brand: '✦ MOMENCRAFTS',
    copy: '© 2026 مومن كرافتس · جميع الحقوق محفوظة',
    back: 'غرفة المستثمرين →',
  },
}
