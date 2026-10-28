// 블로그 수익 허브 생성기
//
// 두 네이버 블로그 + 유튜브 RSS를 읽어 index.html, 지역(/region/)·장소(/place/) 페이지, sitemap.xml, robots.txt 를 만듭니다.
// 고칠 곳은 아래 CONFIG 뿐입니다. 고친 뒤 `node homepage/build.mjs` 또는
// `홈페이지_새로고침.bat` 을 실행하면 다시 만들어집니다.

import { writeFileSync, mkdirSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
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
        title: '삼성 갤럭시북6 NT740VJQ-A58A',
        desc: '14인치 가성비 사무용. 학생·사무용으로 고민된다면.',
        image:
          'https://postfiles.pstatic.net/MjAyNjA5MDdfNzYg/MDAxNzg4NzQ2ODcwOTY2.r4kWPJb4EcXaT0cX2YHoBFA343lCoIpomu894WJtswAg.uMuMSUTZBYqWFp385r1uf4JbmxjLQRYYcw_rlGKWa-8g.PNG/image.png',
        link: 'https://link.coupang.com/a/gQdWZsXmTY',
        post: 'https://blog.naver.com/kgg8308/224403410493',
        badge: '노트북',
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
      {
        title: '한우먹는날 한우 도가니탕 700g 3개',
        desc: '독립문 대성집 60년 노포의 그 맛을 집에서.',
        image:
          'https://blogthumb.pstatic.net/MjAyNjEwMTJfMTc1/MDAxNzkxNzkwMjEzNDIx.SifMjSDl-vIXZTiAVeRYcVrFk-AqlgaUPb4GMvxyuTwg.KrBvFfB4qqZ0pDTkQgPvjd9ExRRfvfPhWQknR2KMA-sg.JPEG/IMG%A3%DF0767.jpg?type=s3',
        link: 'https://link.coupang.com/a/hMG5Hp9Njo',
        post: 'https://blog.naver.com/kgg8308/224439196444',
        badge: '맛집 밀키트',
      },
    ],
  },

  // ── 맛집 지도 ─────────────────────────────────────────────────
  // 글에 네이버 '장소'를 첨부하면 자동으로 지도에 핀이 꽂힙니다.
  // 장소 첨부가 없는 글을 지도에 넣고 싶을 때만 여기에 적으세요.
  //   { name: '가게 이름', address: '도로명 주소', post: '블로그 글 주소' }
  // (좌표를 알면 lat, lng 를 같이 적어도 됩니다. 없으면 주소로 자동 변환)
  places: [],
  // 지도 핀 색: 음식점·카페 = 맛집(빨강), 나머지 = 핫플(파랑). 자동 분류가 틀린 곳만 여기서 고치세요.
  //   '가게 이름(일부만 적어도 됨)': 'food' (맛집)  또는  'hot' (핫플)
  // 폐업한 곳: 이름(일부만 적어도 됨)을 적으면 지도에 X 표시로 바뀝니다.
  //   예) closed: ['회상', '필로우 문래'],
  closed: [],
  placeKinds: {
    부타매니아동: 'food', 비비비당: 'food', 밀창고: 'food', 하가원: 'food', 기장끝집: 'food', 정짓간: 'food',
    유주키친: 'food', 호린옥: 'food', 애슐리: 'food', 온더보더: 'food', 랑만: 'food', 장만옥: 'food',
    파작: 'food', 난포: 'food', 파르노: 'food', 서령: 'food', 빠르크: 'food', 한정선: 'food', 대성집: 'food',
    류센소: 'food', 비씨씨킹덤: 'food', 이쿠라: 'food', '에비스:더라운지': 'food', 아웃백: 'food',
    온천집: 'food', 올드머그: 'food', 까사부사노: 'food', 나막집: 'food', 그리고문래: 'food', 이흥룡: 'food',
    더베이101: 'hot', 여의나루역: 'hot', '라이다서빙고': 'hot', 케이스위스성수점: 'hot',
  },

  // ── 유튜브 ────────────────────────────────────────────────────
  // 채널 RSS 로 최신 영상을 자동으로 가져옵니다. 채널을 바꾸려면 channelId 만 고치세요.
  youtube: {
    name: '맛잘러',
    channelId: 'UCphYGzNexZL1P5j_7ZamAQQ',
    blurb: '블로그에 쓴 그 집, 영상으로도 남깁니다.',
    count: 6,
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

// 이미지 파일명에 해시가 붙으므로, 남은 옛 파일이 쌓이지 않게 매번 비운다.
rmSync(join(dirname(fileURLToPath(import.meta.url)), 'assets'), { recursive: true, force: true });
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
    // 파일명에 내용 해시를 붙인다. 사진을 바꾸면 주소도 바뀌므로
    // 방문자 브라우저가 옛 사진을 캐시해 두는 일이 없다.
    const hash = createHash('sha1').update(buf).digest('hex').slice(0, 8);
    const rel = `assets/${name}-${hash}.${png ? 'png' : gif ? 'gif' : 'jpg'}`;
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
    // 최근 글 썸네일은 사이트에 같이 올린다. 네이버가 외부 사이트에서 부르는 썸네일을 막아
    // 휴대폰(사파리 등)에서 ? 깨진 이미지로 보이기 때문.
    const items = feed.items.slice(0, POSTS_PER_BLOG);
    for (const it of items) it.localThumb = await saveImage(it.thumb, `post-${it.link.split('/').pop()}`);
    return { ...base, ...feed, avatar, allItems: feed.items, items, ok: true };
  } catch (err) {
    return { ...base, note: `불러오지 못했습니다 (${err.message})` };
  }
}

/* ───────────────────────── 유튜브 ───────────────────────── */
//
// 채널 RSS(최근 15개 영상)를 읽는다. 못 읽으면 지난번에 저장한 목록을 그대로 쓴다
// → 유튜브가 잠깐 응답하지 않아도 영상 칸이 사라지지 않는다.
const YT_FILE = join(HERE, 'youtube.json');

async function loadYoutube(cfg) {
  if (!cfg?.channelId) return null;
  const url = `https://www.youtube.com/channel/${cfg.channelId}`;
  const base = { ...cfg, url, subscribe: `${url}?sub_confirmation=1`, videos: [] };
  try {
    const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${cfg.channelId}`, {
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    const videos = xml
      .split('<entry>')
      .slice(1)
      .map((chunk) => {
        const raw = chunk.split('</entry>')[0];
        const id = pick(raw, 'yt:videoId');
        const date = new Date(pick(raw, 'published'));
        const link = raw.match(/<link[^>]+href="([^"]+)"/)?.[1] || `https://www.youtube.com/watch?v=${id}`;
        return {
          id,
          title: pick(raw, 'title').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>'),
          date: isNaN(date) ? '' : isoDate(date),
          link,
          short: /\/shorts\//.test(link),
        };
      })
      .filter((v) => v.id && v.title);
    if (!videos.length) throw new Error('영상 없음');
    writeFileSync(YT_FILE, JSON.stringify(videos, null, 1) + '\n', 'utf8');
    return { ...base, videos, ok: true };
  } catch (err) {
    let videos = [];
    try {
      videos = JSON.parse(readFileSync(YT_FILE, 'utf8'));
    } catch {}
    console.log(`유튜브 — RSS 를 못 읽음 (${err.message})${videos.length ? `, 지난번 목록 ${videos.length}개 사용` : ''}`);
    return { ...base, videos, ok: false };
  }
}

/* ───────────────────────── 맛집 지도 ───────────────────────── */
//
// 블로그 글 본문에서 네이버 '장소' 첨부(가게 이름·주소·좌표)를 찾아 places.json 에 모은다.
// 한 번 확인한 글은 다시 읽지 않고, RSS 에서 밀려난 옛 글의 장소도 계속 남는다.

const PLACES_FILE = join(HERE, 'places.json');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const inKorea = (lat, lng) => lat > 32.8 && lat < 38.9 && lng > 124 && lng < 132.2;

function loadPlaceStore() {
  try {
    const d = JSON.parse(readFileSync(PLACES_FILE, 'utf8'));
    return { posts: d.posts || {}, geocode: d.geocode || {}, lists: d.lists || {} };
  } catch {
    return { posts: {}, geocode: {}, lists: {} };
  }
}

const decodeAttr = (s) =>
  s.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16))).replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

// JSON 안을 훑어 이름 + 좌표를 가진 객체를 모두 장소로 본다 (에디터 버전마다 구조가 달라서).
function collectPlaces(node, out) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) return node.forEach((n) => collectPlaces(n, out));
  const ll = node.latlng || node.latLng || node;
  const lat = parseFloat(ll.latitude ?? ll.lat ?? ll.y);
  const lng = parseFloat(ll.longitude ?? ll.lng ?? ll.x);
  const name = node.name || node.placeName || node.title;
  if (typeof name === 'string' && name.trim() && inKorea(lat, lng)) {
    const cat = [node.category, node.categoryName, node.placeCategory, node.bizCategory, node.categoryPath]
      .flat()
      .filter((v) => typeof v === 'string' && v.trim())
      .join(' ')
      .trim();
    out.push({
      name: name.trim(),
      address: String(node.address || node.roadAddress || node.addr || '').trim(),
      lat: +lat.toFixed(6),
      lng: +lng.toFixed(6),
      ...(cat ? { pc: cat } : {}),
    });
    return;
  }
  for (const v of Object.values(node)) collectPlaces(v, out);
}

