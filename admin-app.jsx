const { useState, useEffect, useRef, useCallback } = React;

// ── API helper ──────────────────────────────────────────────────────────────
async function apiCall(endpoint, method = 'GET', body = null, retryAuth = true) {
  const token = sessionStorage.getItem('auth_token');
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': 'Bearer ' + token } : {}),
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch('/api/' + endpoint, opts);
  const j = await r.json();
  if (!r.ok && r.status === 401 && retryAuth && endpoint !== 'login') {
    await new Promise(resolve => setTimeout(resolve, 800));
    return apiCall(endpoint, method, body, false);
  }
  if (!r.ok && r.status === 401) {
    logout();
    throw new Error('Unauthorized');
  }
  if (!r.ok || j.success === false) {
    throw new Error(j.error || ('HTTP ' + r.status));
  }
  return j;
}

function logout() {
  sessionStorage.removeItem('auth_token');
  sessionStorage.removeItem('user');
  window.location.reload();
}

// ── Utilities ───────────────────────────────────────────────────────────────
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

function translateError(msg) {
  const m = String(msg || '');
  if (/not found/i.test(m) || /\b404\b/.test(m)) return '找不到資源。';
  if (/bad credentials/i.test(m) || /\b401\b/.test(m)) return '認證失敗，請重新登入。';
  if (/rate limit/i.test(m)) return '操作太頻繁，請稍後再試。';
  if (/\b403\b/.test(m)) return '沒有權限執行此操作。';
  if (/failed to fetch/i.test(m) || /networkerror/i.test(m) || /network error/i.test(m)) return '網路連線失敗，請檢查網路後再試。';
  // Sanitize fallback to prevent XSS from raw API error messages
  return m.replace(/[<>]/g, '');
}

