// 블로그 수익 허브 생성기
//
// 두 네이버 블로그의 RSS를 읽어 homepage/index.html + sitemap.xml + robots.txt 를 만듭니다.
// 고칠 곳은 아래 CONFIG 뿐입니다. 고친 뒤 `node homepage/build.mjs` 또는
// `홈페이지_새로고침.bat` 을 실행하면 다시 만들어집니다.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CONFIG = {
  // ── 사이트 정체성 ───────────────────────────────────────────────
  siteTitle: '잘 먹고 잘 사는 법',
  tagline: '맛집은 맛집! 쇼핑! King, 디지털·테슬라는 유인양품. 직접 가보고 직접 써본 리뷰만 모았습니다.',

  // 실제 배포 주소. (비워두면 sitemap.xml 과 canonical 태그를 만들지 않습니다)
  siteUrl: 'https://kgg8308.github.io',

  // 검색엔진 소유확인 코드 (서치어드바이저 / 서치콘솔에서 발급)
  verify: { naver: '', google: '' },

  // ── 쿠팡 파트너스 ──────────────────────────────────────────────
  coupang: {
    // 파트너스 필수 고지 문구. 지우지 마세요.
    disclosure: '이 사이트는 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.',
    // 추천 상품.
    // link  = 쿠팡 파트너스 링크. 유인양품 글에 걸려 있던 링크를 그대로 가져왔다.
    //         (글에서는 네이버 단축주소 vvd.bz 로 감싸여 있어 원본을 풀어 적었다)
    // post  = 그 제품을 다룬 리뷰 글. link 가 비면 이쪽으로 연결된다.
    // 둘 다 비어 있는 상품은 페이지에 나오지 않는다.
    picks: [
      {
        title: '레노버 LOQ 15AHP11 라이젠7 RTX 5060',
        desc: '원룸·좁은 책상이면 데스크톱보다 이쪽. 직접 비교해 본 결론.',
        image:
          'https://blogthumb.pstatic.net/MjAyNjEwMjBfMzYg/MDAxNzkyNDYwODk3NDcz.LVOP7mri7JagnI0dd_Szy-9-dklrJn7mwSFQvLsfA3wg.mxXfnQJIPcIGTSLIEpfvvn7-D43lptD1yLSY4S8FjAkg.PNG/img_01.png?type=s3',
        link: 'https://link.coupang.com/a/hZy6y0iCXY',
        post: 'https://blog.naver.com/sexpo15/224447508927',
        badge: '게이밍 노트북',
      },
      {
        title: '플레이스테이션 5 프로',
        desc: '귀무자 웨이 오브 더 소드 돌려보고 내린 결론 — 살 만하다.',
        image:
          'https://blogthumb.pstatic.net/MjAyNjA5MDZfMjQ3/MDAxNzg4Njc5ODc5NDA5.6PHRQhApMTE4GZou9SzLr3fhWSvJ--WlmX_k-53kPYMg.xEp0StltGpHpEM5Pm0UlK26uWN5kLtbCRNQaNg-jf7cg.PNG/image.png?type=s3',
        link: 'https://link.coupang.com/a/gOVTdFVQJg',
        post: 'https://blog.naver.com/sexpo15/224402711685',
        badge: '콘솔',
      },
      {
        title: '세이코 SRPE93J1 프로스펙스 터틀',
        desc: '오래 차봐도 만족스러운 다이버 워치.',
        image:
          'https://blogthumb.pstatic.net/MjAyNjA5MjdfMTk3/MDAxNzkwNDkxMjkyODAw.N1Ge-_zN_p-emgesKR9shX51IvVcsye0t4imITSsHuMg.1LbhNCZcir0kl5lMCi6qNmd2SifkD3MNYbMbKRs3KGwg.PNG/image.png?type=s3',
        link: 'https://link.coupang.com/a/hnIMTWiTWm',
        post: 'https://blog.naver.com/sexpo15/224423876618',
        badge: '시계',
      },
    ],
  },

  // ── 블로그 ────────────────────────────────────────────────────
  blogs: [
    {
      id: 'kgg8308',
      accent: '#e4572e',
      kicker: '먹는 이야기',
      focus: '맛집 · 카페 · 핫플레이스',
      blurb: '서울·부산 가리지 않고 직접 가서 먹고 씁니다. 백화점 팝업과 쇼핑 소식까지.',
    },
    {
      id: 'sexpo15',
      accent: '#2f6df6',
      kicker: '쓰는 이야기',
      focus: '디지털 · 가전 · 테슬라',
      blurb: '노트북부터 테슬라까지, 돈 주고 산 물건을 오래 써보고 남기는 리뷰.',
    },
  ],
};

