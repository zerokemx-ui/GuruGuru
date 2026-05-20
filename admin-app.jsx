const { useState, useEffect, useRef, useCallback } = React;

function fileToDataURL(file, { maxDim = 1600, quality = 0.85 } = {}) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        if (Math.max(w, h) > maxDim) {
          const scale = maxDim / Math.max(w, h);
          w = Math.round(w * scale);
          h = Math.round(h * scale);
        }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function ImageDrop({ value, onChange, label, aspect = '1/1' }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const onFile = async (file) => {
    if (!file) return;
    setBusy(true);
    try {
      const url = await fileToDataURL(file);
      onChange(url);
    } catch (e) { console.error(e); }
    setBusy(false);
  };
  return (
    <div className="img-drop"
         style={{ aspectRatio: aspect }}
         onClick={() => ref.current?.click()}
         onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('drag'); }}
         onDragLeave={(e) => e.currentTarget.classList.remove('drag')}
         onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove('drag'); onFile(e.dataTransfer.files?.[0]); }}>
      {value ? (
        <>
          <img src={value} alt="" />
          <div className="img-drop-overlay">
            <span>更換照片</span>
            <button type="button" className="img-drop-clear"
                    onClick={(e) => { e.stopPropagation(); onChange(''); }}>移除</button>
          </div>
        </>
      ) : (
        <div className="img-drop-empty">
          <div className="img-drop-icon">↑</div>
          <div className="img-drop-label">{busy ? '處理中…' : label || '點擊或拖曳上傳'}</div>
          <div className="img-drop-hint">JPG / PNG · 自動壓縮至 1600px</div>
        </div>
      )}
      <input type="file" accept="image/*" ref={ref} style={{ display: 'none' }}
             onChange={(e) => onFile(e.target.files?.[0])} />
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {hint && <span className="field-hint">{hint}</span>}
      {children}
    </label>
  );
}

function LoginScreen({ onLogin, error, loading }) {
  const [token, setToken] = useState('');
  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-brand">
          <span className="admin-brand-mark">d</span>
          <div>
            <div className="admin-brand-name">咕嚕咕嚕雙腸搗蛋</div>
            <div className="admin-brand-sub">後台管理 · CMS</div>
          </div>
        </div>
        <div className="login-form">
          <Field label="GitHub Personal Access Token">
            <input type="password" className="input" value={token}
                   placeholder="ghp_xxxxxxxxxxxx"
                   onChange={e => setToken(e.target.value)}
                   onKeyDown={e => e.key === 'Enter' && token && onLogin(token)} />
          </Field>
          {error && <div className="login-error">{error}</div>}
          <button className="btn-primary-sm login-btn"
                  onClick={() => onLogin(token)}
                  disabled={loading || !token}>
            {loading ? '登入中…' : '登入後台'}
          </button>
        </div>
        <div className="login-help">
          <details>
            <summary>如何取得 Token？</summary>
            <ol>
              <li>前往 GitHub → Settings → Developer settings</li>
              <li>Personal access tokens → Tokens (classic)</li>
              <li>點 "Generate new token (classic)"</li>
              <li>勾選 <strong>repo</strong> 權限</li>
              <li>產生後複製 token，貼到上方欄位</li>
            </ol>
          </details>
        </div>
      </div>
    </div>
  );
}

