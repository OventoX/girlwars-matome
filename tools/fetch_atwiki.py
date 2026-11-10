import os
import re
import json
import time
from common import fetch_html, parse_soup

BASE_URL = "https://w.atwiki.jp/girlwars/"
LIST_URL = "https://w.atwiki.jp/girlwars/list"
TIER_URL = "https://w.atwiki.jp/girlwars/pages/135.html"

def fetch_atwiki_tier():
    print("[ATWIKI] Fetching Tier table...")
    html = fetch_html(TIER_URL)
    soup = parse_soup(html)
    if not soup:
        return {}
    
    body = soup.find(id='wikibody')
    if not body:
        return {}

    tier_map = {}
    current_tier = "T0"
    ignore_words = ['前書き', '新しい基準', '各ランクについて', 'Tランクに含まれていない', 'ガイドが皆様', 'タグ', 'キャンセル', '更新に失敗', 'ページを更新', 'いいね', 'サポートキャラ']
    
    for div in body.find_all('div'):
        text = div.text.strip()
        img = div.find('img')
        img_src = img.get('src') if img else None
        if img_src and img_src.startswith('//'):
            img_src = 'https:' + img_src

        if not text:
            continue

        # Check if this div changes tier
        t_match = re.search(r'^(T[0-3])\b', text)
        if t_match:
            current_tier = t_match.group(1)
            text = text[len(current_tier):].strip()

        if not text:
            continue

        lines = [l.strip() for l in text.split('\n') if l.strip()]
        if not lines:
            continue

        first_line = lines[0]
        if any(w in first_line for w in ignore_words):
            continue

        clean_name = re.sub(r'^(UR|SSR)\s*', '', first_line).strip()
        if clean_name and len(clean_name) <= 12 and not any(w in clean_name for w in ignore_words):
            comment = "\n".join(lines[1:])
            if clean_name not in tier_map:
                tier_map[clean_name] = {
                    'tier': current_tier,
                    'name': clean_name,
                    'fullName': first_line,
                    'comment': comment,
                    'iconUrl': img_src,
                    'source': '少女ウォーズ@wiki Tier表 (2024-08-15)'
                }

    print(f"[ATWIKI] Parsed {len(tier_map)} characters from Tier page.")
    return tier_map

def fetch_atwiki_characters():
    print("[ATWIKI] Fetching character page list...")
    html = fetch_html(LIST_URL)
    soup = parse_soup(html)
    if not soup:
        return []

    # Collect character pages
    pages = []
    for a in soup.find_all('a', href=re.compile(r'/girlwars/pages/\d+\.html')):
        text = a.text.strip().split('\n')[-1].strip()
        href = a['href']
        if not href.startswith('http'):
            href = 'https:' + href if href.startswith('//') else 'https://w.atwiki.jp' + href
        pages.append((text, href))

    unique = {}
    for t, h in pages:
        clean_t = t.strip()
        if re.search(r'\d+日前', clean_t):
            continue
        if any(clean_t.startswith(x) for x in ['登録', 'Wiki初心者', 'トップ', 'メニュー', '右メニュー', 'FAQ', 'PVP', 'コンテンツ', 'システム', 'ギフト', '同盟', '初恋', '世界', '冒険', '初心者', '毎日', '編集', '戦闘攻略', 'キャラ育成', 'Tier表', '装備', '募集', 'イベント一覧']):
            continue
        if h not in unique:
            unique[h] = clean_t

    tier_map = fetch_atwiki_tier()
    char_list = []

    print(f"[ATWIKI] Scraping {len(unique)} candidate character pages...")
    for page_url, title in unique.items():
        # Identify rarity and clean name
        rarity = "SSR"
        if title.startswith("UR/") or title.startswith("UR"):
            rarity = "UR"
        elif title.startswith("花嫁/"):
            rarity = "花嫁"

        clean_name = re.sub(r'^(SSR/SSR|UR/UR|SSR|UR|花嫁/)\s*', '', title).strip()
        if not clean_name:
            continue

        c_html = fetch_html(page_url)
        c_soup = parse_soup(c_html)
        if not c_soup:
            continue

        body = c_soup.find(id='wikibody')
        if not body:
            continue

        # Basic fields from table 0
        ctype = "力" # default fallback
        role = ""
        cv = ""
        illust_url = None

        tables = body.find_all('table')
        if tables:
            t0 = tables[0]
            for row in t0.find_all('tr'):
                cells = [c.text.strip() for c in row.find_all(['td', 'th'])]
                if len(cells) >= 2:
                    k, v = cells[0], cells[1]
                    if '職業' in k or 'タイプ' in k:
                        ctype = v.replace('将', '').strip()
                    elif '定位' in k:
                        role = v.strip()
                    elif 'CV' in k:
                        cv = v.strip()
                    elif 'レア' in k:
                        if 'UR' in v:
                            rarity = 'UR'
                        elif 'SSR' in v:
                            rarity = 'SSR'

        # Images: Naver image or atwiki attach image
        for img in body.find_all('img'):
            src = img.get('src')
            if src:
                if src.startswith('//'):
                    src = 'https:' + src
                if 'nng-phinf.pstatic.net' in src or 'attach' in src:
                    illust_url = src
                    break

        # Dialogue lines (Table 1 if exists)
        dialogues = {}
        if len(tables) > 1:
            for row in tables[1].find_all('tr'):
                cells = [c.text.strip() for c in row.find_all(['td', 'th'])]
                if len(cells) >= 2:
                    k, v = cells[0], cells[1]
                    if k and v and k != 'セリフ':
                        dialogues[k] = v

        # Profile / Story text
        story_paras = []
        for p in body.find_all('p'):
            t = p.text.strip()
            if len(t) > 30 and 'セリフ' not in t and 'レア' not in t:
                story_paras.append(t)
        story_text = "\n\n".join(story_paras[:3])

        # Tier matching
        tier_info = tier_map.get(clean_name, {})

        char_data = {
            'id': f"wiki_{re.sub(r'[^a-zA-Z0-9]', '_', clean_name)}",
            'name': clean_name,
            'title': title,
            'rarity': rarity,
            'type': ctype,
            'role': role,
            'cv': cv,
            'illustUrl': illust_url,
            'illustSource': '少女ウォーズ@wiki',
            'illustCredit': '少女ウォーズ@wiki / 公式スチル',
            'dialogues': dialogues,
            'story': story_text,
            'skills': None, # wiki does not have skill texts
            'evaluation': {
                'tierRank': tier_info.get('tier'),
                'summary': tier_info.get('comment', role),
                'iconUrl': tier_info.get('iconUrl')
            },
            'sourceInfo': {
                'primaryUrl': page_url,
                'sourceName': '少女ウォーズ@wiki',
                'updatedAt': '2024-08-15',
                'isOutdated': True
            }
        }
        char_list.append(char_data)
        time.sleep(0.05) # Polite delay

    print(f"[ATWIKI] Successfully parsed {len(char_list)} characters.")
    return char_list

if __name__ == '__main__':
    chars = fetch_atwiki_characters()
    out_path = os.path.join(os.path.dirname(__file__), 'atwiki_chars.json')
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(chars, f, ensure_ascii=False, indent=2)
    print(f"Saved {len(chars)} characters to {out_path}")