const HERE = dirname(fileURLToPath(import.meta.url));
const POSTS_PER_BLOG = 6;

/* ───────────────────────── 유틸 ───────────────────────── */

const esc = (s) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const cdata = (s) =>
  String(s ?? '').replace(/^\s*<!\[CDATA\[/, '').replace(/\]\]>\s*$/, '').trim();

const pick = (xml, name) => {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
  return m ? cdata(m[1]) : '';
};

const cleanLink = (url) => url.split('?')[0];

// 네이버가 주는 이미지 주소에 http:// 가 섞여 있다. https 사이트에서는
// 혼합 콘텐츠로 차단되므로 전부 https 로 올려준다.
const https = (url) => String(url ?? '').replace(/^http:\/\//, 'https://');

const plain = (html) =>
  cdata(html)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\.{3,}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const fmtDate = (d) =>
  d ? `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}` : '';

const isoDate = (d) => (d ? d.toISOString().slice(0, 10) : '');

/* ───────────────────────── RSS ───────────────────────── */

function parseFeed(xml) {
  const head = xml.split('<item>')[0];
  const items = xml
    .split('<item>')
    .slice(1)
    .map((chunk) => {
      const raw = chunk.split('</item>')[0];
      const desc = pick(raw, 'description');
      const img = desc.match(/<img[^>]+src="([^"]+)"/);
      const date = new Date(pick(raw, 'pubDate'));
      return {
        title: pick(raw, 'title'),
        link: cleanLink(pick(raw, 'link')),
        category: pick(raw, 'category'),
        date: isNaN(date) ? null : date,
        // 네이버 썸네일은 RSS가 준 ?type=s3 만 유효합니다. 크기를 바꾸면 404.
        thumb: img ? https(img[1]) : '',
        snippet: plain(desc).slice(0, 120),
      };
    })
    .filter((it) => it.title && it.link);

  return {
    name: pick(head, 'title'),
    description: pick(head, 'description'),
    avatar: pick(pick(head, 'image'), 'url'),
    items,
  };
}

// 네이버 이미지 서버는 두 가지로 발목을 잡는다.
//   - 프로필(blogpfthumb.phinf.naver.net): https 를 아예 지원하지 않는다(443 거부)
//   - 썸네일(blogthumb.pstatic.net): 일부 이미지는 외부 사이트에서 부르면 차단된다
// 그래서 꼭 보여야 하는 이미지는 빌드할 때 받아서 사이트에 같이 올린다.
// 실패하면 빈 값을 돌려주고, 페이지는 이미지 없이 그려진다.
async function saveImage(url, name) {
  if (!url) return '';
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    // 확장자는 실제 내용으로 판단한다 (네이버는 .PNG 경로로 JPEG 를 주기도 한다)
    const png = buf[0] === 0x89 && buf[1] === 0x50;
    const gif = buf[0] === 0x47 && buf[1] === 0x49;
    const rel = `assets/${name}.${png ? 'png' : gif ? 'gif' : 'jpg'}`;
    mkdirSync(join(HERE, 'assets'), { recursive: true });
    writeFileSync(join(HERE, rel), buf);
    return rel;
  } catch {
    return '';
  }
}

