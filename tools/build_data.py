import os
import re
import json
import datetime
from fetch_atwiki import fetch_atwiki_characters, fetch_atwiki_tier
from fetch_rimuru import fetch_rimuru_catalog
from fetch_kokomato import fetch_kokomato_articles
from fetch_kokomato_brides import fetch_kokomato_brides, fetch_kokomato_bride_extras

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
    'アウグストゥス': 'あうぐすとぅす',
    '石田三成': 'いしだみつなり',
    '稲姫': 'いなひめ',
    'クーフーリン': 'くーふーりん',
    '佐々木小次郎': 'ささきこじろう',
    '坂田金時': 'さかたきんとき',
    'セミラミス': 'せみらみす',
    '曹操': 'そうそう',
    '立花宗茂': 'たちばなむねしげ',
    '立花道雪': 'たちばなどうせつ',
    'ダヴィンチ': 'だゔぃんち',
    'ダンテ': 'だんて',
    'ネロ': 'ねろ',
    '八百比丘尼': 'やおびくに',
    '卑弥呼': 'ひみこ',
    'ヘラクレス': 'へらくれす',
    'ペルセウス': 'ぺるせうす',
    '源頼光': 'みなもとのよりみつ',
    'ランスロット': 'らんすろっと',
    '玉藻前': 'たまものまえ',
    '黄忠': 'こうちゅう',
}

TAG_DEFINITIONS = [
    {'id': 'aoe', 'name': '全体攻撃', 'icon': '💥', 'desc': '敵全体または全員への範囲ダメージ', 'pattern': r'全体攻撃|敵全体|すべての敵|敵全員'},
    {'id': 'control', 'name': '行動不能付与', 'icon': '❄️', 'desc': '眩暈、凍結、沈黙、石化、麻痺等の行動制限', 'pattern': r'行動不能|眩暈|凍結|石化|麻痺|沈黙|封印|足止め'},
    {'id': 'rage_gain', 'name': '戦意回復', 'icon': '⚡', 'desc': '自身または味方の戦意（ゲージ）回復・獲得', 'pattern': r'戦意.*?(?:回復|獲得|アップ|上昇|\+\s*\d+|満タン)'},
    {'id': 'rage_drain', 'name': '戦意減少', 'icon': '🔻', 'desc': '敵の戦意減少、低下、吸収効果', 'pattern': r'戦意.*?(?:減少|低下|吸収|削|ダウン|減らす)'},
    {'id': 'revive', 'name': '復活/死亡回避', 'icon': '🕊️', 'desc': '致死ダメージ無効化、死亡回避、HP復活', 'pattern': r'復活|致死.*?死亡せず|致命.*?回避|一回死亡を回避|致死.*?耐え|死亡回避'},
    {'id': 'self_heal', 'name': '自己回復', 'icon': '💖', 'desc': '自身のHP回復、持続リジェネ', 'pattern': r'自身.*?HP.*?回復|HP.*?回復.*?自身|自身のHPを|HPを持続回復'},
    {'id': 'team_heal', 'name': '味方回復', 'icon': '🌿', 'desc': '味方全体または周囲の味方HP治療', 'pattern': r'味方.*?HP.*?回復|周囲の味方.*?回復|全体のHP.*?回復|治療|味方のHP'},
    {'id': 'dmg_share', 'name': '被ダメ分配', 'icon': '🛡️', 'desc': '味方の被ダメージ分担、肩代わり', 'pattern': r'ダメ分担|被ダメージの分配|ダメージ.*?分担|ダメージ.*?分配|肩代わり'},
    {'id': 'debuff', 'name': 'デバフ付与', 'icon': '💀', 'desc': '敵への烙印、重傷、禁療、黒血侵食、防御低下等', 'pattern': r'デバフ|烙印|重傷|禁療|黒血侵食|呪い|減傷.*?低下|脆弱|防御力.*?低下'},
    {'id': 'cleanse', 'name': 'デバフ解除/免疫', 'icon': '✨', 'desc': '弱体・行動不能効果の解除または免疫', 'pattern': r'デバフ.*?解除|デバフ.*?免疫|コントロール.*?解除|状態異常.*?無効|免疫'},
    {'id': 'counter', 'name': '追撃/反撃', 'icon': '⚔️', 'desc': '敵の行動時や被弾時の自動反撃・追撃', 'pattern': r'追撃|反撃|カウンター'},
    {'id': 'anti_followup', 'name': '追撃阻止', 'icon': '🛑', 'desc': '敵の追撃行動を高確率で阻止・中断', 'pattern': r'追撃.*?阻止|追撃.*?防'},
    {'id': 'ignore_def', 'name': '防御無視/貫通', 'icon': '🎯', 'desc': '敵の防御力またはダメージ軽減の無視・貫通', 'pattern': r'防御.*?無視|減傷.*?無視|防御無視|軽減無視'},
    {'id': 'buff', 'name': 'バフ付与/自己強化', 'icon': '⭐', 'desc': '攻撃力、会心、増傷等の味方または自己強化', 'pattern': r'攻撃力.*?(?:上昇|アップ|増加)|会心.*?(?:上昇|アップ)|与ダメ.*?(?:上昇|アップ)|増傷.*?(?:上昇|アップ)|バフ'}
]

