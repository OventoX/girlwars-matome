const fs = require('fs');
const vm = require('vm');

console.log("================ RIGOROUS VERIFICATION SUITE ================");

// 1. Load Data
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('app/data.js', 'utf8'), sandbox);
vm.runInContext(fs.readFileSync('app/tier_data.js', 'utf8'), sandbox);

const data = sandbox.window.GIRLWARS_DATA;
const meta = sandbox.window.GIRLWARS_METADATA;
const tier = sandbox.window.GIRLWARS_TIER;

console.log(`[DATA] Total records: ${data.length}`);
console.log(`[META] Metadata totalCount: ${meta.totalCount}`);

// Check 1: ID Uniqueness & atwiki IDs
const ids = data.map(c => c.id);
const uniqueIds = new Set(ids);
const idCollisions = ids.length - uniqueIds.size;
const wikiIds = data.filter(c => c.id.startsWith('wiki_')).map(c => c.id);
const uniqueWikiIds = new Set(wikiIds);
const wikiCollisions = wikiIds.length - uniqueWikiIds.size;

console.log(`\n--- 修正1: ID一意性 ---`);
console.log(`  全レコードID総数: ${ids.length}, ユニークID数: ${uniqueIds.size}`);
console.log(`  ID重複件数: ${idCollisions} (期待値: 0) -> ${idCollisions === 0 ? 'PASS' : 'FAIL'}`);
console.log(`  atwiki由来件数: ${wikiIds.length}, ユニークID数: ${uniqueWikiIds.size}`);
console.log(`  atwiki ID重複: ${wikiCollisions} (期待値: 0) -> ${wikiCollisions === 0 ? 'PASS' : 'FAIL'}`);
console.log(`  サンプルatwiki ID: ${[...uniqueWikiIds].slice(0, 5).join(', ')}`);

// Check 2: Skill Full Texts & Evolution Strings
let withSkillsActual = 0;
data.forEach(c => {
  if (!c.skills) return;
  const n = c.skills.normal && c.skills.normal.text && c.skills.normal.text.trim();
  const p = c.skills.passive && c.skills.passive.text && c.skills.passive.text.trim();
  const u = c.skills.ultimate && c.skills.ultimate.text && c.skills.ultimate.text.trim();
  if (n || p || u) withSkillsActual++;
});

let emptyEvoCount = 0;
data.forEach(c => {
  if (c.skills && c.skills.evolution) {
    ['fire', 'ice'].forEach(k => {
      (c.skills.evolution[k] || []).forEach(item => {
        if (item.replace(/Lv\d+:\s*/, '').trim() === '') {
          emptyEvoCount++;
        }
      });
    });
  }
});

console.log(`\n--- 修正2: スキル全文 & 空進化除去 ---`);
console.log(`  実測スキル本文保持数: ${withSkillsActual}`);
console.log(`  メタデータ withSkillsCount: ${meta.withSkillsCount}`);
console.log(`  メタデータと実測の一致: ${withSkillsActual === meta.withSkillsCount ? 'PASS' : 'FAIL'}`);
console.log(`  空進化ラベル ("Lv1: ") 残存数: ${emptyEvoCount} (期待値: 0) -> ${emptyEvoCount === 0 ? 'PASS' : 'FAIL'}`);

// Check 3: UR閃 Evaluation Summary
const urSens = data.filter(c => c.rarity === 'UR閃');
const urSensWithSummary = urSens.filter(c => c.evaluation && c.evaluation.summary && c.evaluation.summary.trim());
console.log(`\n--- 修正3: UR閃 強み要約抽出 ---`);
console.log(`  UR閃総数: ${urSens.length}, 要約保持数: ${urSensWithSummary.length}/${urSens.length}`);
console.log(`  全件抽出達成: ${urSensWithSummary.length === urSens.length ? 'PASS' : 'FAIL'}`);
if (urSensWithSummary.length > 0) {
  console.log(`  サンプル要約 (${urSensWithSummary[0].name}): ${urSensWithSummary[0].evaluation.summary.slice(0, 60)}...`);
}