async function loadBlog(blog) {
  const feedUrl = `https://rss.blog.naver.com/${blog.id}.xml`;
  const base = { ...blog, url: `https://blog.naver.com/${blog.id}`, feedUrl, ok: false, items: [] };
  try {
    const res = await fetch(feedUrl, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const feed = parseFeed(await res.text());
    if (!feed.name) return { ...base, note: '이 주소에서 블로그를 찾지 못했습니다' };
    const avatar = await saveImage(feed.avatar, `${blog.id}-profile`);
    return { ...base, ...feed, avatar, items: feed.items.slice(0, POSTS_PER_BLOG), ok: true };
  } catch (err) {
    return { ...base, note: `불러오지 못했습니다 (${err.message})` };
  }
}

/* ───────────────────────── 조각 ───────────────────────── */

const postItem = (post) => `
          <li class="post">
            <a href="${esc(post.link)}" target="_blank" rel="noopener">
              ${post.thumb
                ? `<span class="thumb"><img src="${esc(post.thumb)}" alt="" loading="lazy" decoding="async"></span>`
                : '<span class="thumb thumb-empty" aria-hidden="true"></span>'}
              <span class="post-body">
                <span class="post-title">${esc(post.title)}</span>
                <span class="post-meta">${[post.category, fmtDate(post.date)].filter(Boolean).map(esc).join(' · ')}</span>
              </span>
            </a>
          </li>`;

const blogPanel = (blog) => `
      <section class="panel" style="--accent:${esc(blog.accent)}" data-blog="${esc(blog.id)}">
        <header class="panel-head">
          ${blog.avatar
            ? `<img class="avatar" src="${esc(blog.avatar)}" alt="" loading="lazy" decoding="async">`
            : '<span class="avatar avatar-empty" aria-hidden="true"></span>'}
          <div class="panel-title">
            <p class="kicker">${esc(blog.kicker)}</p>
            <h2>${esc(blog.name || blog.id)}</h2>
            <p class="focus">${esc(blog.focus)}</p>
          </div>
        </header>
        <p class="blurb">${esc(blog.blurb)}</p>
        <div class="panel-bar">
          <span class="freshness">${blog.items[0]?.date ? `최근 글 ${fmtDate(blog.items[0].date)}` : '최신글'}</span>
          <a class="visit" href="${esc(blog.url)}" target="_blank" rel="noopener">블로그 전체 보기 <span aria-hidden="true">&rarr;</span></a>
        </div>
        <ol class="posts">${blog.items.map(postItem).join('')}</ol>
        ${!blog.ok
          ? `<p class="empty">${esc(blog.note || '최신글을 불러오지 못했습니다')}<br><span class="empty-sub">build.mjs 의 CONFIG 에서 주소를 확인한 뒤 다시 실행하세요.</span></p>`
          : ''}
      </section>`;

// 파트너스 링크가 있으면 쿠팡으로, 없으면 그 제품을 다룬 리뷰 글로 보낸다.
const pickCard = (p) => `
        <li class="pick">
          <a href="${esc(p.link || p.post)}" target="_blank" rel="${p.link ? 'nofollow sponsored noopener' : 'noopener'}">
            ${p.image
              ? `<span class="pick-img"><img src="${esc(p.image)}" alt="" loading="lazy" decoding="async"></span>`
              : '<span class="pick-img pick-img-empty" aria-hidden="true"></span>'}
            <span class="pick-body">
              ${p.badge ? `<span class="pick-badge">${esc(p.badge)}</span>` : ''}
              <span class="pick-title">${esc(p.title)}</span>
              ${p.desc ? `<span class="pick-desc">${esc(p.desc)}</span>` : ''}
              <span class="pick-cta">${p.link ? '최저가 보러 가기' : '리뷰 보기'} <span aria-hidden="true">&rarr;</span></span>
            </span>
          </a>
        </li>`;

const picksSection = (picks) => `
      <section class="picks-wrap" id="picks">
        <div class="section-head">
          <h2>이 달의 추천</h2>
          <p>리뷰하면서 실제로 쓰고 있는 물건만 올립니다.</p>
        </div>
        <ul class="picks">${picks.map(pickCard).join('')}</ul>
        ${picks.some((p) => p.link) ? `<p class="disclosure">${esc(CONFIG.coupang.disclosure)}</p>` : ''}
      </section>`;

/* ───────────────────────── 빌드 ───────────────────────── */

const blogs = [];
for (const blog of CONFIG.blogs) blogs.push(await loadBlog(blog));

const allPosts = blogs
  .flatMap((b) => b.items.map((it) => ({ ...it, blog: b.name || b.id })))
  .sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));

// 파트너스 링크가 아직 없어도 리뷰 글이 있으면 카드로 보여준다.
const livePicks = CONFIG.coupang.picks.filter((p) => (p.link || p.post || '').trim());

// 수익이 걸린 카드라 이미지는 네이버가 아니라 우리 사이트에서 서빙한다.
for (const [i, p] of livePicks.entries()) {
  p.image = (await saveImage(p.image, `pick-${i + 1}`)) || p.image;
}
const builtAt = new Date();

