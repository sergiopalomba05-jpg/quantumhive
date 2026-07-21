const revealNodes = document.querySelectorAll('.reveal');
const modal = document.querySelector('.video-modal');
const modalVideo = modal?.querySelector('video');
const hero = document.querySelector('[data-hero]');
const heroVideo = document.querySelector('[data-hero-video]');
const hoverRevealCards = document.querySelectorAll('.hover-reveal-card');

const translations = {
  es: {
    nav_inicio: 'Inicio',
    nav_quantumcore: 'Quantum Core',
    nav_cartaviva: 'Carta Viva',
    nav_humania: 'HumanIA Chat',
    nav_contacto: 'Contacto',
    btn_ver_intro: 'Ver intro',
    hero_tag: 'Multi-Agent Business Infrastructure',
    hero_lede: 'QuantumHive construye asistentes de IA humanizados con voz en tiempo real, vision en tiempo real, presencia avatar y arquitectura multiagente para una nueva clase de operacion inteligente.',
    hero_btn_abrir: 'Ver secuencia',
    hero_btn_explorar: 'Explorar arquitectura',
    band_1: 'IA humanizada',
    band_2: 'Tiempo real',
    band_3: 'Vision contextual',
    band_4: 'Presencia avatar',
    band_5: 'Orquestacion multiagente',
    band_6: 'Infraestructura aplicada',
    system_tag: 'Sistema QuantumHive',
    system_title: 'No es una demo. Es una capa expandible de inteligencia aplicada.',
    system_statement: 'La parte visible puede hablar, mirar o habitar una interfaz. La parte no visible decide, conecta, ejecuta y sostiene el criterio de toda la experiencia.',
    system_note: 'Menos chat flotante. Mas sistema con identidad, criterio y capacidad de operar en el mundo real.',
    presence_tag: 'Nueva interfaz',
    presence_title: 'Cuando la IA adquiere voz, mirada y forma, cambia la percepcion del sistema entero.',
    presence_main_title: 'Una inteligencia que se siente viva.',
    presence_main_text: 'QuantumHive no se limita a responder texto. Construye una presencia capaz de conversar, observar, guiar, explicar y sostener una relacion mas rica entre empresa, interfaz y usuario.',
    presence_01_title: 'Voz con identidad',
    presence_01_text: 'Menos sintetico, mas cercano, mas memorable.',
    presence_02_title: 'Vision con contexto',
    presence_02_text: 'Lee escena, interfaz o situacion antes de responder.',
    presence_03_title: 'Avatar con rol',
    presence_03_text: 'No un truco visual. Una capa real de presencia de marca.',
    fronts_tag: 'Frentes de expansion',
    fronts_title: 'Una sola arquitectura. Multiples superficies de negocio.',
    fronts_cta: 'Empleados virtuales',
    fronts_manifesto_title: 'QuantumHive no nace para un nicho. Nace para ocupar una categoria.',
    fronts_manifesto_text: 'La misma capa de inteligencia puede convertirse en empleado virtual, interfaz comercial, operador asistido o presencia premium de marca sin perder coherencia.',
    front_01_title: 'Empleados virtuales',
    front_01_text: 'Recepcion, ventas, soporte, guiado y seguimiento con una presencia mucho mas avanzada que un bot plano.',
    front_02_title: 'Interfaces comerciales',
    front_02_text: 'Sistemas que explican, convierten y sostienen conversaciones con identidad propia.',
    front_03_title: 'Inteligencia operacional',
    front_03_text: 'Agentes que ordenan, coordinan, activan flujos y conectan decision con ejecucion.',
    manifesto_text: 'QuantumHive combina presencia humana, operacion en tiempo real y arquitectura aplicada para moverse donde la IA deja de ser promesa y empieza a parecer inevitable.',
    contact_tag: 'Contacto',
    contact_title: 'Si queres construir la proxima interfaz de tu empresa, empecemos por ahi.',
    contact_text: 'QuantumHive esta disenado para companias que quieren salir del modelo de interfaz vieja y entrar en una capa nueva de voz, vision, avatar y sistemas coordinados.',
    contact_btn_intro: 'Ver intro otra vez',
    footer_tagline: 'IA humanizada en tiempo real',
    modal_tag: 'Intro QuantumHive',
    modal_title: 'Secuencia de apertura',
    modal_close: 'Cerrar',
    loader_quantumcore: 'Cargando Quantum Core...',
    loader_cartaviva: 'Cargando Carta Viva...',
    loader_humania: 'Cargando HumanIA Chat...',
  },
  en: {
    nav_inicio: 'Home',
    nav_quantumcore: 'Quantum Core',
    nav_cartaviva: 'Carta Viva',
    nav_humania: 'HumanIA Chat',
    nav_contacto: 'Contact',
    btn_ver_intro: 'Watch intro',
    hero_tag: 'Multi-Agent Business Infrastructure',
    hero_lede: 'QuantumHive builds humanized AI assistants with real-time voice, real-time vision, avatar presence and multi-agent architecture for a new class of intelligent operation.',
    hero_btn_abrir: 'Play sequence',
    hero_btn_explorar: 'Explore architecture',
    band_1: 'Humanized AI',
    band_2: 'Real time',
    band_3: 'Contextual vision',
    band_4: 'Avatar presence',
    band_5: 'Multi-agent orchestration',
    band_6: 'Applied infrastructure',
    system_tag: 'QuantumHive System',
    system_title: "It's not a demo. It's an expandable layer of applied intelligence.",
    system_statement: 'The visible part can speak, see or inhabit an interface. The invisible part decides, connects, executes and sustains the criteria of the entire experience.',
    system_note: 'Less floating chat. More system with identity, criteria and ability to operate in the real world.',
    presence_tag: 'New interface',
    presence_title: 'When AI acquires voice, gaze and form, it changes the perception of the entire system.',
    presence_main_title: 'An intelligence that feels alive.',
    presence_main_text: 'QuantumHive is not limited to responding to text. It builds a presence capable of conversing, observing, guiding, explaining and sustaining a richer relationship between company, interface and user.',
    presence_01_title: 'Voice with identity',
    presence_01_text: 'Less synthetic, closer, more memorable.',
    presence_02_title: 'Vision with context',
    presence_02_text: 'Reads scene, interface or situation before responding.',
    presence_03_title: 'Avatar with role',
    presence_03_text: 'Not a visual trick. A real layer of brand presence.',
    fronts_tag: 'Expansion verticals',
    fronts_title: 'One architecture. Multiple business surfaces.',
    fronts_cta: 'Virtual employees',
    fronts_manifesto_title: 'QuantumHive is not born for a niche. It is born to occupy a category.',
    fronts_manifesto_text: 'The same layer of intelligence can become a virtual employee, commercial interface, assisted operator or premium brand presence without losing coherence.',
    front_01_title: 'Virtual employees',
    front_01_text: 'Reception, sales, support, guidance and follow-up with a presence far more advanced than a flat bot.',
    front_02_title: 'Commercial interfaces',
    front_02_text: 'Systems that explain, convert and sustain conversations with their own identity.',
    front_03_title: 'Operational intelligence',
    front_03_text: 'Agents that organize, coordinate, activate flows and connect decision with execution.',
    manifesto_text: 'QuantumHive combines human presence, real-time operation and applied architecture to move where AI stops being a promise and starts seeming inevitable.',
    contact_tag: 'Contact',
    contact_title: "If you want to build your company's next interface, let's start there.",
    contact_text: 'QuantumHive is designed for companies that want to leave the old interface model and enter a new layer of voice, vision, avatar and coordinated systems.',
    contact_btn_intro: 'Watch intro again',
    footer_tagline: 'Humanized AI in real time',
    modal_tag: 'QuantumHive Intro',
    modal_title: 'Opening sequence',
    modal_close: 'Close',
    loader_quantumcore: 'Loading Quantum Core...',
    loader_cartaviva: 'Loading Carta Viva...',
    loader_humania: 'Loading HumanIA Chat...',
  },
};