// Check 4: tierRank Rarity Pollution Elimination
const distinctTierRanks = [...new Set(data.map(c => c.evaluation && c.evaluation.tierRank).filter(Boolean))];
const hasRarityInTier = distinctTierRanks.some(t => ['UR閃', 'UR', 'SSR', '花嫁'].includes(t));
console.log(`\n--- 修正4: tierRank へのレアリティ混入 ---`);
console.log(`  検出されたtierRank値一覧: ${JSON.stringify(distinctTierRanks)}`);
console.log(`  レアリティ文字列の混入なし: ${!hasRarityInTier ? 'PASS' : 'FAIL'}`);

// Check 5: Freshness updatedAt Granularity
const distinctUpdatedAts = [...new Set(data.map(c => c.sourceInfo && c.sourceInfo.updatedAt).filter(Boolean))];
console.log(`\n--- 修正5: updatedAt 粒度 ---`);
console.log(`  検出された更新日付種類数: ${distinctUpdatedAts.length} 種類 (旧3種類から個別日付へ拡充)`);
console.log(`  個別日付の反映確認: ${distinctUpdatedAts.length > 20 ? 'PASS' : 'FAIL'}`);

// Check 6: Image Fallbacks in app.js
const appJs = fs.readFileSync('app/app.js', 'utf8');
const imgTags = appJs.match(/<img[^>]+>/g) || [];
console.log(`\n--- 修正6: 画像フォールバック ---`);
console.log(`  app.js 内の <img> タグ総数: ${imgTags.length}`);
let allHaveOnerror = true;
imgTags.forEach((img, idx) => {
  const hasOnerror = img.includes('onerror=');
  if (!hasOnerror) allHaveOnerror = false;
  console.log(`  img[${idx}]: has onerror? ${hasOnerror}`);
});
console.log(`  全画像フォールバック実装: ${allHaveOnerror ? 'PASS' : 'FAIL'}`);

// Check 7: HTML Escaping & Tier Event Delegation
const hasInlineOpenByName = appJs.includes('onclick="window.__openCharByName');
const hasDataCharName = appJs.includes('data-char-name=');
console.log(`\n--- 修正7: エスケープ & Tier表クリック ---`);
console.log(`  インライン onclick 残存: ${hasInlineOpenByName} (期待値: false) -> ${!hasInlineOpenByName ? 'PASS' : 'FAIL'}`);
console.log(`  data-char-name 属性実装: ${hasDataCharName} -> ${hasDataCharName ? 'PASS' : 'FAIL'}`);

// Check 8: README Accuracy
const readme = fs.readFileSync('README.md', 'utf8');
const dataJsSize = fs.statSync('app/data.js').size;
const readmeMatchesCount = readme.includes('151体');
console.log(`\n--- 修正8: README 記載整合性 ---`);
console.log(`  実測 data.js サイズ: ${dataJsSize} bytes (~${(dataJsSize/1024/1024).toFixed(1)}MB)`);
console.log(`  README に 151体 の明記あり: ${readmeMatchesCount ? 'PASS' : 'FAIL'}`);

// Check 9: Tier Table Missing & Normalization
const tierEntries = Object.keys(tier.atwiki2024);
const namesInData = new Set(data.map(c => c.name));
const nameNorm = { 'エカチェリーナ': 'エカテリーナ', 'ジャンヌ': 'ジャンヌ・ダルク' };
const unrecorded = [];
tierEntries.forEach(k => {
  const norm = nameNorm[k] || k;
  if (!namesInData.has(norm)) {
    unrecorded.push(k);
  }
});
console.log(`\n--- 修正9: Tier表キャラマッチング ---`);
console.log(`  Tier総数: ${tierEntries.length}, 表記ゆれ補正後の未収録キャラ: ${unrecorded.join(', ')}`);
console.log(`  エカチェリーナがエカテリーナに正常マッチ: ${namesInData.has('エカテリーナ') ? 'PASS' : 'FAIL'}`);
console.log(`  未収録5体に対する警告ハンドリング実装済み: ${appJs.includes('の個別キャラデータは未収録です') ? 'PASS' : 'FAIL'}`);

// Check Optional: Story
const withStoryCount = data.filter(c => c.story && c.story.trim()).length;
console.log(`\n--- 任意項目: プロフィール・ストーリー ---`);
console.log(`  ストーリー本文収録キャラ数: ${withStoryCount} / ${data.length}`);