const siteUrl = CONFIG.siteUrl.replace(/\/+$/, '');
const metaDesc = plain(CONFIG.tagline).slice(0, 155);
const ogImage = blogs.find((b) => b.items.find((i) => i.thumb))?.items.find((i) => i.thumb)?.thumb || '';


const jsonLd = JSON.stringify({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      name: CONFIG.siteTitle,
      description: metaDesc,
      ...(siteUrl ? { url: siteUrl + '/' } : {}),
      inLanguage: 'ko-KR',
    },
    {
      '@type': 'ItemList',
      name: `${CONFIG.siteTitle} 최신 리뷰`,
      itemListElement: allPosts.slice(0, 12).map((p, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: p.link,
        name: p.title,
      })),
    },
  ],
});

const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(CONFIG.siteTitle)} — 맛집 리뷰와 디지털 리뷰를 한곳에</title>
<meta name="description" content="${esc(metaDesc)}">
${siteUrl ? `<link rel="canonical" href="${esc(siteUrl)}/">` : ''}
${CONFIG.verify.naver ? `<meta name="naver-site-verification" content="${esc(CONFIG.verify.naver)}">` : ''}
${CONFIG.verify.google ? `<meta name="google-site-verification" content="${esc(CONFIG.verify.google)}">` : ''}
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(CONFIG.siteTitle)}">
<meta property="og:title" content="${esc(CONFIG.siteTitle)}">
<meta property="og:description" content="${esc(metaDesc)}">
${siteUrl ? `<meta property="og:url" content="${esc(siteUrl)}/">` : ''}
${ogImage ? `<meta property="og:image" content="${esc(ogImage)}">` : ''}
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#f4f3f1" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#121315" media="(prefers-color-scheme: dark)">
<link rel="preconnect" href="https://blogthumb.pstatic.net" crossorigin>
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<style>
:root {
  color-scheme: light;
  --bg: #f4f3f1;
  --surface: #ffffff;
  --ink: #17191c;
  --muted: #6b7280;
  --faint: #9aa0a8;
  --line: #e4e2de;
  --shadow: 0 1px 2px rgba(23, 25, 28, .05), 0 12px 28px -18px rgba(23, 25, 28, .25);
  --coupang: #ae0000;
}
@media (prefers-color-scheme: dark) {
  :root {
    color-scheme: dark;
    --bg: #121315;
    --surface: #1b1d20;
    --ink: #ecedef;
    --muted: #9ca3ac;
    --faint: #767c85;
    --line: #2b2e33;
    --shadow: 0 1px 2px rgba(0, 0, 0, .4), 0 14px 30px -20px rgba(0, 0, 0, .8);
    --coupang: #ff6b6b;
  }
}
* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--ink);
  font: 15px/1.6 'Pretendard Variable', Pretendard, -apple-system, 'Malgun Gothic', 'Segoe UI', sans-serif;
  -webkit-font-smoothing: antialiased;
  letter-spacing: -0.01em;
}
img { max-width: 100%; }
a { color: inherit; text-decoration: none; }
.wrap { max-width: 1060px; margin: 0 auto; padding: 0 20px 80px; }

/* 헤더 */
.topbar {
  position: sticky;
  top: 0;
  z-index: 10;
  background: color-mix(in srgb, var(--bg) 86%, transparent);
  backdrop-filter: saturate(180%) blur(12px);
  border-bottom: 1px solid var(--line);
}
.topbar-inner {
  max-width: 1060px;
  margin: 0 auto;
  padding: 13px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
}
.brand { font-weight: 800; letter-spacing: -0.03em; font-size: 15.5px; }
.topnav { margin-left: auto; display: flex; gap: 18px; font-size: 13.5px; color: var(--muted); font-weight: 600; }
.topnav a:hover { color: var(--ink); }

/* 히어로 */
.hero { padding: 64px 0 44px; }
.eyebrow {
  margin: 0 0 14px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .16em;
  text-transform: uppercase;
  color: var(--faint);
}
.hero h1 {
  margin: 0;
  font-size: clamp(32px, 6.4vw, 54px);
  font-weight: 800;
  letter-spacing: -0.04em;
  line-height: 1.1;
}
.hero .tagline {
  margin: 18px 0 0;
  max-width: 48ch;
  font-size: 16.5px;
  color: var(--muted);
}
.hero-cta { margin: 28px 0 0; display: flex; gap: 10px; flex-wrap: wrap; }
.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 11px 18px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: var(--surface);
  font-size: 14px;
  font-weight: 700;
  box-shadow: var(--shadow);
  transition: transform .15s ease;
}
.btn:hover { transform: translateY(-1px); }
.btn .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--c); }

