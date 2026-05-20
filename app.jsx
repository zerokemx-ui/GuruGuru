// Main app: composes sections, manages background pattern + tweaks.

const { useEffect: _ue } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "palette": ["#FBF3E7", "#B27347", "#3E2A1F"],
  "fontPair": "rounded",
  "patternDensity": 0.1
}/*EDITMODE-END*/;

const PALETTE_OPTIONS = [
  ['#FBF3E7','#B27347','#3E2A1F'],
  ['#FCF1ED','#D88B85','#48262A'],
  ['#F0F5EE','#7CA275','#2C3A2A'],
];

const PALETTES = [
  { cream:'#FBF3E7', deep:'#F5E9D4', paper:'#FFFCF6', cocoa:'#3E2A1F', cocoaSoft:'#6B4A36', caramel:'#B27347', caramelDeep:'#8A5430', peach:'#F5B58A', sage:'#9BAE8E', mist:'#E8D9C0' },
  { cream:'#FCF1ED', deep:'#F8DBD4', paper:'#FFF9F7', cocoa:'#48262A', cocoaSoft:'#7A4A50', caramel:'#D88B85', caramelDeep:'#A85F5A', peach:'#F2B6A8', sage:'#B7C4A4', mist:'#F0DBD3' },
  { cream:'#F0F5EE', deep:'#DCE8D6', paper:'#F9FCF7', cocoa:'#2C3A2A', cocoaSoft:'#536B4F', caramel:'#7CA275', caramelDeep:'#557A4F', peach:'#E8C99A', sage:'#9BAE8E', mist:'#D9E2CF' },
];

const FONT_PAIRS = {
  rounded: { display:"'Zen Maru Gothic'", body:"'Noto Sans TC'", script:"'Caveat'" },
  serif:   { display:"'Zen Old Mincho'",  body:"'Noto Serif TC'", script:"'Caveat'" },
  brush:   { display:"'Yuji Boku'",       body:"'Noto Sans TC'", script:"'Shadows Into Light'" },
};

function applyTweaks(t) {
  const root = document.documentElement;
  const idx = Math.max(0, PALETTE_OPTIONS.findIndex(a => a.join() === (t.palette || []).join()));
  const p = PALETTES[idx] || PALETTES[0];
  root.style.setProperty('--cream', p.cream);
  root.style.setProperty('--cream-deep', p.deep);
  root.style.setProperty('--paper', p.paper);
  root.style.setProperty('--cocoa', p.cocoa);
  root.style.setProperty('--cocoa-soft', p.cocoaSoft);
  root.style.setProperty('--caramel', p.caramel);
  root.style.setProperty('--caramel-deep', p.caramelDeep);
  root.style.setProperty('--peach', p.peach);
  root.style.setProperty('--sage', p.sage);
  root.style.setProperty('--mist', p.mist);
  const f = FONT_PAIRS[t.fontPair] || FONT_PAIRS.rounded;
  root.style.setProperty('--font-display', `${f.display}, 'Noto Sans TC', system-ui, sans-serif`);
  root.style.setProperty('--font-body', `${f.body}, system-ui, sans-serif`);
  root.style.setProperty('--font-script', `${f.script}, cursive`);
  root.style.setProperty('--pattern-opacity', String(t.patternDensity));
  root.style.setProperty('--pattern-url', `url("${window.buildPatternSVG({ fg: p.caramel })}")`);
}

function App() {
  const data = useStore();
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);

  _ue(() => { applyTweaks(tweaks); }, [tweaks]);

  useParallaxBg(0.18);
  useReveal();

  return (
    <>
      <div className="pattern-bg"></div>
      <div className="site">
        <Nav />
        <Hero data={data} />
        <Story data={data} />
        <Services data={data} />
        <Boarding data={data} />
        <Gallery data={data} />
        <Videos data={data} />
        <Reviews data={data} />
        <Booking data={data} />
        <Foot />
      </div>

      <TweaksPanel title="Tweaks">
        <TweakSection label="配色">
          <TweakColor
            label="主題色系"
            value={tweaks.palette}
            options={PALETTE_OPTIONS}
            onChange={(v) => setTweak('palette', v)}
          />
        </TweakSection>
        <TweakSection label="字體">
          <TweakRadio
            label="字體組合"
            value={tweaks.fontPair}
            options={[
              { value:'rounded', label:'圓潤' },
              { value:'serif',   label:'明朝' },
              { value:'brush',   label:'手寫' },
            ]}
            onChange={(v) => setTweak('fontPair', v)}
          />
        </TweakSection>
        <TweakSection label="背景">
          <TweakSlider
            label="圖案密度"
            value={tweaks.patternDensity}
            min={0} max={0.25} step={0.01}
            onChange={(v) => setTweak('patternDensity', v)}
          />
        </TweakSection>
        <TweakSection label="後台">
          <TweakButton label="進入後台管理 →" onClick={() => window.location.href = 'admin.html'} />
        </TweakSection>
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
