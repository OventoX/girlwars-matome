import json
import re
import os

DATA_JS_PATH = os.path.join(os.path.dirname(__file__), '..', 'app', 'data.js')

# Reference TAG_DEFINITIONS from build_data.py (exact id, name, icon)
TAG_MASTER = {
    'aoe': ('全体攻撃', '💥'),
    'control': ('行動不能付与', '❄️'),
    'rage_gain': ('戦意回復', '⚡'),
    'rage_drain': ('戦意減少', '🔻'),
    'revive': ('復活/死亡回避', '🕊️'),
    'self_heal': ('自己回復', '💖'),
    'team_heal': ('味方回復', '🌿'),
    'dmg_share': ('被ダメ分配', '🛡️'),
    'debuff': ('デバフ付与', '💀'),
    'cleanse': ('デバフ解除/免疫', '✨'),
    'counter': ('追撃/反撃', '⚔️'),
    'anti_followup': ('追撃阻止', '🛑'),
    'ignore_def': ('防御無視/貫通', '🎯'),
    'buff': ('バフ付与/自己強化', '⭐'),
}

def make_tag(tag_id):
    name, icon = TAG_MASTER[tag_id]
    return {
        'id': tag_id,
        'name': name,
        'icon': icon,
        'fromSkill': False,
        'fromEval': True
    }

# Explicit, evidence-based tag rules ONLY for characters that currently have empty tags
# Derived strictly from existing evaluation.summary / role texts (never fabricated)
EXPLICIT_SSR_TAGS = {
    'wiki_85': ['debuff'],                 # エリザベス: 敵軍弱体、絶技増加
    'wiki_93': ['ignore_def', 'self_heal'],# 小早川秀秋: リアルダメージ、吸血攻撃
    'wiki_114': ['debuff', 'control'],     # 坂本龍馬: 弱点印記、単体制御
    'wiki_97': ['debuff'],                 # 始皇帝: 始皇の炎、回復剋星
    'wiki_80': ['control', 'buff'],        # ジャンヌ・ダルク: 猛系支援　目標禁錮
    'wiki_69': ['control'],                # 立花道雪: 雷神降誕、群制御
    'wiki_67': ['cleanse', 'revive'],      # 徳川家康: 制御抵抗、不滅之身
    'wiki_78': ['debuff', 'revive'],       # ベオウルフ: 目標弱化、強靭不死
    'wiki_87': ['buff'],                   # 源義経: チーム中核、後列減傷
    'wiki_65': ['self_heal'],              # 毛利元就: ダメ反射回復、戦意制御
    'wiki_68': ['buff'],                   # モードレッド: チーム中核、前列強化
    'wiki_102': ['debuff'],                # 明智光秀: 敵軍弱体、絶技増加
}

def extract_bride_tags_from_comment(comment):
    """Extract tags strictly from atwiki Tier comment for newly-populated brides."""
    tag_ids = []
    # Remove phrases that would falsely trigger positive effect tags
    cleaned = comment.replace('復活封鎖', '').replace('コントロールされやすい', '')

    checks = [
        ('aoe', r'全体攻撃|敵全体|すべての敵|敵全員|全体奥義|全体にダメージ'),
        ('control', r'行動不能|眩暈|凍結|石化|麻痺|沈黙|封印|足止め|コントロール(?!解除)'),
        ('rage_gain', r'戦意[^。、\n]*?(?:回復|獲得|アップ|上昇|\+\s*\d+|満タン)'),
        ('rage_drain', r'戦意[^。、\n]*?(?:減少|低下|吸収|削|ダウン|減らす)'),
        ('revive', r'復活|不死能力|致死[^。、\n]*?死亡せず|致命[^。、\n]*?回避|一回死亡を回避|致死[^。、\n]*?耐え|死亡回避'),
        ('self_heal', r'自身[^。、\n]*?HP[^。、\n]*?回復|HP[^。、\n]*?回復[^。、\n]*?自身|自身のHPを|HPを持続回復'),
        ('team_heal', r'味方[^。、\n]*?HP[^。、\n]*?回復|周囲の味方[^。、\n]*?回復|全体のHP[^。、\n]*?回復|治療|味方のHP'),
        ('dmg_share', r'ダメ分担|被ダメージの分配|ダメージ[^。、\n]*?分担|ダメージ[^。、\n]*?分配|肩代わり'),
        ('debuff', r'デバフ|烙印|重傷|禁療|黒血侵食|呪い|減傷[^。、\n]*?低下|脆弱|防御力[^。、\n]*?低下|攻撃力(?:低下|の減少)|ダメージを低下'),
        ('cleanse', r'デバフ[^。、\n]*?解除|デバフ[^。、\n]*?免疫|コントロール[^。、\n]*?解除|コントロール解除|状態異常[^。、\n]*?無効|免疫'),
        ('counter', r'追撃|反撃|カウンター'),
        ('anti_followup', r'追撃[^。、\n]*?阻止|追撃[^。、\n]*?防'),
        ('ignore_def', r'防御[^。、\n]*?無視|減傷[^。、\n]*?無視|防御無視|軽減無視'),
        ('buff', r'攻撃力[^。、\n]*?(?:上昇|アップ|増加)|会心[^。、\n]*?(?:上昇|アップ)|与ダメ[^。、\n]*?(?:上昇|アップ)|増傷[^。、\n]*?(?:上昇|アップ)|(?<!デ)バフ|ダメージ軽減'),
    ]
    for tid, pat in checks:
        if re.search(pat, cleaned):
            tag_ids.append(tid)
    return tag_ids