// ── Login Screen ─────────────────────────────────────────────────────────────
function LoginScreen({ onLogin, error, loading }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username && password) onLogin(username, password);
  };

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
        <form className="login-form" onSubmit={handleSubmit}>
          <Field label="帳號">
            <input type="text" className="input" value={username}
                   placeholder="username"
                   onChange={e => setUsername(e.target.value)} autoComplete="username" />
          </Field>
          <Field label="密碼">
            <input type="password" className="input" value={password}
                   placeholder="********"
                   onChange={e => setPassword(e.target.value)} autoComplete="current-password" />
          </Field>
          {error && <div className="login-error">{error}</div>}
          <button type="submit" className="btn-primary-sm login-btn"
                  disabled={loading || !username || !password}>
            {loading ? '登入中…' : '登入後台'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Profile Tab ───────────────────────────────────────────────────────────────
function ProfileTab({ user, onUserUpdate }) {
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('');

  // Password change state
  const [showPwd, setShowPwd] = useState(false);
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdMsg, setPwdMsg] = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setMsg('');
    try {
      const result = await apiCall('update-profile', 'POST', { name, email });
      onUserUpdate({ ...user, ...result.data });
      setEditing(false);
      setMsg('個人資料已儲存');
      setMsgType('success');
      setTimeout(() => setMsg(''), 4000);
    } catch (e) {
      setMsg('儲存失敗：' + translateError(e.message));
      setMsgType('error');
    }
    setSaving(false);
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwdMsg('');
    if (!oldPwd || !newPwd) { setPwdMsg('請填寫所有欄位'); return; }
    if (newPwd !== confirmPwd) { setPwdMsg('新密碼與確認密碼不符'); return; }
    if (newPwd.length < 6) { setPwdMsg('新密碼至少要 6 個字元'); return; }
    setPwdSaving(true);
    try {
      await apiCall('change-password', 'POST', { currentPassword: oldPwd, newPassword: newPwd });
      setOldPwd(''); setNewPwd(''); setConfirmPwd('');
      setShowPwd(false);
      setPwdMsg('密碼已更新');
      setMsgType('success');
      setTimeout(() => setPwdMsg(''), 4000);
    } catch (e) {
      setPwdMsg(translateError(e.message));
    }
    setPwdSaving(false);
  };

  return (
    <div className="tab-content">
      <h2 className="tab-title">個人資料</h2>

      <div className="profile-info">
        <div className="profile-avatar">
          <span className="avatar-initial">{((user?.name || user?.username || '?')[0] || '?').toUpperCase()}</span>
        </div>
        <div className="profile-detail">
          <div className="profile-role">角色：<span className={'role-badge role-' + (user?.role || 'user')}>{user?.role === 'admin' ? '管理者' : '一般用戶'}</span></div>
          <div className="profile-username">帳號：{user?.username}</div>
        </div>
      </div>

      {msg && <div className={'status-msg ' + msgType}>{msg}</div>}

      <div className="profile-form">
        <Field label="名稱">
          {editing
            ? <input type="text" className="input" value={name} onChange={e => setName(e.target.value)} />
            : <div className="field-view">{name || '（未設定）'}</div>
          }
        </Field>
        <Field label="Email">
          {editing
            ? <input type="email" className="input" value={email} onChange={e => setEmail(e.target.value)} />
            : <div className="field-view">{email || '（未設定）'}</div>
          }
        </Field>

        <div className="profile-actions">
          {editing ? (
            <>
              <button className="btn-primary-sm" onClick={handleSave} disabled={saving}>
                {saving ? '儲存中…' : '儲存'}
              </button>
              <button className="btn-ghost-sm" onClick={() => { setEditing(false); setName(user?.name || ''); setEmail(user?.email || ''); }}>取消</button>
            </>
          ) : (
            <button className="btn-primary-sm" onClick={() => setEditing(true)}>編輯資料</button>
          )}
        </div>
      </div>

      {/* Password change section */}
      <div className="pwd-section">
        <button className="btn-ghost-sm" onClick={() => setShowPwd(p => !p)}>
          {showPwd ? '取消修改密碼' : '修改密碼'}
        </button>

        {showPwd && (
          <form className="pwd-form" onSubmit={handlePasswordChange}>
            <Field label="舊密碼">
              <input type="password" className="input" value={oldPwd}
                     onChange={e => setOldPwd(e.target.value)} autoComplete="current-password" />
            </Field>
            <Field label="新密碼">
              <input type="password" className="input" value={newPwd}
                     onChange={e => setNewPwd(e.target.value)} autoComplete="new-password" />
            </Field>
            <Field label="確認新密碼">
              <input type="password" className="input" value={confirmPwd}
                     onChange={e => setConfirmPwd(e.target.value)} autoComplete="new-password" />
            </Field>
            {pwdMsg && <div className="login-error">{pwdMsg}</div>}
            <button type="submit" className="btn-primary-sm" disabled={pwdSaving}>
              {pwdSaving ? '更新中…' : '更新密碼'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ── Accounts Tab (admin only) ─────────────────────────────────────────────────
function AccountsTab() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [newAccount, setNewAccount] = useState({ username: '', password: '', name: '', email: '', role: 'member' });
  const [savingNew, setSavingNew] = useState(false);
  const [savingAccount, setSavingAccount] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await apiCall('users');
      setAccounts(result.data || []);
      setCurrentUserId(JSON.parse(sessionStorage.getItem('user') || '{}').id);
    } catch (e) {
      setError('載入失敗：' + translateError(e.message));
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);

  const updateAccountField = (id, field, value) => {
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSavingNew(true);
    setMsg('');
    try {
      const result = await apiCall('users', 'POST', newAccount);
      setAccounts(prev => [...prev, result.data]);
      setNewAccount({ username: '', password: '', name: '', email: '', role: 'member' });
      setMsg('帳號已新增');
    } catch (e) {
      setMsg('新增失敗：' + translateError(e.message));
    }
    setSavingNew(false);
  };

  const handleSaveAccount = async (account) => {
    setSavingAccount(account.id);
    setMsg('');
    try {
      const payload = { id: account.id, name: account.name, email: account.email, role: account.role };
      if (account.newPassword) payload.password = account.newPassword;
      const result = await apiCall('users', 'PATCH', payload);
      setAccounts(prev => prev.map(a => a.id === account.id ? { ...result.data, newPassword: '' } : a));
      setMsg('帳號已更新');
    } catch (e) {
      setMsg('更新失敗：' + translateError(e.message));
    }
    setSavingAccount(null);
  };

  const handleDelete = async (id) => {
    if (!confirm('確定要刪除這個帳號嗎？')) return;
    setDeleting(id);
    try {
      await apiCall('users?id=' + encodeURIComponent(id), 'DELETE');
      setAccounts(prev => prev.filter(a => a.id !== id));
      setMsg('帳號已刪除');
    } catch (e) {
      alert('刪除失敗：' + translateError(e.message));
    }
    setDeleting(null);
  };

  return (
    <div className="tab-content">
      <h2 className="tab-title">帳號管理</h2>

      <div className="card">
        <div className="card-title">新增帳號</div>
        <form className="account-form" onSubmit={handleCreate}>
          <div className="row">
            <Field label="帳號">
              <input className="input" value={newAccount.username} onChange={e => setNewAccount(a => ({ ...a, username: e.target.value }))} />
            </Field>
            <Field label="初始密碼">
              <input className="input" type="password" value={newAccount.password} onChange={e => setNewAccount(a => ({ ...a, password: e.target.value }))} />
            </Field>
          </div>
          <div className="row">
            <Field label="名稱">
              <input className="input" value={newAccount.name} onChange={e => setNewAccount(a => ({ ...a, name: e.target.value }))} />
            </Field>
            <Field label="Email">
              <input className="input" type="email" value={newAccount.email} onChange={e => setNewAccount(a => ({ ...a, email: e.target.value }))} />
            </Field>
          </div>
          <Field label="角色">
            <select className="input" value={newAccount.role} onChange={e => setNewAccount(a => ({ ...a, role: e.target.value }))}>
              <option value="member">一般用戶</option>
              <option value="admin">管理者</option>
            </select>
          </Field>
          <button className="btn-primary-sm account-submit" type="submit" disabled={savingNew || !newAccount.username || !newAccount.password}>
            {savingNew ? '新增中…' : '新增帳號'}
          </button>
        </form>
        {msg && <div className="login-error">{msg}</div>}
      </div>

      <div className="accounts-list">
        <h3>所有帳號</h3>
        {loading ? (
          <div className="loading-text">載入中…</div>
        ) : error ? (
          <div className="login-error">{error}</div>
        ) : (
          <table className="accounts-table">
            <thead>
              <tr>
                <th>名稱</th>
                <th>帳號</th>
                <th>Email</th>
                <th>角色</th>
                <th>重設密碼</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map(a => (
                <tr key={a.id} className={a.id === currentUserId ? 'current-user-row' : ''}>
                  <td><input className="input table-input" value={a.name || ''} onChange={e => updateAccountField(a.id, 'name', e.target.value)} /></td>
                  <td>{a.username}</td>
                  <td><input className="input table-input" type="email" value={a.email || ''} onChange={e => updateAccountField(a.id, 'email', e.target.value)} /></td>
                  <td>
                    <select className="input table-input" value={a.role} disabled={a.id === currentUserId} onChange={e => updateAccountField(a.id, 'role', e.target.value)}>
                      <option value="member">一般用戶</option>
                      <option value="admin">管理者</option>
                    </select>
                  </td>
                  <td><input className="input table-input" type="password" placeholder="留空不變" value={a.newPassword || ''} onChange={e => updateAccountField(a.id, 'newPassword', e.target.value)} /></td>
                  <td className="account-actions">
                    <button className="btn-primary-sm" disabled={savingAccount === a.id} onClick={() => handleSaveAccount(a)}>
                      {savingAccount === a.id ? '儲存中…' : '儲存'}
                    </button>
                    {a.id !== currentUserId ? (
                      <button className="btn-ghost-sm danger" disabled={deleting === a.id} onClick={() => handleDelete(a.id)}>
                        {deleting === a.id ? '刪除中…' : '刪除'}
                      </button>
                    ) : (
                      <span className="self-label">（自己）</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Existing Tab Components (unchanged) ──────────────────────────────────────
function HeroTab({ data, update, updateImage }) {
  return (
    <div className="tab-content">
      <h2 className="tab-title">首頁 Hero</h2>
      <Field label="主標題">
        <input className="input" value={data.hero?.title || ''} onChange={e => update('hero.title', e.target.value)} />
      </Field>
      <Field label="副標題">
        <input className="input" value={data.hero?.subtitle || ''} onChange={e => update('hero.subtitle', e.target.value)} />
      </Field>
      <Field label="主圖">
        <ImageDrop value={data.images?.[data.hero?.img]} onChange={url => updateImage('hero_img', url)} label="上傳主圖" aspect="16/9" />
      </Field>
    </div>
  );
}

function AboutTab({ data, update }) {
  return (
    <div className="tab-content">
      <h2 className="tab-title">關於我們</h2>
      <Field label="標題">
        <input className="input" value={data.about?.title || ''} onChange={e => update('about.title', e.target.value)} />
      </Field>
      <Field label="內容">
        <textarea className="input" rows="6" value={data.about?.text || ''} onChange={e => update('about.text', e.target.value)} />
      </Field>
    </div>
  );
}

function ServicesTab({ data, updateField, add, remove, updateImage }) {
  return (
    <div className="tab-content">
      <h2 className="tab-title">服務 & 價目</h2>
      {data.services?.map((s, i) => (
        <div key={s.id} className="service-item">
          <Field label="名稱"><input className="input" value={s.name} onChange={e => updateField(i, 'name', e.target.value)} /></Field>
          <Field label="英文名"><input className="input" value={s.sub || ''} onChange={e => updateField(i, 'sub', e.target.value)} /></Field>
          <Field label="價格"><input className="input" type="number" value={s.price} onChange={e => updateField(i, 'price', Number(e.target.value))} /></Field>
          <Field label="說明"><textarea className="input" rows="2" value={s.desc || ''} onChange={e => updateField(i, 'desc', e.target.value)} /></Field>
          <button className="btn-ghost-sm danger" onClick={() => remove(i)}>刪除</button>
        </div>
      ))}
      <button className="btn-primary-sm" onClick={add}>新增服務</button>
    </div>
  );
}

function GalleryTab({ data, updateField, updateImage }) {
  return (
    <div className="tab-content">
      <h2 className="tab-title">寶貝相簿</h2>
      {data.gallery?.map((g, i) => (
        <div key={g.id} className="gallery-item">
          <Field label="標題"><input className="input" value={g.title} onChange={e => updateField(i, 'title', e.target.value)} /></Field>
          <Field label="圖片"><ImageDrop value={data.images?.[g.img]} onChange={url => updateImage(g.img, url)} label="上傳圖片" aspect="1/1" /></Field>
        </div>
      ))}
    </div>
  );
}

function VideosTab({ data, updateField, add, remove }) {
  return (
    <div className="tab-content">
      <h2 className="tab-title">影片</h2>
      {data.videos?.map((v, i) => (
        <div key={v.id} className="video-item">
          <Field label="標題"><input className="input" value={v.title} onChange={e => updateField(i, 'title', e.target.value)} /></Field>
          <Field label="網址"><input className="input" value={v.src} onChange={e => updateField(i, 'src', e.target.value)} /></Field>
          <button className="btn-ghost-sm danger" onClick={() => remove(i)}>刪除</button>
        </div>
      ))}
      <button className="btn-primary-sm" onClick={add}>新增影片</button>
    </div>
  );
}

function ReviewsTab({ data, updateField, add, remove }) {
  return (
    <div className="tab-content">
      <h2 className="tab-title">客人心得</h2>
      {data.reviews?.map((r, i) => (
        <div key={r.id} className="review-item">
          <Field label="姓名"><input className="input" value={r.name} onChange={e => updateField(i, 'name', e.target.value)} /></Field>
          <Field label="心得"><textarea className="input" rows="3" value={r.text || ''} onChange={e => updateField(i, 'text', e.target.value)} /></Field>
          <Field label="星級">
            <select className="input" value={r.stars} onChange={e => updateField(i, 'stars', Number(e.target.value))}>
              {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} ★</option>)}
            </select>
          </Field>
          <button className="btn-ghost-sm danger" onClick={() => remove(i)}>刪除</button>
        </div>
      ))}
      <button className="btn-primary-sm" onClick={add}>新增心得</button>
    </div>
  );
}

function ContactTab({ data, update, updateImage }) {
  return (
    <div className="tab-content">
      <h2 className="tab-title">聯絡資訊</h2>
      <Field label="地址"><input className="input" value={data.contact?.address || ''} onChange={e => update('contact.address', e.target.value)} /></Field>
      <Field label="電話"><input className="input" value={data.contact?.phone || ''} onChange={e => update('contact.phone', e.target.value)} /></Field>
      <Field label="Email"><input className="input" value={data.contact?.email || ''} onChange={e => update('contact.email', e.target.value)} /></Field>
      <Field label="地圖圖片"><ImageDrop value={data.images?.[data.contact?.map]} onChange={url => updateImage('contact_map', url)} label="上傳地圖" aspect="4/1" /></Field>
    </div>
  );
}

// ── Main Admin App ───────────────────────────────────────────────────────────
function AdminApp() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);

  const [user, setUser] = useState(null);
  const [data, setData] = useState(null);
  const [dataSha, setDataSha] = useState(null);
  const [previews, setPreviews] = useState({});
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [tab, setTab] = useState('profile');
  const [statusMsg, setStatusMsg] = useState('');
  const [statusType, setStatusType] = useState('');

  useEffect(() => {
    const token = sessionStorage.getItem('auth_token');
    const storedUser = sessionStorage.getItem('user');
    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
        loadData();
        setLoggedIn(true);
      } catch {
        sessionStorage.removeItem('auth_token');
        sessionStorage.removeItem('user');
        setInitialLoading(false);
      }
    } else {
      setInitialLoading(false);
    }
  }, []);

  const loadData = async () => {
    try {
      const file = await apiCall('data');
      setData(file.data);
      setDataSha(file.sha);
    } catch {
      setData(JSON.parse(JSON.stringify(window.GGStore.DEFAULTS)));
      setDataSha(null);
    }
    setInitialLoading(false);
  };

  const doLogin = async (username, password) => {
    setLoginLoading(true);
    setLoginError('');
    try {
      const result = await apiCall('login', 'POST', { username, password });
      sessionStorage.setItem('auth_token', result.data.token);
      sessionStorage.setItem('user', JSON.stringify(result.data.user));
      setUser(result.data.user);
      setLoggedIn(true);
      await loadData();
    } catch (e) {
      setLoginError(translateError(e.message));
    }
    setLoginLoading(false);
  };

  const handleUserUpdate = (updatedUser) => {
    setUser(updatedUser);
    sessionStorage.setItem('user', JSON.stringify(updatedUser));
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
          const uploadResult = await apiCall('upload/' + id, 'POST', { data: base64 });
          updatedImages[id] = uploadResult.path;
        }
      }
      const saveData = { ...data, images: updatedImages };
      const result = await apiCall('data', 'PUT', saveData);
      setData(saveData);
      setDataSha(result.sha);
      setPreviews({});
      setDirty(false);
      setStatusType('success');
      setStatusMsg('已儲存！');
      setTimeout(() => setStatusMsg(''), 6000);
    } catch (e) {
      setStatusType('error');
      setStatusMsg('儲存失敗：' + translateError(e.message));
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
    { id: 'profile', label: '個人資料', icon: '◉' },
    ...(user?.role === 'admin' ? [{ id: 'accounts', label: '帳號管理', icon: '✦' }] : []),
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
            <div className="side-tip-title">CMS 管理系統</div>
            <div className="side-tip-body">
              編輯完成後按下方「儲存」，變更會自動更新。前台約 30 秒後同步。
            </div>
          </div>
        </aside>

        <main className="admin-main">
          {tab === 'profile' && <ProfileTab user={user} onUserUpdate={handleUserUpdate} />}
          {tab === 'accounts' && user?.role === 'admin' && <AccountsTab />}
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
          {saving ? '儲存中…' : '儲存到伺服器'}
        </button>
      </div>
    </div>
  );
}

Object.assign(window, { AdminApp, ImageDrop, Field, fileToDataURL });
