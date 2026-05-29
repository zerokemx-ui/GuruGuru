// Admin tab components.

function HeroTab({ data, update, updateImage }) {
  return (
    <div className="tab-pane">
      <div className="tab-head">
        <h1 className="tab-title">首頁 Hero</h1>
        <p className="tab-sub">訪客進入網站第一個看見的區域。標題、副標、主圖。</p>
      </div>
      <div className="tab-grid two-col">
        <div className="card">
          <div className="card-title">文字內容</div>
          <Field label="上方說明" hint="字小、品牌定位用">
            <input className="input" value={data.hero.eyebrow} onChange={e => update('hero.eyebrow', e.target.value)} />
          </Field>
          <div className="row">
            <Field label="主標 第一行">
              <input className="input" value={data.hero.title1} onChange={e => update('hero.title1', e.target.value)} />
            </Field>
            <Field label="主標 第二行" hint="會以咖啡色顯示">
              <input className="input" value={data.hero.title2} onChange={e => update('hero.title2', e.target.value)} />
            </Field>
          </div>
          <Field label="副標 描述">
            <textarea className="input" rows="3" value={data.hero.subtitle} onChange={e => update('hero.subtitle', e.target.value)} />
          </Field>
          <Field label="按鈕文字">
            <input className="input" value={data.hero.cta} onChange={e => update('hero.cta', e.target.value)} />
          </Field>
        </div>
        <div className="card">
          <div className="card-title">主視覺照片</div>
          <p className="card-hint">建議方形或寬幅，1200×1000px 以上。會自動壓縮。</p>
          <ImageDrop
            value={data.images?.heroMascot || ''}
            onChange={(url) => updateImage('heroMascot', url)}
            aspect="1.2/1"
            label="拖一張你最寶貝的照片進來"
          />
        </div>
      </div>
    </div>
  );
}