/* 섹션 공통 */
.section-head { margin: 0 0 20px; }
.section-head h2 {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.03em;
}
.section-head p { margin: 6px 0 0; font-size: 14px; color: var(--muted); }

/* 추천 */
.picks-wrap { padding: 18px 0 10px; }
.picks { list-style: none; margin: 0; padding: 0; display: grid; gap: 16px; grid-template-columns: repeat(3, minmax(0, 1fr)); }
.pick a {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: var(--shadow);
  transition: transform .15s ease;
}
.pick a:hover { transform: translateY(-2px); }
.pick-img { display: block; flex: none; aspect-ratio: 4 / 3; background: var(--bg); overflow: hidden; }
.pick-img img { width: 100%; height: 100%; object-fit: cover; display: block; }
.pick-body { display: flex; flex: 1 1 auto; flex-direction: column; gap: 7px; padding: 16px 16px 18px; }
.pick-badge {
  align-self: start;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .04em;
  padding: 3px 9px;
  border-radius: 999px;
  background: var(--bg);
  color: var(--muted);
}
.pick-title { font-size: 15px; font-weight: 700; line-height: 1.4; }
.pick-desc { font-size: 13px; color: var(--muted); }
.pick-cta { margin-top: 4px; font-size: 13px; font-weight: 700; color: var(--coupang); }
.picks-empty {
  border: 1px dashed var(--line);
  border-radius: 16px;
  padding: 22px;
  color: var(--muted);
  font-size: 14px;
}
.picks-empty p { margin: 0 0 10px; }
.picks-empty code {
  font-family: ui-monospace, 'Cascadia Mono', Consolas, monospace;
  font-size: 12.5px;
  background: var(--bg);
  padding: 1px 5px;
  border-radius: 5px;
}
.picks-empty pre {
  margin: 12px 0 0;
  padding: 14px;
  background: var(--bg);
  border-radius: 10px;
  font-family: ui-monospace, 'Cascadia Mono', Consolas, monospace;
  font-size: 12.5px;
  line-height: 1.55;
  color: var(--ink);
  overflow-x: auto;
}
.disclosure {
  margin: 16px 0 0;
  font-size: 12px;
  color: var(--faint);
}