function extractPlaces(html) {
  const found = [];
  for (const m of html.matchAll(/data-(?:linkdata|module)\s*=\s*(['"])([\s\S]*?)\1/g)) {
    const raw = decodeAttr(m[2]);
    if (!/lat|longitude|latlng/i.test(raw)) continue;
    try {
      collectPlaces(JSON.parse(raw), found);
    } catch {}
  }
  const seen = new Set();
  return found.filter((p) => {
    const k = `${p.name}|${p.lat.toFixed(4)}|${p.lng.toFixed(4)}`;
    return seen.has(k) ? false : seen.add(k);
  });
}

async function fetchPostPlaces(blogId, link) {
  const logNo = link.split('/').pop();
  const url = `https://blog.naver.com/PostView.naver?blogId=${blogId}&logNo=${logNo}&redirect=Dlog&widgetTypeCall=true`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(20000),
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  // 대표 사진: og:image → 본문 첫 사진 (RSS 에서 밀려난 옛 글용)
  const og = html.match(/property=["']og:image["'][^>]*content=["']([^"']+)/i);
  const img = html.match(/https:\/\/(?:postfiles|blogfiles)\.pstatic\.net\/[^"'\s?]+/);
  return { places: extractPlaces(html), thumb: og ? https(decodeAttr(og[1])) : img ? `${img[0]}?type=w580` : '' };
}

// RSS 는 최근 50개 글만 준다. 블로그 글 목록을 처음부터 끝까지 훑어 옛 글도 지도에 넣는다.
async function fetchAllPosts(blogId) {
  const out = [];
  for (let page = 1; page <= 100; page++) {
    const url = `https://blog.naver.com/PostTitleListAsync.naver?blogId=${blogId}&viewdate=&currentPage=${page}&categoryNo=0&parentCategoryNo=0&countPerPage=30`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(20000),
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36', Referer: `https://blog.naver.com/${blogId}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const d = JSON.parse((await res.text()).replace(/\\'/g, "'"));
    const list = d.postList || [];
    for (const p of list) {
      let title = String(p.title || '');
      try { title = decodeURIComponent(title.replace(/\+/g, ' ')); } catch {}
      const m = String(p.addDate || '').match(/(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})/);
      out.push({
        link: `https://blog.naver.com/${blogId}/${p.logNo}`,
        title: decodeAttr(title).trim(),
        date: m ? `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}` : '',
      });
    }
    if (list.length < 30 || out.length >= +(d.totalCount || 0)) break;
    await sleep(300);
  }
  return out;
}

// 핀 종류: 음식점·카페 = 'food'(맛집), 나머지 = 'hot'(핫플)
const FOOD = /음식|식당|미역|정찬|회센|집밥|맥주|브레드|bread|로스터스|엔젤리너스|폴 ?바셋|맥도날드|쉐이크쉑|버거킹|롯데리아|양장|스타벅스|투썸|이디야|메가커피|빽다방|블루보틀|고든램지|베이글|바게트|페스츄리|패스츄리|로스터리|로스팅|브루잉|아라비카|찻집|다방|티하우스|한식|중식|일식|양식|분식|뷔페|카페|커피|디저트|베이커리|제과|빵|떡|술집|주점|호프|포차|이자카야|와인|칵테일|펍|bar\b|고기|갈비|삼겹|돼지|소고기|한우|곱창|막창|대창|국밥|국수|냉면|밀면|칼국수|수제비|라멘|라면|우동|소바|스시|초밥|오마카세|횟집|회센터|물회|해물|조개|장어|복어|아구|게장|대게|킹크랩|랍스|돈까스|돈카츠|카츠|덮밥|규동|텐동|야키|쿠시|닭|치킨|버거|피자|파스타|스테이크|브런치|타코|쌀국수|마라|훠궈|딤섬|짜장|짬뽕|반점|김밥|떡볶이|순대|족발|보쌈|찜|탕|찌개|전골|샤브|만두|죽|비빔|쌈밥|정식|백반|ラーメン|ramen|sushi|cafe|coffee|bakery|restaurant|bistro|kitchen|dining|grill|brewing|食|屋|亭|鮨|寿司|丼|麺|喫茶|珈琲/i;
const HOT = /백화점|아울렛|몰|mall|쇼핑|마트|시장|스토어|store|shop|숍|샵|편집|팝업|매장|센터|타워|공원|해수욕장|해변|비치|전망|스카이|박물관|미술관|갤러리|전시|서점|books|tsutaya|테마파크|월드|랜드|파크|park|공항|호텔|리조트|경기장|스타디움|체육|시티|베이스|센터|빌딩|building|百貨店|ストア|ショップ|MITSUKOSHI|PARCO|LOFT|Pokémon|포켓몬/i;

const SKIP = /주차장|주차구획|주차타워|약국|고등학교|중학교|초등학교|^\S*역\s*\d+호선$/;

const isClosed = (name) => {
  const key = String(name).replace(/\s+/g, '');
  return CONFIG.closed.some((c) => c && key.includes(String(c).replace(/\s+/g, '')));
};

function placeKind(p, postPlaces) {
  const key = p.name.replace(/\s+/g, '');
  const hit = Object.keys(CONFIG.placeKinds).find((k) => key.includes(k.replace(/\s+/g, '')));
  if (hit) return CONFIG.placeKinds[hit] === 'food' ? 'food' : 'hot';
  if (p.pc) {
    if (FOOD.test(p.pc)) return 'food';
    return 'hot';
  }
  if (FOOD.test(p.name)) return 'food';
  // 'OO 롯데몰동부산점' 처럼 입점 매장이면 지점명을 떼고 본다 (몰 안 식당이 핫플로 잡히지 않게)
  const core = p.name
    .split(/\s+/)
    .filter((w) => !/롯데|신세계|현대|아울렛|백화점|몰|센텀|동부산|마린시티|엘시티|본점$|직영점$|\S+점$|^@/.test(w))
    .join(' ');
  if (!core || HOT.test(core)) return 'hot';
  // 이름으로 모르면 글 맥락: 맛집 카테고리 글의 단독 장소는 맛집
  const ctx = `${p.category || ''} ${p.title || ''}`;
  if ((/맛집|먹|식당|카페|국밥|라멘|뷔페|와인바|칵테일|소주|술집|이자카야/.test(ctx) || FOOD.test(p.title || '')) && postPlaces <= 3) return 'food';
  return 'hot';
}

// 주소 → 좌표 (CONFIG.places 에 좌표 없이 적은 곳만). OpenStreetMap 무료 검색, 결과는 저장해 재사용.
async function geocode(address, store) {
  if (address in store.geocode) return store.geocode[address];
  let result = null;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=kr&q=${encodeURIComponent(address)}`,
      { signal: AbortSignal.timeout(15000), headers: { 'User-Agent': 'kgg8308.github.io blog map' } },
    );
    const [hit] = res.ok ? await res.json() : [];
    if (hit && inKorea(+hit.lat, +hit.lon)) result = [+(+hit.lat).toFixed(6), +(+hit.lon).toFixed(6)];
    await sleep(1100);
  } catch {
    return null; // 일시 오류는 저장하지 않고 다음에 다시 시도
  }
  store.geocode[address] = result;
  return result;
}

const STORE_V = 2; // 장소 업종(pc)을 읽기 시작한 버전. 옛 버전으로 저장된 글은 한 번 다시 읽는다.
const MAX_SCAN = 2500; // 한 번 실행에 새로 읽는 글 수 상한 (남은 글은 다음 실행 때)

async function buildPlaces(blogs) {
  const store = loadPlaceStore();
  let checked = 0;
  let failed = 0;
  const queue = [];
  for (const blog of blogs) {
    // 1) RSS 최근 글: 제목·카테고리·썸네일이 가장 정확하다
    const seen = new Set();
    const items = (blog.allItems || []).map((it) => ({
      link: it.link,
      meta: { blog: blog.id, title: it.title, category: it.category, date: isoDate(it.date), thumb: it.thumb },
    }));
    // 2) 블로그 전체 글 목록 (RSS 에 없는 옛 글)
    try {
      const all = await fetchAllPosts(blog.id);
      store.lists[blog.id] = all.length;
      for (const p of all) items.push({ link: p.link, meta: { blog: blog.id, title: p.title, date: p.date } });
    } catch (err) {
      console.log(`지도 — ${blog.id} 전체 글 목록을 못 읽음 (${err.message}), 최근 글만 확인`);
    }
    for (const { link, meta } of items) {
      if (seen.has(link)) continue;
      seen.add(link);
      const prev = store.posts[link];
      if (prev) {
        // 제목·썸네일이 바뀌었으면 반영 (빈 값으로 덮어쓰지 않음)
        for (const [k, v] of Object.entries(meta)) if (v) prev[k] = v;
        if (prev.v === STORE_V) continue;
      }
      queue.push({ blog, link, meta });
    }
  }
  for (const { blog, link, meta } of queue.slice(0, MAX_SCAN)) {
    try {
      const got = await fetchPostPlaces(blog.id, link);
      const prev = store.posts[link] || {};
      store.posts[link] = { category: '', thumb: '', ...prev, ...Object.fromEntries(Object.entries(meta).filter(([, v]) => v)), thumb: prev.thumb || meta.thumb || got.thumb, places: got.places, v: STORE_V };
      checked++;
    } catch {
      failed++;
    }
    await sleep(350);
  }
  if (queue.length > MAX_SCAN) console.log(`지도 — 남은 글 ${queue.length - MAX_SCAN}개는 다음 실행 때 확인`);

  const pins = [];
  for (const [link, post] of Object.entries(store.posts)) {
    const n = (post.places || []).length;
    for (const pl of post.places || []) {
      if (SKIP.test(decodeAttr(pl.name))) continue; // 주차장·약국 같은 안내용 장소는 지도에서 뺀다
      const pin = { ...pl, name: decodeAttr(pl.name), address: decodeAttr(pl.address || ''), link, blog: post.blog, title: post.title, category: post.category, date: post.date, thumb: post.thumb };
      pin.kind = placeKind(pin, n);
      pin.closed = isClosed(pin.name);
      pins.push(pin);
    }
  }
  for (const m of CONFIG.places) {
    if (!m?.name) continue;
    let ll = m.lat && m.lng ? [m.lat, m.lng] : m.address ? await geocode(m.address, store) : null;
    if (!ll) {
      console.log(`지도 — 위치를 찾지 못함: ${m.name} (${m.address || '주소 없음'})`);
      continue;
    }
    const post = store.posts[m.post] || {};
    const pin = { name: m.name, address: m.address || '', lat: ll[0], lng: ll[1], link: m.post || '', blog: post.blog || 'kgg8308', title: post.title || m.name, category: post.category || '', date: post.date || '', thumb: post.thumb || '' };
    pin.kind = m.kind === 'food' || m.kind === 'hot' ? m.kind : placeKind(pin, 1);
    pin.closed = m.closed === true || isClosed(m.name);
    pins.push(pin);
  }
  // 두 블로그에 같은 곳을 올린 경우 핀은 하나만 (맛집 블로그 글 우선, 그다음 최신 글)
  const first = CONFIG.blogs[0].id;
  pins.sort((a, b) => (b.blog === first) - (a.blog === first) || (b.date || '').localeCompare(a.date || ''));
  // 같은 곳을 다룬 글은 모두 모아 둔다 (장소 상세 페이지에서 리뷰 목록으로 쓴다).
  const seenPin = new Map();
  const unique = pins.filter((p) => {
    const k = `${p.name.replace(/\s+/g, '')}|${p.lat.toFixed(3)}|${p.lng.toFixed(3)}`;
    const ref = { link: p.link, blog: p.blog, title: p.title, date: p.date, thumb: p.thumb };
    const had = seenPin.get(k);
    if (had) {
      if (p.link && !had.posts.some((x) => x.link === p.link)) had.posts.push(ref);
      return false;
    }
    p.posts = p.link ? [ref] : [];
    seenPin.set(k, p);
    return true;
  });
  for (const p of unique) p.posts.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  unique.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  // 정렬해서 저장 → 내용이 같으면 파일도 같아 불필요한 커밋이 생기지 않는다.
  const sorted = (o) => Object.fromEntries(Object.keys(o).sort().map((k) => [k, o[k]]));
  writeFileSync(PLACES_FILE, JSON.stringify({ lists: sorted(store.lists), posts: sorted(store.posts), geocode: sorted(store.geocode) }, null, 1) + '\n', 'utf8');
  console.log(`지도 — 핀 ${unique.length}개 (맛집 ${unique.filter((p) => p.kind === 'food').length} · 핫플 ${unique.filter((p) => p.kind !== 'food').length}, 새로 확인한 글 ${checked}개${failed ? `, 못 읽은 글 ${failed}개는 다음에 재시도` : ''})`);
  return unique;
}

const PIN = { food: '#e03131', hot: '#2f6df6' }; // 맛집 빨강 · 핫플 파랑
const mapSection = (pins) => `
      <section class="map-wrap" id="map">
        <div class="section-head">
          <h2>맛집·핫플 지도</h2>
          <p>직접 다녀와서 글로 남긴 곳 <strong>${pins.length}</strong>곳. 핀을 누르면 리뷰로 이어집니다.</p>
        </div>
        <div class="map-box">
          <div class="map-legend" role="group" aria-label="지도 표시 선택">
            <button type="button" data-k="all" aria-pressed="true">전체 <b>${pins.length}</b></button>
            <button type="button" data-k="food" aria-pressed="false"><span class="lg-dot" style="--pc:${PIN.food}"></span>맛집 <b>${pins.filter((p) => p.kind === 'food').length}</b></button>
            <button type="button" data-k="hot" aria-pressed="false"><span class="lg-dot" style="--pc:${PIN.hot}"></span>핫플 <b>${pins.filter((p) => p.kind !== 'food').length}</b></button>
            ${pins.some((p) => p.closed) ? `<button type="button" data-k="closed" aria-pressed="false"><span class="lg-x">✕</span>폐업 <b>${pins.filter((p) => p.closed).length}</b></button>` : ''}
          </div>
          <div id="placemap" class="placemap" role="region" aria-label="맛집·핫플 지도"><span class="map-loading">지도를 불러오는 중…</span></div>
        </div>
        <script type="application/json" id="place-data">${JSON.stringify(
          pins.map((p) => ({ n: p.name, a: p.address, y: p.lat, x: p.lng, l: p.link, b: p.blog, k: p.kind === 'food' ? 'food' : 'hot', ...(p.closed ? { z: 1 } : {}), t: p.title, c: p.category, d: p.date, i: p.thumb })),
        ).replace(/</g, '\\u003c')}</script>
      </section>`;

/* ───────────────────────── 지역 · 장소 페이지 ───────────────────────── */
//
// 검색 노출용: 장소마다 /place/이름-xxxx/ , 지역마다 /region/부산-해운대구/ 페이지를 만든다.
// 홈 한 장에 모든 걸 담으면 '해운대 맛집' 같은 검색어로 걸릴 페이지가 없기 때문.

const SIDO = {
  서울특별시: '서울', 서울시: '서울', 서울: '서울',
  부산광역시: '부산', 부산시: '부산', 부산: '부산',
  대구광역시: '대구', 대구: '대구',
  인천광역시: '인천', 인천: '인천',
  광주광역시: '광주', 광주: '광주',
  대전광역시: '대전', 대전: '대전',
  울산광역시: '울산', 울산: '울산',
  세종특별자치시: '세종', 세종: '세종',
  경기도: '경기', 경기: '경기',
  강원도: '강원', 강원특별자치도: '강원', 강원: '강원',
  충청북도: '충북', 충북: '충북',
  충청남도: '충남', 충남: '충남',
  전라북도: '전북', 전북특별자치도: '전북', 전북: '전북',
  전라남도: '전남', 전남: '전남',
  경상북도: '경북', 경북: '경북',
  경상남도: '경남', 경남: '경남',
  제주특별자치도: '제주', 제주도: '제주', 제주: '제주',
};
// 지역 목록 정렬 순서 (많이 다니는 곳 먼저)
const SIDO_ORDER = ['부산', '서울', '경기', '인천', '대전', '대구', '울산', '광주', '세종', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주', '일본'];

function regionOf(p) {
  const a = String(p.address || '').trim();
  if (/Fukuoka|福岡|후쿠오카/i.test(a) || /후쿠오카/.test(p.name)) return { sido: '일본', sgg: '후쿠오카' };
  const [t1, t2] = a.split(/\s+/);
  const sido = SIDO[t1];
  if (!sido) return null;
  if (sido === '세종' || !t2 || !/(시|군|구)$/.test(t2)) return { sido, sgg: '' };
  return { sido, sgg: t2 };
}
const regionName = (r) => (r.sgg ? `${r.sido} ${r.sgg}` : r.sido);
// 파일 이름으로 쓸 수 없는 글자만 바꾼다 (윈도우에서 받아도 깨지지 않게)
const slugify = (s) =>
  String(s)
    .normalize('NFC')
    .replace(/[\s/\\?#%&:;"'<>|*.,()[\]{}!@$^+=~`]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
    .replace(/-$/, '');
const shortHash = (s) => createHash('sha1').update(s).digest('hex').slice(0, 4);
const placeSlug = (p) => `${slugify(p.name) || 'place'}-${shortHash(`${p.name}|${p.lat.toFixed(4)}|${p.lng.toFixed(4)}`)}`;
const regionSlug = (r) => slugify(r.sgg ? `${r.sido}-${r.sgg}` : r.sido);

// 두 지점 사이 거리(km)
function distKm(a, b) {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const fmtKm = (km) => (km < 1 ? `${Math.max(10, Math.round(km * 100) * 10)}m` : `${km.toFixed(1)}km`);
const dotDate = (iso) => String(iso || '').replace(/-/g, '.');

// 홈 화면: 지역별 바로가기 (검색엔진이 지역 페이지를 찾아가는 길이기도 하다)
const regionsSection = (regions) => `
      <section class="regions-wrap" id="regions">
        <div class="section-head">
          <h2>지역별로 보기</h2>
          <p>동네 이름으로 골라 보세요. 직접 가본 곳만 모았습니다.</p>
        </div>
        <ul class="region-chips">${regions
          .slice(0, 24)
          .map((r) => `<li><a href="region/${encodeURI(r.slug)}/">${esc(r.name)} <b>${r.places.length}</b></a></li>`)
          .join('')}
          <li><a class="chip-all" href="region/">전체 지역 <span aria-hidden="true">&rarr;</span></a></li>
        </ul>
      </section>`;

// 홈 화면: 유튜브 최신 영상
const videoCard = (v) => `
          <li class="video">
            <a href="${esc(v.link)}" target="_blank" rel="noopener">
              <span class="video-thumb"><img src="https://i.ytimg.com/vi/${esc(v.id)}/hqdefault.jpg" alt="" loading="lazy" decoding="async"><span class="video-play" aria-hidden="true"></span>${v.short ? '<span class="video-tag">Shorts</span>' : ''}</span>
              <span class="video-title">${esc(v.title)}</span>
              ${v.date ? `<span class="video-date">${esc(dotDate(v.date))}</span>` : ''}
            </a>
          </li>`;

const youtubeSection = (yt) => `
      <section class="videos-wrap" id="videos">
        <div class="section-head section-head-row">
          <div>
            <h2>${esc(yt.name)} 유튜브</h2>
            <p>${esc(yt.blurb || '최신 영상')}</p>
          </div>
          <a class="yt-sub" href="${esc(yt.subscribe)}" target="_blank" rel="noopener"><span class="yt-logo" aria-hidden="true"></span>구독하기</a>
        </div>
        <ul class="videos">${yt.videos.slice(0, yt.count || 6).map(videoCard).join('')}</ul>
      </section>`;

// 지역·장소 페이지가 같이 쓰는 스타일 (site.css 로 저장)
const SITE_CSS = `:root {
  color-scheme: light;
  --bg: #f4f3f1; --surface: #ffffff; --ink: #17191c; --muted: #6b7280; --faint: #9aa0a8; --line: #e4e2de;
  --shadow: 0 1px 2px rgba(23, 25, 28, .05), 0 12px 28px -18px rgba(23, 25, 28, .25);
  --food: ${PIN.food}; --hot: ${PIN.hot};
}
@media (prefers-color-scheme: dark) {
  :root {
    color-scheme: dark;
    --bg: #121315; --surface: #1b1d20; --ink: #ecedef; --muted: #9ca3ac; --faint: #767c85; --line: #2b2e33;
    --shadow: 0 1px 2px rgba(0, 0, 0, .4), 0 14px 30px -20px rgba(0, 0, 0, .8);
  }
}
* { box-sizing: border-box; }
body {
  margin: 0; background: var(--bg); color: var(--ink);
  font: 15px/1.6 'Pretendard Variable', Pretendard, -apple-system, 'Malgun Gothic', 'Segoe UI', sans-serif;
  -webkit-font-smoothing: antialiased; letter-spacing: -0.01em;
}
img { max-width: 100%; }
a { color: inherit; text-decoration: none; }
.wrap { max-width: 1060px; margin: 0 auto; padding: 0 20px 80px; }
.topbar { position: sticky; top: 0; z-index: 1000; background: color-mix(in srgb, var(--bg) 86%, transparent); backdrop-filter: saturate(180%) blur(12px); border-bottom: 1px solid var(--line); }
.topbar-inner { max-width: 1060px; margin: 0 auto; padding: 13px 20px; display: flex; align-items: center; gap: 16px; }
.brand { font-weight: 800; letter-spacing: -0.03em; font-size: 15.5px; white-space: nowrap; }
.topnav { margin-left: auto; display: flex; gap: 18px; font-size: 13.5px; color: var(--muted); font-weight: 600; }
.topnav a:hover { color: var(--ink); }
.visits { display: inline-flex; align-items: center; gap: 8px; padding: 5px 11px; border: 1px solid var(--line); border-radius: 999px; background: var(--surface); font-size: 12px; color: var(--muted); white-space: nowrap; font-variant-numeric: tabular-nums; }
.visits b { color: var(--ink); font-weight: 800; }
.visits .sep { opacity: .4; }

.crumbs { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; padding: 22px 0 0; font-size: 13px; color: var(--faint); }
.crumbs a { color: var(--muted); font-weight: 600; }
.crumbs a:hover { color: var(--ink); }
.crumbs [aria-current] { color: var(--faint); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 60vw; }
.crumb-sep { opacity: .6; }

.place-head, .region-head { padding: 26px 0 24px; }
.badge { margin: 0 0 10px; display: inline-flex; gap: 8px; align-items: center; font-size: 12px; font-weight: 800; color: var(--pc); letter-spacing: .02em; }
.closed { color: var(--muted); font-weight: 800; }
h1 { margin: 0; font-size: clamp(28px, 5.4vw, 44px); font-weight: 800; letter-spacing: -0.04em; line-height: 1.15; }
.addr { margin: 10px 0 0; color: var(--muted); font-size: 15px; }
.lead { margin: 12px 0 0; color: var(--muted); font-size: 16px; max-width: 60ch; }
.lead strong { color: var(--ink); }
.actions { margin: 22px 0 0; display: flex; flex-wrap: wrap; gap: 8px; }
.btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px; border-radius: 999px; border: 1px solid var(--line); background: var(--surface); font-size: 14px; font-weight: 700; box-shadow: var(--shadow); transition: transform .15s ease; }
.btn:hover { transform: translateY(-1px); }
.btn-primary { background: var(--pc, var(--ink)); border-color: var(--pc, var(--ink)); color: #fff; }

.place-grid { display: grid; gap: 18px; grid-template-columns: minmax(0, 1fr) minmax(0, 1.25fr); align-items: start; }
.review { display: flex; flex-direction: column; background: var(--surface); border: 1px solid var(--line); border-radius: 18px; overflow: hidden; box-shadow: var(--shadow); transition: transform .15s ease; }
.review:hover { transform: translateY(-2px); }
.review-img { display: block; aspect-ratio: 4 / 3; background: var(--bg); overflow: hidden; }
.review-img img { width: 100%; height: 100%; object-fit: cover; display: block; }
.review-body { display: grid; gap: 6px; padding: 18px 20px 20px; }
.review-kicker { font-size: 12px; font-weight: 700; color: var(--faint); }
.review-title { font-size: 17px; font-weight: 700; line-height: 1.45; letter-spacing: -0.02em; }
.review-cta { margin-top: 4px; font-size: 13.5px; font-weight: 700; color: var(--pc); }
.place-head + .place-grid .review-cta { color: inherit; }

.map-box { position: relative; border: 1px solid var(--line); border-radius: 18px; overflow: hidden; background: var(--surface); box-shadow: var(--shadow); }
.placemap { height: clamp(320px, 52vh, 480px); width: 100%; background: #dfe7ec; display: grid; place-items: center; z-index: 0; }
.map-small .placemap { height: clamp(280px, 44vh, 420px); }
.map-loading { font-size: 13px; color: #6b7280; }
.pin { width: 28px; height: 28px; border-radius: 50% 50% 50% 0; background: var(--pc); transform: rotate(-45deg); border: 2.5px solid #fff; box-shadow: 0 3px 10px rgba(0,0,0,.35); display: grid; place-items: center; }
.pin::after { content: ''; width: 8px; height: 8px; border-radius: 50%; background: #fff; }
.pin-cur { width: 38px; height: 38px; border-width: 3px; }
.pin-cur::after { width: 11px; height: 11px; }
.pin-dim { opacity: .78; }
.pin-closed { background: color-mix(in srgb, var(--pc) 45%, #8a8f98); }
.pin-closed::after { content: '✕'; width: auto; height: auto; background: none; color: #fff; font: 900 12px/1 sans-serif; transform: rotate(45deg); }
.pin-cluster { min-width: 38px; height: 38px; padding: 0 8px; border-radius: 999px; background: #17191c; color: #fff; font: 800 13.5px/1 inherit; display: grid; place-items: center; border: 3px solid #fff; box-shadow: 0 3px 12px rgba(0,0,0,.35); }
.leaflet-container { font-family: inherit; }
.leaflet-popup-content-wrapper { border-radius: 14px; padding: 0; overflow: hidden; }
.leaflet-popup-content { margin: 0; width: 220px !important; }
.pop { display: block; color: #17191c; }
.pop-img { display: block; aspect-ratio: 16 / 9; background: #eee; overflow: hidden; }
.pop-img img { width: 100%; height: 100%; object-fit: cover; display: block; }
.pop-body { display: grid; gap: 3px; padding: 10px 12px 12px; }
.pop-kind { font-size: 11.5px; font-weight: 800; color: var(--pc); }
.pop-name { font-weight: 800; font-size: 14.5px; letter-spacing: -0.02em; }
.pop-addr { font-size: 12px; color: #6b7280; }
.pop-cta { margin-top: 4px; font-size: 12.5px; font-weight: 700; color: var(--pc); }

.block { padding: 40px 0 0; }
.block h2 { margin: 0 0 16px; font-size: 21px; font-weight: 800; letter-spacing: -0.03em; display: flex; align-items: baseline; gap: 8px; }
.block h2 b { font-size: 14px; color: var(--faint); font-weight: 800; font-variant-numeric: tabular-nums; }
.pcards { list-style: none; margin: 0; padding: 0; display: grid; gap: 14px; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); }
.pcard a { display: flex; flex-direction: column; height: 100%; background: var(--surface); border: 1px solid var(--line); border-radius: 16px; overflow: hidden; box-shadow: var(--shadow); transition: transform .15s ease; }
.pcard a:hover { transform: translateY(-2px); }
.pcard-img { display: block; aspect-ratio: 16 / 10; background: var(--bg); overflow: hidden; }
.pcard-img img { width: 100%; height: 100%; object-fit: cover; display: block; }
.pcard-img.noimg { background: linear-gradient(135deg, color-mix(in srgb, var(--pc) 18%, var(--surface)), var(--bg)); }
.pcard-body { display: flex; flex-direction: column; gap: 4px; padding: 13px 15px 15px; }
.pcard-kind { font-size: 11.5px; font-weight: 800; color: var(--pc); }
.pcard-name { font-size: 15.5px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.35; }
.pcard-addr { font-size: 12.5px; color: var(--muted); }
.pcard-post { margin-top: 2px; font-size: 13px; color: var(--muted); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

.post-list { list-style: none; margin: 0; padding: 0; background: var(--surface); border: 1px solid var(--line); border-radius: 16px; box-shadow: var(--shadow); }
.post-list li + li { border-top: 1px solid var(--line); }
.post-list a { display: flex; flex-direction: column; gap: 3px; padding: 14px 18px; }
.post-list a:hover .pl-title { text-decoration: underline; text-underline-offset: 3px; }
.pl-title { font-weight: 600; font-size: 14.5px; }
.pl-meta { font-size: 12px; color: var(--faint); }

.region-chips { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 8px; }
.region-chips a { display: inline-flex; align-items: baseline; gap: 6px; padding: 9px 14px; border-radius: 999px; background: var(--surface); border: 1px solid var(--line); font-size: 14px; font-weight: 600; transition: transform .15s ease, border-color .15s ease; }
.region-chips a:hover { transform: translateY(-1px); border-color: var(--ink); }
.region-chips b { font-size: 12px; font-weight: 800; color: var(--faint); font-variant-numeric: tabular-nums; }
.more { margin: 36px 0 0; }

footer { margin-top: 56px; padding-top: 24px; border-top: 1px solid var(--line); font-size: 12.5px; color: var(--faint); display: flex; flex-direction: column; gap: 10px; }
footer a:hover { color: var(--ink); }
.foot-row { display: flex; gap: 10px 14px; flex-wrap: wrap; align-items: baseline; }
.foot-row .dot { opacity: .5; }

@media (max-width: 760px) {
  .place-grid { grid-template-columns: 1fr; }
  .place-head, .region-head { padding: 18px 0 20px; }
}
@media (max-width: 560px) {
  .topnav { display: none; }
  .visits { margin-left: auto; }
  .pcards { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .pcard-body { padding: 10px 11px 12px; }
  .pcard-name { font-size: 14.5px; }
  .pcard-post { display: none; }
}
`;

// 지역·장소 페이지 공용 스크립트 (site.js 로 저장): 지도 + 방문자 수
const SITE_JS = `(function () {
  // ── 지도 ──
  var box = document.getElementById('placemap');
  var dataEl = document.getElementById('place-data');
  if (box && dataEl) {
    var PIN = ${JSON.stringify(PIN)};
    var data = JSON.parse(dataEl.textContent);
    var useCluster = data.length > 40;
    var css = function (h) { var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = h; document.head.appendChild(l); };
    var js = function (s) { return new Promise(function (ok, no) { var t = document.createElement('script'); t.src = s; t.onload = ok; t.onerror = no; document.head.appendChild(t); }); };
    var e = function (s) { return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
    var started = false;
    var start = function () {
      if (started) return; started = true;
      var L0 = 'https://unpkg.com/leaflet@1.9.4/dist/', C0 = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/';
      css(L0 + 'leaflet.css');
      var p = js(L0 + 'leaflet.js');
      if (useCluster) { css(C0 + 'MarkerCluster.css'); p = p.then(function () { return js(C0 + 'leaflet.markercluster.js'); }); }
      p.then(draw).catch(function () { box.innerHTML = '<span class="map-loading">지도를 불러오지 못했습니다. 새로고침해 주세요.</span>'; });
    };
    var draw = function () {
      box.innerHTML = '';
      var map = L.map(box, { scrollWheelZoom: false, zoomSnap: 0.5 });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(map);
      var group = useCluster
        ? L.markerClusterGroup({ showCoverageOnHover: false, maxClusterRadius: 42, iconCreateFunction: function (c) { return L.divIcon({ html: '<div class="pin-cluster">' + c.getChildCount() + '</div>', className: '', iconSize: [40, 40] }); } })
        : L.featureGroup();
      var cur = null;
      data.forEach(function (p) {
        var c = PIN[p.k] || PIN.hot, s = p.c ? 38 : 28;
        var cls = 'pin' + (p.c ? ' pin-cur' : '') + (p.z ? ' pin-closed' : '') + (data.some(function (q) { return q.c; }) && !p.c ? ' pin-dim' : '');
        var icon = L.divIcon({ html: '<div class="' + cls + '" style="--pc:' + c + '"></div>', className: '', iconSize: [s, s], iconAnchor: [s / 2, s], popupAnchor: [0, -s + 2] });
        var html = '<a class="pop" style="--pc:' + c + '" href="' + e(p.u) + '">' +
          (p.i ? '<span class="pop-img"><img src="' + e(p.i) + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentNode.remove()"></span>' : '') +
          '<span class="pop-body"><span class="pop-kind">' + (p.k === 'food' ? '맛집' : '핫플') + (p.z ? ' · 폐업' : '') + '</span><span class="pop-name">' + e(p.n) + '</span>' +
          (p.a ? '<span class="pop-addr">' + e(p.a) + '</span>' : '') +
          (p.c ? '' : '<span class="pop-cta">자세히 보기 &rarr;</span>') + '</span></a>';
        var mk = L.marker([p.y, p.x], { icon: icon, title: p.n, alt: p.n, zIndexOffset: p.c ? 1000 : 0 }).bindPopup(html, { maxWidth: 240 });
        if (p.c) { cur = mk; mk.addTo(map); } else group.addLayer(mk);
      });
      map.addLayer(group);
      if (cur) {
        var ll = cur.getLatLng();
        var b = L.latLngBounds([ll]);
        if (group.getLayers().length) b.extend(group.getBounds());
        // 근처 핀이 보이되, 너무 멀리 빠지지는 않게
        map.fitBounds(b, { padding: [40, 40], maxZoom: 16 });
        if (map.getZoom() < 13) map.setView(ll, 14);
      } else if (data.length) {
        map.fitBounds(group.getBounds(), { padding: [36, 36], maxZoom: 15 });
      } else map.setView([36.3, 127.8], 7);
      map.once('focus click', function () { map.scrollWheelZoom.enable(); });
    };
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { io.disconnect(); start(); } }, { rootMargin: '400px' });
      io.observe(box);
    } else start();
  }

  // ── 방문자 수 (홈과 같은 카운터. 같은 브라우저는 하루 한 번만 집계) ──
  var API = 'https://abacus.jasoncameron.dev', NS = 'kgg8308-github-io';
  var day = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10).replace(/-/g, '');
  var seenKey = 'visited-' + day, seen = false;
  try { seen = localStorage.getItem(seenKey) === '1'; } catch (err) {}
  var mode = seen ? 'get' : 'hit';
  var fmt = function (n) { return Number(n || 0).toLocaleString('ko-KR'); };
  var load = function (key, id) {
    var el = document.getElementById(id);
    if (!el) return Promise.resolve();
    return fetch(API + '/' + mode + '/' + NS + '/' + key)
      .then(function (r) { return r.ok ? r.json() : { value: 0 }; })
      .then(function (d) { el.textContent = fmt(d.value); })
      .catch(function () {});
  };
  Promise.all([load('day-' + day, 'v-today'), load('total', 'v-total')]).then(function () {
    if (!seen) { try { localStorage.setItem(seenKey, '1'); } catch (err) {} }
  });
})();
`;

/* ───────────────────────── 조각 ───────────────────────── */

const postItem = (post) => `
          <li class="post">
            <a href="${esc(post.link)}" target="_blank" rel="noopener">
              ${post.localThumb || post.thumb
                ? `<span class="thumb"><img src="${esc(post.localThumb || post.thumb)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.remove()"></span>`
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

const pins = await buildPlaces(blogs);
const blogAccent = Object.fromEntries(CONFIG.blogs.map((b) => [b.id, b.accent]));
const yt = await loadYoutube(CONFIG.youtube);

// 장소 → 지역 묶기. 주소에서 시·도 + 시·군·구를 읽는다.
const regionMap = new Map();
const usedSlugs = new Set();
for (const p of pins) {
  let slug = placeSlug(p);
  while (usedSlugs.has(slug)) slug += 'x'; // 이름·좌표가 완전히 같은 곳은 사실상 없지만 혹시 몰라
  usedSlugs.add(slug);
  p.slug = slug;
  const r = regionOf(p);
  if (!r) continue;
  const rs = regionSlug(r);
  if (!regionMap.has(rs)) regionMap.set(rs, { ...r, slug: rs, name: regionName(r), places: [] });
  p.region = regionMap.get(rs);
  p.region.places.push(p);
}
const regions = [...regionMap.values()].sort((a, b) => b.places.length - a.places.length || a.name.localeCompare(b.name, 'ko'));
for (const r of regions) r.updated = r.places.reduce((m, p) => ((p.date || '') > m ? p.date : m), '');

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
.visits {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 5px 11px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--surface);
  font-size: 12px;
  color: var(--muted);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.visits b { color: var(--ink); font-weight: 800; }
.visits .sep { opacity: .4; }

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

/* 맛집 지도 */
.map-wrap { padding: 34px 0 6px; }
.map-box {
  position: relative;
  border: 1px solid var(--line);
  border-radius: 18px;
  overflow: hidden;
  background: var(--surface);
  box-shadow: var(--shadow);
}
.placemap { height: clamp(380px, 62vh, 560px); width: 100%; background: #dfe7ec; display: grid; place-items: center; z-index: 0; }
.map-loading { font-size: 13px; color: #6b7280; }
.map-legend {
  position: absolute; top: 12px; left: 50%; transform: translateX(-50%); z-index: 500;
  display: flex; gap: 4px; padding: 4px; border-radius: 999px;
  background: rgba(255,255,255,.94); box-shadow: 0 2px 10px rgba(0,0,0,.18);
}
.map-legend button {
  font: 600 13px/1 inherit; color: #374151; background: none; border: 0; cursor: pointer;
  padding: 8px 12px; border-radius: 999px; display: flex; align-items: center; gap: 6px; white-space: nowrap;
}
.map-legend button b { font-weight: 800; color: #17191c; }
.map-legend button[aria-pressed="true"] { background: #17191c; color: #fff; }
.map-legend button[aria-pressed="true"] b { color: #fff; }
.lg-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--pc); box-shadow: 0 0 0 2px #fff; }
.pin {
  width: 30px; height: 30px; border-radius: 50% 50% 50% 0;
  background: var(--pc); transform: rotate(-45deg);
  border: 2.5px solid #fff; box-shadow: 0 3px 10px rgba(0,0,0,.35);
  display: grid; place-items: center;
}
.pin::after { content: ''; width: 9px; height: 9px; border-radius: 50%; background: #fff; }
/* 폐업: 원래 색은 흐리게, 가운데 흰 점 대신 X */
.pin-closed { background: color-mix(in srgb, var(--pc) 45%, #8a8f98); }
.pin-closed::after { content: '✕'; width: auto; height: auto; background: none; color: #fff; font: 900 13px/1 sans-serif; transform: rotate(45deg); }
.lg-x { font-weight: 900; color: #6b7280; }
.map-legend button[aria-pressed="true"] .lg-x { color: #fff; }
.pop-closed { color: #6b7280; }
.pin-cluster {
  min-width: 38px; height: 38px; padding: 0 8px; border-radius: 999px;
  background: #17191c; color: #fff; font: 800 13.5px/1 inherit;
  display: grid; place-items: center; border: 3px solid #fff; box-shadow: 0 3px 12px rgba(0,0,0,.35);
}
.leaflet-container { font-family: inherit; }
.leaflet-popup-content-wrapper { border-radius: 14px; padding: 0; overflow: hidden; }
.leaflet-popup-content { margin: 0; width: 240px !important; }
.pop { display: block; color: #17191c; }
.pop-img { display: block; aspect-ratio: 16 / 9; background: #eee; overflow: hidden; }
.pop-img img { width: 100%; height: 100%; object-fit: cover; display: block; }
.pop-body { display: grid; gap: 3px; padding: 11px 13px 13px; }
.pop-kind { font-size: 11.5px; font-weight: 800; color: var(--pc); letter-spacing: .02em; }
.pop-name { font-weight: 800; font-size: 15px; letter-spacing: -0.02em; }
.pop-addr { font-size: 12px; color: #6b7280; }
.pop-title { font-size: 12.5px; color: #374151; margin-top: 3px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.pop-cta { margin-top: 5px; font-size: 13px; font-weight: 700; color: var(--pc); }

/* 추천 */
.picks-wrap { padding: 18px 0 10px; }
.picks { list-style: none; margin: 0; padding: 0; display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); }
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

section[id] { scroll-margin-top: 72px; }

/* 지역별 보기 */
.regions-wrap { padding: 34px 0 6px; }
.region-chips { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 8px; }
.region-chips a {
  display: inline-flex; align-items: baseline; gap: 6px;
  padding: 9px 14px; border-radius: 999px;
  background: var(--surface); border: 1px solid var(--line);
  font-size: 14px; font-weight: 600; transition: transform .15s ease, border-color .15s ease;
}
.region-chips a:hover { transform: translateY(-1px); border-color: var(--ink); }
.region-chips b { font-size: 12px; font-weight: 800; color: var(--faint); font-variant-numeric: tabular-nums; }
.region-chips .chip-all { background: var(--ink); color: var(--bg); border-color: var(--ink); }

/* 유튜브 */
.videos-wrap { padding: 34px 0 6px; }
.section-head-row { display: flex; align-items: flex-end; gap: 16px; }
.yt-sub {
  margin-left: auto; flex: none; display: inline-flex; align-items: center; gap: 8px;
  padding: 9px 15px; border-radius: 999px; background: #ff0033; color: #fff;
  font-size: 13.5px; font-weight: 700;
}
.yt-logo { width: 16px; height: 11px; border-radius: 3px; background: #fff; position: relative; }
.yt-logo::after { content: ''; position: absolute; left: 6px; top: 3px; border-left: 5px solid #ff0033; border-top: 2.5px solid transparent; border-bottom: 2.5px solid transparent; }
.videos { list-style: none; margin: 0; padding: 0; display: grid; gap: 16px 14px; grid-template-columns: repeat(3, minmax(0, 1fr)); }
.video a { display: flex; flex-direction: column; gap: 8px; }
.video-thumb { position: relative; display: block; aspect-ratio: 16 / 9; border-radius: 14px; overflow: hidden; background: var(--line); }
.video-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .25s ease; }
.video a:hover .video-thumb img { transform: scale(1.03); }
.video-play {
  position: absolute; left: 50%; top: 50%; width: 46px; height: 32px; margin: -16px 0 0 -23px;
  border-radius: 9px; background: rgba(0,0,0,.62);
}
.video-play::after { content: ''; position: absolute; left: 19px; top: 9px; border-left: 12px solid #fff; border-top: 7px solid transparent; border-bottom: 7px solid transparent; }
.video-tag { position: absolute; right: 8px; bottom: 8px; padding: 2px 7px; border-radius: 6px; background: rgba(0,0,0,.7); color: #fff; font-size: 11px; font-weight: 700; }
.video-title { font-size: 14px; font-weight: 600; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.video-date { font-size: 12px; color: var(--faint); margin-top: -4px; }
@media (max-width: 760px) { .videos { grid-template-columns: repeat(2, minmax(0, 1fr)); } }

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
  .blogs { grid-template-columns: 1fr; margin-top: 44px; }
  .hero { padding: 44px 0 32px; }
}
@media (max-width: 560px) {
  .topnav { display: none; }
  .visits { margin-left: auto; }
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
      ${pins.length ? '<a href="#map">지도</a>' : ''}
      ${regions.length ? '<a href="#regions">지역</a>' : ''}
      ${yt?.videos.length ? '<a href="#videos">영상</a>' : ''}
${blogs.map((b) => `      <a href="#${esc(b.id)}">${esc(b.kicker)}</a>`).join('\n')}
    </nav>
    <div class="visits" aria-label="방문자 수">
      <span>오늘 <b id="v-today">-</b></span><span class="sep">|</span><span>전체 <b id="v-total">-</b></span>
    </div>
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
${pins.length ? mapSection(pins) : ''}
${regions.length ? regionsSection(regions) : ''}
${yt?.videos.length ? youtubeSection(yt) : ''}

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

${pins.length ? `<script>
// 맛집 지도: 화면 가까이 왔을 때만 지도 라이브러리를 불러온다 (첫 화면 속도 유지).
(function () {
  var box = document.getElementById('placemap');
  if (!box) return;
  var PIN = ${JSON.stringify(PIN)};
  var started = false;
  function css(href) { var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; document.head.appendChild(l); }
  function js(src) { return new Promise(function (ok, no) { var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s); }); }
  function e(s) { return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function start() {
    if (started) return; started = true;
    var L0 = 'https://unpkg.com/leaflet@1.9.4/dist/', C0 = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/';
    css(L0 + 'leaflet.css'); css(C0 + 'MarkerCluster.css');
    js(L0 + 'leaflet.js').then(function () { return js(C0 + 'leaflet.markercluster.js'); }).then(draw).catch(function () {
      box.innerHTML = '<span class="map-loading">지도를 불러오지 못했습니다. 새로고침해 주세요.</span>';
    });
  }
  function draw() {
    var data = JSON.parse(document.getElementById('place-data').textContent);
    box.innerHTML = '';
    var map = L.map(box, { scrollWheelZoom: false, zoomSnap: 0.5 }).setView([36.3, 127.8], 7);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);
    var layers = { food: [], hot: [], closed: [] };
    var group = L.markerClusterGroup({
      showCoverageOnHover: false, maxClusterRadius: 46,
      iconCreateFunction: function (c) { return L.divIcon({ html: '<div class="pin-cluster">' + c.getChildCount() + '</div>', className: '', iconSize: [40, 40] }); }
    });
    data.forEach(function (p) {
      var c = PIN[p.k] || PIN.hot;
      var icon = L.divIcon({ html: '<div class="pin' + (p.z ? ' pin-closed' : '') + '" style="--pc:' + c + '"></div>', className: '', iconSize: [30, 30], iconAnchor: [15, 30], popupAnchor: [0, -28] });
      var html = '<a class="pop" style="--pc:' + c + '" href="' + e(p.l) + '" target="_blank" rel="noopener">' +
        (p.i ? '<span class="pop-img"><img src="' + e(p.i) + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentNode.remove()"></span>' : '') +
        '<span class="pop-body"><span class="pop-kind">' + (p.k === 'food' ? '맛집' : '핫플') + (p.z ? ' · <span class="pop-closed">폐업</span>' : '') + '</span><span class="pop-name">' + e(p.n) + '</span>' +
        (p.a ? '<span class="pop-addr">' + e(p.a) + '</span>' : '') +
        (p.t && p.t !== p.n ? '<span class="pop-title">' + e(p.t) + '</span>' : '') +
        (p.l ? '<span class="pop-cta">리뷰 보기 &rarr;</span>' : '') + '</span></a>';
      var mk = L.marker([p.y, p.x], { icon: icon, title: p.n, alt: p.n }).bindPopup(html, { maxWidth: 260 });
      (layers[p.k] || layers.hot).push(mk);
      if (p.z) layers.closed.push(mk);
    });
    group.addLayers(layers.food.concat(layers.hot));
    map.addLayer(group);
    // 범례 버튼: 전체 / 맛집만 / 핫플만
    var btns = document.querySelectorAll('.map-legend button');
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        var k = b.getAttribute('data-k');
        btns.forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        group.clearLayers();
        group.addLayers(k === 'all' ? layers.food.concat(layers.hot) : layers[k]);
      });
    });
    if (data.length) map.fitBounds(group.getBounds(), { padding: [36, 36], maxZoom: 14 });
    // PC: 지도를 한 번 클릭해야 마우스 휠 확대가 켜진다 (페이지 스크롤이 지도에 걸리지 않게).
    map.once('focus click', function () { map.scrollWheelZoom.enable(); });
  }
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { io.disconnect(); start(); } }, { rootMargin: '400px' });
    io.observe(box);
  } else start();
})();
</script>` : ''}

<script>
// 방문자 수: 같은 브라우저는 하루 한 번만 집계합니다 (새로고침으로 숫자가 부풀지 않도록).
(function () {
  var API = 'https://abacus.jasoncameron.dev';
  var NS = 'kgg8308-github-io';
  var day = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10).replace(/-/g, ''); // 한국 시간 기준 날짜
  var seenKey = 'visited-' + day;
  var seen = false;
  try { seen = localStorage.getItem(seenKey) === '1'; } catch (e) {}
  var mode = seen ? 'get' : 'hit';
  function fmt(n) { return Number(n || 0).toLocaleString('ko-KR'); }
  function load(key, el) {
    return fetch(API + '/' + mode + '/' + NS + '/' + key)
      .then(function (r) { return r.ok ? r.json() : { value: 0 }; })
      .then(function (d) { document.getElementById(el).textContent = fmt(d.value); })
      .catch(function () {});
  }
  Promise.all([load('day-' + day, 'v-today'), load('total', 'v-total')]).then(function () {
    if (!seen) { try { localStorage.setItem(seenKey, '1'); } catch (e) {} }
  });
})();
</script>

</body>
</html>
`;

