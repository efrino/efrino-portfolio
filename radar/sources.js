// Job sources with public APIs/feeds. Each returns normalized items; attribution is kept (source + url).
const UA = { 'User-Agent': 'EfrinoRadar/1.0 (+https://efrino.web.id; efrinowep@gmail.com)' };
const ENT = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const decode = t => t.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d)).replace(/&([a-z]+);/gi, (m, n) => ENT[n.toLowerCase()] ?? m);
// Decode twice: some feeds HTML-escape already-escaped text.
const strip = h => decode(decode(String(h || '').replace(/<[^>]+>/g, ' '))).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const get = async (url, as = 'json') => { const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(30000) }); if (!r.ok) throw new Error(`${url} ${r.status}`); return as === 'json' ? r.json() : r.text(); };
const item = o => ({ ...o, description: strip(o.description).slice(0, 5000), title: strip(o.title).slice(0, 200) });

export const SOURCES = {
  remotive: async () => (await get('https://remotive.com/api/remote-jobs?category=software-dev')).jobs.map(j => item({
    ext_id: String(j.id), title: j.title, company: j.company_name, url: j.url, location: j.candidate_required_location, salary: j.salary, tags: (j.tags || []).join(', '), description: j.description, posted_at: j.publication_date })),
  remoteok: async () => (await get('https://remoteok.com/api')).filter(j => j.id).map(j => item({
    ext_id: String(j.id), title: j.position, company: j.company, url: j.url, location: j.location, salary: j.salary_min ? `$${j.salary_min}–${j.salary_max}` : '', tags: (j.tags || []).join(', '), description: j.description, posted_at: j.date })),
  weworkremotely: async () => {
    const xml = await get('https://weworkremotely.com/categories/remote-programming-jobs.rss', 'text');
    return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, x]) => { const t = tag => (x.match(new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`)) || [])[1] || '';
      const [company, ...title] = t('title').split(': '); return item({ ext_id: t('guid') || t('link'), title: title.join(': ') || t('title'), company, url: t('link'), location: t('region'), salary: '', tags: t('category'), description: t('description'), posted_at: t('pubDate') }); });
  },
  himalayas: async () => (await get('https://himalayas.app/jobs/api?limit=100')).jobs.map(j => item({
    ext_id: j.guid || j.applicationLink, title: j.title, company: j.companyName, url: j.applicationLink, location: (j.locationRestrictions || []).join(', ') || 'Worldwide', salary: j.minSalary ? `${j.currency || '$'} ${j.minSalary}–${j.maxSalary}` : '', tags: (j.categories || []).join(', '), description: j.description || j.excerpt, posted_at: j.pubDate ? new Date(j.pubDate * 1000).toISOString() : null })),
  arbeitnow: async () => (await get('https://www.arbeitnow.com/api/job-board-api')).data.filter(j => j.remote).map(j => item({
    ext_id: j.slug, title: j.title, company: j.company_name, url: j.url, location: j.location, salary: '', tags: (j.tags || []).join(', '), description: j.description, posted_at: j.created_at ? new Date(j.created_at * 1000).toISOString() : null })),
  // Monthly "Ask HN: Who is hiring?" thread: one comment = one job post.
  hn: async () => {
    const story = (await get('https://hn.algolia.com/api/v1/search_by_date?tags=story,author_whoishiring&query=hiring&hitsPerPage=1')).hits[0];
    if (!story) return [];
    const c = await get(`https://hn.algolia.com/api/v1/search?tags=comment,story_${story.objectID}&hitsPerPage=300`);
    return c.hits.filter(h => h.comment_text && /remote/i.test(h.comment_text)).map(h => { const text = strip(h.comment_text); return item({
      ext_id: h.objectID, title: text.split('|').slice(0, 2).join(' | ').slice(0, 140), company: text.split('|')[0].trim().slice(0, 80), url: `https://news.ycombinator.com/item?id=${h.objectID}`, location: 'Remote (HN)', salary: '', tags: 'hackernews', description: text, posted_at: h.created_at }); });
  },
};
