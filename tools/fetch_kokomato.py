import os
import re
import json
import time
from common import fetch_html, parse_soup

KOKOMATO_CAT = "https://kokomatoblog.com/category/game/shoujyowars"

def fetch_kokomato_articles():
    print("[KOKOMATO] Fetching articles list...")
    html = fetch_html(KOKOMATO_CAT)
    soup = parse_soup(html)
    if not soup:
        return {}

    articles = {}
    for a in soup.find_all('a'):
        href = a.get('href', '')
        text = a.text.strip().replace('\n', ' ')
        if 'kokomatoblog.com/' in href and any(k in href for k in ['sw-', 'sh-']):
            # Match character evaluation or wedding
            m = re.search(r'【(?:評価まとめ|花嫁[^】]+)】(.*?)(?:のスキル|のヒント|！)', text)
            char_name = m.group(1).strip() if m else None
            if not char_name:
                # try extracting from title
                m2 = re.search(r'(メイヴ|巴御前|ローラン|オジマンディアス|半兵衛|頼光|稲姫|スカアハ|ロームルス)', text)
                if m2:
                    char_name = m2.group(1)

            if char_name and char_name not in articles:
                articles[char_name] = {'url': href, 'title': text}

    print(f"[KOKOMATO] Found {len(articles)} character articles.")
    
    char_data_map = {}
    for cname, info in articles.items():
        url = info['url']
        print(f"  Fetching Kokomato: {cname} ({url})...")
        a_html = fetch_html(url)
        a_soup = parse_soup(a_html)
        if not a_soup:
            continue

        body = a_soup.find('article') or a_soup.find(class_=re.compile(r'entry-content'))
        if not body:
            continue

        # Date
        time_tag = a_soup.find(['time', 'span'], class_=re.compile(r'date'))
        date_str = time_tag.text.strip() if time_tag else "2026-11-01"
        # normalize date
        d_match = re.search(r'(\d{4})年(\d{1,2})月(\d{1,2})日', date_str)
        if d_match:
            date_str = f"{d_match.group(1)}-{int(d_match.group(2)):02d}-{int(d_match.group(3)):02d}"

        # Images (look for high res png)
        best_img = None
        for img in body.find_all('img'):
            src = img.get('src')
            if src and 'wp-content/uploads/2026' in src and ('.png' in src or '.jpg' in src):
                if not any(x in src for x in ['AppIcon', 'appreach', 'logo', 'itune', 'gplay']):
                    best_img = src
                    break

        # Summary bullet points (under 評価まとめ)
        summary_bullets = []
        for ul in body.find_all('ul'):
            for li in ul.find_all('li'):
                t = li.text.strip()
                if len(t) > 5 and len(t) < 100:
                    summary_bullets.append(t)
            if summary_bullets:
                break

        # Recommended gems (おすすめ宝石)
        gems = []
        gem_h = body.find(string=re.compile(r'おすすめ宝石'))
        if gem_h:
            parent = gem_h.find_parent(['h2', 'h3', 'p', 'div'])
            if parent:
                # next sibling or paragraphs
                for sib in parent.find_next_siblings(['p', 'ul'])[:3]:
                    if sib.name == 'ul':
                        gems = [li.text.strip() for li in sib.find_all('li')]
                        break
                    elif sib.name == 'p':
                        gems.append(sib.text.strip())

        char_data_map[cname] = {
            'url': url,
            'title': info['title'],
            'date': date_str,
            'illustUrl': best_img,
            'summaryBullets': summary_bullets[:6],
            'recommendedGems': gems[:4]
        }
        time.sleep(0.05)

    return char_data_map

if __name__ == '__main__':
    data = fetch_kokomato_articles()
    out_path = os.path.join(os.path.dirname(__file__), 'kokomato_data.json')
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Saved {len(data)} kokomato entries to {out_path}")
