import os
import re
import json
import time
from common import fetch_html, parse_soup

RIMURU_UR_SEN_SUMMARY = "https://ameblo.jp/hetarerimuru/entry-12892546368.html"
RIMURU_UR_SEN_STRENGTHS = "https://ameblo.jp/hetarerimuru/entry-12892549072.html"
RIMURU_UR_SUMMARY = "https://ameblo.jp/hetarerimuru/entry-12849511377.html"

def parse_strengths_map():
    print("[RIMURU] Fetching UR閃 strengths map...")
    html = fetch_html(RIMURU_UR_SEN_STRENGTHS)
    soup = parse_soup(html)
    if not soup:
        return {}
    
    body = soup.find('article') or soup.find(class_=re.compile(r'skin-entryBody|entryBody|articleBody'))
    if not body:
        return {}

    strengths = {}
    text = body.text
    parts = re.split(r'名前：', text)
    for p in parts[1:]:
        lines = [l.strip() for l in p.split('\n') if l.strip()]
        if not lines:
            continue
        raw_name = lines[0]
        # e.g. 芦屋道満（あしやどうまん）
        clean_name = re.sub(r'（.*?）|\(.*?\)', '', raw_name).strip()
        # Find strength summary text
        summary_lines = []
        for l in lines[1:]:
            if any(k in l for k in ['名前：', '行のキャラ', '目次', '終わりに']):
                break
            if any(k in l for k in ['タイプ：', '初期ランク：', '系統：']):
                continue
            if len(l) > 10:
                summary_lines.append(l)
        summary = "\n".join(summary_lines[:3])
        strengths[clean_name] = summary

    print(f"[RIMURU] Parsed {len(strengths)} strengths entries.")
    return strengths

def extract_section(text, start_kw, end_kws):
    pattern = rf'(?:^|\n)\s*{re.escape(start_kw)}\s*\n(.*?)(?=(?:^|\n)\s*(?:{"|".join(map(re.escape, end_kws))})|\Z)'
    for m in re.finditer(pattern, text, re.DOTALL):
        sec = m.group(1).strip()
        lines = [l.strip() for l in sec.split('\n') if l.strip()]
        if len(lines) >= 2 and len(sec) > 15:
            return {'name': lines[0], 'text': '\n'.join(lines[1:])}
    return None

def parse_char_detail(url):
    html = fetch_html(url)
    soup = parse_soup(html)
    if not soup:
        return {}, None, None

    # Extract article publication/modification date from JSON-LD
    art_date = None
    for s in soup.find_all('script', type='application/ld+json'):
        try:
            d = json.loads(s.string)
            if 'dateModified' in d:
                art_date = d['dateModified'][:10]
            elif 'datePublished' in d:
                art_date = d['datePublished'][:10]
        except:
            pass

    body = soup.find('article') or soup.find(class_=re.compile(r'skin-entryBody|entryBody|articleBody'))
    if not body:
        return {}, None, art_date

    # Extract image
    illust_url = None
    for img in body.find_all('img'):
        src = img.get('src')
        if src and 'user_images' in src and ('stat.ameba.jp' in src or 'ameblo' in src):
            illust_url = src
            break

    # Extract sections: スキル, パッシブ, 奥義, 超進化
    text = body.text
    skills = {
        'normal': None,
        'passive': None,
        'ultimate': None,
        'evolution': {'fire': [], 'ice': []}
    }

    skills['normal'] = extract_section(text, 'スキル', ['パッシブ', '奥義', '火炎', '超進化', 'まとめ'])
    skills['passive'] = extract_section(text, 'パッシブ', ['スキル', '奥義', '火炎', '超進化', 'まとめ'])
    skills['ultimate'] = extract_section(text, '奥義', ['火炎', '氷魂', '閃超進化', '超進化', 'まとめ', '終わりに'])

    # Evolution levels: only non-empty entries (no empty "Lv1: ")
    for lv, digits, label in [(1, '[1１]', 'Lv1'), (2, '[2２]', 'Lv2'), (3, '[3３]', 'Lv3')]:
        pattern = rf'火炎[LＬ][vｖ]{digits}\s*\n(.*?)(?=火炎[LＬ]|氷魂|閃超進化|超進化|まとめ|終わりに|\Z)'
        for m in re.finditer(pattern, text, re.DOTALL):
            txt = m.group(1).strip()
            lines = [l.strip() for l in txt.split('\n') if l.strip()]
            if lines and len(" ".join(lines)) > 15:
                content = "\n".join(lines)
                skills['evolution']['fire'].append(f"{label}: {content}")
                break

    for lv, digits, label in [(1, '[1１]', 'Lv1'), (2, '[2２]', 'Lv2')]:
        pattern = rf'氷魂[LＬ][vｖ]{digits}\s*\n(.*?)(?=氷魂[LＬ]|火炎[LＬ]|閃超進化|超進化|まとめ|終わりに|\Z)'
        for m in re.finditer(pattern, text, re.DOTALL):
            txt = m.group(1).strip()
            lines = [l.strip() for l in txt.split('\n') if l.strip()]
            if lines and len(" ".join(lines)) > 15:
                content = "\n".join(lines)
                skills['evolution']['ice'].append(f"{label}: {content}")
                break

    return skills, illust_url, art_date

