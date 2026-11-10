import json, re

import os

data_path = os.path.join(os.path.dirname(__file__), '..', 'app', 'data.js')
with open(data_path, 'r', encoding='utf-8') as f:
    text = f.read()

start = text.find('window.GIRLWARS_DATA = ') + len('window.GIRLWARS_DATA = ')
end = text.rfind(';')
data = json.loads(text[start:end])

TAG_RULES = [
    {
        'id': 'aoe',
        'name': '全体攻撃',
        'pattern': r'全体攻撃|敵全体|すべての敵|敵全員'
    },
    {
        'id': 'control',
        'name': '行動不能付与',
        'pattern': r'行動不能|眩暈|凍結|石化|麻痺|沈黙|封印|足止め'
    },
    {
        'id': 'rage_gain',
        'name': '戦意回復',
        'pattern': r'戦意.*?(?:回復|獲得|アップ|上昇|\+\s*\d+|満タン)'
    },
    {
        'id': 'rage_drain',
        'name': '戦意減少',
        'pattern': r'戦意.*?(?:減少|低下|吸収|削|ダウン|減らす)'
    },
    {
        'id': 'revive',
        'name': '復活/死亡回避',
        'pattern': r'復活|致死.*?死亡せず|致命.*?回避|一回死亡を回避|致死.*?耐え|死亡回避'
    },
    {
        'id': 'self_heal',
        'name': '自己回復',
        'pattern': r'自身.*?HP.*?回復|HP.*?回復.*?自身|自身のHPを|HPを持続回復'
    },
    {
        'id': 'team_heal',
        'name': '味方回復',
        'pattern': r'味方.*?HP.*?回復|周囲の味方.*?回復|全体のHP.*?回復|治療|味方のHP'
    },
    {
        'id': 'dmg_share',
        'name': '被ダメ分配',
        'pattern': r'ダメ分担|被ダメージの分配|ダメージ.*?分担|ダメージ.*?分配|肩代わり'
    },
    {
        'id': 'debuff',
        'name': 'デバフ付与',
        'pattern': r'デバフ|烙印|重傷|禁療|黒血侵食|呪い|減傷.*?低下|脆弱|防御力.*?低下'
    },
    {
        'id': 'cleanse',
        'name': 'デバフ解除/免疫',
        'pattern': r'デバフ.*?解除|デバフ.*?免疫|コントロール.*?解除|状態異常.*?無効|免疫'
    },
    {
        'id': 'counter',
        'name': '追撃/反撃',
        'pattern': r'追撃|反撃|カウンター'
    },
    {
        'id': 'anti_followup',
        'name': '追撃阻止',
        'pattern': r'追撃.*?阻止|追撃.*?防'
    },
    {
        'id': 'ignore_def',
        'name': '防御無視/貫通',
        'pattern': r'防御.*?無視|減傷.*?無視|防御無視|軽減無視'
    },
    {
        'id': 'buff',
        'name': 'バフ付与/自己強化',
        'pattern': r'攻撃力.*?(?:上昇|アップ|増加)|会心.*?(?:上昇|アップ)|与ダメ.*?(?:上昇|アップ)|増傷.*?(?:上昇|アップ)|バフ'
    }
]

def extract_char_tags(c):
    # Collect skill text
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

    # Collect eval / role text
    eval_text_parts = []
    if c.get('evaluation'):
        if c['evaluation'].get('summary'):
            eval_text_parts.append(c['evaluation']['summary'])
        for b in c['evaluation'].get('summaryBullets', []):
            eval_text_parts.append(b)
    if c.get('role'):
        eval_text_parts.append(c['role'])
    eval_full_text = "\n".join(eval_text_parts)

    matched_tags = []
    for r in TAG_RULES:
        tag_name = r['name']
        pat = r['pattern']
        m_skill = re.search(pat, skill_full_text)
        m_eval = re.search(pat, eval_full_text)
        if m_skill or m_eval:
            sample_snippet = ""
            if m_skill:
                # snippet around match
                idx = m_skill.start()
                sample_snippet = skill_full_text[max(0, idx-10):min(len(skill_full_text), idx+40)].replace('\n', ' ')
            elif m_eval:
                idx = m_eval.start()
                sample_snippet = eval_full_text[max(0, idx-10):min(len(eval_full_text), idx+40)].replace('\n', ' ')

            matched_tags.append({
                'id': r['id'],
                'name': tag_name,
                'fromSkill': bool(m_skill),
                'fromEval': bool(m_eval and not m_skill),
                'snippet': sample_snippet.strip()
            })
    return matched_tags

tag_stats = {r['name']: {'count': 0, 'from_skill': 0, 'from_eval_only': 0, 'samples': []} for r in TAG_RULES}

total_tagged_chars = 0
for c in data:
    tags = extract_char_tags(c)
    if tags:
        total_tagged_chars += 1
    for t in tags:
        name = t['name']
        tag_stats[name]['count'] += 1
        if t['fromSkill']:
            tag_stats[name]['from_skill'] += 1
        else:
            tag_stats[name]['from_eval_only'] += 1
        if len(tag_stats[name]['samples']) < 2:
            tag_stats[name]['samples'].append((c['name'], t['fromSkill'], t['snippet']))

print(f"Total characters with tags: {total_tagged_chars} / {len(data)}")
print("\n--- Tag Statistics ---")
for r in TAG_RULES:
    st = tag_stats[r['name']]
    print(f"【{r['name']}】: 合計 {st['count']} 体 (本文由来: {st['from_skill']}, 評価由来: {st['from_eval_only']})")
    for s_name, s_skill, s_snip in st['samples']:
        source_label = '本文' if s_skill else '評価'
        print(f"   - {s_name} ({source_label}): 「{s_snip}」")
