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
    
    // Smooth pagination
    renderedLimit: 40,
    PAGE_SIZE: 40,

    // Persistent lists
    favorites: new Set(),
    // Party: 12 slots (0-2: 前列, 3-5: 後列, 6-11: 控え)
    party: new Array(12).fill(null)
  };

  // LocalStorage Keys
  const STORAGE_KEYS = {
    FAVORITES: 'gw_favorites_v1',
    PARTY: 'gw_party_v1',
    VIEW_MODE: 'gw_view_mode_v1'
  };

  // DOM Elements
  const el = {
    metaBadge: document.getElementById('data-meta-badge'),
    totalCharCount: document.getElementById('total-char-count'),
    partyCountBadge: document.getElementById('party-count-badge'),
    filteredCount: document.getElementById('filtered-count'),
    searchInput: document.getElementById('search-input'),
    searchClearBtn: document.getElementById('search-clear-btn'),
    sortSelect: document.getElementById('sort-select'),
    resetFiltersBtn: document.getElementById('reset-filters-btn'),
    
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
    tabTier: document.getElementById('tab-tier'),
    tabAbout: document.getElementById('tab-about'),
    controlsPanel: document.getElementById('controls-panel'),
    atwikiTierGroups: document.getElementById('atwiki-tier-groups'),
    ursenStrengthsContainer: document.getElementById('ursen-strengths-container'),

    // Party Controls
    btnExportParty: document.getElementById('btn-export-party'),
    btnImportParty: document.getElementById('btn-import-party'),
    btnClearParty: document.getElementById('btn-clear-party'),
    synergyPowerCount: document.getElementById('synergy-power-count'),
    synergyWisdomCount: document.getElementById('synergy-wisdom-count'),
    synergyBraveCount: document.getElementById('synergy-brave-count'),
    synergyWindCount: document.getElementById('synergy-wind-count'),
    synergyFlowerCount: document.getElementById('synergy-flower-count'),
    synergySnowCount: document.getElementById('synergy-snow-count'),
    synergyMoonCount: document.getElementById('synergy-moon-count')
  };

  // Load persistent state
  function loadPersistedState() {
    try {
      const favRaw = localStorage.getItem(STORAGE_KEYS.FAVORITES);
      if (favRaw) {
        state.favorites = new Set(JSON.parse(favRaw));
      }
      const partyRaw = localStorage.getItem(STORAGE_KEYS.PARTY);
      if (partyRaw) {
        const parsed = JSON.parse(partyRaw);
        if (Array.isArray(parsed) && parsed.length === 12) {
          state.party = parsed;
        }
      }
      const savedView = localStorage.getItem(STORAGE_KEYS.VIEW_MODE);
      if (savedView && ['card', 'table', 'gallery'].includes(savedView)) {
        state.viewMode = savedView;
      }
    } catch (e) {
      console.warn('Could not read from localStorage:', e);
    }
  }

  function savePersistedState() {
    try {
      localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify([...state.favorites]));
      localStorage.setItem(STORAGE_KEYS.PARTY, JSON.stringify(state.party));
      localStorage.setItem(STORAGE_KEYS.VIEW_MODE, state.viewMode);
    } catch (e) {
      console.warn('Could not save to localStorage:', e);
    }
  }

  // Initialize
  function init() {
    loadPersistedState();
    setupMetaBadge();
    setupEventListeners();
    updateViewModeUI();
    renderCatalog();
    renderPartyView();
    renderTierView();
  }

  function setupMetaBadge() {
    const meta = window.GIRLWARS_METADATA || {};
    const count = meta.totalCount || (window.GIRLWARS_DATA || []).length;
    if (el.metaBadge) {
      el.metaBadge.textContent = `全 ${count} 体収録 (スキル全文: ${meta.withSkillsCount || 72}体)`;
    }
    if (el.totalCharCount) {
      el.totalCharCount.textContent = count;
    }
    updatePartyBadge();
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
        el.tabTier.classList.toggle('active', tab === 'tier');
        el.tabAbout.classList.toggle('active', tab === 'about');

        // Only show controls on catalog tab
        if (el.controlsPanel) {
          el.controlsPanel.style.display = tab === 'catalog' ? 'block' : 'none';
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

      document.querySelectorAll('.filter-chips').forEach(group => {
        group.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        const allChip = group.querySelector('[data-val="all"]');
        if (allChip) allChip.classList.add('active');
      });

      renderCatalog();
    });

    // Party action buttons
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
        }
      });
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
      const isFresh = c.sourceInfo && !c.sourceInfo.isOutdated;
      const freshHtml = isFresh
        ? `<span class="badge-freshness badge-fresh" style="position:static;">🟢 最新</span>`
        : `<span class="badge-freshness badge-outdated" style="position:static;">⚠️ '24</span>`;

      // Skill status
      const hasSkills = Boolean(c.skills && (c.skills.normal || c.skills.passive || c.skills.ultimate));
      const skillBadge = hasSkills
        ? `<span style="color:#10b981; font-weight:bold; font-size:0.75rem;">✔ 全文あり</span>`
        : `<span style="color:#64748b; font-size:0.75rem;">- 未記載</span>`;

      const roleSnippet = (c.evaluation && c.evaluation.summary) || c.role || '-';
      const isFav = state.favorites.has(c.id);

      tr.innerHTML = `
        <td>
          ${c.illustUrl ? `<img class="table-char-thumb" src="${c.illustUrl}" alt="${c.name}" loading="lazy">` : `<div class="table-char-thumb" style="display:flex;align-items:center;justify-content:center;color:#64748b;">⚔️</div>`}
        </td>
        <td>
          <div class="table-char-name-col">
            ${c.ruby ? `<span class="table-char-ruby">${c.ruby}</span>` : ''}
            <span class="table-char-name">${c.name}</span>
          </div>
        </td>
        <td><span class="badge-rarity ${rClass}" style="font-size:0.75rem; padding:2px 6px;">${c.rarity}</span></td>
        <td><span class="badge-tag ${tClass}">${c.type}将</span></td>
        <td>${sysHtml}</td>
        <td><div class="table-role-snippet">${escapeHtml(roleSnippet)}</div></td>
        <td>${skillBadge}</td>
        <td>${freshHtml}</td>
        <td onclick="event.stopPropagation();">
          <button class="btn-card-quick btn-card-fav ${isFav ? 'active' : ''}" data-char-id="${c.id}" style="padding:2px 6px;" title="お気に入り">
            ${isFav ? '★' : '☆'}
          </button>
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
      const isFresh = c.sourceInfo && !c.sourceInfo.isOutdated;
      const freshBadgeHtml = isFresh
        ? `<span class="badge-freshness badge-fresh">🟢 最新</span>`
        : `<span class="badge-freshness badge-outdated">⚠️ '24情報</span>`;

      // Tier tag
      let tierHtml = '';
      if (c.evaluation && c.evaluation.tierRank) {
        tierHtml = `<span class="badge-tier-tag">${c.evaluation.tierRank}</span>`;
      }

      // Favorite state
      const isFav = state.favorites.has(c.id);

      // Visual / Illustration
      let visualHtml = '';
      if (c.illustUrl) {
        visualHtml = `
          <div class="card-visual">
            <div class="card-badges-top">
              <span class="badge-rarity ${rClass}">${c.rarity}</span>
            </div>
            ${freshBadgeHtml}
            <img class="card-img" src="${c.illustUrl}" alt="${c.name}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'card-placeholder\\'><span>⚔️</span><span>イラスト準備中</span></div>';">
            <div class="card-actions-quick" onclick="event.stopPropagation();">
              <button class="btn-card-quick btn-card-fav ${isFav ? 'active' : ''}" data-char-id="${c.id}" title="お気に入り登録">
                ${isFav ? '★' : '☆'}
              </button>
              <button class="btn-card-quick btn-card-add-party" data-char-id="${c.id}" title="部隊に編成">
                ＋編成
              </button>
            </div>
          </div>
        `;
      } else {
        visualHtml = `
          <div class="card-visual">
            <div class="card-badges-top">
              <span class="badge-rarity ${rClass}">${c.rarity}</span>
            </div>
            ${freshBadgeHtml}
            <div class="card-placeholder">
              <span style="font-size: 1.8rem;">👘</span>
              <span>イラスト準備中</span>
            </div>
            <div class="card-actions-quick" onclick="event.stopPropagation();">
              <button class="btn-card-quick btn-card-fav ${isFav ? 'active' : ''}" data-char-id="${c.id}" title="お気に入り登録">
                ${isFav ? '★' : '☆'}
              </button>
              <button class="btn-card-quick btn-card-add-party" data-char-id="${c.id}" title="部隊に編成">
                ＋編成
              </button>
            </div>
          </div>
        `;
      }

      const roleSnippet = (c.evaluation && c.evaluation.summary) || c.role || (c.cv ? `CV: ${c.cv}` : '');

      card.innerHTML = `
        ${visualHtml}
        <div class="card-body">
          <div class="card-meta-row">
            <span class="badge-tag ${tClass}">${c.type}将</span>
            ${sysHtml}
            ${tierHtml}
          </div>
          <div class="card-name-group">
            ${c.ruby ? `<span class="card-ruby">${c.ruby}</span>` : ''}
            <div class="card-name">${c.name}</div>
          </div>
          ${roleSnippet ? `<div class="card-role-snippet">${escapeHtml(roleSnippet)}</div>` : ''}
          <div class="card-footer">
            <span>${c.sourceInfo ? c.sourceInfo.sourceName : '出典明記'}</span>
            <span>${c.sourceInfo ? c.sourceInfo.updatedAt : ''}</span>
          </div>
        </div>
      `;

      card.addEventListener('click', () => openModal(c));
      card.addEventListener('keydown', e => {
        if (e.key === 'Enter') openModal(c);
      });

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
    alert(`「${c.name}」を部隊スロット ${emptyIndex + 1} に追加しました！`);
  }

  function removeCharacterFromParty(slotIndex) {
    state.party[slotIndex] = null;
    savePersistedState();
    updatePartyBadge();
    renderPartyView();
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
          ${c.illustUrl ? `<img class="slot-char-avatar" src="${c.illustUrl}" alt="${c.name}">` : `<div class="slot-char-avatar" style="display:flex;align-items:center;justify-content:center;color:#64748b;">⚔️</div>`}
          <div class="slot-char-info">
            <div style="display:flex; gap: 4px; align-items: center;">
              <span class="badge-rarity badge-${c.rarity === 'UR閃' ? 'ur-sen' : c.rarity.toLowerCase()}" style="font-size: 0.65rem; padding: 1px 5px;">${c.rarity}</span>
              <span class="badge-tag ${tClass}" style="font-size: 0.65rem; padding: 0 4px;">${c.type}</span>
              ${c.system ? `<span class="badge-tag tag-sys-${c.system === '風' ? 'wind' : c.system === '花' ? 'flower' : c.system === '雪' ? 'snow' : 'moon'}" style="font-size: 0.65rem; padding: 0 4px;">${c.system}</span>` : ''}
            </div>
            <div class="slot-char-name">${c.name}</div>
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
      warningBoxHtml = `
        <div class="modal-warning-box">
          ⚠️ <strong>2024年時点の情報です</strong>: このデータは2024年8月15日時点のwiki情報を元に作成されています。現在のゲーム内仕様・スキル性能・Tier環境とは異なっている場合があります。
        </div>
      `;
    }

    let visualHtml = '';
    if (c.illustUrl) {
      visualHtml = `
        <div class="modal-header-visual">
          <img class="modal-big-img" src="${c.illustUrl}" alt="${c.name}">
          <div class="modal-visual-credit">
            イラスト出典: <a href="${c.sourceInfo ? c.sourceInfo.primaryUrl : '#'}" target="_blank" rel="noopener">${c.illustCredit || c.illustSource || '公式スチル'}</a>
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
          <div class="modal-section-title">📊 評価・強みメモ</div>
          <div class="eval-box">
            ${c.evaluation.tierRank ? `<div style="font-size: 0.88rem; font-weight: 700; color: #fbbf24; margin-bottom: 6px;">Tier評価: ${c.evaluation.tierRank}</div>` : ''}
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

    let storyHtml = '';
    if (c.story) {
      storyHtml = `
        <div class="modal-section">
          <div class="modal-section-title">📜 プロフィール・ストーリー</div>
          <div style="font-size: 0.84rem; color: var(--text-secondary); line-height: 1.7; background: var(--bg-secondary); padding: 14px; border-radius: var(--radius-md); white-space: pre-wrap;">${escapeHtml(c.story)}</div>
        </div>
      `;
    }

    el.modalContent.innerHTML = `
      ${visualHtml}
      <div class="modal-content-inner">
        <div class="modal-title-row">
          <div class="modal-char-names">
            ${c.ruby ? `<span class="modal-char-ruby">${c.ruby}</span>` : ''}
            <h2 class="modal-char-name">${c.name}</h2>
          </div>
          <div class="modal-attributes">
            <span class="badge-rarity ${rClass}" style="font-size: 0.88rem; padding: 4px 10px;">${c.rarity}</span>
            <span class="badge-tag ${tClass}" style="font-size: 0.84rem; padding: 4px 10px;">${c.type}将</span>
            ${c.system ? `<span class="badge-tag tag-sys-${c.system === '風' ? 'wind' : c.system === '花' ? 'flower' : c.system === '雪' ? 'snow' : 'moon'}" style="font-size: 0.84rem; padding: 4px 10px;">${c.system}系統</span>` : ''}
            ${c.initialRarity ? `<span class="meta-badge">初期: ${c.initialRarity}</span>` : ''}
            ${c.cv ? `<span class="meta-badge">CV: ${c.cv}</span>` : ''}
            ${c.role ? `<span class="meta-badge">定位: ${c.role}</span>` : ''}
          </div>
        </div>

        ${warningBoxHtml}
        ${evalHtml}
        ${skillsHtml}
        ${dialogueHtml}
        ${storyHtml}

        <div class="modal-source-footer">
          <div>
            <strong>一次情報出典:</strong> ${c.sourceInfo ? c.sourceInfo.sourceName : '公式/wiki'}
            （最終更新: ${c.sourceInfo ? c.sourceInfo.updatedAt : '不明'}）
          </div>
          <div style="display: flex; gap: 8px;">
            <button id="modal-btn-add-party" class="btn-secondary" style="background: var(--accent-rose); color: #fff; border-color: var(--accent-rose);">
              ＋ 部隊に編成
            </button>
            ${c.sourceInfo && c.sourceInfo.primaryUrl ? `
              <a href="${c.sourceInfo.primaryUrl}" target="_blank" rel="noopener noreferrer" class="btn-open-source">
                出典元の記事を見る ↗
              </a>
            ` : ''}
          </div>
        </div>
      </div>
    `;

    const modalAddPartyBtn = document.getElementById('modal-btn-add-party');
    if (modalAddPartyBtn) {
      modalAddPartyBtn.addEventListener('click', () => {
        addCharacterToParty(c);
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
          const matchedChar = allChars.find(c => c.name === item.name || c.name.includes(item.name));
          const iconSrc = item.iconUrl || (matchedChar && matchedChar.illustUrl) || '';

          return `
            <div class="tier-item-card" style="cursor: pointer;" onclick="window.__openCharByName('${escapeHtml(item.name)}')">
              ${iconSrc ? `<img class="tier-item-icon" src="${iconSrc}" alt="${item.name}" loading="lazy">` : `<div class="tier-item-icon" style="display:flex;align-items:center;justify-content:center;color:#64748b;">⚔️</div>`}
              <div class="tier-item-info">
                <div class="tier-item-name">${item.fullName || item.name}</div>
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

        item.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="badge-rarity badge-ur-sen">UR閃</span>
              <span class="badge-tag ${tClass}">${c.type}将</span>
              ${c.system ? `<span class="badge-tag tag-sys-${c.system === '風' ? 'wind' : c.system === '花' ? 'flower' : c.system === '雪' ? 'snow' : 'moon'}">${c.system}</span>` : ''}
              <strong style="font-size: 1.1rem; color: #fff;">${c.name}</strong>
              ${c.ruby ? `<span style="font-size: 0.75rem; color: var(--text-muted);">（${c.ruby}）</span>` : ''}
            </div>
            <span class="badge-freshness badge-fresh">🟢 2026最新</span>
          </div>
          <div style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.6; white-space: pre-wrap;">
            ${escapeHtml((c.evaluation && c.evaluation.summary) || '最新のUR閃キャラクター。詳細モーダルでスキル全文を確認できます。')}
          </div>
        `;

        item.addEventListener('click', () => openModal(c));
        el.ursenStrengthsContainer.appendChild(item);
      });
    }
  }

  // Global helper for Tier card click
  window.__openCharByName = function(name) {
    const allChars = window.GIRLWARS_DATA || [];
    const matched = allChars.find(c => c.name === name || c.name.includes(name) || name.includes(c.name));
    if (matched) {
      openModal(matched);
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