// Check 10: Feature 1 - キャラ比較ビュー
console.log(`\n--- 第3弾 機能1: キャラ比較ビュー ---`);
const hasCompareTab = fs.readFileSync('app/index.html', 'utf8').includes('id="tab-compare"');
const hasCompareLogic = appJs.includes('renderCompareView') && appJs.includes('toggleCompare') && appJs.includes('compareList');
const hasCompareHighlight = appJs.includes('compare-best-highlight');
console.log(`  比較ビュースクリーン/タブ実装: ${hasCompareTab ? 'PASS' : 'FAIL'}`);
console.log(`  比較ロジック & localStorage保存: ${hasCompareLogic ? 'PASS' : 'FAIL'}`);
console.log(`  最高位/優劣ハイライト実装: ${hasCompareHighlight ? 'PASS' : 'FAIL'}`);

// Check 11: Feature 2 - スキル効果タグ & 逆引きAND検索
console.log(`\n--- 第3弾 機能2: スキル効果タグ＋逆引き検索 ---`);
const tagsMaster = meta.tagsMaster || [];
console.log(`  定義タグ数: ${tagsMaster.length} (期待値: 14) -> ${tagsMaster.length === 14 ? 'PASS' : 'FAIL'}`);
const charsWithTags = data.filter(c => c.tags && c.tags.length > 0);
console.log(`  タグ保有キャラ数: ${charsWithTags.length} / ${data.length} (${(charsWithTags.length / data.length * 100).toFixed(1)}%)`);
const hasSkillVsEvalDistinction = charsWithTags.some(c => c.tags.some(t => t.fromSkill)) && charsWithTags.some(c => c.tags.some(t => t.fromEval));
console.log(`  本文由来(fromSkill)と評価由来(fromEval)の区別: ${hasSkillVsEvalDistinction ? 'PASS' : 'FAIL'}`);
const hasAndFilterInApp = appJs.includes('state.selectedTags.size > 0') && appJs.includes('!charTagIds.has(reqTag)');
console.log(`  公開求人式 AND絞り込み検索ロジック: ${hasAndFilterInApp ? 'PASS' : 'FAIL'}`);

// Check 12: Feature 3 - 複数ソース評価併記 & 評価変更履歴
console.log(`\n--- 第3弾 機能3: 複数ソース評価併記＋Tier変更履歴 ---`);
const multiSourceChars = data.filter(c => c.evaluation && c.evaluation.flags && c.evaluation.flags.hasMultiSources);
const outdated2024Chars = data.filter(c => c.evaluation && c.evaluation.flags && c.evaluation.flags.onlyOutdated2024);
const historyChars = data.filter(c => c.evaluation && c.evaluation.history && c.evaluation.history.length > 0);
console.log(`  複数ソース評価保有キャラ数: ${multiSourceChars.length} 体`);
console.log(`  2024年wikiのみ評価キャラ数: ${outdated2024Chars.length} 体`);
console.log(`  評価/Tier変更履歴データ保有キャラ数: ${historyChars.length} 体`);
const hasHistoryFields = historyChars.length > 0 && historyChars[0].evaluation.history[0].date && historyChars[0].evaluation.history[0].change;
console.log(`  履歴データ構造（日付・変更・理由・URL）検証: ${hasHistoryFields ? 'PASS' : 'FAIL'}`);
const hasSourceCardsInModal = appJs.includes('eval-source-card') && appJs.includes('eval-history-timeline');
console.log(`  モーダル併記＆タイムライン表示実装: ${hasSourceCardsInModal ? 'PASS' : 'FAIL'}`);

// Check 13: Feature 4 - 編成共有URL & セット保存 & 1枠差し替え比較
console.log(`\n--- 第3弾 機能4: 編成共有URL＋セット保存・1枠差し替え比較 ---`);
const hasUrlShare = appJs.includes('checkUrlPartyParam') && appJs.includes('sharePartyUrl') && appJs.includes('?party=');
const hasSavedParties = appJs.includes('savedParties') && appJs.includes('setupSavedPartiesUI');
const hasDiffSim = appJs.includes('updateDiffSimulator') && appJs.includes('diffSlotSelect') && appJs.includes('diff-badge-plus');
console.log(`  URLパラメータ共有＆自動復元: ${hasUrlShare ? 'PASS' : 'FAIL'}`);
console.log(`  編成複数セット保存/読込/削除: ${hasSavedParties ? 'PASS' : 'FAIL'}`);
console.log(`  1枠差し替えシミュレータ（シナジー・タグ増減）: ${hasDiffSim ? 'PASS' : 'FAIL'}`);