def extract_char_tags(c):
    skill_text_parts = []
    if c.get('skills'):
        for k in ['normal', 'passive', 'ultimate']:
            sk = c['skills'].get(k)
            if sk and isinstance(sk, dict) and sk.get('text'):
                skill_text_parts.append(sk['text'])
        if c['skills'].get('evolution'):
            for ek in ['fire', 'ice']:
                for evo in c['skills']['evolution'].get(ek, []):
                    skill_text_parts.append(evo)
    skill_full_text = "\n".join(skill_text_parts)

    eval_text_parts = []
    if c.get('evaluation'):
        if c['evaluation'].get('summary'):
            eval_text_parts.append(c['evaluation']['summary'])
        for b in c['evaluation'].get('summaryBullets', []):
            eval_text_parts.append(b)
    if c.get('role'):
        eval_text_parts.append(c['role'])
    eval_full_text = "\n".join(eval_text_parts)

    tags = []
    for r in TAG_DEFINITIONS:
        m_skill = re.search(r['pattern'], skill_full_text)
        m_eval = re.search(r['pattern'], eval_full_text)
        if m_skill or m_eval:
            tags.append({
                'id': r['id'],
                'name': r['name'],
                'icon': r['icon'],
                'fromSkill': bool(m_skill),
                'fromEval': bool(m_eval and not m_skill)
            })
    return tags

def enrich_evaluation_sources(c, tier_table, kokomato_info=None):
    eval_obj = c.setdefault('evaluation', {})
    name = c['name']
    
    # 1. Atwiki Tier evaluation
    norm_name = {'エカテリーナ': 'エカチェリーナ', 'ジャンヌ・ダルク': 'ジャンヌ'}.get(name, name)
    tier_entry = tier_table.get(norm_name) or tier_table.get(name)
    
    atwiki_source = None
    if tier_entry:
        atwiki_source = {
            'sourceName': '少女ウォーズ@wiki Tier表',
            'date': '2024-08-15',
            'url': 'https://w.atwiki.jp/girlwars/pages/135.html',
            'tier': tier_entry.get('tier'),
            'comment': tier_entry.get('comment', ''),
            'iconUrl': tier_entry.get('iconUrl')
        }
        # If character doesn't have tierRank yet, set from atwiki tier
        if not eval_obj.get('tierRank') and c.get('rarity') in ['UR', 'SSR']:
            eval_obj['tierRank'] = tier_entry.get('tier')

    # 2. Rimuru evaluation
    rimuru_source = None
    if c.get('sourceInfo', {}).get('sourceName') == 'へたれゲームプレイヤーリムルの日記と攻略情報':
        rimuru_source = {
            'sourceName': 'へたれゲームプレイヤーリムルの日記と攻略情報',
            'date': c['sourceInfo'].get('updatedAt', '2026-11-05'),
            'url': c['sourceInfo'].get('primaryUrl', ''),
            'tier': None, # Rimuru does not provide letter tier
            'summary': eval_obj.get('summary', '')
        }

    # 3. Kokomato evaluation
    kokomato_source = None
    if kokomato_info or eval_obj.get('summaryBullets') or eval_obj.get('recommendedGems'):
        kokomato_source = {
            'sourceName': 'マトメバコ！ (kokomatoblog.com)',
            'date': '2026-11-09',
            'url': kokomato_info.get('url', 'https://kokomatoblog.com/') if kokomato_info else 'https://kokomatoblog.com/',
            'bullets': eval_obj.get('summaryBullets', []),
            'gems': eval_obj.get('recommendedGems', [])
        }

    sources = {}
    if atwiki_source: sources['atwiki'] = atwiki_source
    if rimuru_source: sources['rimuru'] = rimuru_source
    if kokomato_source: sources['kokomato'] = kokomato_source
    eval_obj['sources'] = sources

    # Flags
    eval_obj['flags'] = {
        'onlyOutdated2024': bool(atwiki_source and not rimuru_source and not kokomato_source),
        'hasMultiSources': len(sources) >= 2
    }

    # History
    history = []
    if atwiki_source:
        history.append({
            'date': '2024-08-15',
            'sourceName': '少女ウォーズ@wiki',
            'sourceUrl': atwiki_source['url'],
            'change': f"2024年PVP環境Tier {atwiki_source['tier']} に選出",
            'reason': atwiki_source['comment'][:80] + ('...' if len(atwiki_source['comment']) > 80 else '')
        })
    if rimuru_source:
        if c.get('rarity') == 'UR閃':
            history.append({
                'date': rimuru_source['date'],
                'sourceName': 'へたれリムルブログ',
                'sourceUrl': rimuru_source['url'],
                'change': 'UR閃への昇格・最新性能評価',
                'reason': (rimuru_source['summary'][:80] + '...') if rimuru_source.get('summary') else '最新UR閃性能解説'
            })
        elif c.get('rarity') == 'UR':
            history.append({
                'date': rimuru_source['date'],
                'sourceName': 'へたれリムルブログ',
                'sourceUrl': rimuru_source['url'],
                'change': 'URキャラ性能評価・スキル詳細掲載',
                'reason': 'UR環境におけるスキル構成と運用の評価'
            })
    eval_obj['history'] = history