function AdminApp() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);

  const [data, setData] = useState(null);
  const [dataSha, setDataSha] = useState(null);
  const [previews, setPreviews] = useState({});
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [tab, setTab] = useState('hero');
  const [statusMsg, setStatusMsg] = useState('');
  const [statusType, setStatusType] = useState('');

  useEffect(() => {
    const stored = sessionStorage.getItem('gh_token');
    if (stored) {
      doLogin(stored, true);
    } else {
      setInitialLoading(false);
    }
  }, []);

  const doLogin = async (token, isAutoLogin) => {
    if (!isAutoLogin) setLoginLoading(true);
    setLoginError('');
    window.GitHubAPI.token = token;
    try {
      const valid = await window.GitHubAPI.validate();
      if (!valid) {
        setLoginError('Token 無效或無法存取此 repo');
        if (!isAutoLogin) setLoginLoading(false);
        setInitialLoading(false);
        return;
      }
      sessionStorage.setItem('gh_token', token);
      try {
        const file = await window.GitHubAPI.getFile('data.json');
        setData(JSON.parse(file.content));
        setDataSha(file.sha);
      } catch {
        setData(JSON.parse(JSON.stringify(window.GGStore.DEFAULTS)));
        setDataSha(null);
      }
      setLoggedIn(true);
    } catch (e) {
      setLoginError('登入失敗：' + e.message);
    }
    if (!isAutoLogin) setLoginLoading(false);
    setInitialLoading(false);
  };

  const logout = () => {
    sessionStorage.removeItem('gh_token');
    window.GitHubAPI.token = null;
    setLoggedIn(false);
    setData(null);
    setDataSha(null);
    setPreviews({});
    setDirty(false);
    setStatusMsg('');
  };

  const update = (path, value) => {
    setData(d => {
      const next = JSON.parse(JSON.stringify(d));
      const keys = path.split('.');
      let cur = next;
      for (let i = 0; i < keys.length - 1; i++) cur = cur[keys[i]];
      cur[keys[keys.length - 1]] = value;
      return next;
    });
    setDirty(true);
  };

  const handleImageChange = (id, url) => {
    if (url) {
      setPreviews(prev => ({ ...prev, [id]: url }));
    } else {
      setPreviews(prev => { const n = { ...prev }; delete n[id]; return n; });
      setData(d => { const images = { ...d.images }; delete images[id]; return { ...d, images }; });
    }
    setDirty(true);
  };

  const updateServiceField = (idx, field, value) => {
    setData(d => ({
      ...d,
      services: d.services.map((s, i) => i === idx ? { ...s, [field]: value } : s)
    }));
    setDirty(true);
  };
  const addService = () => {
    setData(d => ({
      ...d,
      services: [...d.services, { id: 's' + Date.now(), name: '新服務', sub: 'New Service', price: 1000, desc: '描述…', duration: '60 分' }]
    }));
    setDirty(true);
  };
  const removeService = (idx) => {
    setData(d => ({ ...d, services: d.services.filter((_, i) => i !== idx) }));
    setDirty(true);
  };

  const updateGalleryField = (idx, field, value) => {
    setData(d => ({
      ...d,
      gallery: d.gallery.map((g, i) => i === idx ? { ...g, [field]: value } : g)
    }));
    setDirty(true);
  };

  const updateVideoField = (idx, field, value) => {
    setData(d => ({
      ...d,
      videos: d.videos.map((v, i) => i === idx ? { ...v, [field]: value } : v)
    }));
    setDirty(true);
  };
  const addVideo = () => {
    setData(d => ({ ...d, videos: [...d.videos, { id: 'v' + Date.now(), title: '新影片', src: '' }] }));
    setDirty(true);
  };
  const removeVideo = (idx) => {
    setData(d => ({ ...d, videos: d.videos.filter((_, i) => i !== idx) }));
    setDirty(true);
  };

  const updateReviewField = (idx, field, value) => {
    setData(d => ({
      ...d,
      reviews: d.reviews.map((r, i) => i === idx ? { ...r, [field]: field === 'stars' ? Number(value) : value } : r)
    }));
    setDirty(true);
  };
  const addReview = () => {
    setData(d => ({ ...d, reviews: [...d.reviews, { id: 'r' + Date.now(), name: '新客人', text: '心得…', stars: 5 }] }));
    setDirty(true);
  };
  const removeReview = (idx) => {
    setData(d => ({ ...d, reviews: d.reviews.filter((_, i) => i !== idx) }));
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    setStatusMsg('');
    try {
      const updatedImages = { ...(data.images || {}) };

      for (const [id, dataUrl] of Object.entries(previews)) {
        if (dataUrl && dataUrl.startsWith('data:')) {
          const base64 = dataUrl.split(',')[1];
          const path = 'uploads/' + id + '.jpg';
          let sha = null;
          try { sha = await window.GitHubAPI.getFileSha(path); } catch {}
          await window.GitHubAPI.putBinary(path, base64, sha, 'Upload ' + id);
          updatedImages[id] = path;
        }
      }

      const saveData = { ...data, images: updatedImages };
      const json = JSON.stringify(saveData, null, 2);
      const result = await window.GitHubAPI.putFile('data.json', json, dataSha, 'Update site content');

      setData(saveData);
      setDataSha(result.content.sha);
      setPreviews({});
      setDirty(false);
      setStatusType('success');
      setStatusMsg('已儲存！GitHub Pages 約 30 秒後更新前台');
      setTimeout(() => setStatusMsg(''), 6000);
    } catch (e) {
      setStatusType('error');
      setStatusMsg('儲存失敗：' + e.message);
    }
    setSaving(false);
  };

  const reset = () => {
    if (confirm('確定要重設所有內容回預設值嗎？')) {
      setData(JSON.parse(JSON.stringify(window.GGStore.DEFAULTS)));
      setPreviews({});
      setDirty(true);
    }
  };

  if (initialLoading) {
    return (
      <div className="login-screen">
        <div style={{ color: 'var(--cocoa-soft)', fontSize: 14 }}>載入中…</div>
      </div>
    );
  }

  if (!loggedIn) {
    return <LoginScreen onLogin={doLogin} error={loginError} loading={loginLoading} />;
  }

  if (!data) return null;

  const displayData = { ...data, images: { ...(data.images || {}), ...previews } };

  const tabs = [
    { id: 'hero', label: '首頁 Hero', icon: '✦' },
    { id: 'about', label: '關於我們', icon: '◐' },
    { id: 'services', label: '服務 & 價目', icon: '✁' },
    { id: 'gallery', label: '寶貝相簿', icon: '✿' },
    { id: 'videos', label: '影片', icon: '▶' },
    { id: 'reviews', label: '客人心得', icon: '★' },
    { id: 'contact', label: '聯絡資訊', icon: '◉' },
  ];

  return (
    <div className="admin">
      <header className="admin-top">
        <div className="admin-brand">
          <span className="admin-brand-mark">d</span>
          <div>
            <div className="admin-brand-name">咕嚕咕嚕雙腸搗蛋</div>
            <div className="admin-brand-sub">後台管理 · CMS</div>
          </div>
        </div>
        <div className="admin-meta">
          {dirty && <span className="admin-saved"><span className="dot" style={{ background: 'var(--caramel)' }} /> 有未儲存的變更</span>}
          {!dirty && statusMsg && statusType === 'success' && (
            <span className="admin-saved"><span className="dot" /> {statusMsg}</span>
          )}
          <button className="btn-ghost-sm danger" onClick={reset}>重設</button>
          <button className="btn-ghost-sm" onClick={logout}>登出</button>
          <a className="btn-primary-sm" href="index.html" target="_blank">看網站 ↗</a>
        </div>
      </header>

      <div className="admin-body">
        <aside className="admin-side">
          {tabs.map(t => (
            <button key={t.id} className={'side-tab' + (tab === t.id ? ' on' : '')} onClick={() => setTab(t.id)}>
              <span className="side-tab-icon">{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
          <div className="side-tip">
            <div className="side-tip-title">GitHub CMS</div>
            <div className="side-tip-body">
              編輯完成後按下方「儲存到 GitHub」，變更會自動部署到網站。約 30 秒後前台更新。
            </div>
          </div>
        </aside>

        <main className="admin-main">
          {tab === 'hero' && <HeroTab data={displayData} update={update} updateImage={handleImageChange} />}
          {tab === 'about' && <AboutTab data={displayData} update={update} />}
          {tab === 'services' && <ServicesTab data={displayData} updateField={updateServiceField} add={addService} remove={removeService} updateImage={handleImageChange} />}
          {tab === 'gallery' && <GalleryTab data={displayData} updateField={updateGalleryField} updateImage={handleImageChange} />}
          {tab === 'videos' && <VideosTab data={displayData} updateField={updateVideoField} add={addVideo} remove={removeVideo} />}
          {tab === 'reviews' && <ReviewsTab data={displayData} updateField={updateReviewField} add={addReview} remove={removeReview} />}
          {tab === 'contact' && <ContactTab data={displayData} update={update} updateImage={handleImageChange} />}
        </main>
      </div>

      <div className="save-bar">
        <div className={'save-bar-msg ' + statusType}>
          {saving ? '儲存中，請稍候…' : statusMsg}
        </div>
        <button className={'btn-save' + (dirty ? ' dirty' : '')}
                onClick={save} disabled={saving || !dirty}>
          {saving ? '儲存中…' : '儲存到 GitHub'}
        </button>
      </div>
    </div>
  );
}

Object.assign(window, { AdminApp, ImageDrop, Field, fileToDataURL });
