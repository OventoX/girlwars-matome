import os
import re
import json
import datetime
from fetch_atwiki import fetch_atwiki_characters, fetch_atwiki_tier
from fetch_rimuru import fetch_rimuru_catalog
from fetch_kokomato import fetch_kokomato_articles

APP_DIR = os.path.join(os.path.dirname(__file__), '..', 'app')
os.makedirs(APP_DIR, exist_ok=True)

# Furigana map for primary characters to enable perfect Japanese alphabetical sorting
RUBY_MAP = {
    '芦屋道満': 'あしやどうまん',
    'アストルフォ': 'あすとるふぉ',
    '安倍晴明': 'あべのせいめい',
    'アキレウス': 'あきれうす',
    'アッティラ': 'あってぃら',
    'アレクサンドロス': 'あれくさんどろす',
    'アーサー王': 'あーさーおう',
    'エカテリーナ': 'えかてりーな',
    'エリザベス': 'えりざべす',
    'オジマンディアス': 'おじまんでぃあす',
    'オデュッセウス': 'おでゅっせうす',
    'オベロン': 'おべろん',
    'オリオン': 'おりおん',
    '沖田総司': 'おきたそうじ',
    '織田信長': 'おだのぶなが',
    'ガウェイン': 'がうぇいん',
    'カエサル': 'かえさる',
    '果心居士': 'かしんこじ',
    '上泉信綱': 'かみいずみのぶつな',
    'カール大帝': 'かーるたいてい',
    '関羽': 'かんう',
    'ギルガメッシュ': 'ぎるがまっしゅ',
    'クレオパトラ': 'くれおぱとら',
    '項羽': 'こうう',
    '小早川秀秋': 'こばやかわひであき',
    'コンスタンティノス': 'こんすたんてぃのす',
    '斎藤帰蝶': 'さいとうきちょう',
    '坂本龍馬': 'さかもとりょうま',
    '真田幸村': 'さなだゆきむら',
    'サンタ': 'さんた',
    '猿飛佐助': 'さるとびさすけ',
    'ジークフリート': 'じーくふりーと',
    '始皇帝': 'しこうてい',
    'ジャンヌ・ダルク': 'じゃんぬだるく',
    '諸葛孔明': 'しょかつこうめい',
    'ジンギスカン': 'じんぎすかん',
    '周瑜': 'しゅうゆ',
    '静御前': 'しずかごぜん',
    'スカアハ': 'すかあは',
    'ソロモン': 'そろもん',
    '平清盛': 'たいらのきよもり',
    '武田信玄': 'たけだしんげん',
    '竹中半兵衛': 'たけなかはんべえ',
    '伊達政宗': 'だてまさむね',
    '長宗我部元親': 'ちょうそかべもとちか',
    '趙子龍': 'ちょうしりゅう',
    '張飛': 'ちょうひ',
    '貂蝉': 'ちょうせん',
    '徳川家康': 'とくがわいえやす',
    '巴御前': 'ともえごぜん',
    '豊臣秀吉': 'とよとみひでよし',
    '直江兼続': 'なおえかねつぐ',
    'ナポレオン': 'なぽれおん',
    '寧々': 'ねね',
    '服部半蔵': 'はっとりはんぞう',
    'ビスマルク': 'びすまるく',
    'ブリュンヒルド': 'ぶりゅんひるど',
    'フランケンシュタイン': 'ふらんけんしゅたいん',
    'フリードリヒ': 'ふりーどりひ',
    'ベオウルフ': 'べおうるふ',
    '本多忠勝': 'ほんだただかつ',
    '前田慶次': 'まえだけいじ',
    '前田利家': 'まえだとしいえ',
    '馬超': 'ばちょう',
    'マーリン': 'まーりん',
    '源義経': 'みなもとのよしつね',
    '宮本武蔵': 'みやもとむさし',
    '毛利元就': 'もうりもとなり',
    'メディア': 'めでぃあ',
    'メフィスト': 'めふぃすと',
    'メイヴ': 'めいゔ',
    'モードレッド': 'もーどれっど',
    'ヤマトタケル': 'やまとたける',
    '雪女': 'ゆきおんな',
    '李白': 'りはく',
    'リチャード': 'りちゃーど',
    '劉邦': 'りゅうほう',
    '劉備': 'りゅうび',
    '呂布': 'りょふ',
    'レオニダス1世': 'れおにだすいっせい',
    'ロームルス': 'ろーむるす',
    'ローラン': 'ろーらん',
}

