import os
import re
import urllib.parse
from common import fetch_html, parse_soup

KOKOMATO_WED_URL = "https://kokomatoblog.com/shoujyowars-wed"

# Slug map for 61 kokomato bride characters
SLUG_MAP = {
    'アウグストゥス': 'augustus',
    'アキレウス': 'achilles',
    'アストルフォ': 'astolfo',
    'アッティラ': 'attila',
    'アレクサンドロス': 'alexander',
    'エリザベス': 'elizabeth',
    'オリオン': 'orion',
    'カール大帝': 'charlemagne',
    'ガウェイン': 'gawain',
    'ギルガメッシュ': 'gilgamesh',
    'クーフーリン': 'cu_chulainn',
    'ジャンヌ・ダルク': 'jeanne_darc',
    'ジンギスカン': 'genghis_khan',
    'スカアハ': 'scathach',
    'セミラミス': 'semiramis',
    'ソロモン': 'solomon',
    'ダンテ': 'dante',
    'ダヴィンチ': 'da_vinci',
    'ネロ': 'nero',
    'ビスマルク': 'bismarck',
    'フランケンシュタイン': 'frankenstein',
    'フリードリヒ': 'friedrich',
    'ブリュンヒルド': 'brynhildr',
    'ヘラクレス': 'heracles',
    'ベオウルフ': 'beowulf',
    'ペルセウス': 'perseus',
    'メディア': 'medea',
    'メフィスト': 'mephisto',
    'モードレッド': 'mordred',
    'ランスロット': 'lancelot',
    'ロームルス': 'romulus',
    '上泉信綱': 'kamiizumi_nobutsuna',
    '伊達政宗': 'date_masamune',
    '佐々木小次郎': 'sasaki_kojiro',
    '八百比丘尼': 'yaobikuni',
    '劉備': 'ryubi',
    '卑弥呼': 'himiko',
    '呂布': 'ryohu',
    '坂田金時': 'sakata_kintoki',
    '始皇帝': 'shikoutei',
    '安倍晴明': 'abe_no_seimei',
    '巴御前': 'tomoe_gozen',
    '曹操': 'sousou',
    '李白': 'rihaku',
    '武田信玄': 'takeda_shingen',
    '沖田総司': 'okita_soji',
    '源頼光': 'minamoto_no_yorimitsu',
    '玉藻前': 'tamamo_no_mae',
    '石田三成': 'ishida_mitsunari',
    '稲姫': 'inahime',
    '立花宗茂': 'tachibana_muneshige',
    '立花道雪': 'tachibana_dosetsu',
    '竹中半兵衛': 'takenaka_hanbei',
    '豊臣秀吉': 'toyotomi_hideyoshi',
    '貂蝉': 'chousen',
    '長宗我部元親': 'chosokabe_motochika',
    '雪女': 'yukionna',
    '静御前': 'shizuka_gozen',
    '項羽': 'kouu',
    '馬超': 'bachou',
    '黄忠': 'kouchuu'
}

# 28 atwiki bride names that are already recorded from atwiki
ATWIKI_BRIDE_NAMES = set([
    'アーサー', 'エカテリーナ', 'カエサル', 'コンスタンティノス', 'サンタ', 'ジークフリート',
    'マーリン', 'レオニダス1世', '上杉謙信', '周瑜', '坂本龍馬', '宮本武蔵', '寧々',
    '小早川秀秋', '平清盛', '徳川家康', '斎藤帰蝶', '明智光秀', '服部半蔵', '本多忠勝',
    '毛利元就', '源義経', '真田幸村', '立花誾千代', '織田信長', '諸葛孔明', '趙子龍', '関羽'
])

def percent_encode_url(url):
    if not url:
        return url
    parts = urllib.parse.urlsplit(url)
    path = urllib.parse.quote(parts.path)
    return urllib.parse.urlunsplit((parts.scheme, parts.netloc, path, parts.query, parts.fragment))