let currentLang = localStorage.getItem('qh-lang') || 'es';

function applyTranslations(lang) {
  currentLang = lang;
  localStorage.setItem('qh-lang', lang);
  document.documentElement.lang = lang;

  const t = translations[lang];
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (t[key]) {
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = t[key];
      } else {
        el.innerHTML = t[key];
      }
    }
  });

  const flagEl = document.getElementById('langFlag');
  if (flagEl) {
    flagEl.textContent = lang === 'es' ? 'EN' : 'ES';
  }
}

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      }
    },
    {
      threshold: 0.15,
      rootMargin: '0px 0px -40px 0px',
    },
  );

  revealNodes.forEach((node) => observer.observe(node));
} else {
  revealNodes.forEach((node) => node.classList.add('visible'));
}

function openVideoModal() {
  if (!modal) return;
  modal.hidden = false;
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

  if (modalVideo) {
    modalVideo.currentTime = 0;
    modalVideo.play().catch(() => {});
  }
}

function closeVideoModal() {
  if (!modal) return;
  modal.hidden = true;
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';

  if (modalVideo) {
    modalVideo.pause();
  }
}

document.querySelectorAll('[data-open-video="true"]').forEach((button) => {
  button.addEventListener('click', openVideoModal);
});

document.querySelectorAll('[data-close-video="true"]').forEach((button) => {
  button.addEventListener('click', closeVideoModal);
});