const out = join(HERE, 'index.html');
writeFileSync(out, html, 'utf8');

/* ───────────────────────── 지역 · 장소 페이지 쓰기 ───────────────────────── */

// 옛 페이지가 남지 않게 매번 새로 만든다 (가게 이름이 바뀌면 주소도 바뀌므로).
for (const d of ['place', 'region']) rmSync(join(HERE, d), { recursive: true, force: true });
// GitHub Pages 가 파일을 그대로 올리도록 (Jekyll 변환을 건너뛰면 배포도 빨라진다)
writeFileSync(join(HERE, '.nojekyll'), '', 'utf8');

const blogLabel = Object.fromEntries(blogs.map((b) => [b.id, b.name || b.kicker || b.id]));
const blogHome = Object.fromEntries(blogs.map((b) => [b.id, `https://blog.naver.com/${b.id}`]));
const abs = (path) => (siteUrl ? `${siteUrl}/${encodeURI(path)}` : '');
const placePath = (p) => `place/${p.slug}/`;
const regionPath = (r) => `region/${r.slug}/`;
const UP = '../../'; // 장소·지역 페이지는 모두 2단계 아래에 있다
const kindLabel = (p) => (p.kind === 'food' ? '맛집' : '핫플');
const isKorea = (p) => p.region?.sido !== '일본' && !/Fukuoka|福岡|일본/.test(p.address || '');
// 주소에서 시·도 + 시·군·구를 떼고 동네부터 (카드에 짧게 쓰려고)
const shortAddr = (p) => {
  const a = String(p.address || '').trim();
  if (!p.region || !isKorea(p)) return a;
  const parts = a.split(/\s+/);
  return parts.slice(p.region.sgg ? 2 : 1).join(' ') || a;
};
const mapLinks = (p) =>
  isKorea(p)
    ? [
        ['네이버 지도', `https://map.naver.com/p/search/${encodeURIComponent(`${p.name} ${p.address || ''}`.trim())}`],
        ['카카오맵 길찾기', `https://map.kakao.com/link/to/${encodeURIComponent(p.name)},${p.lat},${p.lng}`],
      ]
    : [['구글 지도', `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`]];