/* 블로그 패널 */
.blogs { margin-top: 56px; display: grid; gap: 22px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.panel {
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 18px;
  padding: 26px 24px 20px;
  box-shadow: var(--shadow);
  position: relative;
  overflow: hidden;
}
.panel::before {
  content: '';
  position: absolute;
  inset: 0 0 auto;
  height: 3px;
  background: var(--accent);
}
.panel-head { display: flex; gap: 14px; align-items: flex-start; }
.avatar {
  width: 52px; height: 52px; flex: none;
  border-radius: 50%;
  object-fit: cover;
  background: var(--bg);
  border: 1px solid var(--line);
}
.avatar-empty { display: block; }
.panel-title { min-width: 0; }
.kicker {
  margin: 0 0 4px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .12em;
  color: var(--accent);
}
.panel-title h2 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.03em; }
.focus { margin: 4px 0 0; font-size: 13px; color: var(--muted); }
.blurb { margin: 16px 0 0; font-size: 14px; color: var(--muted); }
.panel-bar {
  margin-top: 20px;
  padding-top: 14px;
  border-top: 1px solid var(--line);
  display: flex;
  align-items: baseline;
  gap: 12px;
  flex-wrap: wrap;
}
.freshness {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: var(--accent);
}
.visit { margin-left: auto; font-size: 13px; font-weight: 700; color: var(--ink); }
.visit span { display: inline-block; transition: transform .15s ease; }
.visit:hover span { transform: translateX(3px); }
.posts { list-style: none; margin: 4px 0 0; padding: 0; }
.post + .post { border-top: 1px solid var(--line); }
.post a {
  display: flex;
  gap: 14px;
  align-items: center;
  padding: 13px 0;
  border-radius: 10px;
  transition: background .15s ease, transform .15s ease;
}
.post a:hover { background: var(--bg); transform: translateX(2px); }
.thumb {
  width: 68px; height: 68px; flex: none;
  border-radius: 12px;
  overflow: hidden;
  background: var(--bg);
  border: 1px solid var(--line);
}
.thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.post-body { min-width: 0; display: flex; flex-direction: column; gap: 5px; }
.post-title {
  font-size: 14.5px;
  font-weight: 600;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.post-meta { font-size: 12px; color: var(--faint); }
.empty {
  margin: 18px 0 0;
  padding: 16px;
  border: 1px dashed var(--line);
  border-radius: 12px;
  font-size: 13px;
  color: var(--muted);
}
.empty-sub { color: var(--faint); font-size: 12px; }

/* 푸터 */
footer {
  margin-top: 56px;
  padding-top: 24px;
  border-top: 1px solid var(--line);
  font-size: 12.5px;
  color: var(--faint);
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.foot-row { display: flex; gap: 10px 18px; flex-wrap: wrap; align-items: baseline; }
.foot-row .dot { opacity: .5; }

@media (max-width: 860px) {
  .picks { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .blogs { grid-template-columns: 1fr; margin-top: 44px; }
  .hero { padding: 44px 0 32px; }
}
@media (max-width: 560px) {
  .picks { grid-template-columns: 1fr; }
  .topnav { display: none; }
}
</style>
<script type="application/ld+json">${jsonLd}</script>
</head>
<body>

<div class="topbar">
  <div class="topbar-inner">
    <a class="brand" href="#top">${esc(CONFIG.siteTitle)}</a>
    <nav class="topnav">
      ${livePicks.length ? '<a href="#picks">추천</a>' : ''}
${blogs.map((b) => `      <a href="#${esc(b.id)}">${esc(b.kicker)}</a>`).join('\n')}
    </nav>
  </div>
</div>

<div class="wrap" id="top">
  <header class="hero">
    <p class="eyebrow">Review Hub</p>
    <h1>${esc(CONFIG.siteTitle)}</h1>
    <p class="tagline">${esc(CONFIG.tagline)}</p>
    <div class="hero-cta">
${blogs.map((b) => `      <a class="btn" href="#${esc(b.id)}" style="--c:${esc(b.accent)}"><span class="dot"></span>${esc(b.focus.split(' · ')[0])} 리뷰 보기</a>`).join('\n')}
    </div>
  </header>

  <main>
${livePicks.length ? picksSection(livePicks) : ""}

    <div class="blogs">
${blogs.map((b) => blogPanel(b).replace('<section class="panel"', `<section class="panel" id="${esc(b.id)}"`)).join('\n')}
    </div>
  </main>

  <footer>
    <div class="foot-row">
      <span>마지막 새 글 <strong>${esc(fmtDate(allPosts[0]?.date || builtAt))}</strong></span>
      <span class="dot">·</span>
      <span>6시간마다 자동으로 새 글을 반영합니다</span>
    </div>
    <div class="foot-row"><span>${esc(CONFIG.coupang.disclosure)}</span></div>
  </footer>
</div>

</body>
</html>
`;

const out = join(HERE, 'index.html');
writeFileSync(out, html, 'utf8');

// 검색엔진용 파일은 실제 주소가 정해졌을 때만 만듭니다.
if (siteUrl) {
  const lastmod = isoDate(allPosts[0]?.date || builtAt);
  writeFileSync(
    join(HERE, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${siteUrl}/</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`,
    'utf8',
  );
  writeFileSync(
    join(HERE, 'robots.txt'),
    `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`,
    'utf8',
  );
}

for (const b of blogs) {
  console.log(b.ok ? `OK   ${b.name} — 글 ${b.items.length}개` : `실패 ${b.id} — ${b.note}`);
}
console.log(`추천 상품 ${livePicks.length}개 노출 (쿠팡 링크 ${CONFIG.coupang.picks.filter((p) => p.link).length}개 / 나머지는 리뷰 글로 연결)`);
console.log(siteUrl ? `sitemap.xml / robots.txt 생성 (${siteUrl})` : 'siteUrl 비어 있음 → sitemap.xml / robots.txt 생략');
console.log(`만들었습니다: ${out}`);
