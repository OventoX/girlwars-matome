import json
import os
import re
import urllib.parse
import urllib.request
import sys
sys.path.append('tools')
from common import DEFAULT_HEADERS

DATA_JS_PATH = os.path.join(os.path.dirname(__file__), '..', 'app', 'data.js')

# Verified exact URLs from kokomatoblog.com articles (16 characters with confirmed 下着姿)
# Excluded: カール大帝, 趙子龍 (confirmed NOT present in their kokomatoblog articles)
UNDERWEAR_TO_ADD = {
    '芦屋道満': 'https://kokomatoblog.com/wp-content/uploads/2025/11/少女ウォーズの芦屋道満下着姿-1024x576.jpg',
    '安倍晴明': 'https://kokomatoblog.com/wp-content/uploads/2025/12/少女ウォーズUR閃安倍晴明下着姿-1024x576.jpg',
    'エカテリーナ': 'https://kokomatoblog.com/wp-content/uploads/2025/06/少女ウォーズのUR閃エカテリーナの下着姿-1024x576.jpg',
    'オリオン': 'https://kokomatoblog.com/wp-content/uploads/2025/09/少女ウォーズのオリオン下着姿-1024x576.jpg',
    '上泉信綱': 'https://kokomatoblog.com/wp-content/uploads/2025/06/少女ウォーズの上泉信綱の下着姿-1024x576.jpg',
    'ガウェイン': 'https://kokomatoblog.com/wp-content/uploads/2025/08/少女ウォーズのガウェインの下着姿-1024x576.jpg',
    '項羽': 'https://kokomatoblog.com/wp-content/uploads/2025/10/少女ウォーズの項羽下着姿-1024x576.jpg',
    'スカアハ': 'https://kokomatoblog.com/wp-content/uploads/2025/12/少女ウォーズスカアハ下着姿-1024x576.jpg',
    '玉藻前': 'https://kokomatoblog.com/wp-content/uploads/2025/05/少女ウォーズの玉藻前の下着姿-1024x576.jpg',
    '伊達政宗': 'https://kokomatoblog.com/wp-content/uploads/2025/10/少女ウォーズのUR閃・伊達政宗下着姿-1024x576.jpg',
    'ダンテ': 'https://kokomatoblog.com/wp-content/uploads/2025/07/少女ウォーズのダンテの下着姿-1024x576.jpg',
    '長宗我部元親': 'https://kokomatoblog.com/wp-content/uploads/2025/04/少女ウォーズのUR閃長宗我部元親の下着姿-1024x576.jpg',
    'ペルセウス': 'https://kokomatoblog.com/wp-content/uploads/2025/07/少女ウォーズのペルセウス下着姿-1024x576.jpg',
    '八百比丘尼': 'https://kokomatoblog.com/wp-content/uploads/2025/09/少女ウォーズの八百比丘尼の下着-1024x576.jpg',
    'ロームルス': 'https://kokomatoblog.com/wp-content/uploads/2025/11/少女ウォーズのロームルス下着-1024x576.jpg',
    'ダ・ヴィンチ': 'https://kokomatoblog.com/wp-content/uploads/2025/08/少女ウォーズのダヴィンチ下着姿-1024x576.jpg',
}

def encode_url(url):
    parts = urllib.parse.urlsplit(url)
    path = urllib.parse.quote(parts.path)
    return urllib.parse.urlunsplit((parts.scheme, parts.netloc, path, parts.query, parts.fragment))

def main():
    # 1. Verify all 16 URLs return HTTP 200 OK
    print(f"Verifying {len(UNDERWEAR_TO_ADD)} underwear image URLs...")
    verified_urls = {}
    for name, raw_url in UNDERWEAR_TO_ADD.items():
        enc_url = encode_url(raw_url)
        req = urllib.request.Request(enc_url, headers=DEFAULT_HEADERS)
        with urllib.request.urlopen(req, timeout=8) as res:
            if res.status != 200:
                raise RuntimeError(f"Failed to fetch {name}: HTTP {res.status}")
            print(f"  [OK {res.status}] {name}")
        verified_urls[name] = enc_url

    # 2. Load data.js and update the 16 UR閃 records
    with open(DATA_JS_PATH, 'r', encoding='utf-8') as f:
        content = f.read()

    idx = content.find('window.GIRLWARS_DATA = ')
    header_part = content[:idx]
    json_str = content[idx + len('window.GIRLWARS_DATA = '):].rstrip(';\n ')
    data = json.loads(json_str)

    before_images = sum(len(c.get('images', [])) for c in data)
    before_variants = sum(1 for c in data if len(c.get('images', [])) > 1)
    added_count = 0

    for c in data:
        if c.get('rarity') == 'UR閃' and c['name'] in verified_urls:
            imgs = c.setdefault('images', [])
            if not any(i.get('label') == '下着姿' for i in imgs):
                imgs.append({
                    'label': '下着姿',
                    'url': verified_urls[c['name']],
                    'source': 'マトメバコ！',
                    'credit': 'マトメバコ！ (kokomatoblog.com)'
                })
                added_count += 1

    after_images = sum(len(c.get('images', [])) for c in data)
    after_variants = sum(1 for c in data if len(c.get('images', [])) > 1)
    print(f"\nImages: {before_images} -> {after_images} (+{added_count})")
    print(f"Variants: {before_variants} -> {after_variants}")

    new_header = re.sub(r'withVariantsCount:\s*\d+', f'withVariantsCount: {after_variants}', header_part)
    new_header = re.sub(r'totalImagesCount:\s*\d+', f'totalImagesCount: {after_images}', new_header)

    new_content = f"{new_header}window.GIRLWARS_DATA = {json.dumps(data, ensure_ascii=False, indent=2)};\n"
    with open(DATA_JS_PATH, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f"[SAVED] Updated {DATA_JS_PATH}")

if __name__ == '__main__':
    main()