def fetch_rimuru_catalog():
    strengths_map = parse_strengths_map()
    char_entries = []
    
    # 1. UR閃 characters
    print("[RIMURU] Fetching UR閃 catalog...")
    html_ur_sen = fetch_html(RIMURU_UR_SEN_SUMMARY)
    soup_sen = parse_soup(html_ur_sen)
    
    body_sen = soup_sen.find('article') or soup_sen.find(class_=re.compile(r'skin-entryBody|entryBody|articleBody'))
    text_sen = body_sen.text if body_sen else ""
    parts_sen = re.split(r'名前：', text_sen)
    
    links_sen = body_sen.find_all('a', href=re.compile(r'entry-\d+\.html')) if body_sen else []
    link_map_sen = {}
    for a in links_sen:
        t = a.text.strip()
        h = a['href']
        for p in parts_sen[1:]:
            raw_n = p.split('\n')[0].strip()
            clean_n = re.sub(r'（.*?）|\(.*?\)', '', raw_n).strip()
            if clean_n in t and clean_n not in link_map_sen:
                link_map_sen[clean_n] = h

    for p in parts_sen[1:]:
        lines = [l.strip() for l in p.split('\n') if l.strip()]
        if not lines:
            continue
        raw_name = lines[0]
        ruby_match = re.search(r'（(.*?)）|\((.*?)\)', raw_name)
        ruby = (ruby_match.group(1) or ruby_match.group(2)) if ruby_match else ""
        clean_name = re.sub(r'（.*?）|\(.*?\)', '', raw_name).strip()
        
        init_rank = "UR閃"
        ctype = "力"
        system = "風"
        for l in lines[1:8]:
            if '初期ランク：' in l:
                init_rank = l.split('：')[-1].strip()
            elif 'タイプ：' in l:
                ctype = l.split('：')[-1].replace('将', '').strip()
            elif '系統：' in l:
                system = l.split('：')[-1].strip()

        detail_url = link_map_sen.get(clean_name)
        skills = None
        illust_url = None
        art_date = None

        if detail_url:
            skills, detail_img, art_date = parse_char_detail(detail_url)
            illust_url = detail_img
            time.sleep(0.02)

        summary_text = strengths_map.get(clean_name)

        char_entries.append({
            'id': f"rimuru_ursen_{clean_name}",
            'name': clean_name,
            'ruby': ruby,
            'rarity': 'UR閃',
            'type': ctype,
            'system': system,
            'initialRarity': init_rank,
            'illustUrl': illust_url,
            'illustSource': 'へたれリムルブログ',
            'illustCredit': 'へたれゲームプレイヤーリムル (ameblo)',
            'skills': skills,
            'evaluation': {
                'tierRank': None,  # No Tier ranking in Rimuru UR閃 entries; do not fake with 'UR閃'
                'summary': summary_text
            },
            'sourceInfo': {
                'primaryUrl': detail_url or RIMURU_UR_SEN_SUMMARY,
                'sourceName': 'へたれゲームプレイヤーリムルの日記と攻略情報',
                'updatedAt': art_date or '2026-11-05',
                'isOutdated': False
            }
        })

    # 2. UR characters
    print("[RIMURU] Fetching UR catalog...")
    html_ur = fetch_html(RIMURU_UR_SUMMARY)
    soup_ur = parse_soup(html_ur)
    body_ur = soup_ur.find('article') or soup_ur.find(class_=re.compile(r'skin-entryBody|entryBody|articleBody'))
    text_ur = body_ur.text if body_ur else ""
    parts_ur = re.split(r'名前：', text_ur)
    
    links_ur = body_ur.find_all('a', href=re.compile(r'entry-\d+\.html')) if body_ur else []
    link_map_ur = {}
    for a in links_ur:
        t = a.text.strip()
        h = a['href']
        for p in parts_ur[1:]:
            raw_n = p.split('\n')[0].strip()
            clean_n = re.sub(r'（.*?）|\(.*?\)', '', raw_n).strip()
            if clean_n in t and clean_n not in link_map_ur:
                link_map_ur[clean_n] = h

    for p in parts_ur[1:]:
        lines = [l.strip() for l in p.split('\n') if l.strip()]
        if not lines:
            continue
        raw_name = lines[0]
        ruby_match = re.search(r'（(.*?)）|\((.*?)\)', raw_name)
        ruby = (ruby_match.group(1) or ruby_match.group(2)) if ruby_match else ""
        clean_name = re.sub(r'（.*?）|\(.*?\)', '', raw_name).strip()

        init_rank = "UR"
        ctype = "力"
        system = "風"
        for l in lines[1:8]:
            if '初期ランク：' in l:
                init_rank = l.split('：')[-1].strip()
            elif 'タイプ：' in l:
                ctype = l.split('：')[-1].replace('将', '').strip()
            elif '系統：' in l:
                system = l.split('：')[-1].strip()

        detail_url = link_map_ur.get(clean_name)
        skills = None
        illust_url = None
        art_date = None

        if detail_url:
            skills, detail_img, art_date = parse_char_detail(detail_url)
            illust_url = detail_img
            time.sleep(0.02)

        char_entries.append({
            'id': f"rimuru_ur_{clean_name}",
            'name': clean_name,
            'ruby': ruby,
            'rarity': 'UR',
            'type': ctype,
            'system': system,
            'initialRarity': init_rank,
            'illustUrl': illust_url,
            'illustSource': 'へたれリムルブログ',
            'illustCredit': 'へたれゲームプレイヤーリムル (ameblo)',
            'skills': skills,
            'evaluation': {
                'tierRank': None,  # No Tier ranking in Rimuru UR entries; do not fake with 'UR'
                'summary': f"{system}系統の{ctype}将キャラ。初期ランク{init_rank}。"
            },
            'sourceInfo': {
                'primaryUrl': detail_url or RIMURU_UR_SUMMARY,
                'sourceName': 'へたれゲームプレイヤーリムルの日記と攻略情報',
                'updatedAt': art_date or '2025-03-21',
                'isOutdated': False
            }
        })

    print(f"[RIMURU] Successfully compiled {len(char_entries)} total characters (UR閃 + UR).")
    return char_entries

if __name__ == '__main__':
    chars = fetch_rimuru_catalog()
    out_path = os.path.join(os.path.dirname(__file__), 'rimuru_chars.json')
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(chars, f, ensure_ascii=False, indent=2)
    print(f"Saved {len(chars)} UR/UR閃 characters to {out_path}")