// 지도에 넘길 최소 데이터 (u = 이 페이지 기준 상대 주소)
const pinData = (p, cur) => ({
  n: p.name, y: p.lat, x: p.lng, k: p.kind === 'food' ? 'food' : 'hot', a: shortAddr(p),
  u: `${UP}${encodeURI(placePath(p))}`, i: p.thumb || '', ...(p.closed ? { z: 1 } : {}), ...(cur ? { c: 1 } : {}),
});
const mapBlock = (list, opts = {}) => `
    <div class="map-box${opts.small ? ' map-small' : ''}">
      <div id="placemap" class="placemap" role="region" aria-label="지도"><span class="map-loading">지도를 불러오는 중…</span></div>
    </div>
    <script type="application/json" id="place-data">${JSON.stringify(list).replace(/</g, '\\u003c')}</script>`;

const placeCard = (p, extra = '') => {
  const post = p.posts[0];
  return `
      <li class="pcard">
        <a href="${UP}${encodeURI(placePath(p))}" style="--pc:${p.kind === 'food' ? PIN.food : PIN.hot}">
          ${p.thumb
            ? `<span class="pcard-img"><img src="${esc(p.thumb)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.parentNode.classList.add('noimg');this.remove()"></span>`
            : '<span class="pcard-img noimg" aria-hidden="true"></span>'}
          <span class="pcard-body">
            <span class="pcard-kind">${kindLabel(p)}${p.closed ? ' · <span class="closed">폐업</span>' : ''}${extra ? ` · ${extra}` : ''}</span>
            <span class="pcard-name">${esc(p.name)}</span>
            ${p.address ? `<span class="pcard-addr">${esc(shortAddr(p))}</span>` : ''}
            ${post && post.title && post.title !== p.name ? `<span class="pcard-post">${esc(post.title)}</span>` : ''}
          </span>
        </a>
      </li>`;
};