def main():
    with open(DATA_JS_PATH, 'r', encoding='utf-8') as f:
        content = f.read()

    idx = content.find('window.GIRLWARS_DATA = ')
    if idx == -1:
        raise ValueError("Could not find window.GIRLWARS_DATA in app/data.js")

    header_part = content[:idx]
    json_str = content[idx + len('window.GIRLWARS_DATA = '):].rstrip(';\n ')
    data = json.loads(json_str)

    # Pre-check counts
    before_eval = sum(1 for c in data if c.get('evaluation', {}).get('summary', '').strip())
    before_tags = sum(1 for c in data if c.get('tags') and len(c['tags']) > 0)
    print(f"[BEFORE] Total: {len(data)}, With eval: {before_eval}, With tags: {before_tags}, Empty tags: {len(data) - before_tags}")

    eval_added = 0
    tags_added = 0

    for c in data:
        ev = c.setdefault('evaluation', {})
        has_eval = bool(ev.get('summary', '').strip())
        has_tags = bool(c.get('tags') and len(c['tags']) > 0)

        # 作業2: 評価文が空欄で、既存の出典(sources.atwiki.comment)がある場合は補完
        if not has_eval:
            atwiki_src = ev.get('sources', {}).get('atwiki')
            if atwiki_src and atwiki_src.get('comment', '').strip():
                ev['summary'] = atwiki_src['comment'].strip()
                eval_added += 1

        # 作業1: タグが空欄のキャラのみ、根拠がある場合に付与（既存タグありは一切触らない）
        if not has_tags:
            if c['id'] in EXPLICIT_SSR_TAGS:
                c['tags'] = [make_tag(tid) for tid in EXPLICIT_SSR_TAGS[c['id']]]
                tags_added += 1
            elif c['rarity'] == '花嫁' and ev.get('summary', '').strip():
                tids = extract_bride_tags_from_comment(ev['summary'])
                if tids:
                    c['tags'] = [make_tag(tid) for tid in tids]
                    tags_added += 1

    after_eval = sum(1 for c in data if c.get('evaluation', {}).get('summary', '').strip())
    after_tags = sum(1 for c in data if c.get('tags') and len(c['tags']) > 0)
    print(f"[AFTER]  Total: {len(data)}, With eval: {after_eval} (+{eval_added}), With tags: {after_tags} (+{tags_added}), Empty tags: {len(data) - after_tags}")

    # Update withTagsCount in header metadata
    new_header = re.sub(r'withTagsCount:\s*\d+', f'withTagsCount: {after_tags}', header_part)

    new_content = f"{new_header}window.GIRLWARS_DATA = {json.dumps(data, ensure_ascii=False, indent=2)};\n"
    with open(DATA_JS_PATH, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f"[SAVED] Updated {DATA_JS_PATH}")

if __name__ == '__main__':
    main()
