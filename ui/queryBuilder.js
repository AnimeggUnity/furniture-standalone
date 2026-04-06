
((app) => {

  // ─── 欄位目錄 ────────────────────────────────────────────────
  const FIELDS = [
    { key: 'WinnerID',       label: '得標者',      type: 'presence' },
    { key: 'IsPay',          label: '付款狀態',    type: 'boolean'  },
    { key: 'IsGet',          label: '取貨狀態',    type: 'boolean'  },
    { key: 'IsFinish',       label: '是否結標',    type: 'boolean'  },
    { key: 'HasBids',        label: '有無競標',    type: 'boolean'  },
    { key: 'EndDate',        label: '截標日',      type: 'date'     },
    { key: 'StartDate',      label: '起標日',      type: 'date'     },
    { key: 'TrackCount',     label: '追蹤數',      type: 'number'   },
    { key: 'InitPrice',      label: '起標價',      type: 'number'   },
    { key: '_duration',      label: '競標天數',    type: 'number'   },
    { key: '_daysUntilEnd',  label: '距截標天數',  type: 'number'   },
    { key: '_daysAfterEnd',  label: '結標後天數',  type: 'number'   },
  ];

  const OPS = {
    presence: [
      { value: 'notEmpty', label: '有值' },
      { value: 'isEmpty',  label: '無值' },
    ],
    boolean: [
      { value: 'eq_true',  label: '是' },
      { value: 'eq_false', label: '否' },
    ],
    number: [
      { value: 'gt',  label: '>'  },
      { value: 'gte', label: '>=' },
      { value: 'lt',  label: '<'  },
      { value: 'lte', label: '<=' },
      { value: 'eq',  label: '='  },
      { value: 'neq', label: '≠'  },
    ],
    date: [
      { value: 'before', label: '早於' },
      { value: 'after',  label: '晚於' },
      { value: 'eq',     label: '等於' },
    ],
  };

  // ─── 內建 Preset ─────────────────────────────────────────────
  const BUILT_IN_PRESETS = {
    '逾期未付': {
      logic: 'AND',
      conditions: [
        { field: 'WinnerID',      op: 'notEmpty'  },
        { field: 'IsPay',         op: 'eq_false'  },
        { field: '_daysAfterEnd', op: 'gt', value: 14 },
      ]
    },
    '長期未結標（無人）': {
      logic: 'AND',
      conditions: [
        { field: '_duration',     op: 'gte', value: 20 },
        { field: '_daysUntilEnd', op: 'gt',  value: 0  },
        { field: 'HasBids',       op: 'eq_false'        },
      ]
    },
    '長期未結標（競標中）': {
      logic: 'AND',
      conditions: [
        { field: '_duration',     op: 'gte', value: 20 },
        { field: '_daysUntilEnd', op: 'gt',  value: 7  },
        { field: 'HasBids',       op: 'eq_true'         },
        { field: 'WinnerID',      op: 'isEmpty'         },
      ]
    },
    '已得標未取貨': {
      logic: 'AND',
      conditions: [
        { field: 'IsPay', op: 'eq_true'  },
        { field: 'IsGet', op: 'eq_false' },
      ]
    },
  };

  // ─── 引擎 ────────────────────────────────────────────────────
  function getFieldValue(row, key) {
    if (key === '_duration') {
      const s = new Date(row.StartDate), e = new Date(row.EndDate);
      return (e - s) / 86400000;
    }
    if (key === '_daysUntilEnd') {
      return (new Date(row.EndDate) - new Date()) / 86400000;
    }
    if (key === '_daysAfterEnd') {
      return (new Date() - new Date(row.EndDate)) / 86400000;
    }
    return row[key];
  }

  function evalCondition(row, { field, op, value }) {
    const v = getFieldValue(row, field);
    switch (op) {
      case 'notEmpty':  return v != null && v !== '';
      case 'isEmpty':   return v == null || v === '';
      case 'eq_true':   return v === true;
      case 'eq_false':  return v === false;
      case 'gt':        return Number(v) > Number(value);
      case 'gte':       return Number(v) >= Number(value);
      case 'lt':        return Number(v) < Number(value);
      case 'lte':       return Number(v) <= Number(value);
      case 'eq':        return String(v) === String(value);
      case 'neq':       return String(v) !== String(value);
      case 'before':    return new Date(v) < new Date(value);
      case 'after':     return new Date(v) > new Date(value);
    }
    return false;
  }

  function applyFilter(rows, conditions, logic) {
    if (!conditions.length) return rows;
    return rows.filter(row => {
      const results = conditions.map(c => evalCondition(row, c));
      return logic === 'AND' ? results.every(Boolean) : results.some(Boolean);
    });
  }

  // ─── 使用者儲存的 Preset ──────────────────────────────────────
  const STORAGE_KEY = 'tm_qb_presets';
  function loadUserPresets()  { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; } }
  function saveUserPresets(p) { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); }

  // ─── UI 建構 ─────────────────────────────────────────────────
  function buildQueryBuilder(container, onApply) {
    let logic = 'AND';
    let conditions = [];

    const inputStyle = 'padding:5px 8px;border:1px solid #ccc;border-radius:4px;font-size:12px;';
    const btnStyle   = (bg, fg = '#fff') => `padding:5px 12px;background:${bg};color:${fg};border:none;border-radius:4px;cursor:pointer;font-size:12px;`;

    // ── Header ──
    const header = document.createElement('div');
    header.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap;';

    const logicLabel = document.createElement('span');
    logicLabel.style.cssText = 'font-size:12px;color:#555;';
    logicLabel.textContent = '條件邏輯：';

    const andBtn = document.createElement('button');
    const orBtn  = document.createElement('button');
    const setLogic = (l) => {
      logic = l;
      andBtn.style.background = l === 'AND' ? '#2980b9' : '#e0e0e0';
      andBtn.style.color      = l === 'AND' ? '#fff'    : '#333';
      orBtn.style.background  = l === 'OR'  ? '#e67e22' : '#e0e0e0';
      orBtn.style.color       = l === 'OR'  ? '#fff'    : '#333';
    };
    andBtn.textContent = 'AND（全符合）'; andBtn.style.cssText = btnStyle('#e0e0e0', '#333') + 'margin-right:4px;';
    orBtn.textContent  = 'OR（任一符合）'; orBtn.style.cssText  = btnStyle('#e0e0e0', '#333');
    andBtn.onclick = () => setLogic('AND');
    orBtn.onclick  = () => setLogic('OR');
    setLogic('AND');

    // Preset 下拉
    const presetSelect = document.createElement('select');
    presetSelect.style.cssText = inputStyle + 'margin-left:auto;max-width:180px;';
    const updatePresetOptions = () => {
      presetSelect.innerHTML = '<option value="">— 套用 Preset —</option>';
      const builtIn = Object.keys(BUILT_IN_PRESETS);
      const user    = Object.keys(loadUserPresets());
      builtIn.forEach(k => { const o = document.createElement('option'); o.value = `b:${k}`; o.textContent = `⭐ ${k}`; presetSelect.appendChild(o); });
      user.forEach(k    => { const o = document.createElement('option'); o.value = `u:${k}`; o.textContent = `💾 ${k}`; presetSelect.appendChild(o); });
    };
    updatePresetOptions();
    presetSelect.onchange = () => {
      const v = presetSelect.value;
      if (!v) return;
      const [src, name] = [v.slice(0,1), v.slice(2)];
      const preset = src === 'b' ? BUILT_IN_PRESETS[name] : loadUserPresets()[name];
      if (!preset) return;
      conditions = preset.conditions.map(c => ({ ...c }));
      setLogic(preset.logic || 'AND');
      renderConditions();
      presetSelect.value = '';
    };

    // 儲存為 Preset
    const saveBtn = document.createElement('button');
    saveBtn.textContent = '💾 儲存';
    saveBtn.style.cssText = btnStyle('#27ae60');
    saveBtn.onclick = () => {
      if (!conditions.length) return;
      const name = prompt('請輸入 Preset 名稱：');
      if (!name) return;
      const presets = loadUserPresets();
      presets[name] = { logic, conditions: conditions.map(c => ({ ...c })) };
      saveUserPresets(presets);
      updatePresetOptions();
    };

    header.append(logicLabel, andBtn, orBtn, presetSelect, saveBtn);

    // ── 條件列表 ──
    const condList = document.createElement('div');
    condList.id = 'tm-qb-conditions';
    condList.style.cssText = 'display:flex;flex-direction:column;gap:6px;margin-bottom:10px;';

    function renderConditions() {
      condList.innerHTML = '';
      if (!conditions.length) {
        condList.innerHTML = '<span style="font-size:12px;color:#aaa;">尚無條件，點「+ 新增條件」開始</span>';
        return;
      }
      conditions.forEach((cond, idx) => {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:6px;';

        // 欄位
        const fieldSel = document.createElement('select');
        fieldSel.style.cssText = inputStyle + 'min-width:120px;';
        FIELDS.forEach(f => {
          const o = document.createElement('option');
          o.value = f.key; o.textContent = f.label;
          if (f.key === cond.field) o.selected = true;
          fieldSel.appendChild(o);
        });

        // 運算子（依欄位類型）
        const opSel = document.createElement('select');
        opSel.style.cssText = inputStyle + 'min-width:80px;';

        // 值輸入
        const valInput = document.createElement('input');
        valInput.style.cssText = inputStyle + 'width:80px;';
        valInput.value = cond.value ?? '';

        const refreshOps = (fieldKey, currentOp) => {
          const field = FIELDS.find(f => f.key === fieldKey);
          const ops   = OPS[field?.type] || OPS.number;
          opSel.innerHTML = '';
          ops.forEach(o => {
            const el = document.createElement('option');
            el.value = o.value; el.textContent = o.label;
            if (o.value === currentOp) el.selected = true;
            opSel.appendChild(el);
          });
          // 布林/presence 不需值輸入
          const needsValue = !['presence','boolean'].includes(field?.type);
          valInput.style.display = needsValue ? '' : 'none';
          // 日期欄位用萬年曆，數字欄位用數字鍵盤
          valInput.type = field?.type === 'date' ? 'date' : 'number';
        };

        refreshOps(cond.field, cond.op);

        fieldSel.onchange = () => {
          conditions[idx].field = fieldSel.value;
          refreshOps(fieldSel.value, null);
          conditions[idx].op    = opSel.value;
          delete conditions[idx].value;
          valInput.value = '';
        };
        opSel.onchange  = () => { conditions[idx].op    = opSel.value; };
        valInput.oninput = () => { conditions[idx].value = valInput.value; };

        const delBtn = document.createElement('button');
        delBtn.textContent = '×';
        delBtn.style.cssText = btnStyle('#e74c3c') + 'padding:5px 8px;';
        delBtn.onclick = () => { conditions.splice(idx, 1); renderConditions(); };

        row.append(fieldSel, opSel, valInput, delBtn);
        condList.appendChild(row);
      });
    }
    renderConditions();

    // ── Footer 按鈕 ──
    const footer = document.createElement('div');
    footer.style.cssText = 'display:flex;gap:8px;align-items:center;';

    const addBtn = document.createElement('button');
    addBtn.textContent = '+ 新增條件';
    addBtn.style.cssText = btnStyle('#fff', '#2980b9') + 'border:1px solid #2980b9;';
    addBtn.onclick = () => {
      conditions.push({ field: FIELDS[0].key, op: OPS[FIELDS[0].type][0].value });
      renderConditions();
    };

    const applyBtn = document.createElement('button');
    applyBtn.textContent = '套用篩選';
    applyBtn.style.cssText = btnStyle('#2980b9');
    applyBtn.onclick = () => onApply(conditions, logic);

    const clearBtn = document.createElement('button');
    clearBtn.textContent = '清除';
    clearBtn.style.cssText = btnStyle('#fff', '#999') + 'border:1px solid #ccc;margin-left:auto;';
    clearBtn.onclick = () => { conditions = []; renderConditions(); onApply([], logic); };

    const countEl = document.createElement('span');
    countEl.id = 'tm-qb-count';
    countEl.style.cssText = 'font-size:12px;color:#888;';

    // ── 匯出／匯入區塊 ──
    const ioPanel = document.createElement('div');
    ioPanel.style.cssText = 'display:none;margin-top:10px;';

    const ioTextarea = document.createElement('textarea');
    ioTextarea.style.cssText = 'width:100%;box-sizing:border-box;height:80px;padding:6px 8px;border:1px solid #ccc;border-radius:4px;font-size:11px;font-family:monospace;resize:vertical;';
    ioTextarea.placeholder = '貼上 JSON 後點「載入」';

    const ioActionRow = document.createElement('div');
    ioActionRow.style.cssText = 'display:flex;gap:6px;margin-top:6px;';

    const copyBtn = document.createElement('button');
    copyBtn.textContent = '複製目前條件';
    copyBtn.style.cssText = btnStyle('#2c3e50');
    copyBtn.onclick = () => {
      const json = JSON.stringify({ logic, conditions }, null, 2);
      ioTextarea.value = json;
      navigator.clipboard?.writeText(json).then(() => {
        copyBtn.textContent = '✓ 已複製';
        setTimeout(() => { copyBtn.textContent = '複製目前條件'; }, 1500);
      });
    };

    const loadBtn = document.createElement('button');
    loadBtn.textContent = '載入';
    loadBtn.style.cssText = btnStyle('#27ae60');
    loadBtn.onclick = () => {
      try {
        const parsed = JSON.parse(ioTextarea.value);
        if (!Array.isArray(parsed.conditions)) throw new Error('格式錯誤');
        conditions = parsed.conditions.map(c => ({ ...c }));
        setLogic(parsed.logic === 'OR' ? 'OR' : 'AND');
        renderConditions();
        loadBtn.textContent = '✓ 載入成功';
        setTimeout(() => { loadBtn.textContent = '載入'; }, 1500);
      } catch {
        loadBtn.textContent = '❌ JSON 格式錯誤';
        setTimeout(() => { loadBtn.textContent = '載入'; }, 2000);
      }
    };

    ioActionRow.append(copyBtn, loadBtn);
    ioPanel.append(ioTextarea, ioActionRow);

    const ioToggleBtn = document.createElement('button');
    ioToggleBtn.textContent = '{ } 匯出／匯入';
    ioToggleBtn.style.cssText = btnStyle('#fff', '#888') + 'border:1px solid #ccc;margin-left:auto;';
    ioToggleBtn.onclick = () => {
      const visible = ioPanel.style.display !== 'none';
      ioPanel.style.display = visible ? 'none' : 'block';
    };

    footer.append(addBtn, applyBtn, countEl, clearBtn, ioToggleBtn);
    container.append(header, condList, footer, ioPanel);

    return {
      setCount: (n, total) => { countEl.textContent = n < total ? `篩選結果：${n} / ${total} 筆` : ''; }
    };
  }

  app.QueryBuilder = { buildQueryBuilder, applyFilter };

})(window.FurnitureHelper = window.FurnitureHelper || {});
