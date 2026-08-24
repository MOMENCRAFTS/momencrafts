/* Tester portal strings. English is the source of truth. */

export const en = {
  badge: 'TESTER ACCESS',
  greeting: (name: string) => `Welcome, ${name}`,
  greetingAnon: 'Welcome',
  sub: 'Everything you need to test — builds, guides, and a direct line for bugs.',
  exit: 'Sign out',

  appsHeading: 'Your test builds',
  appsCount: (n: number) => (n === 1 ? '1 app assigned' : `${n} apps assigned`),

  stages: {
    alpha: 'ALPHA',
    beta: 'BETA',
    rc: 'RELEASE CANDIDATE',
    stable: 'STABLE',
  },

  meta: {
    version: 'Version',
    build: 'Build',
    size: 'Size',
    requires: 'Requires',
  },

  download: 'Download APK',
  downloading: 'Preparing…',
  downloadNote: 'Link expires in 5 minutes and is issued to you personally.',
  noBuild: 'Build coming soon',
  noBuildNote: 'No file uploaded for this app yet.',
  guide: 'User guide',
  reportBug: 'Report a bug',

  install: {
    heading: 'Installing on Android',
    steps: [
      'Tap Download APK — the file lands in your Downloads folder.',
      'Open it. Android will ask permission to install from this source; allow it once.',
      'If an older build is installed, uninstall it first — signatures differ between builds.',
      'Open the app and sign in with the details sent to you.',
    ],
  },

  bug: {
    heading: 'Found something?',
    body: 'Send it straight to the founder. Include what you did, what you expected, and what happened instead — a screenshot helps most.',
    cta: 'Report via WhatsApp',
    message: (app: string, version: string) =>
      `Bug report — ${app} ${version}\n\nWhat I did:\n\nWhat I expected:\n\nWhat happened:\n\nDevice:`,
    generic: 'Bug report — MomenCrafts test build\n\nWhat I did:\n\nWhat I expected:\n\nWhat happened:\n\nDevice:',
  },

  empty: {
    heading: 'No apps assigned yet',
    body: 'Your access key is valid, but no test builds are assigned to it. Message the founder and he will add you to a build.',
    cta: 'Message the founder',
    message: 'Hello Momen — my tester key works but no apps are assigned to it yet.',
  },

  error: {
    heading: "Couldn't load your apps",
    retry: 'Try again',
  },

  footer: 'Test builds are confidential. Please do not redistribute the files or share screenshots publicly.',

  /* ── Testing terms (shown once, before the portal) ── */
  terms: {
    title: 'TESTING TERMS',
    preparedFor: 'PREPARED FOR',
    intro: 'You are about to receive pre-release software from MomenCrafts. It is unfinished by design, and some of it handles real money and personal data.',
    points: [
      'Keep the builds and anything you see in them confidential.',
      'Do not redistribute the files, publish screenshots, or upload them anywhere.',
      'Do not decompile or reverse-engineer the apps.',
      'Feedback, bug reports, and suggestions you send may be used to improve the products.',
      'Use test data where you can. These are pre-release builds and may lose data.',
    ],
    logged: 'Your acceptance is logged against your access key.',
    accept: 'I agree — start testing',
    decline: 'Decline · Return to gate',
  },
}

export const ar: typeof en = {
  badge: 'وصول المختبرين',
  greeting: (name: string) => `أهلاً بك، ${name}`,
  greetingAnon: 'أهلاً بك',
  sub: 'كل ما تحتاجه للاختبار — النسخ، الأدلة، وخط مباشر للإبلاغ عن الأخطاء.',
  exit: 'تسجيل الخروج',

  appsHeading: 'نسخ الاختبار الخاصة بك',
  appsCount: (n: number) => (n === 1 ? 'تطبيق واحد مُسند إليك' : `${n} تطبيقات مُسندة إليك`),

  stages: {
    alpha: 'ألفا',
    beta: 'تجريبي',
    rc: 'نسخة مرشحة',
    stable: 'مستقر',
  },

  meta: {
    version: 'الإصدار',
    build: 'تاريخ البناء',
    size: 'الحجم',
    requires: 'يتطلب',
  },

  download: 'تحميل ملف APK',
  downloading: 'جارٍ التحضير…',
  downloadNote: 'ينتهي الرابط خلال ٥ دقائق وهو صادر باسمك أنت.',
  noBuild: 'النسخة قريباً',
  noBuildNote: 'لم يُرفع ملف لهذا التطبيق بعد.',
  guide: 'دليل الاستخدام',
  reportBug: 'الإبلاغ عن خلل',

  install: {
    heading: 'التثبيت على أندرويد',
    steps: [
      'اضغط «تحميل ملف APK» — سينزل الملف في مجلد التنزيلات.',
      'افتح الملف. سيطلب أندرويد إذناً بالتثبيت من هذا المصدر؛ اسمح به مرة واحدة.',
      'إن كانت لديك نسخة أقدم، احذفها أولاً — تختلف تواقيع النسخ بين الإصدارات.',
      'افتح التطبيق وسجّل الدخول بالبيانات المرسلة إليك.',
    ],
  },

  bug: {
    heading: 'وجدت مشكلة؟',
    body: 'أرسلها مباشرة إلى المؤسس. اذكر ما فعلته، وما توقعته، وما حدث فعلاً — وأرفق لقطة شاشة إن أمكن.',
    cta: 'أبلغ عبر واتساب',
    message: (app: string, version: string) =>
      `بلاغ خلل — ${app} ${version}\n\nما فعلته:\n\nما توقعته:\n\nما حدث:\n\nالجهاز:`,
    generic: 'بلاغ خلل — نسخة اختبار من مومن كرافتس\n\nما فعلته:\n\nما توقعته:\n\nما حدث:\n\nالجهاز:',
  },

  empty: {
    heading: 'لا توجد تطبيقات مُسندة بعد',
    body: 'رمز الوصول الخاص بك صالح، لكن لا توجد نسخ اختبار مسندة إليه. راسل المؤسس وسيضيفك إلى إحدى النسخ.',
    cta: 'راسل المؤسس',
    message: 'مرحباً مومن — رمز الاختبار الخاص بي يعمل لكن لا توجد تطبيقات مسندة إليه بعد.',
  },

  error: {
    heading: 'تعذّر تحميل تطبيقاتك',
    retry: 'أعد المحاولة',
  },

  footer: 'نسخ الاختبار سرية. نرجو عدم إعادة توزيع الملفات أو نشر لقطات الشاشة علناً.',

  terms: {
    title: 'شروط الاختبار',
    preparedFor: 'مُعدّ لـ',
    intro: 'أنت على وشك استلام برمجيات قبل إصدارها من مومن كرافتس. هي غير مكتملة بحكم طبيعتها، وبعضها يتعامل مع أموال حقيقية وبيانات شخصية.',
    points: [
      'حافظ على سرية النسخ وكل ما تطّلع عليه داخلها.',
      'لا تُعِد توزيع الملفات أو تنشر لقطات الشاشة أو ترفعها في أي مكان.',
      'لا تقم بفك أو عكس هندسة التطبيقات.',
      'قد تُستخدم ملاحظاتك وبلاغاتك واقتراحاتك في تحسين المنتجات.',
      'استخدم بيانات تجريبية قدر الإمكان. هذه نسخ ما قبل الإصدار وقد تفقد البيانات.',
    ],
    logged: 'يُسجَّل قبولك مقابل رمز الوصول الخاص بك.',
    accept: 'أوافق — ابدأ الاختبار',
    decline: 'رفض · العودة للبوابة',
  },
}