function AboutTab({ data, update }) {
  return (
    <div className="tab-pane">
      <div className="tab-head">
        <h1 className="tab-title">關於我們</h1>
        <p className="tab-sub">滑動到第二段時，會釘住並依序播放三個重點。</p>
      </div>
      <div className="card">
        <div className="card-title">區塊文字</div>
        <Field label="小標">
          <input className="input" value={data.about.badge} onChange={e => update('about.badge', e.target.value)} />
        </Field>
        <Field label="主標題" hint="用 Enter 換行">
          <textarea className="input" rows="2" value={data.about.title} onChange={e => update('about.title', e.target.value)} />
        </Field>
        <Field label="主文">
          <textarea className="input" rows="4" value={data.about.body} onChange={e => update('about.body', e.target.value)} />
        </Field>
      </div>
      <div className="card">
        <div className="card-title">三個重點面板</div>
        <div className="panels-grid">
          {data.about.panels.map((p, i) => (
            <div key={i} className="panel-edit">
              <div className="panel-edit-num">{p.kicker}</div>
              <Field label="標題">
                <input className="input" value={p.label} onChange={e => {
                  const next = [...data.about.panels];
                  next[i] = { ...p, label: e.target.value };
                  update('about.panels', next);
                }} />
              </Field>
              <Field label="說明">
                <textarea className="input" rows="3" value={p.text} onChange={e => {
                  const next = [...data.about.panels];
                  next[i] = { ...p, text: e.target.value };
                  update('about.panels', next);
                }} />
              </Field>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ServicesTab({ data, updateField, add, remove, updateImage }) {
  return (
    <div className="tab-pane">
      <div className="tab-head">
        <h1 className="tab-title">服務項目 & 價目</h1>
        <p className="tab-sub">這裡列出的項目會顯示在網站的服務區塊。可以新增、刪除、調整價格。寄宿服務（s5）會獨立顯示在「寵物寄宿」區塊。</p>
      </div>
      <div className="card">
        <div className="card-title">寄宿區塊 · 主視覺照片</div>
        <p className="card-hint">放在「寵物寄宿」區塊右側，建議是寄宿環境或寶貝在店裡的照片。</p>
        <div style={{ maxWidth: 320 }}>
          <ImageDrop
            value={data.images?.boardingHero || ''}
            onChange={(url) => updateImage('boardingHero', url)}
            aspect="4/5"
            label="拖寄宿環境照片"
          />
        </div>
      </div>
      <div className="services-edit">
        {data.services.map((s, i) => (
          <div className="card service-edit" key={s.id}>
            <div className="service-edit-head">
              <span className="num-badge">{s.id === 's5' ? '寄宿' : String(i + 1).padStart(2, '0')}</span>
              <button className="btn-ghost-sm danger small" onClick={() => remove(i)}>刪除</button>
            </div>
            <div className="row">
              <Field label="中文名稱">
                <input className="input" value={s.name} onChange={e => updateField(i, 'name', e.target.value)} />
              </Field>
              <Field label="英文副標">
                <input className="input" value={s.sub} onChange={e => updateField(i, 'sub', e.target.value)} />
              </Field>
            </div>
            <Field label="說明">
              <textarea className="input" rows="2" value={s.desc} onChange={e => updateField(i, 'desc', e.target.value)} />
            </Field>
            <div className="row">
              <Field label="價格 (NT$)">
                <input type="number" className="input" value={s.price} onChange={e => updateField(i, 'price', Number(e.target.value))} />
              </Field>
              <Field label="時長 / 計價">
                <input className="input" value={s.duration} onChange={e => updateField(i, 'duration', e.target.value)} />
              </Field>
            </div>
          </div>
        ))}
      </div>
      <button className="btn-add" onClick={add}>＋ 新增服務項目</button>
    </div>
  );
}

function GalleryTab({ data, updateField, updateImage }) {
  return (
    <div className="tab-pane">
      <div className="tab-head">
        <h1 className="tab-title">寶貝相簿</h1>
        <p className="tab-sub">8 個格子的相簿，建議用美容前後對比或可愛瞬間。</p>
      </div>
      <div className="gallery-edit">
        {data.gallery.map((g, i) => {
          const url = data.images?.[g.id] || '';
          return (
            <div className="card gallery-edit-item" key={g.id}>
              <div className="num-badge floating">{String(i + 1).padStart(2, '0')}</div>
              <ImageDrop
                value={url}
                onChange={(u) => updateImage(g.id, u)}
                aspect="1/1"
                label="拖一張寶貝照片"
              />
              <Field label="名字 / 年齡">
                <input className="input" value={g.caption} onChange={e => updateField(i, 'caption', e.target.value)} />
              </Field>
              <Field label="標籤">
                <input className="input" value={g.tag} onChange={e => updateField(i, 'tag', e.target.value)} />
              </Field>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VideosTab({ data, updateField, add, remove }) {
  return (
    <div className="tab-pane">
      <div className="tab-head">
        <h1 className="tab-title">影片日常</h1>
        <p className="tab-sub">支援 YouTube / Vimeo 連結，或直接貼 .mp4 網址。</p>
      </div>
      <div className="services-edit">
        {data.videos.map((v, i) => (
          <div className="card service-edit" key={v.id}>
            <div className="service-edit-head">
              <span className="num-badge">REEL · {String(i + 1).padStart(2, '0')}</span>
              <button className="btn-ghost-sm danger small" onClick={() => remove(i)}>刪除</button>
            </div>
            <Field label="標題">
              <input className="input" value={v.title} onChange={e => updateField(i, 'title', e.target.value)} />
            </Field>
            <Field label="影片連結" hint="YouTube / Vimeo 網址，或直接的 .mp4 連結">
              <input className="input" placeholder="https://youtu.be/…" value={v.src} onChange={e => updateField(i, 'src', e.target.value)} />
            </Field>
            {v.src && (
              <div className="video-preview">
                <div className="video-preview-label">預覽</div>
                {v.src.includes('youtu') ? (
                  <iframe src={(() => {
                    if (v.src.includes('youtu.be/')) {
                      const id = v.src.split('youtu.be/')[1].split(/[?&]/)[0];
                      return `https://www.youtube.com/embed/${id}`;
                    }
                    if (v.src.includes('youtube.com/watch')) {
                      try { return `https://www.youtube.com/embed/${new URL(v.src).searchParams.get('v')}`; } catch { return ''; }
                    }
                    return v.src;
                  })()} frameBorder="0"></iframe>
                ) : (
                  <video src={v.src} controls></video>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      <button className="btn-add" onClick={add}>＋ 新增影片</button>
    </div>
  );
}

function ReviewsTab({ data, updateField, add, remove }) {
  return (
    <div className="tab-pane">
      <div className="tab-head">
        <h1 className="tab-title">客人心得</h1>
        <p className="tab-sub">真實的回饋是最好的招牌。</p>
      </div>
      <div className="services-edit">
        {data.reviews.map((r, i) => (
          <div className="card service-edit" key={r.id}>
            <div className="service-edit-head">
              <span className="num-badge">{String(i + 1).padStart(2, '0')}</span>
              <button className="btn-ghost-sm danger small" onClick={() => remove(i)}>刪除</button>
            </div>
            <div className="row">
              <Field label="客人 & 寶貝">
                <input className="input" value={r.name} onChange={e => updateField(i, 'name', e.target.value)} />
              </Field>
              <Field label="星星數 (1-5)">
                <input type="number" min="1" max="5" className="input" value={r.stars} onChange={e => updateField(i, 'stars', e.target.value)} />
              </Field>
            </div>
            <Field label="心得內容">
              <textarea className="input" rows="3" value={r.text} onChange={e => updateField(i, 'text', e.target.value)} />
            </Field>
          </div>
        ))}
      </div>
      <button className="btn-add" onClick={add}>＋ 新增心得</button>
    </div>
  );
}

function ContactTab({ data, update, updateImage }) {
  const qrUrl = data.images?.lineQR || data.contact.lineQR || '';
  return (
    <div className="tab-pane">
      <div className="tab-head">
        <h1 className="tab-title">聯絡資訊</h1>
        <p className="tab-sub">顯示在頁尾的預約區塊。</p>
      </div>
      <div className="tab-grid two-col">
        <div className="card">
          <div className="card-title">基本資訊</div>
          <Field label="地點">
            <input className="input" value={data.contact.addr} onChange={e => update('contact.addr', e.target.value)} />
          </Field>
          <Field label="營業時間">
            <input className="input" value={data.contact.hours} onChange={e => update('contact.hours', e.target.value)} />
          </Field>
          <Field label="電話">
            <input className="input" value={data.contact.phone} onChange={e => update('contact.phone', e.target.value)} />
          </Field>
          <div className="row">
            <Field label="LINE ID">
              <input className="input" value={data.contact.line} onChange={e => update('contact.line', e.target.value)} />
            </Field>
            <Field label="IG 帳號">
              <input className="input" value={data.contact.ig} onChange={e => update('contact.ig', e.target.value)} />
            </Field>
          </div>
          <Field label="預約標題" hint="會顯示在咕嚕咕嚕字樣前方">
            <input className="input" value={data.contact.bookingTitle || ''} onChange={e => update('contact.bookingTitle', e.target.value)} />
          </Field>
          <Field label="預約說明文字" hint="可換行，會顯示在頁面最下方的預約區塊">
            <textarea className="input" rows="4" value={data.contact.bookingText || ''} onChange={e => update('contact.bookingText', e.target.value)} />
          </Field>
        </div>
        <div className="card">
          <div className="card-title">LINE QR Code</div>
          <p className="card-hint">客人掃描後可以直接加好友。</p>
          <ImageDrop value={qrUrl} onChange={(url) => updateImage('lineQR', url)} aspect="1/1" label="拖一張 QR Code 圖檔" />
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { HeroTab, AboutTab, ServicesTab, GalleryTab, VideosTab, ReviewsTab, ContactTab });
