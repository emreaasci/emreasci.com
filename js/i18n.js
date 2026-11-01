'use strict';

(function (global) {
  const STORAGE_KEY = 'lang';
  const LANGS = ['tr', 'en'];

  const en = {
    'meta.title': 'Emre Aşcı — React Native Developer',
    'meta.description': 'Computer engineer building iOS and Android apps with React Native and Expo. 20,000+ downloads, 10,000+ active users.',

    'nav.about': 'About',
    'nav.experience': 'Experience',
    'nav.projects': 'Projects',
    'nav.skills': 'Skills',
    'nav.contact': 'Contact',

    'hero.summary': "I'm a computer engineer with 2+ years of experience building iOS and Android apps with React Native and Expo. From enterprise HR apps to e-commerce, real-time communication to OCR, I turn ideas into products that ship to the stores.",

    'hero.hint': 'Move your mouse',
    'hero.scroll': 'Scroll down',

    'stats.downloads': 'downloads',
    'stats.users': 'active users',
    'stats.years': 'years of experience',
    'stats.projects': 'shipped projects',

    'experience.date': '09/2024 — Present',
    'experience.location': 'Istanbul',
    'experience.b1': 'Built the Intime HR app with 20 modules including time tracking, leave and expenses: 20,000+ downloads and 10,000+ active users.',
    'experience.b2': 'Fine-tuned PaddleOCR to pull the merchant, date and amount straight from a receipt photo in the expenses module.',
    'experience.b3': 'Built and shipped the AdilPazar e-commerce app for iOS and Android from scratch, on my own (10,000+ downloads).',
    'experience.b4': 'Built real-time messaging with SignalR/WebSocket, VoIP with Linphone SDK, and location tracking that keeps working while the app is closed.',
    'experience.b5': 'Fine-tuned Whisper into a speech-to-text model for PBX calls, and ran release pipelines with EAS, TestFlight and Google Play.',

    'projects.kpi.downloads': 'downloads',
    'projects.kpi.users': 'active users',
    'projects.kpi.solo': 'development',
    'projects.intime-ik.desc': 'An HR app with 20 modules covering time tracking, leave, expenses and advances. The expenses module fills itself in from a receipt photo using OCR.',
    'projects.adilpazar.desc': 'An e-commerce app for iOS and Android. I built and shipped it from scratch on my own; Firebase and Meta Ads integrations made its campaigns measurable.',
    'projects.yeni-nesil-ik.desc': 'An HR app I spun off as a separate product by adapting the Intime HR codebase to a different brand.',
    'projects.nika-ik.desc': 'Another HR app derived from the same codebase, live under its own brand.',
    'projects.intime-takip.desc': 'Tracks field staff during working hours with location updates, even while the app is closed.',
    'projects.tag.bglocation': 'Background location',
    'projects.zaferzone.desc': 'A school app that instantly notifies parents about check-ins, check-outs and late arrivals, with parent, student, teacher and security roles.',
    'projects.tag.push': 'Push notifications',
    'projects.nikachat.desc': 'A real-time messaging and file sharing app.',
    'projects.nikaconnect.desc': 'A communication app combining messaging, voice and video calls.',
    'projects.nikaphone.desc': 'A native-module based voice and video calling app that connects to an Asterisk PBX over SIP.',

    'skills.mobile': 'Mobile',
    'skills.ui': 'UI and state',
    'skills.realtime': 'Real-time communication',
    'skills.device': 'Device features',
    'skills.device.list': 'Bluetooth Low Energy, NFC (HCE), camera and QR, maps, background location, offline with SQLite',
    'skills.devops': 'Release and DevOps',
    'skills.ai': 'AI',
    'skills.ai.list': 'Python, PaddleOCR, Whisper and Faster-Whisper fine-tuning, AI-assisted development with Claude Code',

    'education.degree': "Computer Engineering, Bachelor's",

    'contact.title': "Let's build something together",
    'contact.lead': 'Write to me about a new app idea, a job offer, or just to say hi.',

    'phone.back': 'Back',
    'phone.tab.app': 'App',
    'phone.tab.info': 'About',
    'phone.hint': 'Tap an app',

    'footer.top': 'Back to top ↑',
  };

  function getStoredLang() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return null;
    }
  }

  function setStoredLang(lang) {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (e) {
      // Gizli sekme vb.: seçim bu oturumla sınırlı kalır
    }
  }

  function detectLang(navLangs, stored) {
    if (LANGS.includes(stored)) return stored;
    for (const l of navLangs || []) {
      const code = String(l).toLowerCase();
      if (code.startsWith('tr')) return 'tr';
      if (code.startsWith('en')) return 'en';
    }
    return 'en';
  }

  function applyLang(lang, root = document) {
    const doc = root.ownerDocument || root;
    const meta = doc.querySelector('meta[name="description"]');

    // İlk çağrıda TR metinleri sakla ki geri dönülebilsin
    if (!doc.documentElement.dataset.i18nReady) {
      root.querySelectorAll('[data-i18n]').forEach((el) => { el.dataset.i18nTr = el.textContent; });
      doc.documentElement.dataset.i18nTitleTr = doc.title;
      if (meta) meta.dataset.i18nTr = meta.content;
      doc.documentElement.dataset.i18nReady = '1';
    }

    const t = (key, trText) => (lang === 'en' && en[key]) || trText;
    root.querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = t(el.dataset.i18n, el.dataset.i18nTr);
    });
    doc.title = t('meta.title', doc.documentElement.dataset.i18nTitleTr);
    if (meta) meta.content = t('meta.description', meta.dataset.i18nTr);

    doc.documentElement.lang = lang;
    const toggle = doc.getElementById('lang-toggle');
    if (toggle) {
      const next = lang === 'tr' ? 'en' : 'tr';
      toggle.textContent = next.toUpperCase();
      toggle.setAttribute('aria-label', next === 'en' ? 'Switch to English' : 'Türkçeye geç');
    }
  }

  global.I18N = { en, detectLang, getStoredLang, setStoredLang, applyLang };

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
      let lang = detectLang(navigator.languages || [navigator.language], getStoredLang());
      applyLang(lang);
      const toggle = document.getElementById('lang-toggle');
      if (toggle) {
        toggle.addEventListener('click', () => {
          lang = lang === 'tr' ? 'en' : 'tr';
          setStoredLang(lang);
          applyLang(lang);
        });
      }
    });
  }
})(window);
