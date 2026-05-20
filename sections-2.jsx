// Services, Gallery, Videos, Reviews, Booking, Footer sections.

function Services({ data }) {
  useReveal();
  // Last service is boarding — feature it separately
  const grooming = data.services.filter(s => s.id !== 's5');
  return (
    <section className="section" id="services">
      <div className="section-eyebrow reveal">OUR SERVICES · 美容項目</div>
      <h2 className="section-title reveal reveal-delay-1">{`給長身寶貝的\n專屬包套`}</h2>
      <p style={{ maxWidth: 520, color: 'var(--cocoa-soft)', fontSize: 17, lineHeight: 1.6 }}
         className="reveal reveal-delay-2">
        我們特別為臘腸犬設計的清潔流程，依毛孩狀況分區照顧、溫控吹整。其他犬種也歡迎喔～
      </p>
      <div className="services-grid">
        {grooming.map((s, i) => (
          <div key={s.id} className={`service-card reveal reveal-delay-${(i % 4) + 1}`}>
            <div className="pawmark">{String(i + 1).padStart(2, '0')} · {s.duration}</div>
            <div className="service-name">{s.name}</div>
            <div className="service-sub">{s.sub}</div>
            <div className="service-desc">{s.desc}</div>
            <div className="service-foot">
              <div className="service-price">
                <span className="currency">NT$</span>{s.price.toLocaleString()}
              </div>
              <div className="service-duration">起 / per visit</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Boarding({ data }) {
  useReveal();
  const boarding = data.services.find(s => s.id === 's5');
  if (!boarding) return null;
  return (
    <section className="boarding" id="boarding">
      <div className="boarding-grid">
        <div className="boarding-tag reveal">
          <span className="boarding-tag-dot"></span>
          ALSO AT GURUGURU · 也有提供
        </div>
        <div className="boarding-content">
          <h2 className="section-title reveal" style={{ marginBottom: 18 }}>
            像家一樣的<br/><span style={{ color: 'var(--caramel)' }}>寵物寄宿</span>
          </h2>
          <p className="boarding-lede reveal reveal-delay-1">
            出國、出差不用擔心。<br />
            我們提供小型犬寄宿服務，<br />
            依個性安排活動或靜養空間，<br />
            每天散步、陪玩、按時餵食，<br />
            回家就像沒離開過。
          </p>
          <div className="boarding-perks">
            {[
              { k: '依個性安排', v: '社交 / 靜養彈性調整' },
              { k: '每日散步', v: '早晚各一次' },
              { k: '客製餵食', v: '請自備飼料' },
              { k: '日報照片', v: 'LINE 傳給你' },
            ].map((p, i) => (
              <div key={i} className={`boarding-perk reveal reveal-delay-${(i % 4) + 1}`}>
                <div className="boarding-perk-k">{p.k}</div>
                <div className="boarding-perk-v">{p.v}</div>
              </div>
            ))}
          </div>
          <div className="boarding-foot reveal">
            <div className="boarding-price">
              <span className="currency">NT$</span>
              <span className="num">{boarding.price.toLocaleString()}</span>
              <span className="unit">/ 每晚</span>
            </div>
            <a href="#booking" className="btn-primary">詢問寄宿 ↘</a>
          </div>
        </div>
        <div className="boarding-art reveal reveal-delay-2">
          <PetImg id="boardingHero" data={data} placeholder="寄宿環境照片 / 喵汪日常" />
        </div>
      </div>
    </section>
  );
}

function Gallery({ data }) {
  useReveal();
  return (
    <section className="gallery-wrap" id="gallery">
      <div className="gallery-header">
        <div className="reveal">
          <div className="section-eyebrow">GALLERY · 寶貝相簿</div>
          <h2 className="section-title">{`每一隻都是\n我們的私心`}</h2>
        </div>
        <div className="reveal reveal-delay-2" style={{ maxWidth: 360 }}>
          <p style={{ color: 'var(--cocoa-soft)', fontSize: 16, lineHeight: 1.6, margin: 0 }}>
            點開後台可以隨時更新照片牆。把寶貝的照片拖進對應的格子就好。
          </p>
        </div>
      </div>
      <div className="gallery-grid">
        {data.gallery.slice(0, 8).map((p, i) => (
          <div key={p.id} className={`gallery-cell gc-${i + 1} reveal reveal-delay-${(i % 4) + 1}`}>
            <span className="tag">{p.tag}</span>
            <PetImg id={p.id} data={data} placeholder={p.caption} />
            <div className="caption">{p.caption}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Videos({ data }) {
  useReveal();
  return (
    <section className="videos" id="videos">
      <div className="section-eyebrow reveal">VIDEO REEL · 日常影像</div>
      <h2 className="section-title reveal reveal-delay-1">{`鏡頭裡的\n小撒嬌`}</h2>
      <div className="videos-grid">
        {data.videos.map((v, i) => (
          <VideoCard key={v.id} v={v} i={i} />
        ))}
      </div>
    </section>
  );
}

function VideoCard({ v, i }) {
  const isEmbed = v.src && (v.src.includes('youtube.com') || v.src.includes('youtu.be') || v.src.includes('vimeo'));
  let embedUrl = v.src;
  if (v.src && v.src.includes('youtu.be/')) {
    const id = v.src.split('youtu.be/')[1].split(/[?&]/)[0];
    embedUrl = `https://www.youtube.com/embed/${id}?autoplay=0&mute=1&loop=1&playlist=${id}`;
  } else if (v.src && v.src.includes('youtube.com/watch')) {
    const id = new URL(v.src).searchParams.get('v');
    embedUrl = `https://www.youtube.com/embed/${id}?autoplay=0&mute=1&loop=1&playlist=${id}`;
  }
  return (
    <div className={`video-card reveal reveal-delay-${(i % 4) + 1}`}>
      {v.src ? (
        isEmbed ? (
          <iframe src={embedUrl} allow="autoplay; encrypted-media" allowFullScreen frameBorder="0"></iframe>
        ) : (
          <video src={v.src} autoPlay muted loop playsInline></video>
        )
      ) : (
        <div className="placeholder">VIDEO SLOT · 後台貼上影片連結</div>
      )}
      <div className="meta">
        <div className="play">▶</div>
        <div className="video-num">REEL · {String(i + 1).padStart(2, '0')}</div>
        <div className="video-title">{v.title}</div>
      </div>
    </div>
  );
}

function Reviews({ data }) {
  useReveal();
  return (
    <section className="reviews" id="reviews">
      <div className="section-eyebrow reveal">REVIEWS · 客人心得</div>
      <h2 className="section-title reveal reveal-delay-1">{`回訪率\n是最好的肯定`}</h2>
      <div className="reviews-row">
        {data.reviews.map((r, i) => (
          <div key={r.id} className={`review-card reveal reveal-delay-${(i % 3) + 1}`}>
            <div className="review-stars">{'★'.repeat(r.stars)}</div>
            <p className="review-text">{r.text}</p>
            <div className="review-name">— {r.name}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Booking({ data }) {
  useReveal();
  return (
    <section className="booking" id="booking">
      <div className="booking-card reveal">
        <div>
          <div className="section-eyebrow" style={{ color: 'var(--peach)' }}>
            <span style={{ background: 'var(--peach)' }}></span>
            BOOKING · 預約你的時段
          </div>
          <h2 className="booking-title">想讓寶貝來<span className="accent">咕嚕咕嚕</span>一下嗎？</h2>
          <p className="booking-sub">
            因為店內同時最多三隻寶貝，採完全預約制。<br />
            掃描 LINE QR Code 或私訊 IG 即可，附上寶貝照片、體重與最近一次美容時間。
          </p>
          <div className="booking-info">
            <div className="booking-info-item">
              <div className="label">地點</div>
              <div className="val">{data.contact.addr}</div>
            </div>
            <div className="booking-info-row">
              <div className="booking-info-item">
                <div className="label">營業時間</div>
                <div className="val">{data.contact.hours}</div>
              </div>
              <div className="booking-info-item">
                <div className="label">電話</div>
                <div className="val"><a href={`tel:${data.contact.phone.replace(/\s/g, '')}`}>{data.contact.phone}</a></div>
              </div>
            </div>
            <div className="booking-info-row">
              <div className="booking-info-item">
                <div className="label">LINE</div>
                <div className="val">{data.contact.line}</div>
              </div>
              <div className="booking-info-item">
                <div className="label">Instagram</div>
                <div className="val"><a href={`https://instagram.com/${data.contact.ig.replace('@', '')}`} target="_blank" rel="noreferrer">{data.contact.ig}</a></div>
              </div>
            </div>
          </div>
        </div>
        <div className="booking-qr">
          <div className="qr-frame">
            {data.contact.lineQR ? (
              <img src={data.images?.lineQR || data.contact.lineQR} alt="LINE QR Code" />
            ) : (
              <div className="qr-empty">QR Code</div>
            )}
          </div>
          <div className="qr-label">
            <div className="qr-label-eyebrow">SCAN ME</div>
            <div className="qr-label-main">LINE 加好友<br />立刻預約</div>
            <div className="qr-label-sub">{data.contact.line}</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Foot() {
  return (
    <footer className="foot">
      <div className="foot-brand">咕嚕咕嚕雙腸搗蛋 · doubledachshund © 2026</div>
      <div>
        <a href="https://www.facebook.com/doubledachshund/" target="_blank" rel="noreferrer">Facebook</a>
      </div>
    </footer>
  );
}

Object.assign(window, { Services, Boarding, Gallery, Videos, Reviews, Booking, Foot });