function subPage({ path, title, desc, body, ld, image }) {
  const url = abs(path);
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc.slice(0, 155))}">
${url ? `<link rel="canonical" href="${esc(url)}">` : ''}
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(CONFIG.siteTitle)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc.slice(0, 155))}">
${url ? `<meta property="og:url" content="${esc(url)}">` : ''}
${image ? `<meta property="og:image" content="${esc(image)}">` : ''}
<meta name="theme-color" content="#f4f3f1" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#121315" media="(prefers-color-scheme: dark)">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<link rel="stylesheet" href="${UP}site.css">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>
</head>
<body>
<div class="topbar">
  <div class="topbar-inner">
    <a class="brand" href="${UP}">${esc(CONFIG.siteTitle)}</a>
    <nav class="topnav">
      <a href="${UP}#map">지도</a>
      <a href="${UP}region/">지역</a>
      ${yt?.videos.length ? `<a href="${UP}#videos">영상</a>` : ''}
    </nav>
    <div class="visits" aria-label="방문자 수"><span>오늘 <b id="v-today">-</b></span><span class="sep">|</span><span>전체 <b id="v-total">-</b></span></div>
  </div>
</div>
<div class="wrap">
${body}
  <footer>
    <div class="foot-row">
      <a href="${UP}">${esc(CONFIG.siteTitle)} 홈</a><span class="dot">·</span>