def build_all():
    print("================ BUILDING GIRLWARS MASTER DATA ================")
    
    # 1. Fetch from 3 sources
    wiki_chars = fetch_atwiki_characters()
    tier_table = fetch_atwiki_tier()
    rimuru_chars = fetch_rimuru_catalog()
    kokomato_map = fetch_kokomato_articles()
    
    # 2. Integrate and merge characters
    merged_map = {}

    # (A) Add Rimuru UR/UR閃 characters (2026 High freshness)
    for c in rimuru_chars:
        name = c['name']
        rarity = c['rarity']
        key = f"{name}_{rarity}"
        
        # Check kokomato enrichments
        k_info = None
        for k_key, kd in kokomato_map.items():
            if k_key == '__special_wedinggentei__':
                continue
            if kd.get('is_bride') and rarity != '花嫁':
                continue
            if kd.get('is_ursen') and rarity != 'UR閃':
                continue
            kname = kd.get('cname') or k_key
            c_clean = name.replace('・', '')
            k_clean = kname.replace('・', '')
            if kname in name or name in kname or c_clean in k_clean or k_clean in c_clean:
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

        merged_map[key] = (c, k_info)

    # (B) Add atwiki characters (SSR, UR, 花嫁)
    for w in wiki_chars:
        name = w['name']
        rarity = w['rarity']
        key = f"{name}_{rarity}"

        # If already exists in rimuru with high freshness, enrich CV, dialogues, story
        if key in merged_map:
            existing, k_info = merged_map[key]
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
            if w.get('story') and not existing.get('story'):
                existing['story'] = w['story']
        else:
            # New entity from wiki
            w['ruby'] = RUBY_MAP.get(name, '')
            merged_map[key] = (w, None)

    # (C) Add kokomato bride characters and collect extras (hints & state variants)
    bride_extras = fetch_kokomato_bride_extras()
    kokomato_brides = fetch_kokomato_brides()

    for kb in kokomato_brides:
        name = kb['name']
        key = f"{name}_花嫁"
        kb['ruby'] = RUBY_MAP.get(name, '')
        merged_map[key] = (kb, None)

    # Attach hints to all brides and mark extra images
    for key, (c, k_info) in merged_map.items():
        if c.get('rarity') == '花嫁':
            name = c.get('name')
            extra = bride_extras.get(name)
            if extra:
                if extra.get('hints') and not c.get('hints'):
                    c['hints'] = extra['hints']
                raw_imgs = extra.get('raw_imgs', [])
                if len(raw_imgs) >= 2:
                    c['_kokomato_extra_imgs'] = raw_imgs

    # 3. Post-process characters: enrich tags, multi-source evaluations, and state-variant illustrations
    final_list = []
    weding_gentei = kokomato_map.get('__special_wedinggentei__', {})

    for (c, k_info) in merged_map.values():
        enrich_evaluation_sources(c, tier_table, k_info)
        c['tags'] = extract_char_tags(c)

        # Build images array with state variants
        images = []
        if c.get('images'):
            images = list(c['images'])
        elif c.get('illustUrl'):
            images.append({
                'label': '通常',
                'url': c['illustUrl'],
                'source': c.get('illustSource') or '少女ウォーズ@wiki',
                'credit': c.get('illustCredit') or '公式スチル'
            })

        # Enrich UR閃 state variants from kokomato
        if c.get('rarity') == 'UR閃' and k_info and k_info.get('variants'):
            k_vars = k_info['variants']
            if len(k_vars) >= 2:
                images = k_vars
            elif len(k_vars) == 1:
                if k_vars[0]['label'] == '下着姿':
                    if not images:
                        images = [{'label': '通常', 'url': k_vars[0]['url'], 'source': k_vars[0]['source'], 'credit': k_vars[0]['credit']}]
                    else:
                        images.append(k_vars[0])
                else:
                    images = k_vars

        # Enrich bride Arthur (wiki_42) limited costume from kokomato sw-wedinggentei
        if c.get('id') == 'wiki_42' and weding_gentei.get('arthur_bride_limited'):
            images.append({
                'label': '限定衣装',
                'url': weding_gentei['arthur_bride_limited'],
                'source': 'マトメバコ！',
                'credit': 'マトメバコ！ (kokomatoblog.com) / 公式スチル'
            })

        # Enrich bride state variants from kokomato extras if only 1 image
        if c.get('rarity') == '花嫁' and c.get('_kokomato_extra_imgs'):
            extra_imgs = c.pop('_kokomato_extra_imgs')
            if len(images) == 1 and len(extra_imgs) >= 2:
                images.append({
                    'label': '脱衣後',
                    'url': extra_imgs[1],
                    'source': 'マトメバコ！ (kokomatoblog)',
                    'credit': 'マトメバコ！ / ゲーム内スチル'
                })
        elif c.get('_kokomato_extra_imgs'):
            c.pop('_kokomato_extra_imgs', None)

        # Synchronize representative illustration with images[0]
        if images:
            c['images'] = images
            c['illustUrl'] = images[0]['url']
            c['illustSource'] = images[0]['source']
            c['illustCredit'] = images[0]['credit']
        else:
            c['images'] = []
            c['illustUrl'] = None
            c['illustSource'] = None
            c['illustCredit'] = None

        final_list.append(c)

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
    with_tags = sum(1 for c in final_list if c.get('tags') and len(c['tags']) > 0)
    with_variants = sum(1 for c in final_list if c.get('images') and len(c['images']) > 1)
    total_images = sum(len(c.get('images', [])) for c in final_list)
    bride_with_variants = sum(1 for c in final_list if c.get('rarity') == '花嫁' and c.get('images') and len(c['images']) > 1)
    bride_total_images = sum(len(c.get('images', [])) for c in final_list if c.get('rarity') == '花嫁')

    print(f"\n[BUILD] Total integrated characters: {total_count}")
    print(f"  UR閃: {ur_sen_count}")
    print(f"  UR:   {ur_count}")
    print(f"  SSR:  {ssr_count}")
    print(f"  花嫁: {bride_count}")
    print(f"  With full skill texts:  {with_skills}")
    print(f"  With illustrations:     {with_illust}")
    print(f"  With effect tags:       {with_tags}")
    print(f"  With state variants:    {with_variants}")
    print(f"  Total variant images:   {total_images}")
    print(f"  Bride with variants:    {bride_with_variants}")
    print(f"  Bride total images:     {bride_total_images}")

    # Metadata tag list without regex pattern
    tags_master = [{'id': r['id'], 'name': r['name'], 'icon': r['icon'], 'desc': r['desc']} for r in TAG_DEFINITIONS]

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
  withIllustCount: {with_illust},
  withTagsCount: {with_tags},
  withVariantsCount: {with_variants},
  totalImagesCount: {total_images},
  brideWithVariantsCount: {bride_with_variants},
  brideTotalImagesCount: {bride_total_images},
  tagsMaster: {json.dumps(tags_master, ensure_ascii=False, indent=2)}
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
