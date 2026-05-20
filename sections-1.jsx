// Shared utility components & hooks for the main site.
// Loaded before app.jsx; exports to window.

const { useState, useEffect, useRef, useCallback, useMemo } = React;

// ---------------------- Reveal-on-scroll hook ----------------------
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal:not(.in)');
    if (!els.length) return;

    // Immediate first-paint pass: anything already in (or near) viewport reveals now.
    const initial = () => {
      els.forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight - 40 && r.bottom > 0) {
          el.classList.add('in');
        }
      });
    };
    initial();

    // Then keep watching for elements scrolled into view.
    let io = null;
    if (typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver((entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
      els.forEach(el => { if (!el.classList.contains('in')) io.observe(el); });
    }

    // Scroll-based fallback in case IO is unreliable (sandboxed iframes).
    const onScroll = () => {
      document.querySelectorAll('.reveal:not(.in)').forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight - 40 && r.bottom > 0) el.classList.add('in');
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    return () => {
      if (io) io.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  });
}

// ---------------------- Store subscription hook ----------------------
function useStore() {
  const [data, setData] = useState(() => window.GGStore.load());
  useEffect(() => {
    setData(window.GGStore.load());
    return window.GGStore.subscribe(setData);
  }, []);
  return data;
}

// ---------------------- Parallax for background pattern ----------------------
function useParallaxBg(speed = 0.15) {
  useEffect(() => {
    const el = document.querySelector('.pattern-bg');
    if (!el) return;
    let raf = null;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        const y = window.scrollY * speed;
        el.style.setProperty('--pattern-shift', `-${y}px`);
        raf = null;
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [speed]);
}

// ---------------------- Nav bar ----------------------
function Nav() {
  return (
    <nav className="nav">
      <a className="nav-brand" href="#top">
        <span className="nav-brand-mark">d</span>
        咕嚕咕嚕雙腸搗蛋
      </a>
      <div className="nav-links">
        <a href="#story">關於我們</a>
        <a href="#services">美容服務</a>
        <a href="#boarding">寄宿</a>
        <a href="#gallery">寶貝相簿</a>
        <a href="#videos">影片日常</a>
      </div>
      <a className="nav-cta" href="#booking">預約 ▸</a>
    </nav>
  );
}

// ---------------------- Image slot wrapper — reads from GGStore.images map ----------------------
function PetImg({ id, placeholder, data, className = '' }) {
  const url = data?.images?.[id];
  if (url) {
    return <img src={url} alt={placeholder} className={'pet-img ' + className} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
  }
  return (
    <div className={'pet-placeholder ' + className}>
      <div className="ph-icon">
        <svg viewBox="0 0 40 40" width="32" height="32">
          <ellipse cx="20" cy="26" rx="14" ry="4" fill="currentColor" opacity="0.18"/>
          <rect x="6" y="18" width="22" height="6" rx="3" fill="currentColor" opacity="0.6"/>
          <circle cx="29" cy="20" r="5" fill="currentColor" opacity="0.6"/>
          <rect x="8" y="22" width="3" height="6" rx="1.5" fill="currentColor" opacity="0.8"/>
          <rect x="22" y="22" width="3" height="6" rx="1.5" fill="currentColor" opacity="0.8"/>
        </svg>
      </div>
      <div className="ph-label">{placeholder}</div>
      <div className="ph-hint">後台上傳照片</div>
    </div>
  );
}

// ---------------------- Hero section ----------------------
function Hero({ data }) {
  const h = data.hero;
  return (
    <header className="hero" id="top">
      <div className="hero-meta">
        <span><span className="hero-meta-dot"></span>本週可預約 · 3 個時段</span>
        <span>EST. 2019 · TAIPEI</span>
      </div>
      <div className="hero-scroll-hint">SCROLL TO MEET THE PUPS</div>

      <div className="hero-eyebrow reveal">{h.eyebrow}</div>
      <h1 className="hero-title reveal reveal-delay-1">
        <span className="stamp">{h.title1}</span><br />
        <span className="accent">{h.title2}</span>
      </h1>
      <p className="hero-subtitle reveal reveal-delay-2">{h.subtitle}</p>
      <div className="hero-cta-row reveal reveal-delay-3">
        <a href="#booking" className="btn-primary">{h.cta} <span>↘</span></a>
        <a href="#services" className="btn-ghost">看美容服務</a>
      </div>

      <div className="hero-mascot float">
        <PetImg id="heroMascot" data={data} placeholder="主視覺 / hero mascot" />
      </div>
    </header>
  );
}

// ---------------------- Story section (sticky pinning) ----------------------
function Story({ data }) {
  const stageRef = useRef(null);
  const [step, setStep] = useState(0);
  const panels = data.about.panels;

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const handler = () => {
      const rect = stage.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const progressed = Math.min(Math.max(-rect.top, 0), total);
      const ratio = total > 0 ? progressed / total : 0;
      const idx = Math.min(panels.length - 1, Math.floor(ratio * panels.length * 0.9999));
      setStep(idx);
    };
    handler();
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, [panels.length]);

  return (
    <section className="story" id="story">
      <div className="story-stage" ref={stageRef}>
        <div className="story-pin">
          <div className="story-left">
            <div className="section-eyebrow">{data.about.badge}</div>
            <h2 className="story-left-title">{data.about.title}</h2>
            <p className="story-left-body">{data.about.body}</p>
            <div className="story-progress">
              {panels.map((_, i) => <span key={i} className={i <= step ? 'on' : ''} />)}
            </div>
          </div>
          <div className="story-right">
            {panels.map((p, i) => (
              <div key={i} className={'story-panel' + (i === step ? ' on' : '')}>
                <div>
                  <div className="story-panel-kicker">{p.kicker} / {String(panels.length).padStart(2, '0')}</div>
                  <div className="story-panel-label">{p.label}</div>
                  <div className="story-panel-text">{p.text}</div>
                </div>
                <div className="story-panel-illus">
                  <PanelDoodle i={i} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function PanelDoodle({ i }) {
  // Geometric doodles only (circles, ellipses, rects)
  const palette = ['#B27347', '#3E2A1F', '#9BAE8E'];
  if (i === 0) return (
    <svg viewBox="0 0 200 120">
      <ellipse cx="100" cy="80" rx="48" ry="12" fill="#E8D9C0"/>
      <rect x="60" y="50" width="80" height="20" rx="10" fill={palette[0]}/>
      <circle cx="148" cy="56" r="14" fill={palette[0]}/>
      <circle cx="156" cy="54" r="2" fill="#3E2A1F"/>
      <rect x="142" y="42" width="3" height="8" rx="1.5" fill={palette[0]}/>
      <rect x="68" y="68" width="5" height="12" rx="2.5" fill={palette[1]}/>
      <rect x="120" y="68" width="5" height="12" rx="2.5" fill={palette[1]}/>
    </svg>
  );
  if (i === 1) return (
    <svg viewBox="0 0 200 120">
      <circle cx="100" cy="60" r="40" fill="#E8D9C0"/>
      <path d="M 80 50 q 20 -20 40 0" stroke={palette[0]} strokeWidth="3" fill="none" strokeLinecap="round"/>
      <path d="M 78 62 q 22 -16 44 0" stroke={palette[0]} strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.6"/>
      <path d="M 76 74 q 24 -12 48 0" stroke={palette[0]} strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.3"/>
      <circle cx="100" cy="60" r="12" fill={palette[1]}/>
    </svg>
  );
  return (
    <svg viewBox="0 0 200 120">
      <rect x="40" y="40" width="60" height="50" rx="14" fill="#E8D9C0"/>
      <rect x="48" y="48" width="44" height="6" rx="3" fill={palette[0]}/>
      <rect x="48" y="62" width="32" height="6" rx="3" fill={palette[2]}/>
      <rect x="48" y="76" width="38" height="6" rx="3" fill={palette[0]} opacity="0.6"/>
      <circle cx="140" cy="55" r="20" fill={palette[2]}/>
      <circle cx="140" cy="55" r="10" fill="#FFFCF6"/>
      <path d="M 134 55 l 5 5 l 10 -10" stroke={palette[1]} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

Object.assign(window, { useReveal, useStore, useParallaxBg, Nav, Hero, Story, PetImg });