def parse_kokomato_wed_page():
    html = fetch_html(KOKOMATO_WED_URL)
    soup = parse_soup(html)
    if not soup:
        return []

    article = soup.find('article') or soup.find(class_='entry-content')
    if not article:
        return []

    headings = article.find_all(['h2', 'h3'])
    all_brides_info = []

    for h in headings:
        ht = h.text.strip()
        if ht in ['少女ウォーズの花嫁キャラのヒント一覧', '少女ウォーズの花嫁ヒントの一覧まとめ', 'まとめ', 'comment コメントをキャンセル']:
            continue

        cname = ht.replace('花嫁・', '').replace('花嫁', '').strip()
        if cname == '立花闇千代': cname = '立花誾千代'
        if cname == 'アーサー王': cname = 'アーサー'
        if cname == 'ジャンヌダルク': cname = 'ジャンヌ・ダルク'
        if cname == 'ネロ・クラウディウス': cname = 'ネロ'

        raw_imgs = []
        hints = []
        link = None

        for sib in h.find_next_siblings():
            if sib.name in ['h2', 'h3']:
                break
            a = sib.find('a')
            if a and a.get('href') and ('kokomatoblog.com' in a.get('href')) and not link:
                link = a.get('href')
            for img in sib.find_all('img'):
                src = img.get('src', '')
                alt = img.get('alt', '')
                if src and 'wp-content/uploads' in src and not any(x in src for x in ['100x100', 'AppIcon', 'itune', 'gplay', 'gravatar']):
                    if not any(x['src'] == src for x in raw_imgs):
                        raw_imgs.append({'src': src, 'alt': alt})
            for line in sib.text.split('\n'):
                line = line.strip().replace('※', '').replace('・', '')
                if line and any(w in line for w in ['タップ', 'スワイプ', '撫でる', '引っ張る', '脱ぐ', '捲る', '獲得', '勝つ', '負ける']):
                    if len(line) < 60 and line not in hints:
                        hints.append(line)

        all_brides_info.append({
            'name': cname,
            'link': link,
            'raw_imgs': raw_imgs,
            'hints': hints
        })

    return all_brides_info

def fetch_kokomato_brides():
    print("[KOKOMATO_BRIDES] Parsing bride list for new characters...")
    all_info = parse_kokomato_wed_page()
    bride_records = []

    for b in all_info:
        cname = b['name']
        if cname in ATWIKI_BRIDE_NAMES:
            continue

        images = []
        raw_imgs = b['raw_imgs']
        if len(raw_imgs) >= 1:
            images.append({
                'label': '通常',
                'url': percent_encode_url(raw_imgs[0]['src']),
                'source': 'マトメバコ！ (kokomatoblog)',
                'credit': 'マトメバコ！ / ゲーム内スチル'
            })
        if len(raw_imgs) >= 2:
            images.append({
                'label': '脱衣後',
                'url': percent_encode_url(raw_imgs[1]['src']),
                'source': 'マトメバコ！ (kokomatoblog)',
                'credit': 'マトメバコ！ / ゲーム内スチル'
            })

        slug = SLUG_MAP.get(cname)
        if not slug:
            slug = re.sub(r'[^a-zA-Z0-9]', '_', cname).lower()
        char_id = f"kokomato_wed_{slug}"

        primary_url = b['link'] if b['link'] else KOKOMATO_WED_URL
        illust_url = images[0]['url'] if images else None

        bride_records.append({
            'id': char_id,
            'name': cname,
            'title': f"花嫁/{cname}",
            'rarity': '花嫁',
            'type': '',
            'role': '',
            'cv': '',
            'illustUrl': illust_url,
            'illustSource': 'マトメバコ！ (kokomatoblog)',
            'illustCredit': 'マトメバコ！ / ゲーム内スチル',
            'dialogues': {},
            'story': '',
            'skills': None,
            'hints': b['hints'],
            'evaluation': {
                'tierRank': None,
                'summary': '',
                'iconUrl': None,
                'sources': {},
                'flags': {
                    'onlyOutdated2024': False,
                    'hasMultiSources': False
                },
                'history': []
            },
            'sourceInfo': {
                'primaryUrl': primary_url,
                'sourceName': 'マトメバコ！ (kokomatoblog)',
                'updatedAt': '2026-11-11',
                'isOutdated': False
            },
            'ruby': '',
            'tags': [],
            'images': images
        })

    print(f"[KOKOMATO_BRIDES] Extracted {len(bride_records)} kokomato-only bride characters.")
    return bride_records

def fetch_kokomato_bride_extras():
    """Returns mapping for all 89 brides: hints and extra variant images"""
    all_info = parse_kokomato_wed_page()
    extras = {}
    for b in all_info:
        extras[b['name']] = {
            'hints': b['hints'],
            'raw_imgs': [percent_encode_url(x['src']) for x in b['raw_imgs']],
            'link': b['link']
        }
    return extras

if __name__ == '__main__':
    records = fetch_kokomato_brides()
    print(f"Total extracted: {len(records)}")
    extras = fetch_kokomato_bride_extras()
    print(f"Total bride extras: {len(extras)}")
