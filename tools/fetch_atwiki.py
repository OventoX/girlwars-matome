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
        c_html = fetch_html(page_url)
        c_soup = parse_soup(c_html)
        if not c_soup:
            continue

        # Check actual page title from soup for accurate rarity & clean name
        page_title = c_soup.title.string if c_soup.title else title
        page_title = page_title.replace(' - 少女ウォーズ @ ウィキ | girlwars - atwiki（アットウィキ）', '').strip()

        rarity = "SSR"
        if "花嫁/" in page_title or title.startswith("花嫁/"):
            rarity = "花嫁"
            clean_name = re.sub(r'^.*?花嫁/\s*', '', page_title).strip()
            title = f"花嫁/{clean_name}"
        elif "UR/" in page_title or title.startswith("UR/") or title.startswith("UR"):
            rarity = "UR"
            clean_name = re.sub(r'^(UR/UR|UR/|UR)\s*', '', page_title).strip()
        elif "SSR/" in page_title or title.startswith("SSR/") or title.startswith("SSR"):
            rarity = "SSR"
            clean_name = re.sub(r'^(SSR/SSR|SSR/|SSR)\s*', '', page_title).strip()
        else:
            clean_name = re.sub(r'^(SSR/SSR|UR/UR|SSR|UR|花嫁/)\s*', '', title).strip()

        if not clean_name:
            continue

        body = c_soup.find(id='wikibody')
        if not body:
            continue

        # Extract page updated date
        # e.g. 最終更新：2024年05月20日 19:30
        page_updated_at = '2024-08-15'
        m_date = re.search(r'最終更新：(\d{4})年(\d{2})月(\d{2})日', c_html)
        if m_date:
            page_updated_at = f"{m_date.group(1)}-{m_date.group(2)}-{m_date.group(3)}"

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

        # Unique ID based on atwiki page number (e.g. wiki_115)
        m_pid = re.search(r'/pages/(\d+)\.html', page_url)
        page_id = m_pid.group(1) if m_pid else re.sub(r'[^a-zA-Z0-9]', '_', clean_name)
        char_id = f"wiki_{page_id}"

        # Fix atwiki editor swap: page 44 (小早川秀秋) had Ieyasu image, page 58 (徳川家康) had Hideaki image
        if page_id == '44':
            illust_url = 'https://nng-phinf.pstatic.net/MjAyNDAyMDFfNzkg/MDAxNzA2NzgxMzU2NDU4.DEfkF8STnLMBlfDZMMrGcvPkIRkbwiX0Bs1q588MGx4g.VOHzYng429NThTjJz88C1-SLq90LIXFeNjeAxUuwC40g.JPEG/%ED%9E%88%EB%8D%B0%EC%95%84%ED%82%A4-%EC%8B%A0%EB%B6%80.jpg?type=w1678'
        elif page_id == '58':
            illust_url = 'https://nng-phinf.pstatic.net/MjAyMzEyMjhfMjMg/MDAxNzAzNzQ4NjMwOTc0.grujpelrH9639blyu_OIuwaDE_bODPbUIDS5A_18aswg.VyNQ1X7dN8zszCa0x0gHGSfKKH4h-Iczy_26ql1_tVkg.JPEG/%EC%9D%B4%EC%97%90%EC%95%BC%EC%8A%A4-%EC%8B%A0%EB%B6%80.jpg?type=w1678'

        # Dialogue lines (Table 1 if exists)
        dialogues = {}
        if len(tables) > 1:
            for row in tables[1].find_all('tr'):
                cells = [c.text.strip() for c in row.find_all(['td', 'th'])]
                if len(cells) >= 2:
                    k, v = cells[0], cells[1]
                    if k and v and k != 'セリフ':
                        dialogues[k] = v

        # Profile / Story text (from その一 / その二 / その三 or paragraphs)
        story_paras = []
        for ul in body.find_all('ul'):
            if re.search(r'その[一二三四五]', ul.text):
                sib = ul.find_next_sibling()
                if sib and sib.name == 'div':
                    txt = sib.text.strip()
                    if len(txt) > 20:
                        sec_label = ul.text.replace('|', '').strip()
                        story_paras.append(f"【{sec_label}】\n{txt}")

        if not story_paras:
            for p in body.find_all('p'):
                t = p.text.strip()
                if len(t) > 30 and 'セリフ' not in t and 'レア' not in t:
                    story_paras.append(t)

        story_text = "\n\n".join(story_paras[:3])

        # Tier matching
        tier_info = tier_map.get(clean_name, {})

        char_data = {
            'id': char_id,
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
                'updatedAt': page_updated_at,
                'isOutdated': True
            }
        }
        char_list.append(char_data)
        time.sleep(0.02)

    print(f"[ATWIKI] Successfully parsed {len(char_list)} characters.")
    return char_list

if __name__ == '__main__':
    chars = fetch_atwiki_characters()
    out_path = os.path.join(os.path.dirname(__file__), 'atwiki_chars.json')
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(chars, f, ensure_ascii=False, indent=2)
    print(f"Saved {len(chars)} characters to {out_path}")