${blogs.map((b) => `      <a href="${esc(blogHome[b.id])}" target="_blank" rel="noopener">${esc(blogLabel[b.id])}</a>`).join('<span class="dot">·</span>\n')}
      ${yt ? `<span class="dot">·</span><a href="${esc(yt.url)}" target="_blank" rel="noopener">${esc(yt.name)} 유튜브</a>` : ''}
    </div>
    <div class="foot-row"><span>지도 &copy; OpenStreetMap 기여자</span></div>
  </footer>
</div>
<script src="${UP}site.js" defer></script>
</body>
</html>
`;
}

const crumbs = (items) => `
  <nav class="crumbs" aria-label="위치">${items
    .map(([name, href], i) => (href && i < items.length - 1 ? `<a href="${href}">${esc(name)}</a>` : `<span aria-current="page">${esc(name)}</span>`))
    .join('<span class="crumb-sep" aria-hidden="true">›</span>')}</nav>`;
const crumbLd = (items) => ({
  '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, ...(siteUrl ? { item: path === '' ? `${siteUrl}/` : abs(path) } : {}) })),
});

const write = (path, html) => {
  mkdirSync(join(HERE, path), { recursive: true });
  writeFileSync(join(HERE, path, 'index.html'), html, 'utf8');
};

// ── 장소 페이지 ──
for (const p of pins) {
  const post = p.posts[0];
  const r = p.region;
  const near = pins
    .filter((q) => q !== p)
    .map((q) => ({ q, d: distKm(p, q) }))
    .filter((x) => x.d < 5)
    .sort((a, b) => a.d - b.d)
    .slice(0, 6);
  const where = r ? r.name : '';
  const title = `${p.name}${where ? ` — ${where} ${kindLabel(p)}` : ''} | ${CONFIG.siteTitle}`;
  const desc = `${p.name}${p.address ? ` (${p.address})` : ''}. ${post ? `직접 다녀와서 쓴 리뷰: ${post.title}${post.date ? ` (${dotDate(post.date)})` : ''}.` : ''}${p.closed ? ' 지금은 폐업한 곳입니다.' : ''}`;
  const crumbItems = [['홈', ''], ['지역별', 'region/'], ...(r ? [[r.name, regionPath(r)]] : []), [p.name, placePath(p)]];
  const body = `${crumbs(crumbItems.map(([n, path], i) => [n, i === 0 ? UP : `${UP}${encodeURI(path)}`]))}
  <header class="place-head" style="--pc:${p.kind === 'food' ? PIN.food : PIN.hot}">
    <p class="badge">${kindLabel(p)}${p.closed ? ' <span class="closed">폐업</span>' : ''}</p>
    <h1>${esc(p.name)}</h1>
    ${p.address ? `<p class="addr">${esc(p.address)}</p>` : ''}
    <div class="actions">
      ${post ? `<a class="btn btn-primary" href="${esc(post.link)}" target="_blank" rel="noopener">리뷰 읽기 <span aria-hidden="true">&rarr;</span></a>` : ''}
      ${mapLinks(p).map(([n, u]) => `<a class="btn" href="${esc(u)}" target="_blank" rel="noopener nofollow">${n}</a>`).join('\n      ')}
    </div>
  </header>
  <div class="place-grid">
    ${post
      ? `<a class="review" href="${esc(post.link)}" target="_blank" rel="noopener">
      ${post.thumb ? `<span class="review-img"><img src="${esc(post.thumb)}" alt="${esc(p.name)}" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.parentNode.remove()"></span>` : ''}
      <span class="review-body">
        <span class="review-kicker">${esc(blogLabel[post.blog] || '블로그')} 리뷰${post.date ? ` · ${esc(dotDate(post.date))}` : ''}</span>
        <span class="review-title">${esc(post.title)}</span>
        <span class="review-cta">글 전체 보기 <span aria-hidden="true">&rarr;</span></span>
      </span>
    </a>`
      : ''}
    ${mapBlock([pinData(p, true), ...near.map((x) => pinData(x.q))], { small: true })}
  </div>
  ${p.posts.length > 1
    ? `<section class="block">
    <h2>이 곳을 다룬 글 <b>${p.posts.length}</b></h2>
    <ol class="post-list">${p.posts
      .map((x) => `<li><a href="${esc(x.link)}" target="_blank" rel="noopener"><span class="pl-title">${esc(x.title)}</span><span class="pl-meta">${esc([blogLabel[x.blog], dotDate(x.date)].filter(Boolean).join(' · '))}</span></a></li>`)
      .join('')}</ol>
  </section>`
    : ''}
  ${near.length
    ? `<section class="block">
    <h2>근처에 가본 곳</h2>
    <ul class="pcards">${near.map((x) => placeCard(x.q, fmtKm(x.d))).join('')}</ul>
  </section>`
    : ''}
  ${r ? `<p class="more"><a class="btn" href="${UP}${encodeURI(regionPath(r))}">${esc(r.name)} 전체 ${r.places.length}곳 보기 <span aria-hidden="true">&rarr;</span></a></p>` : ''}`;
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': p.kind === 'food' ? 'FoodEstablishment' : 'Place',
        name: p.name,
        ...(siteUrl ? { url: abs(placePath(p)) } : {}),
        ...(p.address ? { address: { '@type': 'PostalAddress', streetAddress: p.address, addressCountry: isKorea(p) ? 'KR' : 'JP' } } : {}),
        geo: { '@type': 'GeoCoordinates', latitude: p.lat, longitude: p.lng },
        hasMap: mapLinks(p)[0][1],
        ...(p.thumb ? { image: p.thumb } : {}),
        subjectOf: p.posts.map((x) => ({ '@type': 'BlogPosting', headline: x.title, url: x.link, ...(x.date ? { datePublished: x.date } : {}) })),
      },
      crumbLd(crumbItems),
    ],
  };
  write(placePath(p), subPage({ path: placePath(p), title, desc, body, ld, image: p.thumb }));
}

