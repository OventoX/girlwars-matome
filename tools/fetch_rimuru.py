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
            if any(k in l for k in ['名前：', '行のキャラ', '目次', '終わりに', 'タイプ：', '初期ランク：']):
                break
            if len(l) > 15:
                summary_lines.append(l)
        summary = "\n".join(summary_lines[:3])
        strengths[clean_name] = summary

    print(f"[RIMURU] Parsed {len(strengths)} strengths entries.")
    return strengths

def parse_char_detail(url):
    html = fetch_html(url)
    soup = parse_soup(html)
    if not soup:
        return {}, None

    body = soup.find('article') or soup.find(class_=re.compile(r'skin-entryBody|entryBody|articleBody'))
    if not body:
        return {}, None

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

    # Split by major headings: スキル, パッシブ, 奥義
    def extract_section(start_kw, next_kws):
        m = re.search(rf'{start_kw}\s*\n(.*?)(?={"|".join(next_kws)}|$)', text, re.DOTALL)
        if m:
            sec_text = m.group(1).strip()
            # First non-empty line may be the skill name
            lines = [l.strip() for l in sec_text.split('\n') if l.strip()]
            if lines:
                s_name = lines[0]
                s_effect = "\n".join(lines[1:])
                return {'name': s_name, 'text': s_effect}
        return None

    skills['normal'] = extract_section('スキル', ['パッシブ', '奥義', '火炎', '超進化', 'まとめ'])
    skills['passive'] = extract_section('パッシブ', ['スキル', '奥義', '火炎', '超進化', 'まとめ'])
    skills['ultimate'] = extract_section('奥義', ['火炎', '氷魂', '閃超進化', '超進化', 'まとめ', '終わりに'])

    # Evolution levels
    fire_lv1 = re.search(r'火炎L?v?１\s*\n(.*?)(?=火炎L?v?２|氷魂|閃超進化|まとめ|$)', text, re.DOTALL)
    fire_lv2 = re.search(r'火炎L?v?２\s*\n(.*?)(?=火炎L?v?３|氷魂|閃超進化|まとめ|$)', text, re.DOTALL)
    fire_lv3 = re.search(r'火炎L?v?３\s*\n(.*?)(?=氷魂|閃超進化|まとめ|$)', text, re.DOTALL)
    if fire_lv1: skills['evolution']['fire'].append("Lv1: " + fire_lv1.group(1).strip()[:200])
    if fire_lv2: skills['evolution']['fire'].append("Lv2: " + fire_lv2.group(1).strip()[:200])
    if fire_lv3: skills['evolution']['fire'].append("Lv3: " + fire_lv3.group(1).strip()[:200])

    return skills, illust_url

def fetch_rimuru_catalog():
    strengths_map = parse_strengths_map()
    
    # 1. UR閃 characters
    print("[RIMURU] Fetching UR閃 catalog...")
    html_ur_sen = fetch_html(RIMURU_UR_SEN_SUMMARY)
    soup_sen = parse_soup(html_ur_sen)
    
    char_entries = []
    
    # In ameblo, links to individual entries are like href="https://ameblo.jp/hetarerimuru/entry-XXXX.html"
    body_sen = soup_sen.find('article') or soup_sen.find(class_=re.compile(r'skin-entryBody|entryBody|articleBody'))
    text_sen = body_sen.text if body_sen else ""
    parts = re.split(r'名前：', text_sen)
    
    # Find links in body
    links = body_sen.find_all('a', href=re.compile(r'entry-\d+\.html')) if body_sen else []
    link_map = {}
    for a in links:
        t = a.text.strip()
        h = a['href']
        for p in parts[1:]:
            raw_n = p.split('\n')[0].strip()
            clean_n = re.sub(r'（.*?）|\(.*?\)', '', raw_n).strip()
            if clean_n in t and clean_n not in link_map:
                link_map[clean_n] = h

    for p in parts[1:]:
        lines = [l.strip() for l in p.split('\n') if l.strip()]
        if not lines:
            continue
        raw_name = lines[0]
        # Match ruby if present: e.g. 芦屋道満（あしやどうまん）
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

        detail_url = link_map.get(clean_name)
        skills = None
        illust_url = None

        if detail_url:
            print(f"  Fetching details for {clean_name} ({detail_url})...")
            skills, detail_img = parse_char_detail(detail_url)
            illust_url = detail_img
            time.sleep(0.05)

        summary_text = strengths_map.get(clean_name, f"{system}系統の{ctype}将キャラ。")

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
                'tierRank': 'UR閃',
                'summary': summary_text
            },
            'sourceInfo': {
                'primaryUrl': detail_url or RIMURU_UR_SEN_SUMMARY,
                'sourceName': 'へたれゲームプレイヤーリムルの日記と攻略情報',
                'updatedAt': '2026-11-05',
                'isOutdated': False
            }
        })

    print(f"[RIMURU] Successfully compiled {len(char_entries)} UR閃 characters.")
    return char_entries

if __name__ == '__main__':
    chars = fetch_rimuru_catalog()
    out_path = os.path.join(os.path.dirname(__file__), 'rimuru_chars.json')
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(chars, f, ensure_ascii=False, indent=2)
    print(f"Saved {len(chars)} UR閃 characters to {out_path}")