def build_all():
    print("================ BUILDING GIRLWARS MASTER DATA ================")
    
    # 1. Fetch from 3 sources
    wiki_chars = fetch_atwiki_characters()
    tier_table = fetch_atwiki_tier()
    rimuru_chars = fetch_rimuru_catalog()
    kokomato_map = fetch_kokomato_articles()
    
    # 2. Integrate and merge characters
    # Priority for entries:
    # A character can have multiple rarities (e.g. UR and UR閃, or SSR and UR)
    # Each rarity version is an independent entity: name + rarity as unique key
    merged_map = {}

    # (A) Add Rimuru UR/UR閃 characters (2026 High freshness)
    for c in rimuru_chars:
        name = c['name']
        rarity = c['rarity']
        key = f"{name}_{rarity}"
        
        # Check kokomato enrichments
        # Match name in kokomato
        k_info = None
        for kname, kd in kokomato_map.items():
            if kname in name or name in kname:
                k_info = kd
                break

        if k_info:
            if k_info.get('illustUrl'):
                c['illustUrl'] = k_info['illustUrl']
                c['illustSource'] = 'マトメバコ！'
                c['illustCredit'] = 'マトメバコ！ (kokomatoblog.com) / 公式スチル'
            if k_info.get('summaryBullets'):
                c['evaluation']['summaryBullets'] = k_info['summaryBullets']
            if k_info.get('recommendedGems'):
                c['evaluation']['recommendedGems'] = k_info['recommendedGems']

        # Ruby mapping
        if not c.get('ruby'):
            c['ruby'] = RUBY_MAP.get(name, '')

        merged_map[key] = c

    # (B) Add atwiki characters (SSR, UR, 花嫁)
    for w in wiki_chars:
        name = w['name']
        rarity = w['rarity']
        key = f"{name}_{rarity}"

        # If already exists in rimuru with high freshness, enrich CV, dialogues, story
        if key in merged_map:
            existing = merged_map[key]
            if not existing.get('cv') and w.get('cv'):
                existing['cv'] = w['cv']
            if not existing.get('role') and w.get('role'):
                existing['role'] = w['role']
            if not existing.get('illustUrl') and w.get('illustUrl'):
                existing['illustUrl'] = w['illustUrl']
                existing['illustSource'] = w['illustSource']
                existing['illustCredit'] = w['illustCredit']
            if w.get('dialogues'):
                existing['dialogues'] = w['dialogues']
            if w.get('story'):
                existing['story'] = w['story']
        else:
            # New entity from wiki
            w['ruby'] = RUBY_MAP.get(name, '')
            merged_map[key] = w

    final_list = list(merged_map.values())

    # Sort characters: UR閃 -> UR -> SSR -> 花嫁 -> その他, then ruby alphabetical
    rarity_order = {'UR閃': 1, 'UR': 2, 'SSR': 3, '花嫁': 4, 'SR': 5}
    def sort_key(c):
        r_val = rarity_order.get(c.get('rarity', ''), 99)
        ruby = c.get('ruby') or c.get('name') or ''
        return (r_val, ruby)

    final_list.sort(key=sort_key)

    # Validate that all records have unique IDs
    seen_ids = set()
    dup_ids = []
    for c in final_list:
        cid = c.get('id')
        if not cid:
            raise ValueError(f"[ERROR] Character {c.get('name')} is missing ID!")
        if cid in seen_ids:
            dup_ids.append(cid)
        seen_ids.add(cid)
    if dup_ids:
        raise ValueError(f"[ERROR] Duplicate ID violation! Duplicate IDs detected: {dup_ids}")

    # Calculate statistics based on strict actual content
    total_count = len(final_list)
    ur_sen_count = sum(1 for c in final_list if c.get('rarity') == 'UR閃')
    ur_count = sum(1 for c in final_list if c.get('rarity') == 'UR')
    ssr_count = sum(1 for c in final_list if c.get('rarity') == 'SSR')
    bride_count = sum(1 for c in final_list if c.get('rarity') == '花嫁')
    
    def has_actual_skill_text(c):
        if not c.get('skills'):
            return False
        for k in ['normal', 'passive', 'ultimate']:
            sk = c['skills'].get(k)
            if sk and isinstance(sk, dict) and sk.get('text') and sk['text'].strip():
                return True
        return False

    with_skills = sum(1 for c in final_list if has_actual_skill_text(c))
    with_illust = sum(1 for c in final_list if c.get('illustUrl'))

    print(f"\n[BUILD] Total integrated characters: {total_count}")
    print(f"  UR閃: {ur_sen_count}")
    print(f"  UR:   {ur_count}")
    print(f"  SSR:  {ssr_count}")
    print(f"  花嫁: {bride_count}")
    print(f"  With full skill texts: {with_skills}")
    print(f"  With illustrations:    {with_illust}")

    # Output app/data.js
    data_js_path = os.path.join(APP_DIR, 'data.js')
    now_str = datetime.datetime.now().strftime('%Y-%m-%d %H:%M')
    data_js_content = f"""/**
 * 少女ウォーズ キャラクター統合データベース (GirlWars Character Database)
 * Generated: {now_str}
 * Total characters: {total_count} (UR閃: {ur_sen_count}, UR: {ur_count}, SSR: {ssr_count}, 花嫁: {bride_count})
 * 
 * 厳格な著作権・出典明記ルールに基づき生成されています。
 * - 2026年最新キャラ/スキル: へたれゲームプレイヤーリムル (ameblo) & マトメバコ！ (kokomatoblog.com)
 * - 2024年基礎データ/スチル: 少女ウォーズ@wiki (atwiki)
 */

window.GIRLWARS_METADATA = {{
  generatedAt: "{now_str}",
  totalCount: {total_count},
  urSenCount: {ur_sen_count},
  urCount: {ur_count},
  ssrCount: {ssr_count},
  brideCount: {bride_count},
  withSkillsCount: {with_skills},
  withIllustCount: {with_illust}
}};

window.GIRLWARS_DATA = {json.dumps(final_list, ensure_ascii=False, indent=2)};
"""
    with open(data_js_path, 'w', encoding='utf-8') as f:
        f.write(data_js_content)
    print(f"[BUILD] Wrote {data_js_path} ({len(data_js_content)} bytes)")

    # Output app/tier_data.js
    tier_js_path = os.path.join(APP_DIR, 'tier_data.js')
    tier_js_content = f"""/**
 * 少女ウォーズ Tier表マスターデータ
 * - 2024年wiki Tier表: 少女ウォーズ@wiki (最終更新 2024-08-15)
 * - 2026年最新UR閃強み一覧: へたれリムルブログ (2026-11-05)
 */

window.GIRLWARS_TIER = {{
  atwiki2024: {json.dumps(tier_table, ensure_ascii=False, indent=2)},
  sourceWiki: {{
    url: "https://w.atwiki.jp/girlwars/pages/135.html",
    updatedAt: "2024-08-15",
    title: "少女ウォーズ@wiki Tier表"
  }},
  sourceRimuru: {{
    url: "https://ameblo.jp/hetarerimuru/entry-12892549072.html",
    updatedAt: "2026-11-05",
    title: "へたれリムル UR閃キャラ強み一覧"
  }}
}};
"""
    with open(tier_js_path, 'w', encoding='utf-8') as f:
        f.write(tier_js_content)
    print(f"[BUILD] Wrote {tier_js_path} ({len(tier_js_content)} bytes)")

if __name__ == '__main__':
    build_all()