// ── 지역 페이지 ──
for (const r of regions) {
  const list = [...r.places].sort((a, b) => (a.closed - b.closed) || (b.date || '').localeCompare(a.date || ''));
  const food = list.filter((p) => p.kind === 'food');
  const hot = list.filter((p) => p.kind !== 'food');
  const siblings = regions.filter((x) => x.sido === r.sido && x !== r);
  const what = food.length && hot.length ? '맛집·핫플' : food.length ? '맛집' : '핫플';
  const title = `${r.name} ${what} ${r.places.length}곳 — 직접 가본 곳만 | ${CONFIG.siteTitle}`;
  const top = food.slice(0, 5).map((p) => p.name);
  const desc = `${r.name}에서 직접 가보고 리뷰를 남긴 ${what} ${r.places.length}곳을 지도로 모았습니다.${top.length ? ` ${top.join(', ')} 등.` : ''}`;
  const crumbItems = [['홈', ''], ['지역별', 'region/'], [r.name, regionPath(r)]];
  const listSection = (name, arr) =>
    arr.length
      ? `<section class="block">
    <h2>${name} <b>${arr.length}</b></h2>
    <ul class="pcards">${arr.map((p) => placeCard(p)).join('')}</ul>
  </section>`
      : '';
  const body = `${crumbs(crumbItems.map(([n, path], i) => [n, i === 0 ? UP : `${UP}${encodeURI(path)}`]))}
  <header class="region-head">
    <h1>${esc(r.name)} ${what}</h1>
    <p class="lead">직접 가보고 리뷰를 남긴 곳 <strong>${r.places.length}</strong>곳${food.length && hot.length ? ` — 맛집 ${food.length}곳, 핫플 ${hot.length}곳` : ''}.${r.updated ? ` 최근 리뷰 ${esc(dotDate(r.updated))}` : ''}</p>
  </header>
  ${mapBlock(list.map((p) => pinData(p)))}
  ${listSection('맛집', food)}
  ${listSection('핫플', hot)}
  ${siblings.length
    ? `<section class="block">
    <h2>${esc(r.sido)} 다른 동네</h2>
    <ul class="region-chips">${siblings.map((x) => `<li><a href="${UP}${encodeURI(regionPath(x))}">${esc(x.name)} <b>${x.places.length}</b></a></li>`).join('')}</ul>
  </section>`
    : ''}
  <p class="more"><a class="btn" href="${UP}region/">전체 지역 보기 <span aria-hidden="true">&rarr;</span></a></p>`;
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        name: `${r.name} ${what}`,
        description: desc,
        ...(siteUrl ? { url: abs(regionPath(r)) } : {}),
        inLanguage: 'ko-KR',
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: list.length,
          itemListElement: list.slice(0, 100).map((p, i) => ({ '@type': 'ListItem', position: i + 1, name: p.name, ...(siteUrl ? { url: abs(placePath(p)) } : {}) })),
        },
      },
      crumbLd(crumbItems),
    ],
  };
  write(regionPath(r), subPage({ path: regionPath(r), title, desc, body, ld, image: list.find((p) => p.thumb)?.thumb }));
}