function setupHeroExperience() {
  if (!hero) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reducedMotion) {
    return;
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupHeroExperience, { once: true });
} else {
  setupHeroExperience();
}

hoverRevealCards.forEach((card) => {
  const imgSrc = card.getAttribute('data-reveal-img');
  const bgEl = card.querySelector('.hover-reveal-bg img');
  if (imgSrc && bgEl) {
    bgEl.src = imgSrc;
  }

  card.addEventListener('pointermove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.setProperty('--mx', x + 'px');
    card.style.setProperty('--my', y + 'px');
  });

  card.addEventListener('pointerenter', () => {
    card.classList.add('card-active');
  });

  card.addEventListener('pointerleave', () => {
    card.classList.remove('card-active');
  });
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeVideoModal();
  }
});

const langToggle = document.getElementById('langToggle');
if (langToggle) {
  langToggle.addEventListener('click', () => {
    const nextLang = currentLang === 'es' ? 'en' : 'es';
    applyTranslations(nextLang);
  });
}

applyTranslations(currentLang);

// ── TAB MANAGER LOGIC ──
const tabButtons = document.querySelectorAll('.nav-tab');
const tabPanels = document.querySelectorAll('.tab-panel');
const whatsappFab = document.querySelector('.whatsapp-fab');

function switchTab(tabId) {
  // 1. Si el tab es "contacto", abrimos "inicio" y escroleamos a contacto
  if (tabId === 'contacto') {
    switchTab('inicio');
    setTimeout(() => {
      const contactSection = document.getElementById('contacto');
      if (contactSection) {
        contactSection.scrollIntoView({ behavior: 'smooth' });
      }
    }, 150);
    return;
  }

  // 2. Desactivar todos los botones de tab y paneles
  tabButtons.forEach(btn => {
    if (btn.getAttribute('data-tab') === tabId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  tabPanels.forEach(panel => {
    if (panel.id === `tab-${tabId}`) {
      panel.classList.add('active');
      
      // 3. Carga diferida del iframe (Lazy-load src from data-src)
      const iframe = panel.querySelector('iframe');
      if (iframe) {
        const dataSrc = iframe.getAttribute('data-src');
        if (dataSrc && !iframe.getAttribute('src')) {
          const loader = panel.querySelector('.iframe-loader');
          
          // Ocultar loader cuando el iframe termine de cargar
          iframe.addEventListener('load', () => {
            if (loader) {
              loader.classList.add('fade-out');
              setTimeout(() => {
                loader.style.display = 'none';
              }, 400);
            }
          }, { once: true });
          
          iframe.setAttribute('src', dataSrc);
        }
      }
    } else {
      panel.classList.remove('active');
    }
  });

  // 4. Mostrar/Ocultar botón de WhatsApp según la pestaña (solo en "inicio")
  if (whatsappFab) {
    if (tabId === 'inicio') {
      whatsappFab.style.display = 'flex';
    } else {
      whatsappFab.style.display = 'none';
    }
  }

  // 5. Sincronizar el hash en la barra del navegador
  if (tabId === 'inicio') {
    history.replaceState(null, '', ' ');
  } else {
    history.replaceState(null, '', `#${tabId}`);
  }
}

// Event Listeners para clicks en pestañas
tabButtons.forEach(button => {
  button.addEventListener('click', (e) => {
    const tabId = button.getAttribute('data-tab');
    if (tabId) {
      e.preventDefault();
      switchTab(tabId);
    }
  });
});

// Inicialización según Hash de URL al cargar
window.addEventListener('DOMContentLoaded', () => {
  const hash = window.location.hash.substring(1); // ej: "quantumcore"
  if (hash && document.getElementById(`tab-${hash}`)) {
    switchTab(hash);
  } else if (hash === 'contacto') {
    switchTab('contacto');
  } else {
    switchTab('inicio');
  }
});