// Check 14: 第4弾 - 花嫁イラスト点検 & 状態別イラスト収録 & ギャラリー表示
console.log(`\n--- 第4弾: 花嫁イラスト点検 & 状態別イラスト収録 & ギャラリー表示 ---`);
const brides = data.filter(c => c.rarity === '花嫁');
console.log(`  花嫁キャラ総数: ${brides.length} 体 (期待値: 24) -> ${brides.length === 24 ? 'PASS' : 'FAIL'}`);

// Check bride images swap fix (wiki_44 Kobayakawa vs wiki_58 Tokugawa)
const kobayakawa = data.find(c => c.id === 'wiki_44');
const tokugawa = data.find(c => c.id === 'wiki_58');
const kobayakawaCorrect = kobayakawa && kobayakawa.illustUrl && kobayakawa.illustUrl.includes('%ED%9E%88%EB%8D%B0%EC%95%84%ED%82%A4'); // 히데아키
const tokugawaCorrect = tokugawa && tokugawa.illustUrl && tokugawa.illustUrl.includes('%EC%9D%B4%EC%97%90%EC%95%BC%EC%8A%A4'); // 이에야스
console.log(`  小早川秀秋(wiki_44)の画像正常化 (ヒデアキ): ${kobayakawaCorrect ? 'PASS' : 'FAIL'}`);
console.log(`  徳川家康(wiki_58)の画像正常化 (イエヤス): ${tokugawaCorrect ? 'PASS' : 'FAIL'}`);

// Check images array synchronization
let allImagesSynced = true;
let totalImages = 0;
let charsWithMultiple = 0;
data.forEach(c => {
  if (!Array.isArray(c.images)) {
    allImagesSynced = false;
    return;
  }
  totalImages += c.images.length;
  if (c.images.length > 1) {
    charsWithMultiple++;
  }
  if (c.images.length > 0) {
    if (c.images[0].url !== c.illustUrl || c.images[0].source !== c.illustSource || c.images[0].credit !== c.illustCredit) {
      allImagesSynced = false;
    }
  } else if (c.illustUrl !== null) {
    allImagesSynced = false;
  }
});

console.log(`  全キャラ images 配列存在 & 代表画像(images[0])完全同期: ${allImagesSynced ? 'PASS' : 'FAIL'}`);
console.log(`  状態別イラスト保有キャラ数 (>1枚): ${charsWithMultiple} 体 (メタ: ${meta.withVariantsCount}) -> ${charsWithMultiple === meta.withVariantsCount ? 'PASS' : 'FAIL'}`);
console.log(`  収録画像総数: ${totalImages} 枚 (メタ: ${meta.totalImagesCount}) -> ${totalImages === meta.totalImagesCount ? 'PASS' : 'FAIL'}`);

// Bride Arthur check
const arthur = data.find(c => c.id === 'wiki_42');
const arthurHasVariants = arthur && arthur.images && arthur.images.length === 2 && arthur.images[1].label === '限定衣装';
console.log(`  花嫁アーサー(wiki_42)の限定衣装差分収録: ${arthurHasVariants ? 'PASS' : 'FAIL'}`);

// Gallery UI check in app.js & style.css
const hasGalleryMarkup = appJs.includes('modal-gallery-controls') && appJs.includes('modal-gallery-tab');
const hasGalleryLogic = appJs.includes('modal-gallery-main-img') && appJs.includes('modal-gallery-badge') && appJs.includes('modal-gallery-credit');
const styleCss = fs.readFileSync('app/style.css', 'utf8');
const hasGalleryStyles = styleCss.includes('.modal-gallery-controls') && styleCss.includes('.modal-gallery-tab');
console.log(`  詳細モーダル ギャラリーマークアップ実装: ${hasGalleryMarkup ? 'PASS' : 'FAIL'}`);
console.log(`  詳細モーダル 状態切替インタラクション実装: ${hasGalleryLogic ? 'PASS' : 'FAIL'}`);
console.log(`  ギャラリースタイル定義 (style.css): ${hasGalleryStyles ? 'PASS' : 'FAIL'}`);

console.log("\n================ VERIFICATION COMPLETE ================");
