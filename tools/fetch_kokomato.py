import os
import re
import json
import time
from urllib.parse import unquote
from common import fetch_html, parse_soup

KOKOMATO_CAT_BASE = "https://kokomatoblog.com/category/game/shoujyowars"

def get_all_article_urls():
    urls = {}
    for p in range(1, 10):
        p_url = f"{KOKOMATO_CAT_BASE}/page/{p}/" if p > 1 else f"{KOKOMATO_CAT_BASE}/"
        html = fetch_html(p_url)
        if not html:
            break
        soup = parse_soup(html)
        if not soup:
            break
        cards = [a for a in soup.find_all('a') if a.get('href') and ('kokomatoblog.com/sw-' in a.get('href') or 'kokomatoblog.com/sh-' in a.get('href'))]
        added = 0
        for a in cards:
            h = a.get('href', '').split('#')[0].rstrip('/')
            title = a.get('title') or a.text.strip().replace('\n', ' ')
            if h and not any(x in h for x in ['category', 'tag', 'page', 'author', 'contact', 'privacy', 'sitemap']):
                if h not in urls:
                    urls[h] = title
                    added += 1
        if added == 0:
            break
    return urls

def fetch_kokomato_articles():
    print("[KOKOMATO] Fetching article list...")
    article_urls = get_all_article_urls()
    print(f"[KOKOMATO] Found {len(article_urls)} articles.")

    char_data_map = {}

    for url, raw_title in sorted(article_urls.items()):
        html = fetch_html(url)
        soup = parse_soup(html)
        if not soup:
            continue
        title = soup.title.string.strip() if soup.title else raw_title
        slug = url.split('/')[-1]

        body = soup.find('article') or soup.find(class_=re.compile(r'entry-content'))
        if not body:
            continue

        # Date
        time_tag = soup.find(['time', 'span'], class_=re.compile(r'date'))
        date_str = time_tag.text.strip() if time_tag else "2026-11-01"
        d_match = re.search(r'(\d{4})年(\d{1,2})月(\d{1,2})日', date_str)
        if d_match:
            date_str = f"{d_match.group(1)}-{int(d_match.group(2)):02d}-{int(d_match.group(3)):02d}"

        # Summary bullets
        summary_bullets = []
        for ul in body.find_all('ul'):
            for li in ul.find_all('li'):
                t = li.text.strip()
                if 5 < len(t) < 100 and not any(x in t for x in ['AppIcon', 'ダウンロード', 'iOS', 'Android']):
                    summary_bullets.append(t)
            if summary_bullets:
                break

        # Recommended gems
        gems = []
        gem_h = body.find(string=re.compile(r'おすすめ宝石'))
        if gem_h:
            parent = gem_h.find_parent(['h2', 'h3', 'p', 'div'])
            if parent:
                for sib in parent.find_next_siblings(['p', 'ul'])[:3]:
                    if sib.name == 'ul':
                        gems = [li.text.strip() for li in sib.find_all('li')]
                        break
                    elif sib.name == 'p':
                        gems.append(sib.text.strip())

        # Extract images with state variants
        tatie_img = None
        shitagi_img = None
        limited_img = None

        for img in body.find_all('img'):
            src = img.get('src')
            alt = img.get('alt', '')
            if not src or 'wp-content/uploads' not in src:
                continue
            if any(x in src for x in ['AppIcon', 'appreach', 'logo', 'itune', 'gplay', '100x100', 'まとめ', '乳首', 'エロい', 'ぐらと', '【DL不要】']):
                continue
            dec_src = unquote(src.split('/')[-1])
            h = img.find_previous(['h2', 'h3', 'h4'])
            htext = h.text.strip() if h else ""

            # Standing / normal
            if ('立ち絵' in alt or '立ち絵' in dec_src) and not tatie_img:
                tatie_img = src
            # Underwear / state 2
            if ('下着' in alt or '下着' in dec_src) and not shitagi_img:
                if 'お尻' not in alt and 'おっぱい' not in alt and 'アクション' not in alt and '足' not in dec_src and '牛乳' not in dec_src:
                    shitagi_img = src
            # Limited costume
            if ('限定衣装' in alt or '限定衣装' in dec_src) and not limited_img:
                if 'お尻' not in alt and 'おっぱい' not in alt and 'パンパン' not in alt and 'タップ' not in alt:
                    limited_img = src

        # Character identification
        # Wedding overview
        if slug == 'sw-wedinggentei':
            # Check for Arthur bride limited costume
            arthur_img = None
            for img in body.find_all('img'):
                src = img.get('src', '')
                alt = img.get('alt', '')
                if '少女ウォーズの花嫁アーサー' in alt or '少女ウォーズの花嫁アーサー' in src:
                    arthur_img = src
                    break
            char_data_map['__special_wedinggentei__'] = {
                'url': url,
                'arthur_bride_limited': arthur_img
            }
            continue

        # Determine character name
        # Examples of titles:
        # 少女ウォーズのUR閃アストルフォの評価！
        # 少女ウォーズのローランの評価とスキル性能まとめ！
        # 少女ウォーズのUR閃・巴御前の評価！
        # 少女ウォーズの花嫁アキレウスのヒント一覧まとめ！
        # 少女ウォーズのハンニバルの評価！
        cname = None
        is_bride = '花嫁' in title or 'wed' in slug
        is_ursen = 'UR閃' in title or 'ursen' in slug or slug in [
            'sh-roran', 'sw-bokuden', 'sw-hannibal', 'sw-kasinnokji', 'sw-meiv', 'sw-mogan',
            'sw-oberon', 'sw-od', 'sw-ojimanndiasu', 'sw-rityad', 'sw-ryuuhou', 'sw-sanzou',
            'sw-toutaku', 'sw-yagyujyubee', 'sw-yamatotakeru', 'sw-yorimitu'
        ]

        # Extract name with regex
        m = re.search(r'少女ウォーズの(?:UR閃・|UR閃|UR)?\s*([^の！]+?)(?:の評価|のヒント|評価まとめ|評価|立ち絵|スキル|！)', title)
        if m:
            cname = m.group(1).replace('花嫁', '').strip()
        else:
            m2 = re.search(r'【(?:少女ウォーズ)?(?:花嫁|評価まとめ)?([^】]+?)】', title)
            if m2:
                cname = m2.group(1).replace('花嫁', '').replace('UR閃・', '').replace('UR閃', '').replace('UR', '').strip()

        if not cname:
            cname = slug.replace('sw-', '').replace('sh-', '').replace('ursen', '').replace('ur', '').replace('wed', '')

        # Build variants array if images found
        variants = []
        if tatie_img:
            variants.append({
                'label': '通常',
                'url': tatie_img,
                'source': 'マトメバコ！',
                'credit': 'マトメバコ！ (kokomatoblog.com) / 公式スチル'
            })
        if shitagi_img:
            variants.append({
                'label': '下着姿',
                'url': shitagi_img,
                'source': 'マトメバコ！',
                'credit': 'マトメバコ！ (kokomatoblog.com)'
            })
        if limited_img:
            variants.append({
                'label': '限定衣装',
                'url': limited_img,
                'source': 'マトメバコ！',
                'credit': 'マトメバコ！ (kokomatoblog.com)'
            })

        entry_key = f"{cname}_{'ursen' if is_ursen else ('bride' if is_bride else 'other')}"

        char_data_map[entry_key] = {
            'cname': cname,
            'url': url,
            'title': title,
            'date': date_str,
            'slug': slug,
            'is_bride': is_bride,
            'is_ursen': is_ursen,
            'illustUrl': tatie_img or shitagi_img,
            'variants': variants,
            'summaryBullets': summary_bullets[:6],
            'recommendedGems': gems[:4]
        }

    return char_data_map

if __name__ == '__main__':
    data = fetch_kokomato_articles()
    out_path = os.path.join(os.path.dirname(__file__), 'kokomato_data.json')
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Saved {len(data)} kokomato entries to {out_path}")
