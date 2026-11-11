/**
 * 少女ウォーズ キャラまとめ表 - Application Logic
 * Full-featured with Party Simulator, Favorites, Table View & Smooth Rendering
 */

(function() {
  'use strict';

  // State
  const state = {
    search: '',
    rarity: 'all',
    type: 'all',
    system: 'all',
    freshness: 'all',
    favFilter: 'all', // 'all' or 'fav'
    sort: 'rarity-desc',
    activeTab: 'catalog',
    viewMode: 'card', // 'card', 'table', 'gallery'
    tierSubView: 'atwiki',
    selectedChar: null,
    
    // Tag filter (Set of tag IDs)
    selectedTags: new Set(),

    // Smooth pagination
    renderedLimit: 40,
    PAGE_SIZE: 40,

    // Persistent lists
    favorites: new Set(),
    // Party: 12 slots (0-2: 前列, 3-5: 後列, 6-11: 控え)
    party: new Array(12).fill(null),

    // Feature 1: Compare list (array of char IDs, max 4)
    compareList: [],

    // Feature 4: Saved parties (map of name -> 12 slot array)
    savedParties: {},
    diffSlot: 0,
    diffCharId: null
  };

  // LocalStorage Keys
  const STORAGE_KEYS = {
    FAVORITES: 'gw_favorites_v1',
    PARTY: 'gw_party_v1',
    VIEW_MODE: 'gw_view_mode_v1',
    COMPARE: 'gw_compare_v1',
    SAVED_PARTIES: 'gw_saved_parties_v1'
  };

  // DOM Elements
  const el = {
    metaBadge: document.getElementById('data-meta-badge'),
    totalCharCount: document.getElementById('total-char-count'),
    partyCountBadge: document.getElementById('party-count-badge'),
    compareCountBadge: document.getElementById('compare-count-badge'),
    filteredCount: document.getElementById('filtered-count'),
    searchInput: document.getElementById('search-input'),
    searchClearBtn: document.getElementById('search-clear-btn'),
    sortSelect: document.getElementById('sort-select'),
    resetFiltersBtn: document.getElementById('reset-filters-btn'),
    filterTags: document.getElementById('filter-tags'),
    clearTagsBtn: document.getElementById('clear-tags-btn'),
    
    // Catalog Views
    cardsContainer: document.getElementById('characters-container'),
    tableContainer: document.getElementById('characters-table-container'),
    tableBody: document.getElementById('characters-table-body'),
    loadMoreContainer: document.getElementById('load-more-container'),
    btnLoadMore: document.getElementById('btn-load-more'),
    remainingCount: document.getElementById('remaining-count'),
    viewSwitcher: document.getElementById('view-mode-switcher'),

    // Modal
    charModal: document.getElementById('char-modal'),
    modalContent: document.getElementById('modal-content'),
    modalCloseBtn: document.getElementById('modal-close-btn'),

    // Tabs
    tabCatalog: document.getElementById('tab-catalog'),
    tabParty: document.getElementById('tab-party'),
    tabCompare: document.getElementById('tab-compare'),
    tabTier: document.getElementById('tab-tier'),
    tabAbout: document.getElementById('tab-about'),
    controlsPanel: document.getElementById('controls-panel'),
    atwikiTierGroups: document.getElementById('atwiki-tier-groups'),
    ursenStrengthsContainer: document.getElementById('ursen-strengths-container'),

    // Party Controls
    btnSharePartyUrl: document.getElementById('btn-share-party-url'),
    btnExportParty: document.getElementById('btn-export-party'),
    btnImportParty: document.getElementById('btn-import-party'),
    btnClearParty: document.getElementById('btn-clear-party'),
    synergyPowerCount: document.getElementById('synergy-power-count'),
    synergyWisdomCount: document.getElementById('synergy-wisdom-count'),
    synergyBraveCount: document.getElementById('synergy-brave-count'),
    synergyWindCount: document.getElementById('synergy-wind-count'),
    synergyFlowerCount: document.getElementById('synergy-flower-count'),
    synergySnowCount: document.getElementById('synergy-snow-count'),
    synergyMoonCount: document.getElementById('synergy-moon-count'),

    // Saved Parties
    inputPartyName: document.getElementById('input-party-name'),
    btnSaveCurrentParty: document.getElementById('btn-save-current-party'),
    selectSavedParties: document.getElementById('select-saved-parties'),
    btnLoadSavedParty: document.getElementById('btn-load-saved-party'),
    btnDeleteSavedParty: document.getElementById('btn-delete-saved-party'),

    // Diff Simulator
    diffSlotSelect: document.getElementById('diff-slot-select'),
    diffCharSelect: document.getElementById('diff-char-select'),
    diffResultPanel: document.getElementById('diff-result-panel'),

    // Compare View
    compareContentArea: document.getElementById('compare-content-area'),
    btnClearCompare: document.getElementById('btn-clear-compare'),
    btnComparePresetUrsen: document.getElementById('btn-compare-preset-ursen'),
    btnComparePresetSupport: document.getElementById('btn-compare-preset-support')
  };

  // Load persistent state (with invalid / collision ID purge)
  function loadPersistedState() {
    try {
      const allChars = window.GIRLWARS_DATA || [];
      const validIdSet = new Set(allChars.map(c => c.id));
      const charMap = new Map(allChars.map(c => [c.id, c]));

      const favRaw = localStorage.getItem(STORAGE_KEYS.FAVORITES);
      if (favRaw) {
        const rawList = JSON.parse(favRaw);
        if (Array.isArray(rawList)) {
          state.favorites = new Set(rawList.filter(id => validIdSet.has(id)));
        }
      }
      const partyRaw = localStorage.getItem(STORAGE_KEYS.PARTY);
      if (partyRaw) {
        const parsed = JSON.parse(partyRaw);
        if (Array.isArray(parsed) && parsed.length === 12) {
          state.party = parsed.map(item => {
            const id = (typeof item === 'object' && item !== null) ? item.id : item;
            return (id && charMap.has(id)) ? charMap.get(id) : null;
          });
        }
      }
      const savedView = localStorage.getItem(STORAGE_KEYS.VIEW_MODE);
      if (savedView && ['card', 'table', 'gallery'].includes(savedView)) {
        state.viewMode = savedView;
      }
      const compareRaw = localStorage.getItem(STORAGE_KEYS.COMPARE);
      if (compareRaw) {
        const parsedComp = JSON.parse(compareRaw);
        if (Array.isArray(parsedComp)) {
          state.compareList = parsedComp.filter(id => validIdSet.has(id)).slice(0, 4);
        }
      }
      const savedPartiesRaw = localStorage.getItem(STORAGE_KEYS.SAVED_PARTIES);
      if (savedPartiesRaw) {
        const parsedParties = JSON.parse(savedPartiesRaw);
        if (typeof parsedParties === 'object' && parsedParties !== null) {
          state.savedParties = parsedParties;
        }
      }

      // Check URL search parameters for shared party (?party=id1,id2,...)
      checkUrlPartyParam(charMap);

      // Re-save cleaned state so invalid IDs are wiped from storage
      savePersistedState();
    } catch (e) {
      console.warn('Could not read from localStorage:', e);
    }
  }

  function checkUrlPartyParam(charMap) {
    try {
      const params = new URLSearchParams(window.location.search);
      const partyParam = params.get('party');
      if (!partyParam) return;

      const ids = partyParam.split(',');
      const newParty = new Array(12).fill(null);
      let loadedCount = 0;

      for (let i = 0; i < Math.min(ids.length, 12); i++) {
        const id = ids[i].trim();
        if (id && charMap.has(id)) {
          newParty[i] = charMap.get(id);
          loadedCount++;
        }
      }

      if (loadedCount > 0) {
        state.party = newParty;
        setTimeout(() => {
          alert(`🔗 共有リンクから ${loadedCount} 体の部隊編成を読み込みました！`);
        }, 300);
      }
    } catch (e) {
      console.warn('Could not parse party URL param:', e);
    }
  }

  // Format freshness badge based on updated date
  function formatFreshnessBadge(updatedAt, inlineStyle = '') {
    const styleAttr = inlineStyle ? ` style="${inlineStyle}"` : '';
    if (!updatedAt) {
      return `<span class="badge-freshness badge-outdated"${styleAttr}>未確認</span>`;
    }
    const d = new Date(updatedAt);
    if (isNaN(d.getTime())) {
      return `<span class="badge-freshness badge-outdated"${styleAttr}>${escapeHtml(updatedAt)}</span>`;
    }
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const now = new Date();
    const diffMonths = (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m);

    if (diffMonths <= 6 && diffMonths >= 0) {
      return `<span class="badge-freshness badge-fresh"${styleAttr}>🟢 最新</span>`;
    } else if (y >= 2025) {
      const mm = m < 10 ? '0' + m : m;
      return `<span class="badge-freshness badge-recent"${styleAttr}>🔵 ${y}.${mm}</span>`;
    } else {
      return `<span class="badge-freshness badge-outdated"${styleAttr}>⚠️ '${String(y).slice(-2)}情報</span>`;
    }
  }

  function savePersistedState() {
    try {
      localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify([...state.favorites]));
      localStorage.setItem(STORAGE_KEYS.PARTY, JSON.stringify(state.party.map(c => c ? c.id : null)));
      localStorage.setItem(STORAGE_KEYS.VIEW_MODE, state.viewMode);
      localStorage.setItem(STORAGE_KEYS.COMPARE, JSON.stringify(state.compareList));
      localStorage.setItem(STORAGE_KEYS.SAVED_PARTIES, JSON.stringify(state.savedParties));
    } catch (e) {
      console.warn('Could not save to localStorage:', e);
    }
  }

  // Initialize
  function init() {
    loadPersistedState();
    setupMetaBadge();
    setupTagFilterUI();
    setupSavedPartiesUI();
    setupDiffSimulatorUI();
    setupEventListeners();
    updateViewModeUI();
    renderCatalog();
    renderPartyView();
    renderTierView();
    updateCompareBadge();
  }

  function setupMetaBadge() {
    const meta = window.GIRLWARS_METADATA || {};
    const count = meta.totalCount || (window.GIRLWARS_DATA || []).length;
    if (el.metaBadge) {
      el.metaBadge.textContent = `全 ${count} 体収録 (スキル全文: ${meta.withSkillsCount || 72}体 / 状態別ギャラリー: ${meta.withVariantsCount || 22}体)`;
    }
    if (el.totalCharCount) {
      el.totalCharCount.textContent = count;
    }
    updatePartyBadge();
    updateCompareBadge();
  }

  function updatePartyBadge() {
    const assignedCount = state.party.filter(Boolean).length;
    if (el.partyCountBadge) {
      el.partyCountBadge.textContent = `${assignedCount}/12`;
    }
  }

  function updateViewModeUI() {
    if (el.viewSwitcher) {
      el.viewSwitcher.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === state.viewMode);
      });
    }

    if (state.viewMode === 'table') {
      el.cardsContainer.style.display = 'none';
      el.tableContainer.style.display = 'block';
    } else {
      el.cardsContainer.style.display = 'grid';
      el.tableContainer.style.display = 'none';
      el.cardsContainer.classList.toggle('view-gallery', state.viewMode === 'gallery');
    }
  }

  function setupEventListeners() {
    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tab = btn.dataset.tab;
        state.activeTab = tab;

        el.tabCatalog.classList.toggle('active', tab === 'catalog');
        if (el.tabParty) el.tabParty.classList.toggle('active', tab === 'party');
        if (el.tabCompare) el.tabCompare.classList.toggle('active', tab === 'compare');
        el.tabTier.classList.toggle('active', tab === 'tier');
        el.tabAbout.classList.toggle('active', tab === 'about');

        // Only show controls on catalog tab
        if (el.controlsPanel) {
          el.controlsPanel.style.display = tab === 'catalog' ? 'block' : 'none';
        }

        if (tab === 'compare') {
          renderCompareView();
        }
      });
    });

    // View Mode Switcher
    if (el.viewSwitcher) {
      el.viewSwitcher.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          state.viewMode = btn.dataset.view;
          state.renderedLimit = state.PAGE_SIZE;
          savePersistedState();
          updateViewModeUI();
          renderCatalog();
        });
      });
    }

    // Load More Button
    if (el.btnLoadMore) {
      el.btnLoadMore.addEventListener('click', () => {
        state.renderedLimit += state.PAGE_SIZE;
        renderCatalog();
      });
    }

    // Infinite scroll check
    window.addEventListener('scroll', () => {
      if (state.activeTab !== 'catalog' || state.viewMode === 'table') return;
      if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) {
        const filtered = getFilteredCharacters();
        if (state.renderedLimit < filtered.length) {
          state.renderedLimit += state.PAGE_SIZE;
          renderCardsOnly(filtered);
        }
      }
    }, { passive: true });

    // Table Header Sort clicks
    document.querySelectorAll('.matome-table th.sortable').forEach(th => {
      th.addEventListener('click', () => {
        const sortKey = th.dataset.sort;
        if (sortKey) {
          state.sort = sortKey;
          el.sortSelect.value = sortKey;
          renderCatalog();
        }
      });
    });

    // Tier Subviews
    document.querySelectorAll('.tier-sub-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tier-sub-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const view = btn.dataset.tierView;
        state.tierSubView = view;
        document.getElementById('subview-tier-atwiki').classList.toggle('active', view === 'atwiki');
        document.getElementById('subview-tier-ursen').classList.toggle('active', view === 'ursen');
      });
    });

    // Search input
    el.searchInput.addEventListener('input', e => {
      state.search = e.target.value.trim().toLowerCase();
      state.renderedLimit = state.PAGE_SIZE;
      renderCatalog();
    });

    el.searchClearBtn.addEventListener('click', () => {
      el.searchInput.value = '';
      state.search = '';
      state.renderedLimit = state.PAGE_SIZE;
      renderCatalog();
    });

    // Filter Chips
    setupChipGroup('filter-rarity', 'rarity');
    setupChipGroup('filter-freshness', 'freshness');
    setupChipGroup('filter-fav', 'favFilter');
    setupChipGroup('filter-type', 'type');
    setupChipGroup('filter-system', 'system');

    // Sort select
    el.sortSelect.addEventListener('change', e => {
      state.sort = e.target.value;
      renderCatalog();
    });

    // Reset filters
    el.resetFiltersBtn.addEventListener('click', () => {
      state.search = '';
      el.searchInput.value = '';
      state.rarity = 'all';
      state.freshness = 'all';
      state.favFilter = 'all';
      state.type = 'all';
      state.system = 'all';
      state.sort = 'rarity-desc';
      el.sortSelect.value = 'rarity-desc';
      state.renderedLimit = state.PAGE_SIZE;

      state.selectedTags.clear();
      if (el.filterTags) {
        el.filterTags.querySelectorAll('.tag-chip').forEach(c => c.classList.remove('active'));
      }

      document.querySelectorAll('.filter-chips').forEach(group => {
        group.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        const allChip = group.querySelector('[data-val="all"]');
        if (allChip) allChip.classList.add('active');
      });

      renderCatalog();
    });

    // Party action buttons
    if (el.btnSharePartyUrl) {
      el.btnSharePartyUrl.addEventListener('click', sharePartyUrl);
    }
    if (el.btnExportParty) {
      el.btnExportParty.addEventListener('click', exportPartyToClipboard);
    }
    if (el.btnImportParty) {
      el.btnImportParty.addEventListener('click', importPartyFromPrompt);
    }
    if (el.btnClearParty) {
      el.btnClearParty.addEventListener('click', () => {
        if (confirm('編成中の部隊をすべてクリアしますか？')) {
          state.party = new Array(12).fill(null);
          savePersistedState();
          updatePartyBadge();
          renderPartyView();
          updateDiffSimulator();
        }
      });
    }

    // Compare action buttons
    if (el.btnClearCompare) {
      el.btnClearCompare.addEventListener('click', () => {
        state.compareList = [];
        savePersistedState();
        updateCompareBadge();
        renderCompareView();
        renderCatalog();
      });
    }
    if (el.btnComparePresetUrsen) {
      el.btnComparePresetUrsen.addEventListener('click', applyPresetUrsen);
    }
    if (el.btnComparePresetSupport) {
      el.btnComparePresetSupport.addEventListener('click', applyPresetSupport);
    }

    // Modal close
    el.modalCloseBtn.addEventListener('click', closeModal);
    el.charModal.addEventListener('click', e => {
      if (e.target === el.charModal) closeModal();
    });

    window.addEventListener('keydown', e => {
      if (e.key === 'Escape' && el.charModal.style.display !== 'none') {
        closeModal();
      }
    });
  }

  function setupTagFilterUI() {
    if (!el.filterTags) return;
    const meta = window.GIRLWARS_METADATA || {};
    const tagsMaster = meta.tagsMaster || [];
    el.filterTags.innerHTML = '';

    tagsMaster.forEach(tag => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = `tag-chip ${state.selectedTags.has(tag.id) ? 'active' : ''}`;
      chip.dataset.tagId = tag.id;
      chip.title = `${tag.name}: ${tag.desc}`;
      chip.innerHTML = `${tag.icon} ${escapeHtml(tag.name)}`;

      chip.addEventListener('click', () => {
        if (state.selectedTags.has(tag.id)) {
          state.selectedTags.delete(tag.id);
          chip.classList.remove('active');
        } else {
          state.selectedTags.add(tag.id);
          chip.classList.add('active');
        }
        state.renderedLimit = state.PAGE_SIZE;
        renderCatalog();
      });

      el.filterTags.appendChild(chip);
    });

    if (el.clearTagsBtn) {
      el.clearTagsBtn.addEventListener('click', () => {
        state.selectedTags.clear();
        el.filterTags.querySelectorAll('.tag-chip').forEach(c => c.classList.remove('active'));
        state.renderedLimit = state.PAGE_SIZE;
        renderCatalog();
      });
    }
  }

  function setupChipGroup(groupId, stateKey) {
    const group = document.getElementById(groupId);
    if (!group) return;
    group.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', () => {
        group.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        state[stateKey] = chip.dataset.val;
        state.renderedLimit = state.PAGE_SIZE;
        renderCatalog();
      });
    });
  }

  // Filter & Sort Logic
  function getFilteredCharacters() {
    const rawList = window.GIRLWARS_DATA || [];

    return rawList.filter(c => {
      // Search query (name, ruby, cv)
      if (state.search) {
        const q = state.search;
        const nameMatch = c.name && c.name.toLowerCase().includes(q);
        const rubyMatch = c.ruby && c.ruby.toLowerCase().includes(q);
        const cvMatch = c.cv && c.cv.toLowerCase().includes(q);
        const roleMatch = c.role && c.role.toLowerCase().includes(q);
        if (!nameMatch && !rubyMatch && !cvMatch && !roleMatch) {
          return false;
        }
      }

      // Rarity
      if (state.rarity !== 'all') {
        if (c.rarity !== state.rarity) return false;
      }

      // Type
      if (state.type !== 'all') {
        if (c.type !== state.type) return false;
      }

      // System
      if (state.system !== 'all') {
        if (c.system !== state.system) return false;
      }

      // Freshness
      if (state.freshness === 'latest') {
        if (c.sourceInfo && c.sourceInfo.isOutdated) return false;
      } else if (state.freshness === 'outdated') {
        if (!c.sourceInfo || !c.sourceInfo.isOutdated) return false;
      }

      // Favorite filter
      if (state.favFilter === 'fav') {
        if (!state.favorites.has(c.id)) return false;
      }

      // Tag filter (AND query: must have all selected tags)
      if (state.selectedTags.size > 0) {
        const charTagIds = new Set((c.tags || []).map(t => t.id));
        for (const reqTag of state.selectedTags) {
          if (!charTagIds.has(reqTag)) return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (state.sort === 'ruby-asc') {
        const ra = a.ruby || a.name || '';
        const rb = b.ruby || b.name || '';
        return ra.localeCompare(rb, 'ja');
      } else if (state.sort === 'date-desc') {
        const da = (a.sourceInfo && a.sourceInfo.updatedAt) || '2020-01-01';
        const db = (b.sourceInfo && b.sourceInfo.updatedAt) || '2020-01-01';
        return db.localeCompare(da);
      } else {
        // rarity-desc
        const rOrder = { 'UR閃': 1, 'UR': 2, 'SSR': 3, '花嫁': 4, 'SR': 5 };
        const roA = rOrder[a.rarity] || 99;
        const roB = rOrder[b.rarity] || 99;
        if (roA !== roB) return roA - roB;
        const ra = a.ruby || a.name || '';
        const rb = b.ruby || b.name || '';
        return ra.localeCompare(rb, 'ja');
      }
    });
  }

  // Master Render Coordinator
  function renderCatalog() {
    const list = getFilteredCharacters();
    el.filteredCount.textContent = list.length;

    if (state.viewMode === 'table') {
      renderTableOnly(list);
    } else {
      renderCardsOnly(list);
    }
  }

  // Render Table View (まとめ表)
  function renderTableOnly(list) {
    el.tableBody.innerHTML = '';
    el.loadMoreContainer.style.display = 'none';

    if (list.length === 0) {
      el.tableBody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align: center; padding: 40px; color: var(--text-muted);">
            該当するキャラクターが見つかりませんでした。
          </td>
        </tr>
      `;
      return;
    }

    const fragment = document.createDocumentFragment();

    list.forEach(c => {
      const tr = document.createElement('tr');

      // Rarity class
      let rClass = 'badge-ssr';
      if (c.rarity === 'UR閃') rClass = 'badge-ur-sen';
      else if (c.rarity === 'UR') rClass = 'badge-ur';
      else if (c.rarity === '花嫁') rClass = 'badge-bride';

      // Type class
      let tClass = 'tag-power';
      if (c.type === '智') tClass = 'tag-wisdom';
      else if (c.type === '猛') tClass = 'tag-brave';

      // System tag
      let sysHtml = '-';
      if (c.system) {
        const sysClass = {
          '風': 'tag-sys-wind',
          '花': 'tag-sys-flower',
          '雪': 'tag-sys-snow',
          '月': 'tag-sys-moon'
        }[c.system] || '';
        sysHtml = `<span class="badge-tag ${sysClass}">${c.system}</span>`;
      }

      // Freshness
      const freshHtml = formatFreshnessBadge(c.sourceInfo && c.sourceInfo.updatedAt, 'position:static;');

      // Skill status
      const hasSkills = Boolean(c.skills && (
        (c.skills.normal && c.skills.normal.text && c.skills.normal.text.trim()) ||
        (c.skills.passive && c.skills.passive.text && c.skills.passive.text.trim()) ||
        (c.skills.ultimate && c.skills.ultimate.text && c.skills.ultimate.text.trim())
      ));
      const skillBadge = hasSkills
        ? `<span style="color:#10b981; font-weight:bold; font-size:0.75rem;">✔ 全文あり</span>`
        : `<span style="color:#64748b; font-size:0.75rem;">- 未記載</span>`;

      const roleSnippet = (c.evaluation && c.evaluation.summary) || c.role || '-';
      const isFav = state.favorites.has(c.id);
      const isComp = state.compareList.includes(c.id);

      tr.innerHTML = `
        <td>
          ${c.illustUrl ? `<img class="table-char-thumb" src="${escapeHtml(c.illustUrl)}" alt="${escapeHtml(c.name)}" loading="lazy" onerror="this.onerror=null; this.outerHTML='<div class=\\'table-char-thumb\\' style=\\'display:flex;align-items:center;justify-content:center;color:#64748b;font-size:0.9rem;\\'>⚔️</div>';">` : `<div class="table-char-thumb" style="display:flex;align-items:center;justify-content:center;color:#64748b;">⚔️</div>`}
        </td>
        <td>
          <div class="table-char-name-col">
            ${c.ruby ? `<span class="table-char-ruby">${escapeHtml(c.ruby)}</span>` : ''}
            <span class="table-char-name">${escapeHtml(c.name)}</span>
          </div>
        </td>
        <td><span class="badge-rarity ${rClass}" style="font-size:0.75rem; padding:2px 6px;">${escapeHtml(c.rarity)}</span></td>
        <td>${c.type ? `<span class="badge-tag ${tClass}">${escapeHtml(c.type)}将</span>` : '<span style="color:var(--text-muted);">-</span>'}</td>
        <td>${sysHtml}</td>
        <td><div class="table-role-snippet">${escapeHtml(roleSnippet)}</div></td>
        <td>${skillBadge}</td>
        <td>${freshHtml}</td>
        <td onclick="event.stopPropagation();">
          <div style="display:flex; gap:4px; justify-content:center;">
            <button class="btn-card-quick btn-card-compare ${isComp ? 'active' : ''}" data-char-id="${escapeHtml(c.id)}" style="padding:2px 6px;" title="比較に追加/解除">
              ⚖️
            </button>
            <button class="btn-card-quick btn-card-fav ${isFav ? 'active' : ''}" data-char-id="${escapeHtml(c.id)}" style="padding:2px 6px;" title="お気に入り">
              ${isFav ? '★' : '☆'}
            </button>
          </div>
        </td>
      `;

      tr.addEventListener('click', () => openModal(c));

      const favBtn = tr.querySelector('.btn-card-fav');
      if (favBtn) {
        favBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          toggleFavorite(c.id, favBtn);
        });
      }

      const compBtn = tr.querySelector('.btn-card-compare');
      if (compBtn) {
        compBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          toggleCompare(c.id, compBtn);
        });
      }

      fragment.appendChild(tr);
    });

    el.tableBody.appendChild(fragment);
  }

  // Render Card Gallery with Smooth Virtual Pagination
  function renderCardsOnly(list) {
    el.cardsContainer.innerHTML = '';

    if (list.length === 0) {
      el.cardsContainer.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: var(--text-muted);">
          <div style="font-size: 2.5rem; margin-bottom: 12px;">🔍</div>
          <p>該当するキャラクターが見つかりませんでした。</p>
          <button id="btn-empty-reset" class="btn-text" style="margin-top: 8px;">検索条件をリセットする</button>
        </div>
      `;
      const resetBtn = document.getElementById('btn-empty-reset');
      if (resetBtn) {
        resetBtn.addEventListener('click', () => el.resetFiltersBtn.click());
      }
      el.loadMoreContainer.style.display = 'none';
      return;
    }

    // Slice to smooth render limit
    const toRender = list.slice(0, state.renderedLimit);
    const fragment = document.createDocumentFragment();

    toRender.forEach(c => {
      const card = document.createElement('div');
      card.className = 'char-card';
      card.setAttribute('tabindex', '0');

      // Rarity class
      let rClass = 'badge-ssr';
      if (c.rarity === 'UR閃') rClass = 'badge-ur-sen';
      else if (c.rarity === 'UR') rClass = 'badge-ur';
      else if (c.rarity === '花嫁') rClass = 'badge-bride';

      // Type class
      let tClass = 'tag-power';
      if (c.type === '智') tClass = 'tag-wisdom';
      else if (c.type === '猛') tClass = 'tag-brave';

      // System class
      let sysHtml = '';
      if (c.system) {
        const sysClass = {
          '風': 'tag-sys-wind',
          '花': 'tag-sys-flower',
          '雪': 'tag-sys-snow',
          '月': 'tag-sys-moon'
        }[c.system] || '';
        sysHtml = `<span class="badge-tag ${sysClass}">${c.system}</span>`;
      }

      // Freshness
      const freshBadgeHtml = formatFreshnessBadge(c.sourceInfo && c.sourceInfo.updatedAt);

      // Tier tag
      let tierHtml = '';
      if (c.evaluation && c.evaluation.tierRank) {
        tierHtml = `<span class="badge-tier-tag">${escapeHtml(c.evaluation.tierRank)}</span>`;
      }

      // Flags (multi-source, outdated2024)
      let flagHtml = '';
      if (c.evaluation && c.evaluation.flags) {
        if (c.evaluation.flags.hasMultiSources) {
          flagHtml = `<span class="badge-tag" style="background: rgba(14, 165, 233, 0.2); border-color: #0ea5e9; color: #38bdf8; font-size: 0.68rem;" title="複数ソースで評価記載あり">🔀 複数評価</span>`;
        } else if (c.evaluation.flags.onlyOutdated2024) {
          flagHtml = `<span class="badge-tag" style="background: rgba(245, 158, 11, 0.15); border-color: #f59e0b; color: #fbbf24; font-size: 0.68rem;" title="2024年wikiのみで評価記載あり">⚠️ '24評価のみ</span>`;
        }
      }

      // Favorite & Compare state
      const isFav = state.favorites.has(c.id);
      const isComp = state.compareList.includes(c.id);

      // Visual / Illustration
      let visualHtml = '';
      if (c.illustUrl) {
        const variantCountBadge = (c.images && c.images.length > 1)
          ? `<span class="badge-variant-count" title="状態別イラスト ${c.images.length}枚">📷 ${c.images.length}枚</span>`
          : '';
        visualHtml = `
          <div class="card-visual">
            <div class="card-badges-top">
              <span class="badge-rarity ${rClass}">${escapeHtml(c.rarity)}</span>
              ${variantCountBadge}
            </div>
            ${freshBadgeHtml}
            <img class="card-img" src="${escapeHtml(c.illustUrl)}" alt="${escapeHtml(c.name)}" loading="lazy" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'card-placeholder\\'><span>⚔️</span><span>イラスト準備中</span></div>';">
            <div class="card-actions-quick" onclick="event.stopPropagation();">
              <button class="btn-card-quick btn-card-compare ${isComp ? 'active' : ''}" data-char-id="${escapeHtml(c.id)}" title="比較枠に追加/解除">
                ⚖️
              </button>
              <button class="btn-card-quick btn-card-fav ${isFav ? 'active' : ''}" data-char-id="${escapeHtml(c.id)}" title="お気に入り登録">
                ${isFav ? '★' : '☆'}
              </button>
              <button class="btn-card-quick btn-card-add-party" data-char-id="${escapeHtml(c.id)}" title="部隊に編成">
                ＋編成
              </button>
            </div>
          </div>
        `;
      } else {
        visualHtml = `
          <div class="card-visual">
            <div class="card-badges-top">
              <span class="badge-rarity ${rClass}">${escapeHtml(c.rarity)}</span>
            </div>
            ${freshBadgeHtml}
            <div class="card-placeholder">
              <span style="font-size: 1.8rem;">👘</span>
              <span>イラスト準備中</span>
            </div>
            <div class="card-actions-quick" onclick="event.stopPropagation();">
              <button class="btn-card-quick btn-card-compare ${isComp ? 'active' : ''}" data-char-id="${escapeHtml(c.id)}" title="比較枠に追加/解除">
                ⚖️
              </button>
              <button class="btn-card-quick btn-card-fav ${isFav ? 'active' : ''}" data-char-id="${escapeHtml(c.id)}" title="お気に入り登録">
                ${isFav ? '★' : '☆'}
              </button>
              <button class="btn-card-quick btn-card-add-party" data-char-id="${escapeHtml(c.id)}" title="部隊に編成">
                ＋編成
              </button>
            </div>
          </div>
        `;
      }

      const roleSnippet = (c.evaluation && c.evaluation.summary) || c.role || (c.cv ? `CV: ${c.cv}` : '');

      // Tags row
      let tagsRowHtml = '';
      if (c.tags && c.tags.length > 0) {
        const displayTags = c.tags.slice(0, 4);
        const remainingCount = c.tags.length - 4;
        tagsRowHtml = `
          <div class="card-tags-row" style="display: flex; flex-wrap: wrap; gap: 4px; margin: 6px 0;">
            ${displayTags.map(t => {
              const isSkill = t.fromSkill;
              const chipCls = isSkill ? 'tag-chip-skill' : 'tag-chip-eval';
              const titleText = isSkill ? 'スキル本文より抽出' : '評価サマリーより抽出';
              return `<span class="tag-chip ${chipCls}" style="font-size: 0.68rem; padding: 1px 6px;" title="${titleText}">${t.icon || '🏷️'} ${escapeHtml(t.name)}</span>`;
            }).join('')}
            ${remainingCount > 0 ? `<span style="font-size: 0.68rem; color: var(--text-muted); align-self: center;">+${remainingCount}</span>` : ''}
          </div>
        `;
      }

      card.innerHTML = `
        ${visualHtml}
        <div class="card-body">
          <div class="card-meta-row">
            ${c.type ? `<span class="badge-tag ${tClass}">${escapeHtml(c.type)}将</span>` : ''}
            ${sysHtml}
            ${tierHtml}
            ${flagHtml}
          </div>
          <div class="card-name-group">
            ${c.ruby ? `<span class="card-ruby">${escapeHtml(c.ruby)}</span>` : ''}
            <div class="card-name">${escapeHtml(c.name)}</div>
          </div>
          ${tagsRowHtml}
          ${roleSnippet ? `<div class="card-role-snippet">${escapeHtml(roleSnippet)}</div>` : ''}
          <div class="card-footer">
            <span>${escapeHtml(c.sourceInfo ? c.sourceInfo.sourceName : '出典明記')}</span>
            <span>${escapeHtml(c.sourceInfo ? c.sourceInfo.updatedAt : '')}</span>
          </div>
        </div>
      `;

      card.addEventListener('click', () => openModal(c));
      card.addEventListener('keydown', e => {
        if (e.key === 'Enter') openModal(c);
      });

      const compBtn = card.querySelector('.btn-card-compare');
      if (compBtn) {
        compBtn.addEventListener('click', e => {
          e.stopPropagation();
          toggleCompare(c.id, compBtn);
        });
      }

      const favBtn = card.querySelector('.btn-card-fav');
      if (favBtn) {
        favBtn.addEventListener('click', e => {
          e.stopPropagation();
          toggleFavorite(c.id, favBtn);
        });
      }

      const addPartyBtn = card.querySelector('.btn-card-add-party');
      if (addPartyBtn) {
        addPartyBtn.addEventListener('click', e => {
          e.stopPropagation();
          addCharacterToParty(c);
        });
      }

      fragment.appendChild(card);
    });

    el.cardsContainer.appendChild(fragment);

    // Show/hide Load More
    if (state.renderedLimit < list.length) {
      el.loadMoreContainer.style.display = 'flex';
      el.remainingCount.textContent = list.length - state.renderedLimit;
    } else {
      el.loadMoreContainer.style.display = 'none';
    }
  }

  // Favorite toggle
  function toggleFavorite(charId, btnEl) {
    if (state.favorites.has(charId)) {
      state.favorites.delete(charId);
      if (btnEl) {
        btnEl.classList.remove('active');
        btnEl.textContent = '☆';
      }
    } else {
      state.favorites.add(charId);
      if (btnEl) {
        btnEl.classList.add('active');
        btnEl.textContent = '★';
      }
    }
    savePersistedState();
    if (state.favFilter === 'fav') {
      renderCatalog();
    }
  }

  // Compare Logic
  function toggleCompare(charId, btnEl) {
    const idx = state.compareList.indexOf(charId);
    if (idx !== -1) {
      state.compareList.splice(idx, 1);
      if (btnEl) btnEl.classList.remove('active');
    } else {
      if (state.compareList.length >= 4) {
        alert('比較できるのは最大4体までです。比較枠から不要なキャラを外してください。');
        return;
      }
      state.compareList.push(charId);
      if (btnEl) btnEl.classList.add('active');
    }
    savePersistedState();
    updateCompareBadge();
    if (state.activeTab === 'compare') {
      renderCompareView();
    }
    // Update active state in catalog buttons if visible
    document.querySelectorAll(`.btn-card-compare[data-char-id="${charId}"]`).forEach(btn => {
      btn.classList.toggle('active', state.compareList.includes(charId));
    });
  }

  function updateCompareBadge() {
    if (el.compareCountBadge) {
      el.compareCountBadge.textContent = `${state.compareList.length}/4`;
    }
  }

  function applyPresetUrsen() {
    state.compareList = ['rimuru_ursen_芦屋道満', 'rimuru_ursen_アストルフォ', 'rimuru_ursen_安倍晴明', 'rimuru_ursen_エカテリーナ'];
    savePersistedState();
    updateCompareBadge();
    renderCompareView();
    renderCatalog();
  }

  function applyPresetSupport() {
    state.compareList = ['rimuru_ur_アキレウス', 'rimuru_ur_アストルフォ', 'rimuru_ur_安倍晴明', 'rimuru_ur_カール大帝'];
    savePersistedState();
    updateCompareBadge();
    renderCompareView();
    renderCatalog();
  }

  function renderCompareView() {
    if (!el.compareContentArea) return;
    updateCompareBadge();

    const allChars = window.GIRLWARS_DATA || [];
    const charMap = new Map(allChars.map(c => [c.id, c]));
    const chars = state.compareList.map(id => charMap.get(id)).filter(Boolean);

    if (chars.length < 2) {
      el.compareContentArea.innerHTML = `
        <div class="compare-empty-state">
          <div style="font-size: 3rem; margin-bottom: 12px;">⚖️</div>
          <h3 style="margin-bottom: 8px;">比較するキャラクターを2〜4体選択してください</h3>
          <p style="color: var(--text-secondary); font-size: 0.9rem; max-width: 540px; margin: 0 auto 20px;">
            現在 <strong>${chars.length}</strong> 体選択中。キャラ一覧カードの「⚖️」ボタンまたはキャラ詳細モーダル内の「比較枠に追加」ボタンを押して追加できます。
          </p>
          <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
            <button id="btn-empty-preset-ursen" class="btn-secondary">UR閃主力アタッカーで試す</button>
            <button id="btn-empty-preset-support" class="btn-secondary">PVPサポーターで試す</button>
          </div>
        </div>
      `;
      const btnEmptyUrsen = document.getElementById('btn-empty-preset-ursen');
      if (btnEmptyUrsen) btnEmptyUrsen.addEventListener('click', applyPresetUrsen);
      const btnEmptySupport = document.getElementById('btn-empty-preset-support');
      if (btnEmptySupport) btnEmptySupport.addEventListener('click', applyPresetSupport);
      return;
    }

    // Determine highest rarity among selected
    const rOrder = { 'UR閃': 5, 'UR': 4, 'SSR': 3, '花嫁': 2, 'SR': 1 };
    const maxRarityVal = Math.max(...chars.map(c => rOrder[c.rarity] || 0));

    // Determine highest evolution count
    const evoCounts = chars.map(c => {
      if (!c.skills || !c.skills.evolution) return 0;
      return (c.skills.evolution.fire || []).length + (c.skills.evolution.ice || []).length;
    });
    const maxEvoCount = Math.max(...evoCounts);

    // Build Compare Matrix Table
    let tableHtml = `
      <div style="overflow-x: auto;">
        <table class="compare-table">
          <thead>
            <tr>
              <th style="min-width: 140px; width: 140px;">比較項目</th>
              ${chars.map(c => `
                <th style="min-width: 220px; text-align: center;">
                  <div style="position: relative; display: flex; flex-direction: column; align-items: center; gap: 6px;">
                    <button class="btn-remove-compare" data-char-id="${escapeHtml(c.id)}" title="比較から外す" style="position: absolute; top: 0; right: 0; background: rgba(225,29,72,0.2); border: 1px solid var(--accent-rose); color: var(--accent-rose); border-radius: 50%; width: 22px; height: 22px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 0.8rem;">×</button>
                    ${c.illustUrl ? `<img src="${escapeHtml(c.illustUrl)}" alt="${escapeHtml(c.name)}" style="width: 72px; height: 72px; border-radius: 50%; object-fit: cover; border: 2px solid var(--border-color);" onerror="this.onerror=null; this.outerHTML='<div style=\\'width:72px;height:72px;border-radius:50%;background:var(--bg-surface-2);display:flex;align-items:center;justify-content:center;font-size:1.8rem;\\'>⚔️</div>';">` : `<div style="width:72px;height:72px;border-radius:50%;background:var(--bg-surface-2);display:flex;align-items:center;justify-content:center;font-size:1.8rem;">⚔️</div>`}
                    <div style="font-weight: 700; font-size: 1rem; color: #fff;">${escapeHtml(c.name)}</div>
                    ${c.ruby ? `<span style="font-size: 0.72rem; color: var(--text-muted);">${escapeHtml(c.ruby)}</span>` : ''}
                  </div>
                </th>
              `).join('')}
            </tr>
          </thead>
          <tbody>
            <!-- Row: Rarity -->
            <tr>
              <td class="compare-col-header">レアリティ</td>
              ${chars.map(c => {
                const isMax = (rOrder[c.rarity] || 0) === maxRarityVal && maxRarityVal > 0;
                let rClass = 'badge-ssr';
                if (c.rarity === 'UR閃') rClass = 'badge-ur-sen';
                else if (c.rarity === 'UR') rClass = 'badge-ur';
                else if (c.rarity === '花嫁') rClass = 'badge-bride';
                return `<td class="${isMax ? 'compare-best-highlight' : ''}" style="text-align: center;">
                  <span class="badge-rarity ${rClass}" style="font-size: 0.82rem; padding: 2px 8px;">${escapeHtml(c.rarity)}</span>
                  ${isMax ? '<div style="font-size: 0.7rem; color: #10b981; font-weight: 700; margin-top: 2px;">★ 最高位</div>' : ''}
                </td>`;
              }).join('')}
            </tr>

            <!-- Row: Type -->
            <tr>
              <td class="compare-col-header">タイプ（武将属性）</td>
              ${chars.map(c => {
                let tClass = 'tag-power';
                if (c.type === '智') tClass = 'tag-wisdom';
                else if (c.type === '猛') tClass = 'tag-brave';
                return `<td style="text-align: center;">${c.type ? `<span class="badge-tag ${tClass}">${escapeHtml(c.type)}将</span>` : '<span style="color:var(--text-muted);">-</span>'}</td>`;
              }).join('')}
            </tr>

            <!-- Row: System -->
            <tr>
              <td class="compare-col-header">属性系統</td>
              ${chars.map(c => {
                if (!c.system) return `<td style="text-align: center; color: var(--text-muted);">- 未設定</td>`;
                const sysClass = { '風': 'tag-sys-wind', '花': 'tag-sys-flower', '雪': 'tag-sys-snow', '月': 'tag-sys-moon' }[c.system] || '';
                return `<td style="text-align: center;"><span class="badge-tag ${sysClass}">${escapeHtml(c.system)}系統</span></td>`;
              }).join('')}
            </tr>

            <!-- Row: Initial Rarity -->
            <tr>
              <td class="compare-col-header">初期レアリティ</td>
              ${chars.map(c => `
                <td style="text-align: center; font-size: 0.85rem;">
                  ${c.initialRarity ? `<span class="meta-badge">${escapeHtml(c.initialRarity)}</span>` : '<span style="color:var(--text-muted);">-</span>'}
                </td>
              `).join('')}
            </tr>

            <!-- Row: Skills Presence -->
            <tr>
              <td class="compare-col-header">スキル本文収録</td>
              ${chars.map(c => {
                const hasSkill = Boolean(c.skills && ((c.skills.normal && c.skills.normal.text) || (c.skills.ultimate && c.skills.ultimate.text)));
                return `<td class="${hasSkill ? 'compare-best-highlight' : ''}" style="text-align: center; font-size: 0.85rem;">
                  ${hasSkill ? '<span style="color:#10b981; font-weight:700;">✔ 全文あり</span>' : '<span style="color:#64748b;">- 未記載</span>'}
                </td>`;
              }).join('')}
            </tr>

            <!-- Row: Skills Highlights -->
            <tr>
              <td class="compare-col-header">スキル・奥義の要点</td>
              ${chars.map(c => {
                let normalDesc = (c.skills && c.skills.normal && c.skills.normal.text) ? c.skills.normal.text.slice(0, 75) + '…' : (c.skills && c.skills.normal && c.skills.normal.name ? c.skills.normal.name : '未取得');
                let ultDesc = (c.skills && c.skills.ultimate && c.skills.ultimate.text) ? c.skills.ultimate.text.slice(0, 75) + '…' : (c.skills && c.skills.ultimate && c.skills.ultimate.name ? c.skills.ultimate.name : '未取得');
                return `<td style="font-size: 0.8rem; line-height: 1.5; vertical-align: top;">
                  <div style="margin-bottom: 6px;"><strong>通常:</strong> ${escapeHtml(normalDesc)}</div>
                  <div><strong>奥義:</strong> ${escapeHtml(ultDesc)}</div>
                </td>`;
              }).join('')}
            </tr>

            <!-- Row: Evolution -->
            <tr>
              <td class="compare-col-header">超進化（火炎/氷魂）</td>
              ${chars.map((c, idx) => {
                const count = evoCounts[idx];
                const isMax = count === maxEvoCount && maxEvoCount > 0;
                let evoText = '-';
                if (c.skills && c.skills.evolution) {
                  const items = [...(c.skills.evolution.fire || []), ...(c.skills.evolution.ice || [])];
                  if (items.length > 0) {
                    evoText = `${items.length} 段階収録`;
                  }
                }
                return `<td class="${isMax ? 'compare-best-highlight' : ''}" style="text-align: center; font-size: 0.85rem;">
                  ${evoText !== '-' ? `<span style="color:#fbbf24; font-weight:700;">🔥❄️ ${evoText}</span>` : '<span style="color:var(--text-muted);">未実装/未取得</span>'}
                </td>`;
              }).join('')}
            </tr>

            <!-- Row: Effect Tags -->
            <tr>
              <td class="compare-col-header">効果タグ</td>
              ${chars.map(c => {
                if (!c.tags || c.tags.length === 0) {
                  return `<td style="text-align: center; color: var(--text-muted); font-size: 0.8rem;">タグなし</td>`;
                }
                return `<td style="vertical-align: top;">
                  <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                    ${c.tags.map(t => {
                      const isSkill = t.fromSkill;
                      const chipCls = isSkill ? 'tag-chip-skill' : 'tag-chip-eval';
                      return `<span class="tag-chip ${chipCls}" style="font-size: 0.7rem; padding: 2px 6px;">${t.icon || '🏷️'} ${escapeHtml(t.name)}</span>`;
                    }).join('')}
                  </div>
                </td>`;
              }).join('')}
            </tr>

            <!-- Row: Evaluation Summary -->
            <tr>
              <td class="compare-col-header">評価サマリー</td>
              ${chars.map(c => {
                const summary = (c.evaluation && c.evaluation.summary) || '未取得';
                const tier = (c.evaluation && c.evaluation.tierRank) ? `<div style="font-weight:700; color:#fbbf24; margin-bottom:4px;">Tier: ${escapeHtml(c.evaluation.tierRank)}</div>` : '';
                return `<td style="font-size: 0.82rem; line-height: 1.5; vertical-align: top;">
                  ${tier}
                  <div style="white-space: pre-wrap;">${escapeHtml(summary)}</div>
                </td>`;
              }).join('')}
            </tr>

            <!-- Row: Sources & Freshness -->
            <tr>
              <td class="compare-col-header">出典と鮮度</td>
              ${chars.map(c => {
                const fresh = formatFreshnessBadge(c.sourceInfo && c.sourceInfo.updatedAt, 'position:static;');
                const srcName = (c.sourceInfo && c.sourceInfo.sourceName) || '出典明記';
                const srcUrl = c.sourceInfo && c.sourceInfo.primaryUrl;
                return `<td style="text-align: center; font-size: 0.78rem;">
                  <div style="margin-bottom: 4px;">${fresh}</div>
                  <div>${srcUrl ? `<a href="${escapeHtml(srcUrl)}" target="_blank" rel="noopener" style="color:var(--accent-cyan);">${escapeHtml(srcName)} ↗</a>` : escapeHtml(srcName)}</div>
                </td>`;
              }).join('')}
            </tr>
          </tbody>
        </table>
      </div>
    `;

    el.compareContentArea.innerHTML = tableHtml;

    // Remove buttons in compare table
    el.compareContentArea.querySelectorAll('.btn-remove-compare').forEach(btn => {
      btn.addEventListener('click', () => {
        const charId = btn.dataset.charId;
        if (charId) {
          toggleCompare(charId);
        }
      });
    });
  }

  // Party Management Logic
  function addCharacterToParty(c) {
    const existingIndex = state.party.findIndex(item => item && item.id === c.id);
    if (existingIndex !== -1) {
      alert(`「${c.name}」は既にスロット ${existingIndex + 1} に編成されています。`);
      return;
    }

    const emptyIndex = state.party.findIndex(item => item === null);
    if (emptyIndex === -1) {
      alert('部隊枠（12枠）が満員です。不要なキャラを外してから追加してください。');
      return;
    }

    state.party[emptyIndex] = c;
    savePersistedState();
    updatePartyBadge();
    renderPartyView();
    updateDiffSimulator();
    alert(`「${c.name}」を部隊スロット ${emptyIndex + 1} に追加しました！`);
  }

  function removeCharacterFromParty(slotIndex) {
    state.party[slotIndex] = null;
    savePersistedState();
    updatePartyBadge();
    renderPartyView();
    updateDiffSimulator();
  }

  function renderPartyView() {
    for (let i = 0; i < 12; i++) {
      const targetSlot = document.getElementById(`slot-${i}`);
      const parentSlot = targetSlot ? targetSlot.parentElement : null;
      if (!targetSlot) continue;

      const c = state.party[i];
      if (c) {
        if (parentSlot) parentSlot.classList.remove('empty');
        let tClass = 'tag-power';
        if (c.type === '智') tClass = 'tag-wisdom';
        else if (c.type === '猛') tClass = 'tag-brave';

        targetSlot.innerHTML = `
          ${c.illustUrl ? `<img class="slot-char-avatar" src="${escapeHtml(c.illustUrl)}" alt="${escapeHtml(c.name)}" onerror="this.onerror=null; this.outerHTML='<div class=\\'slot-char-avatar\\' style=\\'display:flex;align-items:center;justify-content:center;color:#64748b;\\'>⚔️</div>';">` : `<div class="slot-char-avatar" style="display:flex;align-items:center;justify-content:center;color:#64748b;">⚔️</div>`}
          <div class="slot-char-info">
            <div style="display:flex; gap: 4px; align-items: center;">
              <span class="badge-rarity badge-${c.rarity === 'UR閃' ? 'ur-sen' : c.rarity.toLowerCase()}" style="font-size: 0.65rem; padding: 1px 5px;">${escapeHtml(c.rarity)}</span>
              <span class="badge-tag ${tClass}" style="font-size: 0.65rem; padding: 0 4px;">${escapeHtml(c.type)}</span>
              ${c.system ? `<span class="badge-tag tag-sys-${c.system === '風' ? 'wind' : c.system === '花' ? 'flower' : c.system === '雪' ? 'snow' : 'moon'}" style="font-size: 0.65rem; padding: 0 4px;">${escapeHtml(c.system)}</span>` : ''}
            </div>
            <div class="slot-char-name">${escapeHtml(c.name)}</div>
          </div>
          <button class="slot-remove-btn" data-slot="${i}" title="部隊から外す">×</button>
        `;

        const rmBtn = targetSlot.querySelector('.slot-remove-btn');
        if (rmBtn) {
          rmBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeCharacterFromParty(i);
          });
        }
      } else {
        if (parentSlot) parentSlot.classList.add('empty');
        targetSlot.innerHTML = `<span style="color: var(--text-muted); font-size: 0.8rem;">＋ 空きスロット</span>`;
      }
    }

    updateSynergyMeters();
  }

  function updateSynergyMeters() {
    const frontline = state.party.slice(0, 6).filter(Boolean);

    let power = 0, wisdom = 0, brave = 0;
    let wind = 0, flower = 0, snow = 0, moon = 0;

    frontline.forEach(c => {
      if (c.type === '力') power++;
      else if (c.type === '智') wisdom++;
      else if (c.type === '猛') brave++;

      if (c.system === '風') wind++;
      else if (c.system === '花') flower++;
      else if (c.system === '雪') snow++;
      else if (c.system === '月') moon++;
    });

    if (el.synergyPowerCount) el.synergyPowerCount.textContent = power;
    if (el.synergyWisdomCount) el.synergyWisdomCount.textContent = wisdom;
    if (el.synergyBraveCount) el.synergyBraveCount.textContent = brave;

    if (el.synergyWindCount) el.synergyWindCount.textContent = wind;
    if (el.synergyFlowerCount) el.synergyFlowerCount.textContent = flower;
    if (el.synergySnowCount) el.synergySnowCount.textContent = snow;
    if (el.synergyMoonCount) el.synergyMoonCount.textContent = moon;
  }

  function sharePartyUrl() {
    const ids = state.party.map(c => c ? c.id : '').join(',');
    const url = `${window.location.origin}${window.location.pathname}?party=${encodeURIComponent(ids)}`;
    navigator.clipboard.writeText(url).then(() => {
      alert('🔗 部隊編成の共有URLをクリップボードにコピーしました！\nブラウザで開くとこの編成がそのまま再現されます。');
    }).catch(() => {
      prompt('以下の共有URLをコピーしてください:', url);
    });
  }

  function setupSavedPartiesUI() {
    renderSavedPartiesDropdown();

    if (el.btnSaveCurrentParty) {
      el.btnSaveCurrentParty.addEventListener('click', () => {
        const name = (el.inputPartyName.value || '').trim();
        if (!name) {
          alert('編成名を入力してください（例: メイン風速攻）。');
          return;
        }
        state.savedParties[name] = state.party.map(c => c ? c.id : null);
        savePersistedState();
        renderSavedPartiesDropdown();
        el.inputPartyName.value = '';
        alert(`編成「${name}」を保存しました！`);
      });
    }

    if (el.btnLoadSavedParty) {
      el.btnLoadSavedParty.addEventListener('click', () => {
        const name = el.selectSavedParties.value;
        if (!name || !state.savedParties[name]) {
          alert('読み込む編成を選択してください。');
          return;
        }
        const ids = state.savedParties[name];
        const allChars = window.GIRLWARS_DATA || [];
        const charMap = new Map(allChars.map(c => [c.id, c]));
        state.party = ids.map(id => (id && charMap.has(id)) ? charMap.get(id) : null);
        savePersistedState();
        updatePartyBadge();
        renderPartyView();
        updateDiffSimulator();
        alert(`編成「${name}」を読み込みました！`);
      });
    }

    if (el.btnDeleteSavedParty) {
      el.btnDeleteSavedParty.addEventListener('click', () => {
        const name = el.selectSavedParties.value;
        if (!name || !state.savedParties[name]) {
          alert('削除する編成を選択してください。');
          return;
        }
        if (confirm(`保存済み編成「${name}」を削除しますか？`)) {
          delete state.savedParties[name];
          savePersistedState();
          renderSavedPartiesDropdown();
          alert(`編成「${name}」を削除しました。`);
        }
      });
    }
  }

  function renderSavedPartiesDropdown() {
    if (!el.selectSavedParties) return;
    const names = Object.keys(state.savedParties || {});
    el.selectSavedParties.innerHTML = '<option value="">-- 保存済み編成を選択 --</option>';
    names.forEach(name => {
      const opt = document.createElement('option');
      opt.value = name;
      const count = (state.savedParties[name] || []).filter(Boolean).length;
      opt.textContent = `${name} (${count}体)`;
      el.selectSavedParties.appendChild(opt);
    });
  }

  function setupDiffSimulatorUI() {
    if (!el.diffSlotSelect || !el.diffCharSelect) return;

    refreshDiffSlotLabels();

    const allChars = window.GIRLWARS_DATA || [];
    el.diffCharSelect.innerHTML = '<option value="">-- 差替候補キャラを選択 --</option>';
    allChars.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = `[${c.rarity}] ${c.name} (${c.type}将 / ${c.system || '無'})`;
      el.diffCharSelect.appendChild(opt);
    });

    el.diffSlotSelect.addEventListener('change', updateDiffSimulator);
    el.diffCharSelect.addEventListener('change', updateDiffSimulator);

    updateDiffSimulator();
  }

  function refreshDiffSlotLabels() {
    if (!el.diffSlotSelect) return;
    const currentVal = el.diffSlotSelect.value;
    el.diffSlotSelect.innerHTML = '';
    for (let i = 0; i < 12; i++) {
      const opt = document.createElement('option');
      opt.value = i;
      const c = state.party[i];
      opt.textContent = `枠${i + 1} (${i < 3 ? '前列' : i < 6 ? '後列' : '控え'}): ${c ? c.name : '空き'}`;
      el.diffSlotSelect.appendChild(opt);
    }
    if (currentVal !== '') {
      el.diffSlotSelect.value = currentVal;
    }
  }

  function updateDiffSimulator() {
    if (!el.diffResultPanel || !el.diffSlotSelect || !el.diffCharSelect) return;

    refreshDiffSlotLabels();

    const slotIdx = parseInt(el.diffSlotSelect.value, 10);
    const newCharId = el.diffCharSelect.value;
    const allChars = window.GIRLWARS_DATA || [];
    const charMap = new Map(allChars.map(c => [c.id, c]));

    const currentChar = state.party[slotIdx] || null;
    const newChar = newCharId ? charMap.get(newCharId) : null;

    if (!currentChar && !newChar) {
      el.diffResultPanel.innerHTML = `
        <div style="color: var(--text-muted); font-size: 0.84rem; padding: 12px; background: var(--bg-surface-2); border-radius: var(--radius-sm); text-align: center;">
          対象スロットまたは差替候補キャラを選択してください。
        </div>
      `;
      return;
    }

    // Synergy diff
    let synergyChanges = [];
    if (slotIdx < 6) {
      const oldType = currentChar ? currentChar.type : null;
      const newType = newChar ? newChar.type : null;
      if (oldType !== newType) {
        if (oldType) synergyChanges.push(`<span class="diff-badge-minus">${oldType}将 -1</span>`);
        if (newType) synergyChanges.push(`<span class="diff-badge-plus">${newType}将 +1</span>`);
      }

      const oldSys = currentChar ? currentChar.system : null;
      const newSys = newChar ? newChar.system : null;
      if (oldSys !== newSys) {
        if (oldSys) synergyChanges.push(`<span class="diff-badge-minus">${oldSys}系統 -1</span>`);
        if (newSys) synergyChanges.push(`<span class="diff-badge-plus">${newSys}系統 +1</span>`);
      }
    } else {
      synergyChanges.push(`<span style="color: var(--text-muted); font-size: 0.8rem;">※控え枠のため先発シナジーメーター数値への影響はありません</span>`);
    }

    // Tag diff
    const oldTags = new Set((currentChar && currentChar.tags ? currentChar.tags : []).map(t => t.name));
    const newTags = new Set((newChar && newChar.tags ? newChar.tags : []).map(t => t.name));

    const addedTags = [...newTags].filter(t => !oldTags.has(t));
    const removedTags = [...oldTags].filter(t => !newTags.has(t));

    let tagChangesHtml = '';
    if (addedTags.length === 0 && removedTags.length === 0) {
      tagChangesHtml = `<span style="color: var(--text-muted); font-size: 0.8rem;">効果タグの増減なし</span>`;
    } else {
      tagChangesHtml = `
        <div style="display: flex; flex-wrap: wrap; gap: 6px; align-items: center;">
          ${addedTags.map(t => `<span class="diff-badge-plus">＋ ${escapeHtml(t)}</span>`).join('')}
          ${removedTags.map(t => `<span class="diff-badge-minus">− ${escapeHtml(t)}</span>`).join('')}
        </div>
      `;
    }

    el.diffResultPanel.innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; background: var(--bg-surface-2); padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
        <!-- Before -->
        <div>
          <div style="font-size: 0.78rem; font-weight: 700; color: var(--text-muted); margin-bottom: 6px;">【変更前】枠 ${slotIdx + 1}</div>
          ${currentChar ? `
            <div style="display: flex; gap: 10px; align-items: center;">
              ${currentChar.illustUrl ? `<img src="${escapeHtml(currentChar.illustUrl)}" style="width: 44px; height: 44px; border-radius: 50%; object-fit: cover;" onerror="this.onerror=null; this.outerHTML='<div style=\\'width:44px;height:44px;border-radius:50%;background:#334155;display:flex;align-items:center;justify-content:center;\\'>⚔️</div>';">` : `<div style="width:44px;height:44px;border-radius:50%;background:#334155;display:flex;align-items:center;justify-content:center;">⚔️</div>`}
              <div>
                <strong style="color: #fff; font-size: 0.95rem;">${escapeHtml(currentChar.name)}</strong>
                <div style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(currentChar.rarity)} / ${escapeHtml(currentChar.type)}将 / ${currentChar.system ? escapeHtml(currentChar.system) + '系統' : '無'}</div>
              </div>
            </div>
          ` : `<div style="color: var(--text-muted); font-size: 0.85rem;">（空きスロット）</div>`}
        </div>

        <!-- After -->
        <div>
          <div style="font-size: 0.78rem; font-weight: 700; color: var(--accent-cyan); margin-bottom: 6px;">【変更後】候補キャラ</div>
          ${newChar ? `
            <div style="display: flex; gap: 10px; align-items: center;">
              ${newChar.illustUrl ? `<img src="${escapeHtml(newChar.illustUrl)}" style="width: 44px; height: 44px; border-radius: 50%; object-fit: cover;" onerror="this.onerror=null; this.outerHTML='<div style=\\'width:44px;height:44px;border-radius:50%;background:#334155;display:flex;align-items:center;justify-content:center;\\'>⚔️</div>';">` : `<div style="width:44px;height:44px;border-radius:50%;background:#334155;display:flex;align-items:center;justify-content:center;">⚔️</div>`}
              <div>
                <strong style="color: #fff; font-size: 0.95rem;">${escapeHtml(newChar.name)}</strong>
                <div style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(newChar.rarity)} / ${escapeHtml(newChar.type)}将 / ${newChar.system ? escapeHtml(newChar.system) + '系統' : '無'}</div>
              </div>
            </div>
          ` : `<div style="color: var(--text-muted); font-size: 0.85rem;">（未選択）</div>`}
        </div>

        <!-- Synergy change -->
        <div style="grid-column: 1 / -1; padding-top: 10px; border-top: 1px dashed rgba(255,255,255,0.08);">
          <div style="font-size: 0.8rem; font-weight: 700; margin-bottom: 6px; color: #94a3b8;">先発シナジー影響:</div>
          <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
            ${synergyChanges.join('') || '<span style="color:var(--text-muted);font-size:0.8rem;">シナジー比率の変化なし</span>'}
          </div>
        </div>

        <!-- Tag change -->
        <div style="grid-column: 1 / -1; padding-top: 10px; border-top: 1px dashed rgba(255,255,255,0.08);">
          <div style="font-size: 0.8rem; font-weight: 700; margin-bottom: 6px; color: #94a3b8;">スキル効果タグ増減（実データ比較）:</div>
          ${tagChangesHtml}
        </div>
      </div>
    `;
  }

  function exportPartyToClipboard() {
    const names = state.party.map((c, i) => {
      if (!c) return `枠${i + 1}: (空)`;
      return `枠${i + 1}: ${c.name} (${c.rarity})`;
    }).join('\n');

    const textToCopy = `【少女ウォーズ部隊編成】\n${names}\n\n作成: 少女ウォーズまとめ表 (https://oventox.github.io/girlwars-matome/)`;
    navigator.clipboard.writeText(textToCopy).then(() => {
      alert('部隊編成テキストをクリップボードにコピーしました！\nメモやSNS等に貼り付けて共有できます。');
    }).catch(() => {
      prompt('以下の編成テキストをコピーしてください:', textToCopy);
    });
  }

  function importPartyFromPrompt() {
    const raw = prompt('編成テキストまたはカンマ区切りのキャラ名を入力してください:');
    if (!raw) return;

    const allChars = window.GIRLWARS_DATA || [];
    const lines = raw.split(/[\n,、]/).map(s => s.trim()).filter(Boolean);
    const newParty = new Array(12).fill(null);
    let slot = 0;

    lines.forEach(line => {
      if (slot >= 12) return;
      const cleanName = line.replace(/^枠\d+[:：]\s*/, '').replace(/\s*\(.*?\)/, '').trim();
      const matched = allChars.find(c => c.name === cleanName || cleanName.includes(c.name));
      if (matched) {
        newParty[slot] = matched;
        slot++;
      }
    });

    state.party = newParty;
    savePersistedState();
    updatePartyBadge();
    renderPartyView();
    updateDiffSimulator();
    alert(`${slot} 体のキャラクターを部隊に反映しました！`);
  }

  // Open Modal
  function openModal(c) {
    state.selectedChar = c;

    let rClass = 'badge-ssr';
    if (c.rarity === 'UR閃') rClass = 'badge-ur-sen';
    else if (c.rarity === 'UR') rClass = 'badge-ur';
    else if (c.rarity === '花嫁') rClass = 'badge-bride';

    let tClass = 'tag-power';
    if (c.type === '智') tClass = 'tag-wisdom';
    else if (c.type === '猛') tClass = 'tag-brave';

    let warningBoxHtml = '';
    if (c.sourceInfo && c.sourceInfo.isOutdated) {
      const yearStr = c.sourceInfo.updatedAt ? c.sourceInfo.updatedAt.slice(0, 4) + '年' : '2024年';
      warningBoxHtml = `
        <div class="modal-warning-box">
          ⚠️ <strong>${escapeHtml(yearStr)}時点の情報です</strong>: このデータは${escapeHtml(c.sourceInfo.updatedAt || '2024年')}時点のwiki情報を元に作成されています。現在のゲーム内仕様・スキル性能・Tier環境とは異なっている場合があります。
        </div>
      `;
    }

    // Feature 4: Illustration / State-variant Gallery
    let visualHtml = '';
    const images = (c.images && c.images.length > 0) ? c.images : (c.illustUrl ? [{
      label: '通常',
      url: c.illustUrl,
      source: c.illustSource || '少女ウォーズ@wiki',
      credit: c.illustCredit || c.illustSource || '公式スチル'
    }] : []);

    if (images.length > 0) {
      const initialImg = images[0];
      const hasMultiple = images.length > 1;

      visualHtml = `
        <div class="modal-header-visual">
          <div id="modal-gallery-badge" class="modal-visual-state-badge">
            🖼️ ${escapeHtml(initialImg.label || '通常')}
          </div>
          <img id="modal-gallery-main-img" class="modal-big-img" src="${escapeHtml(initialImg.url)}" alt="${escapeHtml(c.name)} (${escapeHtml(initialImg.label || '通常')})" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'modal-big-placeholder\\'><span>⚔️</span><span>イラスト取得不可または準備中</span></div>';">
          <div id="modal-gallery-credit" class="modal-visual-credit">
            【${escapeHtml(initialImg.label || '通常')}】 出典: <a href="${escapeHtml(c.sourceInfo ? c.sourceInfo.primaryUrl : '#')}" target="_blank" rel="noopener">${escapeHtml(initialImg.credit || initialImg.source || '公式スチル')}</a>
          </div>
        </div>
        ${hasMultiple ? `
          <div class="modal-gallery-controls" role="tablist" aria-label="状態別イラスト切替">
            <span class="modal-gallery-title">状態切替 (${images.length}枚):</span>
            ${images.map((img, idx) => `
              <button class="modal-gallery-tab ${idx === 0 ? 'active' : ''}" data-img-idx="${idx}" type="button" role="tab" aria-selected="${idx === 0 ? 'true' : 'false'}">
                <img class="modal-gallery-tab-thumb" src="${escapeHtml(img.url)}" alt="${escapeHtml(img.label)}" onerror="this.style.display='none';">
                <span>${escapeHtml(img.label)}</span>
              </button>
            `).join('')}
          </div>
        ` : ''}
      `;
    }

    // Feature 2: Effect Tags
    let tagsHtml = '';
    if (c.tags && c.tags.length > 0) {
      tagsHtml = `
        <div class="modal-section">
          <div class="modal-section-title">🏷️ スキル効果タグ（自動抽出）</div>
          <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px;">
            ${c.tags.map(t => {
              const isSkill = t.fromSkill;
              const chipCls = isSkill ? 'tag-chip-skill' : 'tag-chip-eval';
              const sourceLabel = isSkill ? '🗡️ スキル本文より' : '📝 評価サマリーより';
              return `
                <div class="tag-chip ${chipCls}" style="font-size: 0.8rem; padding: 4px 10px;" title="${sourceLabel}">
                  ${t.icon || '🏷️'} <strong>${escapeHtml(t.name)}</strong>
                  <span style="font-size: 0.7rem; opacity: 0.85; margin-left: 4px;">(${sourceLabel})</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }

    // Feature 3: Multi-Source Evaluation
    let sourcesGridHtml = '';
    if (c.evaluation && c.evaluation.sources) {
      const src = c.evaluation.sources;
      const cards = [];

      if (src.atwiki) {
        cards.push(`
          <div class="eval-source-card">
            <div class="eval-source-title">🏛️ 少女ウォーズ@wiki（2024年）</div>
            ${src.atwiki.tier ? `<div class="eval-source-tier">Tier評価: ${escapeHtml(src.atwiki.tier)}</div>` : ''}
            <div class="eval-source-text">${escapeHtml(src.atwiki.comment || src.atwiki.summary || '個別評価記載なし')}</div>
            <div class="eval-source-footer">
              <span>更新: ${escapeHtml(src.atwiki.updatedAt || '2024年')}</span>
              ${src.atwiki.url ? `<a href="${escapeHtml(src.atwiki.url)}" target="_blank" rel="noopener">wikiページ ↗</a>` : ''}
            </div>
          </div>
        `);
      }

      if (src.rimuru) {
        cards.push(`
          <div class="eval-source-card">
            <div class="eval-source-title">📖 へたれリムルブログ（2026年）</div>
            <div class="eval-source-text">${escapeHtml(src.rimuru.summary || '記載なし')}</div>
            <div class="eval-source-footer">
              <span>更新: ${escapeHtml(src.rimuru.date || '2026-03-24')}</span>
              ${src.rimuru.url ? `<a href="${escapeHtml(src.rimuru.url)}" target="_blank" rel="noopener">攻略記事 ↗</a>` : ''}
            </div>
          </div>
        `);
      }

      if (src.kokomato) {
        let gemsText = (src.kokomato.recommendedGems && src.kokomato.recommendedGems.length)
          ? `おすすめ宝石: ${src.kokomato.recommendedGems.join(' / ')}`
          : '記載なし';
        cards.push(`
          <div class="eval-source-card">
            <div class="eval-source-title">💎 マトメバコ！（2026年）</div>
            <div class="eval-source-text">${escapeHtml(gemsText)}</div>
            <div class="eval-source-footer">
              <span>更新: ${escapeHtml(src.kokomato.date || '2026-02-12')}</span>
              ${src.kokomato.url ? `<a href="${escapeHtml(src.kokomato.url)}" target="_blank" rel="noopener">まとめ記事 ↗</a>` : ''}
            </div>
          </div>
        `);
      }

      if (cards.length > 0) {
        sourcesGridHtml = `
          <div class="modal-section">
            <div class="modal-section-title">📊 複数ソース評価の併記</div>
            <div class="eval-sources-grid">
              ${cards.join('')}
            </div>
          </div>
        `;
      }
    }

    // Feature 3: Evaluation History Timeline
    let historyHtml = '';
    if (c.evaluation && c.evaluation.history && c.evaluation.history.length > 0) {
      historyHtml = `
        <div class="modal-section">
          <div class="modal-section-title">📜 評価・Tier変更履歴</div>
          <div class="eval-history-timeline">
            ${c.evaluation.history.map(h => `
              <div class="eval-history-item">
                <div class="eval-history-date">${escapeHtml(h.date)} · ${escapeHtml(h.sourceName || '')}</div>
                <div class="eval-history-change">${escapeHtml(h.change)}</div>
                ${h.reason ? `<div class="eval-history-reason">${escapeHtml(h.reason)}</div>` : ''}
                ${h.sourceUrl ? `<div style="margin-top: 4px; font-size: 0.72rem;"><a href="${escapeHtml(h.sourceUrl)}" target="_blank" rel="noopener" style="color: var(--accent-cyan);">出典リンク ↗</a></div>` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    let skillsHtml = '';
    if (c.skills && (c.skills.normal || c.skills.passive || c.skills.ultimate)) {
      let normalHtml = '';
      if (c.skills.normal) {
        normalHtml = `
          <div class="skill-card">
            <div class="skill-header">
              <span class="skill-type-tag">通常スキル</span>
              <span class="skill-name">${escapeHtml(c.skills.normal.name || 'スキル')}</span>
            </div>
            <div class="skill-text">${escapeHtml(c.skills.normal.text || '')}</div>
          </div>
        `;
      }

      let passiveHtml = '';
      if (c.skills.passive) {
        passiveHtml = `
          <div class="skill-card">
            <div class="skill-header">
              <span class="skill-type-tag skill-type-passive">パッシブスキル</span>
              <span class="skill-name">${escapeHtml(c.skills.passive.name || 'パッシブ')}</span>
            </div>
            <div class="skill-text">${escapeHtml(c.skills.passive.text || '')}</div>
          </div>
        `;
      }

      let ultHtml = '';
      if (c.skills.ultimate) {
        ultHtml = `
          <div class="skill-card">
            <div class="skill-header">
              <span class="skill-type-tag skill-type-ult">奥義</span>
              <span class="skill-name">${escapeHtml(c.skills.ultimate.name || '奥義')}</span>
            </div>
            <div class="skill-text">${escapeHtml(c.skills.ultimate.text || '')}</div>
          </div>
        `;
      }

      let evoHtml = '';
      if (c.skills.evolution && (c.skills.evolution.fire.length || c.skills.evolution.ice.length)) {
        const evoItems = [...c.skills.evolution.fire, ...c.skills.evolution.ice];
        evoHtml = `
          <div class="skill-card">
            <div class="skill-header">
              <span class="skill-type-tag" style="background: #e11d48;">超進化（火炎/氷魂）</span>
            </div>
            <div class="skill-text">${escapeHtml(evoItems.join('\n\n'))}</div>
          </div>
        `;
      }

      skillsHtml = `
        <div class="modal-section">
          <div class="modal-section-title">⚔️ スキル・奥義詳細</div>
          ${normalHtml}
          ${passiveHtml}
          ${ultHtml}
          ${evoHtml}
        </div>
      `;
    } else {
      skillsHtml = `
        <div class="modal-section">
          <div class="modal-section-title">⚔️ スキル・奥義詳細</div>
          <div class="no-skills-notice">
            ※ 出典元（少女ウォーズ@wiki）にスキル本文・数値データが記載されていないため、データの捏造を防止する方針に基づき非表示としています。<br>
            情報をお持ちの方はGitHubリポジトリ等でお知らせください。
          </div>
        </div>
      `;
    }

    let evalHtml = '';
    if (c.evaluation && (c.evaluation.summary || c.evaluation.summaryBullets || c.evaluation.tierRank)) {
      let bulletsHtml = '';
      if (c.evaluation.summaryBullets && c.evaluation.summaryBullets.length) {
        bulletsHtml = `
          <ul style="margin: 8px 0 12px 20px; font-size: 0.84rem; color: var(--text-secondary); line-height: 1.5;">
            ${c.evaluation.summaryBullets.map(b => `<li>${escapeHtml(b)}</li>`).join('')}
          </ul>
        `;
      }

      let gemsHtml = '';
      if (c.evaluation.recommendedGems && c.evaluation.recommendedGems.length) {
        gemsHtml = `
          <div style="margin-top: 10px;">
            <span style="font-size: 0.78rem; font-weight: 700; color: var(--text-muted);">おすすめ宝石（マトメバコ！調べ）:</span>
            <div class="eval-gems-list">
              ${c.evaluation.recommendedGems.map(g => `<span class="gem-pill">💎 ${escapeHtml(g)}</span>`).join('')}
            </div>
          </div>
        `;
      }

      evalHtml = `
        <div class="modal-section">
          <div class="modal-section-title">📊 総合サマリー</div>
          <div class="eval-box">
            ${c.evaluation.tierRank ? `<div style="font-size: 0.88rem; font-weight: 700; color: #fbbf24; margin-bottom: 6px;">Tier評価: ${escapeHtml(c.evaluation.tierRank)}</div>` : ''}
            ${c.evaluation.summary ? `<div class="eval-summary-text">${escapeHtml(c.evaluation.summary)}</div>` : ''}
            ${bulletsHtml}
            ${gemsHtml}
          </div>
        </div>
      `;
    }

    let dialogueHtml = '';
    if (c.dialogues && Object.keys(c.dialogues).length) {
      const dItems = Object.entries(c.dialogues).map(([k, v]) => `
        <div style="font-size: 0.8rem; margin-bottom: 6px; padding: 6px 10px; background: rgba(0,0,0,0.2); border-radius: var(--radius-sm);">
          <strong style="color: #94a3b8;">${escapeHtml(k)}:</strong>
          <span style="color: #e2e8f0;">「${escapeHtml(v)}」</span>
        </div>
      `).join('');

      dialogueHtml = `
        <div class="modal-section">
          <div class="modal-section-title">💬 セリフ集（少女ウォーズ@wiki収録）</div>
          <div style="max-height: 180px; overflow-y: auto; padding-right: 4px;">
            ${dItems}
          </div>
        </div>
      `;
    }

    let hintsHtml = '';
    if (c.hints && c.hints.length) {
      const hItems = c.hints.map(h => `
        <li style="font-size: 0.82rem; margin-bottom: 4px; color: var(--text-secondary); line-height: 1.5;">${escapeHtml(h)}</li>
      `).join('');

      hintsHtml = `
        <div class="modal-section">
          <div class="modal-section-title">💡 花嫁衣装・セリフ解放ヒント（マトメバコ！調べ）</div>
          <div style="max-height: 200px; overflow-y: auto; padding: 10px 14px; background: rgba(236, 72, 153, 0.08); border: 1px solid rgba(236, 72, 153, 0.2); border-radius: var(--radius-md);">
            <ul style="margin: 0; padding-left: 20px;">
              ${hItems}
            </ul>
          </div>
        </div>
      `;
    }

    let storyHtml = '';
    if (c.story) {
      storyHtml = `
        <div class="modal-section">
          <div class="modal-section-title">📜 プロフィール・ストーリー</div>
          <div style="font-size: 0.84rem; color: var(--text-secondary); line-height: 1.7; background: var(--bg-secondary); padding: 14px; border-radius: var(--radius-md); white-space: pre-wrap;">${escapeHtml(c.story)}</div>
        </div>
      `;
    }

    const isCompModal = state.compareList.includes(c.id);

    el.modalContent.innerHTML = `
      ${visualHtml}
      <div class="modal-content-inner">
        <div class="modal-title-row">
          <div class="modal-char-names">
            ${c.ruby ? `<span class="modal-char-ruby">${escapeHtml(c.ruby)}</span>` : ''}
            <h2 class="modal-char-name">${escapeHtml(c.name)}</h2>
          </div>
          <div class="modal-attributes">
            <span class="badge-rarity ${rClass}" style="font-size: 0.88rem; padding: 4px 10px;">${escapeHtml(c.rarity)}</span>
            ${c.type ? `<span class="badge-tag ${tClass}" style="font-size: 0.84rem; padding: 4px 10px;">${escapeHtml(c.type)}将</span>` : ''}
            ${c.system ? `<span class="badge-tag tag-sys-${c.system === '風' ? 'wind' : c.system === '花' ? 'flower' : c.system === '雪' ? 'snow' : 'moon'}" style="font-size: 0.84rem; padding: 4px 10px;">${escapeHtml(c.system)}系統</span>` : ''}
            ${c.initialRarity ? `<span class="meta-badge">初期: ${escapeHtml(c.initialRarity)}</span>` : ''}
            ${c.cv ? `<span class="meta-badge">CV: ${escapeHtml(c.cv)}</span>` : ''}
            ${c.role ? `<span class="meta-badge">定位: ${escapeHtml(c.role)}</span>` : ''}
          </div>
        </div>

        ${warningBoxHtml}
        ${tagsHtml}
        ${sourcesGridHtml}
        ${historyHtml}
        ${evalHtml}
        ${skillsHtml}
        ${hintsHtml}
        ${dialogueHtml}
        ${storyHtml}

        <div class="modal-source-footer">
          <div>
            <strong>一次情報出典:</strong> ${escapeHtml(c.sourceInfo ? c.sourceInfo.sourceName : '公式/wiki')}
            （最終更新: ${escapeHtml(c.sourceInfo ? c.sourceInfo.updatedAt : '不明')}）
          </div>
          <div style="display: flex; gap: 8px;">
            <button id="modal-btn-compare" class="btn-secondary" style="${isCompModal ? 'background: var(--accent-cyan); color: #000; border-color: var(--accent-cyan);' : ''}">
              ${isCompModal ? '⚖️ 比較から外す' : '⚖️ 比較枠に追加'}
            </button>
            <button id="modal-btn-add-party" class="btn-secondary" style="background: var(--accent-rose); color: #fff; border-color: var(--accent-rose);">
              ＋ 部隊に編成
            </button>
            ${c.sourceInfo && c.sourceInfo.primaryUrl ? `
              <a href="${escapeHtml(c.sourceInfo.primaryUrl)}" target="_blank" rel="noopener noreferrer" class="btn-open-source">
                出典元の記事を見る ↗
              </a>
            ` : ''}
          </div>
        </div>
      </div>
    `;

    const modalCompBtn = document.getElementById('modal-btn-compare');
    if (modalCompBtn) {
      modalCompBtn.addEventListener('click', () => {
        toggleCompare(c.id);
        const isNowComp = state.compareList.includes(c.id);
        modalCompBtn.textContent = isNowComp ? '⚖️ 比較から外す' : '⚖️ 比較枠に追加';
        modalCompBtn.style.background = isNowComp ? 'var(--accent-cyan)' : '';
        modalCompBtn.style.color = isNowComp ? '#000' : '';
        modalCompBtn.style.borderColor = isNowComp ? 'var(--accent-cyan)' : '';
      });
    }

    const modalAddPartyBtn = document.getElementById('modal-btn-add-party');
    if (modalAddPartyBtn) {
      modalAddPartyBtn.addEventListener('click', () => {
        addCharacterToParty(c);
      });
    }

    // Gallery Tabs Interaction
    const galleryTabs = el.modalBody.querySelectorAll('.modal-gallery-tab');
    if (galleryTabs.length > 0) {
      galleryTabs.forEach(tab => {
        tab.addEventListener('click', () => {
          const idx = parseInt(tab.getAttribute('data-img-idx'), 10);
          const targetImg = images[idx];
          if (!targetImg) return;

          galleryTabs.forEach(t => {
            t.classList.remove('active');
            t.setAttribute('aria-selected', 'false');
          });
          tab.classList.add('active');
          tab.setAttribute('aria-selected', 'true');

          const mainImg = el.modalBody.querySelector('#modal-gallery-main-img');
          const badge = el.modalBody.querySelector('#modal-gallery-badge');
          const credit = el.modalBody.querySelector('#modal-gallery-credit');
          if (mainImg) {
            mainImg.src = targetImg.url;
            mainImg.alt = `${c.name} (${targetImg.label || '通常'})`;
          }
          if (badge) {
            badge.innerHTML = `🖼️ ${escapeHtml(targetImg.label || '通常')}`;
          }
          if (credit) {
            const sourceUrl = (c.sourceInfo && c.sourceInfo.sources && c.sourceInfo.sources[targetImg.source])
              ? c.sourceInfo.sources[targetImg.source].url
              : (c.sourceInfo ? c.sourceInfo.primaryUrl : '#');
            credit.innerHTML = `【${escapeHtml(targetImg.label || '通常')}】 出典: <a href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener">${escapeHtml(targetImg.credit || targetImg.source || '公式スチル')}</a>`;
          }
        });
      });
    }

    el.charModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    el.charModal.style.display = 'none';
    document.body.style.overflow = '';
    state.selectedChar = null;
  }

  // Render Tier View
  function renderTierView() {
    const tierData = window.GIRLWARS_TIER || {};
    const atwikiMap = tierData.atwiki2024 || {};
    const allChars = window.GIRLWARS_DATA || [];

    const tiers = ['T0', 'T1', 'T2', 'T3'];
    const tierLabels = {
      'T0': '異議なしの強力キャラ（最上位PVP必須）',
      'T1': 'そこそこ強いキャラ（上位環境の主力）',
      'T2': '補強のための次善キャラ',
      'T3': '現行バージョンPVPにおける底辺キャラ'
    };

    el.atwikiTierGroups.innerHTML = '';
    tiers.forEach(tKey => {
      const groupEl = document.createElement('div');
      groupEl.className = 'tier-group';

      let badgeClass = 'tier-t0';
      if (tKey === 'T1') badgeClass = 'tier-t1';
      else if (tKey === 'T2') badgeClass = 'tier-t2';
      else if (tKey === 'T3') badgeClass = 'tier-t3';

      const items = Object.values(atwikiMap).filter(item => item.tier === tKey);

      let itemsHtml = '';
      if (items.length > 0) {
        itemsHtml = items.map(item => {
          const normName = { 'エカチェリーナ': 'エカテリーナ', 'ジャンヌ': 'ジャンヌ・ダルク' }[item.name] || item.name;
          const matchedChar = allChars.find(c => c.name === normName || c.name === item.name);
          const iconSrc = item.iconUrl || (matchedChar && matchedChar.illustUrl) || '';

          return `
            <div class="tier-item-card" data-char-name="${escapeHtml(item.name)}" style="cursor: pointer;">
              ${iconSrc ? `<img class="tier-item-icon" src="${escapeHtml(iconSrc)}" alt="${escapeHtml(item.name)}" loading="lazy" onerror="this.onerror=null; this.outerHTML='<div class=\\'tier-item-icon\\' style=\\'display:flex;align-items:center;justify-content:center;color:#64748b;\\'>⚔️</div>';">` : `<div class="tier-item-icon" style="display:flex;align-items:center;justify-content:center;color:#64748b;">⚔️</div>`}
              <div class="tier-item-info">
                <div class="tier-item-name">${escapeHtml(item.fullName || item.name)}</div>
                <div class="tier-item-comment">${escapeHtml(item.comment || '')}</div>
              </div>
            </div>
          `;
        }).join('');
      } else {
        itemsHtml = `<div style="color: var(--text-muted); font-size: 0.84rem;">該当キャラなし</div>`;
      }

      groupEl.innerHTML = `
        <div class="tier-group-header">
          <span class="tier-badge-large ${badgeClass}">${tKey}</span>
          <span class="tier-group-title">${tierLabels[tKey]}</span>
        </div>
        <div class="tier-cards-row">
          ${itemsHtml}
        </div>
      `;

      // Event delegation for tier item card click
      groupEl.addEventListener('click', (e) => {
        const card = e.target.closest('.tier-item-card');
        if (!card) return;
        const rawName = card.dataset.charName;
        if (!rawName) return;
        const normName = { 'エカチェリーナ': 'エカテリーナ', 'ジャンヌ': 'ジャンヌ・ダルク' }[rawName] || rawName;
        const matched = allChars.find(c => c.name === normName || c.name === rawName);
        if (matched) {
          openModal(matched);
        } else {
          alert(`「${rawName}」の個別キャラデータは未収録です（2024年wiki Tier表のみ記載）。`);
        }
      });

      el.atwikiTierGroups.appendChild(groupEl);
    });

    const urSenChars = allChars.filter(c => c.rarity === 'UR閃');
    el.ursenStrengthsContainer.innerHTML = '';

    if (urSenChars.length > 0) {
      urSenChars.forEach(c => {
        const item = document.createElement('div');
        item.className = 'tier-group';
        item.style.cursor = 'pointer';

        let tClass = 'tag-power';
        if (c.type === '智') tClass = 'tag-wisdom';
        else if (c.type === '猛') tClass = 'tag-brave';

        const freshBadge = formatFreshnessBadge(c.sourceInfo && c.sourceInfo.updatedAt);
        const summaryText = (c.evaluation && c.evaluation.summary) ? c.evaluation.summary : '評価・強み情報は未取得';

        item.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="badge-rarity badge-ur-sen">UR閃</span>
              ${c.type ? `<span class="badge-tag ${tClass}">${escapeHtml(c.type)}将</span>` : ''}
              ${c.system ? `<span class="badge-tag tag-sys-${c.system === '風' ? 'wind' : c.system === '花' ? 'flower' : c.system === '雪' ? 'snow' : 'moon'}">${escapeHtml(c.system)}</span>` : ''}
              <strong style="font-size: 1.1rem; color: #fff;">${escapeHtml(c.name)}</strong>
              ${c.ruby ? `<span style="font-size: 0.75rem; color: var(--text-muted);">（${escapeHtml(c.ruby)}）</span>` : ''}
            </div>
            ${freshBadge}
          </div>
          <div style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.6; white-space: pre-wrap;">
            ${escapeHtml(summaryText)}
          </div>
        `;

        item.addEventListener('click', () => openModal(c));
        el.ursenStrengthsContainer.appendChild(item);
      });
    }
  }

  // Global helper for Tier card click (safe fallback)
  window.__openCharByName = function(name) {
    const allChars = window.GIRLWARS_DATA || [];
    const normName = { 'エカチェリーナ': 'エカテリーナ', 'ジャンヌ': 'ジャンヌ・ダルク' }[name] || name;
    const matched = allChars.find(c => c.name === normName || c.name === name);
    if (matched) {
      openModal(matched);
    } else {
      alert(`「${name}」の個別キャラデータは未収録です（2024年wiki Tier表のみ記載）。`);
    }
  };

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