// ── 전체 지역 목록 ──
{
  const groups = SIDO_ORDER.map((s) => ({ sido: s, list: regions.filter((r) => r.sido === s) }))
    .filter((g) => g.list.length)
    .map((g) => ({ ...g, list: [...g.list].sort((a, b) => b.places.length - a.places.length), total: g.list.reduce((n, r) => n + r.places.length, 0) }));
  const total = regions.reduce((n, r) => n + r.places.length, 0);
  const crumbItems = [['홈', ''], ['지역별', 'region/']];
  const body = `${crumbs([['홈', UP], ['지역별', '']])}
  <header class="region-head">
    <h1>지역별 맛집·핫플</h1>
    <p class="lead">${groups.length}개 시·도, ${regions.length}개 동네에서 직접 가본 <strong>${total}</strong>곳.</p>
  </header>
${groups
  .map(
    (g) => `  <section class="block">
    <h2>${esc(g.sido)} <b>${g.total}</b></h2>
    <ul class="region-chips">${g.list.map((r) => `<li><a href="${UP}${encodeURI(regionPath(r))}">${esc(r.sgg || r.name)} <b>${r.places.length}</b></a></li>`).join('')}</ul>
  </section>`,
  )
  .join('\n')}`;
  // 이 페이지만 한 단계 아래라 상대 주소를 고쳐 쓴다.
  const html = subPage({
    path: 'region/',
    title: `지역별 맛집·핫플 지도 | ${CONFIG.siteTitle}`,
    desc: `부산 해운대·기장, 서울 성수·영등포 등 ${regions.length}개 동네에서 직접 가보고 리뷰한 맛집과 핫플 ${total}곳을 지역별로 모았습니다.`,
    body,
    ld: {
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'CollectionPage', name: '지역별 맛집·핫플', ...(siteUrl ? { url: abs('region/') } : {}), inLanguage: 'ko-KR' },
        crumbLd(crumbItems),
      ],
    },
  }).replaceAll(UP, '../');
  mkdirSync(join(HERE, 'region'), { recursive: true });
  writeFileSync(join(HERE, 'region', 'index.html'), html, 'utf8');
}

writeFileSync(join(HERE, 'site.css'), SITE_CSS, 'utf8');
writeFileSync(join(HERE, 'site.js'), SITE_JS, 'utf8');
console.log(`페이지 — 지역 ${regions.length}개 · 장소 ${pins.length}개${yt ? ` · 유튜브 영상 ${yt.videos.length}개${yt.ok ? '' : ' (지난번 목록)'}` : ''}`);

// 검색엔진용 파일은 실제 주소가 정해졌을 때만 만듭니다.
if (siteUrl) {
  const lastmod = isoDate(allPosts[0]?.date || builtAt);
  const urls = [
    { loc: `${siteUrl}/`, lastmod, freq: 'daily', pri: '1.0' },
    { loc: abs('region/'), lastmod: regions.reduce((m, r) => (r.updated > m ? r.updated : m), ''), freq: 'weekly', pri: '0.8' },
    ...regions.map((r) => ({ loc: abs(regionPath(r)), lastmod: r.updated, freq: 'weekly', pri: '0.8' })),
    ...pins.map((p) => ({ loc: abs(placePath(p)), lastmod: p.posts[0]?.date || p.date || '', freq: 'monthly', pri: '0.6' })),
  ];
  writeFileSync(
    join(HERE, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${esc(u.loc)}</loc>
${/^\d{4}-\d{2}-\d{2}$/.test(u.lastmod) ? `    <lastmod>${u.lastmod}</lastmod>\n` : ''}    <changefreq>${u.freq}</changefreq>
    <priority>${u.pri}</priority>
  </url>`,
  )
  .join('\n')}
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
