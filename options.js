
((app) => {
  const BASE = 'https://recycledstuff.ntpc.gov.tw';

  let products = [];
  let statusEl = null;
  let featureBtns = [];
  let activeFilter = { conditions: [], logic: 'AND' };
  let qbInstance = null;
  let isSortedByWinner = false;
  let startInputEl = null;
  let endInputEl = null;

  // ─── 取得預設日期 ───────────────────────────────────────────────
  function getPageDates() {
    const today = new Date();
    const pad = n => String(n).padStart(2, '0');
    const fmt = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    return {
      start: fmt(new Date(today.getFullYear(), today.getMonth() - 1, today.getDate())),
      end: fmt(today)
    };
  }

  // ─── buildHierarchicalStats ────────────────────────────────────
  function buildHierarchicalStats(data) {
    const stats = { createDate: {}, endDate: {} };
    data.forEach(row => {
      [{ key: 'createDate', raw: row.CreateDate }, { key: 'endDate', raw: row.EndDate }]
        .forEach(({ key, raw }) => {
          const dateStr = (typeof raw === 'string' ? raw : '').slice(0, 10);
          if (dateStr.length !== 10) return;
          const year = dateStr.slice(0, 4), month = dateStr.slice(0, 7);
          const s = stats[key];
          if (!s[year]) s[year] = {};
          if (!s[year][month]) s[year][month] = {};
          if (!s[year][month][dateStr]) s[year][month][dateStr] = [];
          s[year][month][dateStr].push({
            AutoID: row.AutoID, Name: row.Name || '未命名',
            IsGet: row.IsGet, IsPay: row.IsPay, NickName: row.NickName,
            BidPrice: row.BidPrice || null, Bidder: row.Bidder || null, HasBids: row.HasBids || false
          });
        });
    });
    return stats;
  }

  // ─── 啟用/停用功能按鈕 ────────────────────────────────────────
  function setFeatureBtnsEnabled(enabled) {
    featureBtns.forEach(btn => {
      btn.disabled = !enabled;
      btn.style.opacity = enabled ? '1' : '0.4';
    });
  }

  // ─── 編輯聯絡人 Modal ──────────────────────────────────────────
  function showEditContactModal(account, contact) {
    document.getElementById('tm-edit-contact-modal')?.remove();
    const ovl = document.createElement('div');
    ovl.id = 'tm-edit-contact-modal';
    ovl.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10010;display:flex;align-items:center;justify-content:center;';
    const dialog = document.createElement('div');
    dialog.style.cssText = 'background:#fff;border-radius:8px;width:380px;box-shadow:0 8px 32px rgba(0,0,0,.3);font-size:13px;overflow:hidden;';
    dialog.innerHTML = `
      <div style="background:#2c3e50;color:#fff;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;">
        <span style="font-weight:bold;font-size:13px;">${contact ? '✏ 編輯聯絡資訊' : '➕ 補充聯絡資訊'}</span>
        <span id="tm-ecc-close" style="cursor:pointer;font-size:16px;opacity:.7;">×</span>
      </div>
      <div style="padding:16px;">
        <div style="margin-bottom:12px;color:#666;font-weight:bold;font-size:12px;">帳號：${account}</div>
        <div style="margin-bottom:10px;">
          <label style="display:block;margin-bottom:3px;color:#555;font-size:12px;">聯絡電話</label>
          <input id="tm-ecc-phone" type="tel" value="${contact?.phone || ''}" placeholder="例: 02-12345678"
            style="width:100%;box-sizing:border-box;padding:6px 8px;border:1px solid #ccc;border-radius:4px;font-size:13px;">
        </div>
        <div style="margin-bottom:10px;">
          <label style="display:block;margin-bottom:3px;color:#555;font-size:12px;">手機號碼</label>
          <input id="tm-ecc-mobile" type="tel" value="${contact?.mobile || ''}" placeholder="例: 0912345678"
            style="width:100%;box-sizing:border-box;padding:6px 8px;border:1px solid #ccc;border-radius:4px;font-size:13px;">
        </div>
        <div style="margin-bottom:14px;">
          <label style="display:block;margin-bottom:3px;color:#555;font-size:12px;">備註</label>
          <textarea id="tm-ecc-note" rows="3" placeholder="例: 週末聯絡、偏好 Line..."
            style="width:100%;box-sizing:border-box;padding:6px 8px;border:1px solid #ccc;border-radius:4px;font-size:13px;resize:vertical;">${contact?.note || ''}</textarea>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;">
          <button id="tm-ecc-cancel" style="padding:6px 14px;background:#7f8c8d;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px;">取消</button>
          <button id="tm-ecc-save" style="padding:6px 14px;background:#2980b9;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px;font-weight:bold;">💾 儲存</button>
        </div>
      </div>`;
    ovl.appendChild(dialog);
    document.body.appendChild(ovl);
    const close = () => ovl.remove();
    dialog.querySelector('#tm-ecc-close').onclick = close;
    dialog.querySelector('#tm-ecc-cancel').onclick = close;
    ovl.addEventListener('click', e => { if (e.target === ovl) close(); });
    const saveBtn = dialog.querySelector('#tm-ecc-save');
    saveBtn.onclick = async () => {
      const phone  = dialog.querySelector('#tm-ecc-phone').value.trim();
      const mobile = dialog.querySelector('#tm-ecc-mobile').value.trim();
      const note   = dialog.querySelector('#tm-ecc-note').value.trim();
      if (!phone && !mobile && !note) { statusEl.textContent = '請至少填寫一個欄位'; return; }
      saveBtn.disabled = true; saveBtn.textContent = '儲存中...';
      const ok = await app.SheetSync.updateContact(account, phone, mobile, note);
      if (ok) { close(); statusEl.textContent = '聯絡資訊已更新'; renderTable(getDisplayData()); }
      else { saveBtn.disabled = false; saveBtn.textContent = '💾 儲存'; statusEl.textContent = '儲存失敗'; }
    };
    const phoneIn = dialog.querySelector('#tm-ecc-phone');
    const mobileIn = dialog.querySelector('#tm-ecc-mobile');
    if (!phoneIn.value) phoneIn.focus();
    else if (!mobileIn.value) mobileIn.focus();
    else dialog.querySelector('#tm-ecc-note').focus();
  }

  // ─── 編輯商品 Modal ────────────────────────────────────────────
  function showEditModal(row, onSaved) {
    document.getElementById('tm-edit-modal')?.remove();
    const CATEGORIES = app.CATEGORY_MAPPING;
    const toDatetimeLocal = s => s ? s.slice(0, 16).replace(' ', 'T') : '';
    const toAPIDatetime   = s => s ? s.replace('T', ' ') + ':00' : '';
    const ovl = document.createElement('div');
    ovl.id = 'tm-edit-modal';
    ovl.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10002;display:flex;align-items:center;justify-content:center;';
    const modal = document.createElement('div');
    modal.style.cssText = 'background:#fff;border-radius:8px;width:680px;max-height:90vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,.3);font-size:13px;';
    const catOptions = Object.entries(CATEGORIES)
      .map(([name, id]) => `<option value="${id}" ${row.CategoryID === id ? 'selected' : ''}>${name}</option>`)
      .join('');
    modal.innerHTML = `
      <div style="background:#2c3e50;color:#fff;padding:14px 20px;border-radius:8px 8px 0 0;display:flex;justify-content:space-between;align-items:center;">
        <span style="font-weight:bold;font-size:14px;">編輯商品 #${row.AutoID}</span>
        <span id="tm-edit-close" style="cursor:pointer;font-size:18px;opacity:.7;">×</span>
      </div>
      <div style="padding:20px;display:grid;grid-template-columns:1fr 1fr;gap:14px;">
        <div style="grid-column:1/-1;"><label style="display:block;margin-bottom:4px;color:#555;">品名 *</label>
          <input id="ef-name" value="${row.Name || ''}" style="width:100%;box-sizing:border-box;padding:7px 10px;border:1px solid #ccc;border-radius:4px;"></div>
        <div><label style="display:block;margin-bottom:4px;color:#555;">類別 *</label>
          <select id="ef-cat" style="width:100%;padding:7px 10px;border:1px solid #ccc;border-radius:4px;">${catOptions}</select></div>
        <div><label style="display:block;margin-bottom:4px;color:#555;">起標價格 *</label>
          <input id="ef-init" type="number" value="${row.InitPrice || 0}" style="width:100%;box-sizing:border-box;padding:7px 10px;border:1px solid #ccc;border-radius:4px;"></div>
        <div><label style="display:block;margin-bottom:4px;color:#555;">拍賣期間(起)</label>
          <input id="ef-start" type="datetime-local" value="${toDatetimeLocal(row.StartDate)}" style="width:100%;box-sizing:border-box;padding:7px 10px;border:1px solid #ccc;border-radius:4px;"></div>
        <div><label style="display:block;margin-bottom:4px;color:#555;">拍賣期間(迄)</label>
          <input id="ef-end" type="datetime-local" value="${toDatetimeLocal(row.EndDate)}" style="width:100%;box-sizing:border-box;padding:7px 10px;border:1px solid #ccc;border-radius:4px;"></div>
        <div><label style="display:block;margin-bottom:4px;color:#555;">長</label>
          <input id="ef-len" type="number" value="${row.Length || 0}" style="width:100%;box-sizing:border-box;padding:7px 10px;border:1px solid #ccc;border-radius:4px;"></div>
        <div><label style="display:block;margin-bottom:4px;color:#555;">寬</label>
          <input id="ef-wid" type="number" value="${row.Width || 0}" style="width:100%;box-sizing:border-box;padding:7px 10px;border:1px solid #ccc;border-radius:4px;"></div>
        <div><label style="display:block;margin-bottom:4px;color:#555;">高</label>
          <input id="ef-hei" type="number" value="${row.Height || 0}" style="width:100%;box-sizing:border-box;padding:7px 10px;border:1px solid #ccc;border-radius:4px;"></div>
        <div style="grid-column:1/-1;"><label style="display:block;margin-bottom:4px;color:#555;">交貨地點</label>
          <input id="ef-addr" value="${row.DeliveryAddress || ''}" style="width:100%;box-sizing:border-box;padding:7px 10px;border:1px solid #ccc;border-radius:4px;"></div>
        <div style="grid-column:1/-1;"><label style="display:block;margin-bottom:4px;color:#555;">產品描述</label>
          <textarea id="ef-desc" rows="6" style="width:100%;box-sizing:border-box;padding:7px 10px;border:1px solid #ccc;border-radius:4px;resize:vertical;">${row.Description || ''}</textarea></div>
        <div style="grid-column:1/-1;">
          <label style="display:block;margin-bottom:8px;color:#555;">圖片</label>
          <div id="ef-photo-grid" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px;"></div>
          <label style="display:inline-block;padding:6px 14px;background:#2980b9;color:#fff;border-radius:4px;cursor:pointer;font-size:12px;">
            + 上傳圖片<input id="ef-upload" type="file" accept="image/jpeg,image/png" multiple style="display:none;">
          </label>
          <span id="ef-upload-status" style="margin-left:10px;font-size:12px;color:#888;"></span>
        </div>
      </div>
      <div style="padding:14px 20px;border-top:1px solid #eee;display:flex;justify-content:flex-end;gap:10px;">
        <button id="tm-edit-cancel" style="padding:7px 20px;border:1px solid #ccc;background:#fff;border-radius:4px;cursor:pointer;">取消</button>
        <button id="tm-edit-save" style="padding:7px 20px;background:#2980b9;color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:bold;">儲存</button>
      </div>`;
    ovl.appendChild(modal);
    document.body.appendChild(ovl);
    const close = () => ovl.remove();
    ovl.querySelector('#tm-edit-close').onclick = close;
    ovl.querySelector('#tm-edit-cancel').onclick = close;
    ovl.addEventListener('click', e => { if (e.target === ovl) close(); });

    let pendingPhotos = [...(row.Photos || [])];
    const renderPhotoGrid = () => {
      const grid = ovl.querySelector('#ef-photo-grid');
      grid.innerHTML = '';
      if (!pendingPhotos.length) { grid.innerHTML = '<span style="color:#aaa;font-size:12px;">無圖片</span>'; return; }
      pendingPhotos.forEach((p, idx) => {
        const wrap = document.createElement('div');
        wrap.style.cssText = 'position:relative;width:100px;height:75px;';
        const img = document.createElement('img');
        img.src = p.Photo;
        img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:4px;border:1px solid #ddd;';
        const del = document.createElement('button');
        del.textContent = '×';
        del.style.cssText = 'position:absolute;top:2px;right:2px;width:20px;height:20px;background:rgba(231,76,60,.85);color:#fff;border:none;border-radius:50%;cursor:pointer;font-size:14px;line-height:1;padding:0;';
        del.onclick = () => { pendingPhotos.splice(idx, 1); renderPhotoGrid(); };
        wrap.append(img, del);
        grid.appendChild(wrap);
      });
    };
    renderPhotoGrid();

    ovl.querySelector('#ef-upload').addEventListener('change', async e => {
      const files = [...e.target.files];
      if (!files.length) return;
      const statusSpan = ovl.querySelector('#ef-upload-status');
      statusSpan.textContent = `上傳中 (0/${files.length})...`;
      let done = 0;
      for (const file of files) {
        try {
          const result = await app.uploadImage(file);
          pendingPhotos.push({ Photo: result.FilePath || result });
          done++;
          statusSpan.textContent = `上傳中 (${done}/${files.length})...`;
          renderPhotoGrid();
        } catch { statusSpan.textContent = `第 ${done + 1} 張上傳失敗`; }
      }
      statusSpan.textContent = `完成 (${done}/${files.length})`;
      e.target.value = '';
    });

    ovl.querySelector('#tm-edit-save').onclick = async () => {
      const saveBtn = ovl.querySelector('#tm-edit-save');
      saveBtn.textContent = '儲存中...'; saveBtn.disabled = true;
      const payload = {
        ...row,
        Photos:          pendingPhotos,
        Name:            ovl.querySelector('#ef-name').value,
        CategoryID:      Number(ovl.querySelector('#ef-cat').value),
        InitPrice:       Number(ovl.querySelector('#ef-init').value),
        OriginPrice:     Number(ovl.querySelector('#ef-init').value),
        MinAddPrice:     row.MinAddPrice,
        StartDate:       toAPIDatetime(ovl.querySelector('#ef-start').value),
        EndDate:         toAPIDatetime(ovl.querySelector('#ef-end').value),
        Length:          Number(ovl.querySelector('#ef-len').value),
        Width:           Number(ovl.querySelector('#ef-wid').value),
        Height:          Number(ovl.querySelector('#ef-hei').value),
        DeliveryAddress: ovl.querySelector('#ef-addr').value,
        Description:     ovl.querySelector('#ef-desc').value,
      };
      try {
        const resp = await fetch(BASE + '/BidMgr/api/Product/UpdateProduct', {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        close(); onSaved?.();
      } catch (e) { saveBtn.textContent = `失敗：${e.message}`; saveBtn.disabled = false; }
    };
  }


  // ─── 圖片燈箱 ──────────────────────────────────────────────────
  function showPhotoModal(name, photos) {
    document.getElementById('tm-photo-modal')?.remove();
    const modal = document.createElement('div');
    modal.id = 'tm-photo-modal';
    modal.onclick = e => { if (e.target === modal) modal.remove(); };
    const title = document.createElement('div');
    title.className = 'tm-photo-title'; title.textContent = name;
    const grid = document.createElement('div');
    grid.className = 'tm-photo-grid';
    if (!photos || !photos.length) {
      grid.innerHTML = '<p style="color:#ccc;font-size:13px;">此商品無圖片</p>';
    } else {
      photos.forEach(p => {
        const img = document.createElement('img');
        img.src = p.Photo; img.loading = 'lazy';
        img.onclick = () => window.open(p.Photo, '_blank');
        grid.appendChild(img);
      });
    }
    const closeEl = document.createElement('div');
    closeEl.className = 'tm-photo-close';
    closeEl.textContent = '點擊背景或此處關閉';
    closeEl.onclick = () => modal.remove();
    modal.append(title, grid, closeEl);
    document.body.appendChild(modal);
  }

  // ─── 打包工具 ──────────────────────────────────────────────────
  async function packPhotos(photos) {
    const result = [];
    for (const p of photos) {
      if (!p.Photo || p.Photo.startsWith('data:image')) { result.push(p); continue; }
      const url = p.Photo.startsWith('http') ? p.Photo : BASE + p.Photo;
      try { result.push({ ...p, Photo: await app.convertImageToBase64(url) }); }
      catch { result.push(p); }
    }
    return result;
  }

  function downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  // ─── 得標者分組排序 ────────────────────────────────────────────
  function sortByWinnerFn(items) {
    return items.sort((a, b) => {
      const aW = !!a.WinnerID, bW = !!b.WinnerID;
      const aB = !aW && (a.HasBids || a.Bidder);
      const bB = !bW && (b.HasBids || b.Bidder);
      if (aW && !bW) return -1;
      if (!aW && bW) return 1;
      if (aB && !bB && !bW) return -1;
      if (!aB && bB && !aW) return 1;
      if (aW && bW) {
        const as = String(a.WinnerID), bs = String(b.WinnerID);
        if (as === bs) return Number(a.AutoID) - Number(b.AutoID);
        return (a.NickName || as).localeCompare(b.NickName || bs, 'zh-TW');
      }
      return Number(b.AutoID) - Number(a.AutoID);
    });
  }

  // ─── 渲染 Table ────────────────────────────────────────────────
  function renderTable(data) {
    const body = document.getElementById('tm-db-main');
    if (!body) return;
    body.style.cssText = 'flex:1;overflow-y:auto;';

    if (!data.length) {
      body.innerHTML = '<p style="color:#999;padding:20px;font-size:13px;">沒有資料。</p>';
      return;
    }

    const fmt   = s => s ? s.slice(0, 10) : '—';
    const money = n => n != null ? `$${Number(n).toLocaleString()}` : '—';
    const now = new Date();
    const isAbandoned = r => r.WinnerID && !r.IsPay && r.Payment?.MaxDate && new Date(r.Payment.MaxDate) < now;

    const bidPrice = row => {
      if (row.IsPay && row.Payment?.TotalAmount) return money(row.Payment.TotalAmount);
      if (row.BidPrice) return money(row.BidPrice);
      if (row.HasBids === false) return '<span style="color:#999;">無競標</span>';
      return '—';
    };

    const bidderCell = row => {
      if (row.WinnerID) {
        const nick = (row.NickName || '').trim(), acct = (row.Account || '').trim();
        const label = nick && acct && nick !== acct ? `${nick}(${acct})` : nick || acct || `#${row.WinnerID}`;
        const ab = isAbandoned(row);
        const badge = ab ? ' <span style="font-size:10px;background:#bdc3c7;color:#fff;padding:1px 5px;border-radius:3px;">棄標</span>' : '';
        return `<span style="color:${ab ? '#7f8c8d' : '#27ae60'};font-weight:600;">${label}</span>${badge}`;
      }
      if (row.HasBids && row.Bidder) return `<span style="color:#2980b9;">${row.Bidder}</span>`;
      if (row.IsFinish && !row.WinnerID) return '<span style="color:#e74c3c;">流標</span>';
      if (row.HasBids === false) return '<span style="color:#999;">無競標</span>';
      return '—';
    };

    const payCell = row => {
      if (row.IsPay)        return '<span style="color:#27ae60;">✓ 已付</span>';
      if (isAbandoned(row)) return '<span style="color:#7f8c8d;font-weight:600;">棄標</span>';
      if (row.WinnerID)     return '<span style="color:#e74c3c;">✗ 未付</span>';
      return '<span style="color:#ccc;">—</span>';
    };

    const getCell = row => {
      if (!row.IsPay) return '<span style="color:#ccc;">—</span>';
      const label = row.IsGet ? '✓ 已取' : '✗ 未取';
      const color = row.IsGet ? '#27ae60' : '#e74c3c';
      return `<button class="tm-get-btn" data-idx="${row.AutoID}" style="padding:2px 10px;border:1px solid ${color};background:#fff;color:${color};border-radius:3px;cursor:pointer;font-size:12px;">${label}</button>`;
    };

    const sorted = isSortedByWinner
      ? sortByWinnerFn([...data])
      : [...data].sort((a, b) => Number(b.AutoID) - Number(a.AutoID));

    const getGroupKey   = r => r.WinnerID ? `w_${r.WinnerID}` : (r.HasBids || r.Bidder) ? 'bidding' : 'nobids';
    const getGroupLabel = r => {
      if (r.WinnerID) {
        const nick = (r.NickName || '').trim(), acct = (r.Account || '').trim();
        const name = nick && acct && nick !== acct ? `${nick}(${acct})` : nick || acct || `#${r.WinnerID}`;
        return `得標者：${name}`;
      }
      return (r.HasBids || r.Bidder) ? '競標中' : '無競標';
    };

    let lastGroupKey = null;
    const rows = sorted.map(row => {
      let groupHeader = '';
      if (isSortedByWinner) {
        const gKey = getGroupKey(row);
        if (gKey !== lastGroupKey) {
          lastGroupKey = gKey;
          let contactHTML = '', editBtnHTML = '';
          if (row.WinnerID && app.SheetSync?.isSynced()) {
            const acct = row.Account || String(row.WinnerID);
            const c = app.SheetSync.getContact(acct);
            if (c) {
              const parts = [];
              if (c.name)   parts.push(`👤 ${c.name}`);
              if (c.phone)  parts.push(`📞 ${c.phone}`);
              if (c.mobile) parts.push(`📱 ${c.mobile}`);
              if (c.note)   parts.push(`📝 ${c.note}`);
              if (parts.length) contactHTML = `<span style="font-weight:normal;margin-left:12px;color:#333;font-size:13px;">${parts.join('　')}</span>`;
            }
            editBtnHTML = `<button class="tm-edit-contact-btn" data-account="${acct}" style="margin-left:8px;padding:1px 7px;font-size:10px;border:1px solid #2980b9;background:#fff;color:#2980b9;border-radius:3px;cursor:pointer;font-weight:normal;vertical-align:middle;">✏ 聯絡人</button>`;
          }
          const isW = !!row.WinnerID, isB = !isW && (row.HasBids || row.Bidder);
          const ac = isW ? '#27ae60' : isB ? '#2980b9' : '#95a5a6';
          const bg = isW ? '#eafaf1' : isB ? '#eaf4fb' : '#f4f4f4';
          const lbl = isW
            ? `<span style="font-size:13px;color:#1a5276;">${getGroupLabel(row)}</span>`
            : `<span style="color:#555;">${getGroupLabel(row)}</span>`;
          groupHeader = `<tr class="tm-group-hdr" style="background:${bg};border-left:4px solid ${ac};"><td colspan="13" style="padding:6px 10px;font-size:12px;font-weight:bold;letter-spacing:.5px;">${lbl}${contactHTML}${editBtnHTML}</td></tr>`;
        }
      }
      return groupHeader + `<tr>
        <td style="white-space:nowrap;">
          <button class="tm-edit-btn" data-idx="${row.AutoID}" title="編輯" style="padding:2px 8px;font-size:11px;border:1px solid #e67e22;background:#fff;color:#e67e22;border-radius:3px;cursor:pointer;">✏</button>
          <button class="tm-clone-btn" data-idx="${row.AutoID}" title="複製建立新商品" style="padding:2px 7px;font-size:11px;border:1px solid #27ae60;background:#fff;color:#27ae60;border-radius:3px;cursor:pointer;margin-left:3px;">⧉</button>
          <button class="tm-pack-btn" data-idx="${row.AutoID}" title="打包匯出" style="padding:2px 7px;font-size:11px;border:1px solid #8e44ad;background:#fff;color:#8e44ad;border-radius:3px;cursor:pointer;margin-left:3px;">↓</button>
          <button class="tm-del-btn" data-idx="${row.AutoID}" title="刪除" style="padding:2px 7px;font-size:11px;border:1px solid #e74c3c;background:#fff;color:#e74c3c;border-radius:3px;cursor:pointer;margin-left:3px;">🗑</button>
        </td>
        <td>${row.AutoID}</td>
        <td style="max-width:220px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${row.Name || ''}">${row.Name || '未命名'}</td>
        <td><button class="tm-name-link" data-idx="${row.AutoID}" style="padding:2px 8px;font-size:11px;border:1px solid #2980b9;background:#fff;color:#2980b9;border-radius:3px;cursor:pointer;">圖片</button></td>
        <td>${row.CategoryName || '—'}</td>
        <td style="text-align:right;">${money(row.InitPrice)}</td>
        <td style="text-align:right;">${bidPrice(row)}</td>
        <td>${fmt(row.StartDate)}</td>
        <td>${fmt(row.EndDate)}</td>
        <td style="text-align:center;">${row.TrackCount || 0}</td>
        <td>${bidderCell(row)}</td>
        <td>${payCell(row)}</td>
        <td>${getCell(row)}</td>
      </tr>`;
    }).join('');

    const th = (label, align = 'left') =>
      `<th style="padding:8px 10px;text-align:${align};white-space:nowrap;">${label}</th>`;

    body.innerHTML = `
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <thead>
          <tr style="background:#2c3e50;color:#fff;position:sticky;top:0;z-index:1;">
            ${th('')}${th('編號')}${th('名稱')}${th('')}${th('類別')}
            ${th('起標價', 'right')}${th('競標價', 'right')}
            ${th('起標日')}${th('截標日')}${th('追蹤', 'center')}
            ${th('得標者/狀態')}${th('付款')}${th('取貨')}
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;

    const indexedData = Object.fromEntries(data.map(r => [r.AutoID, r]));

    let rowIdx = 0;
    body.querySelectorAll('tbody tr').forEach(tr => {
      if (tr.classList.contains('tm-group-hdr')) return;
      tr.style.background = rowIdx++ % 2 === 0 ? '#fff' : '#f7f9fc';
    });

    body.querySelectorAll('.tm-name-link').forEach(el => {
      el.addEventListener('click', () => {
        const row = indexedData[el.dataset.idx];
        if (row) showPhotoModal(row.Name || '未命名', row.Photos || []);
      });
    });

    body.querySelectorAll('.tm-get-btn').forEach(el => {
      el.addEventListener('click', async () => {
        const row = indexedData[el.dataset.idx];
        if (!row) return;
        el.disabled = true; el.textContent = '...';
        try {
          const newIsGet = !row.IsGet;
          await fetch(BASE + '/BidMgr/api/Product/UpdateProduct', {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...row, IsGet: newIsGet })
          });
          row.IsGet = newIsGet;
          const i = products.findIndex(r => r.AutoID === row.AutoID);
          if (i !== -1) products[i].IsGet = newIsGet;
          renderTable(products);
        } catch { el.disabled = false; el.textContent = '失敗'; }
      });
    });

    body.querySelectorAll('.tm-edit-btn').forEach(el => {
      el.addEventListener('click', () => {
        const row = indexedData[el.dataset.idx];
        if (!row) return;
        showEditModal(row, () => {
          if (startInputEl && endInputEl) handleFetch(startInputEl, endInputEl);
        });
      });
    });

    body.querySelectorAll('.tm-clone-btn').forEach(el => {
      el.addEventListener('click', async () => {
        const row = indexedData[el.dataset.idx];
        if (!row) return;
        el.textContent = '...'; el.disabled = true;
        const payload = {
          CategoryID:      row.CategoryID,
          Name:            row.Name,
          Description:     row.Description || '',
          InitPrice:       row.InitPrice,
          OriginPrice:     row.OriginPrice || row.InitPrice,
          MinAddPrice:     row.MinAddPrice || 10,
          StartDate:       row.StartDate,
          EndDate:         row.EndDate,
          DistID:          row.DistID || '231',
          DeliveryAddress: row.DeliveryAddress || '',
          Length:          row.Length || 0,
          Width:           row.Width || 0,
          Height:          row.Height || 0,
          Photos:          row.Photos || [],
        };
        try {
          const resp = await fetch(BASE + '/BidMgr/api/Product/AddProduct', {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
          });
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          statusEl.textContent = `已複製：${row.Name}`;
          if (startInputEl && endInputEl) handleFetch(startInputEl, endInputEl);
        } catch (e) {
          statusEl.textContent = `複製失敗：${e.message}`;
        } finally {
          el.textContent = '⧉'; el.disabled = false;
        }
      });
    });

    body.querySelectorAll('.tm-pack-btn').forEach(el => {
      el.addEventListener('click', async () => {
        const row = indexedData[el.dataset.idx];
        if (!row) return;
        el.textContent = '...'; el.disabled = true;
        try {
          const photos = await packPhotos(row.Photos || []);
          downloadJSON({ ...row, Photos: photos }, `${row.Name || `item_${row.AutoID}`}_package.json`);
        } catch { el.textContent = '✗'; }
        finally { el.textContent = '↓'; el.disabled = false; }
      });
    });

    body.querySelectorAll('.tm-del-btn').forEach(el => {
      el.addEventListener('click', async () => {
        const row = indexedData[el.dataset.idx];
        if (!row) return;
        if (!confirm(`確定要刪除「${row.Name || '此商品'}」？\n此操作無法復原。`)) return;
        el.textContent = '...'; el.disabled = true;
        try {
          await app.deleteProductAPI(row);
          products = products.filter(r => r.AutoID !== row.AutoID);
          statusEl.textContent = `已刪除：${row.Name || row.AutoID}`;
          renderTable(getDisplayData());
        } catch (e) { el.innerHTML = '🗑'; el.disabled = false; statusEl.textContent = `刪除失敗：${e.message}`; }
      });
    });

    body.querySelectorAll('.tm-edit-contact-btn').forEach(el => {
      el.addEventListener('click', () => {
        const account = el.dataset.account;
        showEditContactModal(account, app.SheetSync?.getContact(account) || null);
      });
    });
  }

  // ─── 取得顯示資料 ──────────────────────────────────────────────
  function getDisplayData() {
    if (!activeFilter.conditions.length) return products;
    return app.QueryBuilder.applyFilter(products, activeFilter.conditions, activeFilter.logic);
  }

  // ─── 查詢 ──────────────────────────────────────────────────────
  async function handleFetch(startInput, endInput) {
    const start = startInput.value.trim(), end = endInput.value.trim();
    if (!start || !end) { statusEl.textContent = '請填入日期範圍'; return; }
    statusEl.textContent = '查詢中...';
    setFeatureBtnsEnabled(false);
    products = [];
    try {
      const raw = await app.getProducts(start, end);
      statusEl.textContent = `共 ${raw.length} 筆，補充競標資料中...`;
      renderTable(raw);
      products = await app.enrichWithBids(raw);
      const display = getDisplayData();
      statusEl.textContent = display.length < products.length
        ? `共 ${products.length} 筆（篩選後：${display.length} 筆）`
        : `共 ${products.length} 筆`;
      setFeatureBtnsEnabled(true);
      renderTable(display);
      qbInstance?.setCount(display.length, products.length);
    } catch (e) { statusEl.textContent = `查詢失敗：${e.message}`; }
  }

  // ─── 功能：刷新截標日 ──────────────────────────────────────────
  async function handleRefreshEndDate(btn) {
    const targets = getDisplayData();
    if (!targets.length) return;
    const days = Math.max(1, parseInt(document.getElementById('tm-refresh-days')?.value || '7', 10));
    if (!confirm(`確定要將 ${targets.length} 筆商品的截標日期刷新為 ${days} 天後？`)) return;
    btn.textContent = '執行中...'; btn.disabled = true;
    let done = 0, failed = 0;
    for (const item of targets) {
      try { await app.updateProductEndDate(item, days); done++; }
      catch { failed++; }
      statusEl.textContent = `刷新截標日：${done + failed} / ${targets.length}`;
    }
    btn.textContent = '執行'; btn.disabled = false;
    statusEl.textContent = failed ? `刷新完成：${done} 筆成功，${failed} 筆失敗` : `已刷新 ${done} 筆截標日`;
    if (startInputEl && endInputEl) handleFetch(startInputEl, endInputEl);
  }

  // ─── 功能：批量刪除 ────────────────────────────────────────────
  async function handleBatchDelete(btn) {
    const targets = getDisplayData();
    if (!targets.length) { statusEl.textContent = '無資料'; return; }
    if (!confirm(`確定要刪除篩選結果的 ${targets.length} 筆商品？\n此操作無法復原。`)) return;
    btn.textContent = '刪除中...'; btn.disabled = true;
    let done = 0, failed = 0;
    for (const item of targets) {
      try { await app.deleteProductAPI(item); products = products.filter(r => r.AutoID !== item.AutoID); done++; }
      catch { failed++; }
      statusEl.textContent = `刪除中：${done + failed} / ${targets.length}`;
    }
    btn.textContent = '執行'; btn.disabled = false;
    statusEl.textContent = failed ? `刪除完成：${done} 筆成功，${failed} 筆失敗` : `已刪除 ${done} 筆`;
    renderTable(getDisplayData());
  }

  // ─── 功能：批量打包匯出 ────────────────────────────────────────
  async function handleBatchPack(btn) {
    const targets = getDisplayData();
    if (!targets.length) { statusEl.textContent = '無資料可匯出'; return; }
    app.showDownloadSettingsWarning(async () => {
      btn.textContent = '處理中...'; btn.disabled = true;
      for (let i = 0; i < targets.length; i++) {
        statusEl.textContent = `打包中 ${i + 1} / ${targets.length}...`;
        const row = targets[i];
        const photos = await packPhotos(row.Photos || []);
        downloadJSON({ ...row, Photos: photos }, `${row.Name || `item_${row.AutoID}`}_package.json`);
        await new Promise(r => setTimeout(r, 200));
      }
      statusEl.textContent = `打包完成，共 ${targets.length} 筆`;
      btn.textContent = '執行'; btn.disabled = false;
    });
    const w = document.getElementById('download-settings-warning');
    if (w) w.style.zIndex = '10010';
  }

  // ─── 功能：設定（分割畫面）────────────────────────────────────
  function openSettingsSplit() {
    const outerBody = document.querySelector('.tm-db-body');
    if (!outerBody) return;
    const mainEl = document.getElementById('tm-db-main');
    outerBody.style.cssText = 'flex:1;overflow:hidden;display:flex;';
    outerBody.innerHTML = '';
    const left = document.createElement('div');
    left.style.cssText = 'flex:1;overflow:hidden;display:flex;flex-direction:column;min-width:0;';
    if (mainEl) left.appendChild(mainEl);
    const right = document.createElement('div');
    right.style.cssText = 'width:380px;border-left:2px solid #e0e0e0;display:flex;flex-direction:column;background:#fafafa;flex-shrink:0;overflow:hidden;';
    outerBody.appendChild(left);
    outerBody.appendChild(right);

    const rHeader = document.createElement('div');
    rHeader.style.cssText = 'background:#2c3e50;color:#fff;padding:8px 10px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;font-size:12px;';
    rHeader.innerHTML = `<span style="font-weight:bold;">系統設定</span><span id="tm-settings-close" style="cursor:pointer;font-size:14px;opacity:.7;">×</span>`;
    const rContent = document.createElement('div');
    rContent.style.cssText = 'overflow-y:auto;flex:1;padding:14px;font-size:13px;';
    right.appendChild(rHeader);
    right.appendChild(rContent);

    const isValidUrl = s => { try { new URL(s); return true; } catch { return false; } };
    const ls    = (k, d) => { try { return localStorage.getItem(k) || d; } catch { return d; } };
    const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch {} };
    const DEFAULT_WEBHOOK  = 'https://580.blias.com/daobo/files.php?format=json';
    const DEFAULT_CONTACTS = 'https://580.blias.com/daobo/contacts.php';
    const DEFAULT_API_KEY  = 'furniture-helper-2024-secret';

    const mkSection = (title, bg) => {
      const sec = document.createElement('div');
      sec.style.cssText = `background:${bg};border-radius:6px;padding:12px;margin-bottom:12px;`;
      const h = document.createElement('div');
      h.style.cssText = 'font-weight:bold;font-size:13px;color:#333;margin-bottom:10px;';
      h.textContent = title; sec.appendChild(h);
      return sec;
    };
    const mkField = (label, id, value, type = 'text') => {
      const wrap = document.createElement('div');
      wrap.style.cssText = 'margin-bottom:8px;';
      wrap.innerHTML = `<label style="display:block;font-size:12px;color:#555;margin-bottom:3px;">${label}</label>
        <input type="${type}" id="${id}" value="${value}" style="width:100%;box-sizing:border-box;padding:5px 8px;border:1px solid #ccc;border-radius:4px;font-size:12px;">`;
      return wrap;
    };
    const mkBtn = (label, color, id) => {
      const btn = document.createElement('button');
      btn.id = id; btn.textContent = label;
      btn.style.cssText = `padding:5px 12px;background:${color};color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px;`;
      return btn;
    };
    const mkBtnRow = (...btns) => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;';
      btns.forEach(b => row.appendChild(b));
      return row;
    };

    const webhookSec = mkSection('📦 遠端匯入 Webhook', '#f8f9fa');
    webhookSec.appendChild(mkField('Webhook 網址', 'tm-s-webhook', ls('furniture-helper-webhook-url', DEFAULT_WEBHOOK), 'url'));
    const wSave = mkBtn('儲存', '#2980b9', 'tm-s-webhook-save');
    const wReset = mkBtn('重置', '#7f8c8d', 'tm-s-webhook-reset');
    const wTest  = mkBtn('測試連線', '#27ae60', 'tm-s-webhook-test');
    webhookSec.appendChild(mkBtnRow(wSave, wReset, wTest));
    rContent.appendChild(webhookSec);

    const contactSec = mkSection('👤 聯絡人 API', '#fff8e1');
    contactSec.appendChild(mkField('API 網址', 'tm-s-contacts-url', ls('furniture-helper-contacts-api-url', DEFAULT_CONTACTS), 'url'));
    contactSec.appendChild(mkField('API Key', 'tm-s-contacts-key', ls('furniture-helper-contacts-api-key', DEFAULT_API_KEY)));
    const cSave = mkBtn('儲存', '#2980b9', 'tm-s-contacts-save');
    const cReset = mkBtn('重置', '#7f8c8d', 'tm-s-contacts-reset');
    const cTest  = mkBtn('測試連線', '#27ae60', 'tm-s-contacts-test');
    contactSec.appendChild(mkBtnRow(cSave, cReset, cTest));
    rContent.appendChild(contactSec);

    const linkSec = mkSection('🔗 快速連結', '#e7f3ff');
    [
      ['Files.php',    () => { const u = new URL(ls('furniture-helper-webhook-url', DEFAULT_WEBHOOK)); window.open(`${u.protocol}//${u.host}${u.pathname}`, '_blank'); }],
      ['聯絡人管理',   () => window.open(ls('furniture-helper-contacts-api-url', DEFAULT_CONTACTS), '_blank')],
      ['官方發布網頁', () => window.open('https://580.blias.com/install/', '_blank')],
      ['GitHub',       () => window.open('https://github.com/AnimeggUnity/furniture-helper', '_blank')],
    ].forEach(([label, fn]) => {
      const btn = document.createElement('button');
      btn.textContent = label;
      btn.style.cssText = 'width:100%;padding:6px;margin-bottom:6px;background:#fff;border:1px solid #ccc;border-radius:4px;cursor:pointer;font-size:12px;text-align:left;';
      btn.onclick = fn;
      linkSec.appendChild(btn);
    });
    rContent.appendChild(linkSec);

    rHeader.querySelector('#tm-settings-close').onclick = () => {
      const main = document.getElementById('tm-db-main');
      outerBody.style.cssText = 'flex:1;overflow:hidden;display:flex;flex-direction:column;';
      outerBody.innerHTML = '';
      if (main) outerBody.appendChild(main);
    };

    wSave.onclick = () => { const url = rContent.querySelector('#tm-s-webhook').value.trim(); if (!isValidUrl(url)) { statusEl.textContent = '請輸入有效網址'; return; } lsSet('furniture-helper-webhook-url', url); statusEl.textContent = 'Webhook 已儲存'; };
    wReset.onclick = () => { rContent.querySelector('#tm-s-webhook').value = DEFAULT_WEBHOOK; lsSet('furniture-helper-webhook-url', DEFAULT_WEBHOOK); statusEl.textContent = 'Webhook 已重置'; };
    wTest.onclick = async () => {
      const url = rContent.querySelector('#tm-s-webhook').value.trim();
      if (!isValidUrl(url)) { statusEl.textContent = '請輸入有效網址'; return; }
      wTest.textContent = '測試中...'; wTest.disabled = true;
      try { const r = await fetch(url); const d = r.ok ? await r.json() : null; statusEl.textContent = r.ok ? `Webhook 連線成功，${Array.isArray(d) ? d.length : 0} 筆` : `連線失敗：${r.status}`; }
      catch (e) { statusEl.textContent = `連線錯誤：${e.message}`; }
      finally { wTest.textContent = '測試連線'; wTest.disabled = false; }
    };
    cSave.onclick = () => { const url = rContent.querySelector('#tm-s-contacts-url').value.trim(); const key = rContent.querySelector('#tm-s-contacts-key').value.trim(); if (!isValidUrl(url) || !key) { statusEl.textContent = '請填寫完整欄位'; return; } lsSet('furniture-helper-contacts-api-url', url); lsSet('furniture-helper-contacts-api-key', key); if (app.SheetSync?.reloadSettings) app.SheetSync.reloadSettings(); statusEl.textContent = '聯絡人 API 已儲存'; };
    cReset.onclick = () => { rContent.querySelector('#tm-s-contacts-url').value = DEFAULT_CONTACTS; rContent.querySelector('#tm-s-contacts-key').value = DEFAULT_API_KEY; lsSet('furniture-helper-contacts-api-url', DEFAULT_CONTACTS); lsSet('furniture-helper-contacts-api-key', DEFAULT_API_KEY); if (app.SheetSync?.reloadSettings) app.SheetSync.reloadSettings(); statusEl.textContent = '聯絡人 API 已重置'; };
    cTest.onclick = async () => {
      const url = rContent.querySelector('#tm-s-contacts-url').value.trim();
      const key = rContent.querySelector('#tm-s-contacts-key').value.trim();
      if (!isValidUrl(url) || !key) { statusEl.textContent = '請填寫完整欄位'; return; }
      cTest.textContent = '測試中...'; cTest.disabled = true;
      try { const r = await fetch(`${url}?action=get_contacts&apiKey=${encodeURIComponent(key)}`); const d = r.ok ? await r.json() : null; statusEl.textContent = (r.ok && d?.success) ? `聯絡人 API 連線成功，${d.contacts?.length || 0} 位` : `連線失敗：${d?.error || r.status}`; }
      catch (e) { statusEl.textContent = `連線錯誤：${e.message}`; }
      finally { cTest.textContent = '測試連線'; cTest.disabled = false; }
    };
  }

  // ─── 功能：遠端匯入 ────────────────────────────────────────────
  async function handleRemoteImport() {
    statusEl.textContent = '連線遠端中...';
    try {
      const resp = await fetch(app.getCurrentWebhookUrl());
      if (!resp.ok) throw new Error(`無法取得清單: ${resp.statusText}`);
      const files = await resp.json();
      if (!files?.length) { statusEl.textContent = '遠端目前無資料'; return; }
      statusEl.textContent = `遠端共 ${files.length} 筆`;
      openRemoteImportSplit(files);
    } catch (e) { statusEl.textContent = `遠端連線失敗：${e.message}`; }
  }

  function openRemoteImportSplit(files) {
    const outerBody = document.querySelector('.tm-db-body');
    if (!outerBody) return;
    files.sort((a, b) => new Date(b.date) - new Date(a.date));
    const mainEl = document.getElementById('tm-db-main');
    outerBody.style.cssText = 'flex:1;overflow:hidden;display:flex;';
    outerBody.innerHTML = '';
    const left = document.createElement('div');
    left.style.cssText = 'flex:1;overflow:hidden;display:flex;flex-direction:column;min-width:0;';
    if (mainEl) left.appendChild(mainEl);
    const right = document.createElement('div');
    right.style.cssText = 'width:360px;border-left:2px solid #e0e0e0;display:flex;flex-direction:column;background:#fafafa;flex-shrink:0;overflow:hidden;';
    outerBody.appendChild(left);
    outerBody.appendChild(right);

    const rHeader = document.createElement('div');
    rHeader.style.cssText = 'background:#2c3e50;color:#fff;padding:8px 10px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;font-size:12px;';
    rHeader.innerHTML = `<span style="font-weight:bold;white-space:nowrap;">遠端匯入（${files.length} 筆）</span><span id="tm-remote-close" style="cursor:pointer;font-size:14px;opacity:.7;">×</span>`;
    const rToolbar = document.createElement('div');
    rToolbar.style.cssText = 'padding:9px 12px;border-bottom:1px solid #e0e0e0;display:flex;gap:8px;align-items:center;flex-shrink:0;background:#fff;';
    rToolbar.innerHTML = `
      <input id="tm-remote-search" type="text" placeholder="搜尋..." style="flex:1;padding:5px 8px;border:1px solid #ccc;border-radius:4px;font-size:12px;">
      <label style="display:flex;align-items:center;gap:4px;font-size:12px;color:#555;white-space:nowrap;">
        競標 <input id="tm-remote-days" type="number" value="14" min="1" max="90" style="width:42px;padding:4px 5px;border:1px solid #ccc;border-radius:4px;font-size:12px;text-align:center;"> 天
      </label>`;
    const listEl = document.createElement('div');
    listEl.style.cssText = 'overflow-y:auto;flex:1;';
    right.appendChild(rHeader); right.appendChild(rToolbar); right.appendChild(listEl);

    rHeader.querySelector('#tm-remote-close').onclick = () => {
      const main = document.getElementById('tm-db-main');
      outerBody.style.cssText = 'flex:1;overflow:hidden;display:flex;flex-direction:column;';
      outerBody.innerHTML = ''; if (main) outerBody.appendChild(main);
    };

    const renderList = (filter = '') => {
      const filtered = filter ? files.filter(f => (f.title || '').toLowerCase().includes(filter)) : files;
      listEl.innerHTML = '';
      filtered.forEach((f, i) => {
        const row = document.createElement('div');
        row.style.cssText = `display:flex;align-items:center;gap:10px;padding:9px 12px;background:${i % 2 === 0 ? '#fff' : '#f7f9fc'};border-bottom:1px solid #eee;`;
        row.innerHTML = `
          <div style="flex:1;min-width:0;">
            <div style="font-weight:600;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${f.title || '未命名'}</div>
            <div style="font-size:11px;color:#888;margin-top:2px;">$${f.price || 0} ｜ ${(f.date || '').slice(0, 10)}</div>
          </div>
          <button class="tm-remote-import-btn" style="padding:4px 10px;background:#27ae60;color:#fff;border:none;border-radius:3px;cursor:pointer;font-size:11px;white-space:nowrap;flex-shrink:0;">匯入</button>`;
        row.querySelector('.tm-remote-import-btn').onclick = async e => {
          const btn = e.currentTarget;
          btn.textContent = '處理中...'; btn.disabled = true;
          try {
            await importRemoteFile(f);
            btn.textContent = '✓ 完成'; btn.style.background = '#95a5a6';
            if (startInputEl && endInputEl) handleFetch(startInputEl, endInputEl);
          } catch (err) { btn.textContent = '失敗'; btn.disabled = false; statusEl.textContent = `匯入失敗：${err.message}`; }
        };
        listEl.appendChild(row);
      });
    };
    renderList();
    rToolbar.querySelector('#tm-remote-search').oninput = e => renderList(e.target.value.trim().toLowerCase());
  }

  async function importRemoteFile(fileInfo) {
    const pad = n => String(n).padStart(2, '0');
    statusEl.textContent = `下載中：${fileInfo.title || ''}`;
    const baseUrl = app.getCurrentWebhookUrl().split('?')[0];
    const resp = await fetch(`${baseUrl}?action=download&file=${fileInfo.filename}`);
    if (!resp.ok) throw new Error(`無法下載：${resp.statusText}`);
    const jsonData = await resp.json();
    if (jsonData.Photos?.length) {
      for (let i = 0; i < jsonData.Photos.length; i++) {
        statusEl.textContent = `處理圖片 ${i + 1}/${jsonData.Photos.length}`;
        const photo = jsonData.Photos[i];
        if (photo.Photo?.startsWith('data:image')) {
          const file = app.optimizedBase64ToFile(photo.Photo, `image_${i + 1}.jpg`);
          const result = await app.uploadImage(file);
          jsonData.Photos[i] = { ...photo, Photo: result.FilePath || result };
        }
      }
    }
    const days = parseInt(document.getElementById('tm-remote-days')?.value, 10) || 14;
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end   = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days);
    const fmt = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} 00:00:00`;
    jsonData.StartDate = fmt(start); jsonData.EndDate = fmt(end);
    statusEl.textContent = `送出中：${fileInfo.title || ''}`;
    await app.directSubmitToAPI(jsonData);
    statusEl.textContent = `匯入完成：${fileInfo.title || ''}`;
  }

  function handleSingleImport() {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;
      try { showImportPreviewModal(JSON.parse(await file.text())); }
      catch (e) { statusEl.textContent = `讀取失敗：${e.message}`; }
    };
    input.click();
  }

  async function handleMultiImport() {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json'; input.multiple = true;
    input.onchange = async () => {
      const files = Array.from(input.files);
      if (!files.length) return;
      statusEl.textContent = '讀取中...';
      const items = [];
      for (const file of files) {
        try { items.push(JSON.parse(await file.text())); }
        catch { statusEl.textContent = `${file.name} 格式錯誤，已略過`; }
      }
      if (items.length) showMultiImportModal(items);
    };
    input.click();
  }

  function showMultiImportModal(items) {
    document.getElementById('tm-multi-import-modal')?.remove();
    const pad = n => String(n).padStart(2, '0');
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    const ovl = document.createElement('div');
    ovl.id = 'tm-multi-import-modal';
    ovl.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10010;display:flex;align-items:center;justify-content:center;';
    const modal = document.createElement('div');
    modal.style.cssText = 'background:#fff;border-radius:8px;width:580px;max-height:85vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,.3);font-size:13px;';
    const listHTML = items.map((d, i) => `
      <label style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-bottom:1px solid #f0f0f0;cursor:pointer;">
        <input type="checkbox" class="tm-multi-chk" data-idx="${i}" checked style="transform:scale(1.1);">
        <span style="flex:1;font-weight:500;">${d.Name || '未命名'}</span>
        <span style="color:#888;font-size:12px;">${d.CategoryName || '—'}</span>
        <span style="color:#27ae60;font-size:12px;min-width:60px;text-align:right;">$${Number(d.InitPrice || 0).toLocaleString()}</span>
      </label>`).join('');
    modal.innerHTML = `
      <div style="background:#2c3e50;color:#fff;padding:14px 20px;border-radius:8px 8px 0 0;display:flex;justify-content:space-between;align-items:center;">
        <span style="font-weight:bold;font-size:14px;">多筆匯入（共 ${items.length} 筆）</span>
        <span id="tm-mi-close" style="cursor:pointer;font-size:18px;opacity:.7;">×</span>
      </div>
      <div style="padding:20px;">
        <div style="border:1px solid #e0e0e0;border-radius:6px;max-height:280px;overflow-y:auto;margin-bottom:16px;">
          <div style="padding:8px 12px;background:#f7f9fc;border-bottom:1px solid #e0e0e0;display:flex;justify-content:space-between;align-items:center;">
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-weight:600;">
              <input type="checkbox" id="tm-mi-all" checked style="transform:scale(1.1);">全選
            </label>
            <span id="tm-mi-count" style="color:#888;font-size:12px;">已選 ${items.length} 筆</span>
          </div>
          ${listHTML}
        </div>
        <div style="background:#e7f3ff;border:1px solid #b3d9ff;border-radius:6px;padding:14px;margin-bottom:16px;">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-weight:600;margin-bottom:10px;">
            <input type="checkbox" id="tm-mi-override" style="transform:scale(1.2);">覆寫競標日期
          </label>
          <div id="tm-mi-date-opts" style="display:none;padding-left:4px;">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
              <span style="color:#555;">起標日</span>
              <input type="date" id="tm-mi-start" value="${todayStr}" style="padding:5px 8px;border:1px solid #ccc;border-radius:4px;font-size:13px;">
              <span style="color:#555;">競標</span>
              <input type="number" id="tm-mi-days" value="14" min="1" max="90" style="width:55px;padding:5px 8px;border:1px solid #ccc;border-radius:4px;font-size:13px;text-align:center;">
              <span style="color:#555;">天</span>
            </div>
          </div>
        </div>
        <div id="tm-mi-progress" style="display:none;padding:10px;background:#f7f9fc;border-radius:4px;margin-bottom:12px;font-size:13px;color:#555;"></div>
        <div style="display:flex;justify-content:flex-end;gap:10px;">
          <button id="tm-mi-cancel" style="padding:7px 20px;border:1px solid #ccc;background:#fff;border-radius:4px;cursor:pointer;">取消</button>
          <button id="tm-mi-confirm" style="padding:7px 20px;background:#27ae60;color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:bold;">開始匯入</button>
        </div>
      </div>`;
    ovl.appendChild(modal); document.body.appendChild(ovl);
    const close = () => ovl.remove();
    ovl.querySelector('#tm-mi-close').onclick = close;
    ovl.querySelector('#tm-mi-cancel').onclick = close;
    ovl.addEventListener('click', e => { if (e.target === ovl) close(); });
    const updateCount = () => {
      const n = ovl.querySelectorAll('.tm-multi-chk:checked').length;
      ovl.querySelector('#tm-mi-count').textContent = `已選 ${n} 筆`;
      ovl.querySelector('#tm-mi-all').checked = n === items.length;
      ovl.querySelector('#tm-mi-all').indeterminate = n > 0 && n < items.length;
    };
    ovl.querySelector('#tm-mi-all').onchange = e => { ovl.querySelectorAll('.tm-multi-chk').forEach(c => { c.checked = e.target.checked; }); updateCount(); };
    ovl.querySelectorAll('.tm-multi-chk').forEach(c => c.onchange = updateCount);
    ovl.querySelector('#tm-mi-override').onchange = e => { ovl.querySelector('#tm-mi-date-opts').style.display = e.target.checked ? 'block' : 'none'; };
    ovl.querySelector('#tm-mi-confirm').onclick = async () => {
      const selected = [...ovl.querySelectorAll('.tm-multi-chk:checked')].map(c => items[c.dataset.idx]);
      if (!selected.length) return;
      const confirmBtn = ovl.querySelector('#tm-mi-confirm');
      const cancelBtn  = ovl.querySelector('#tm-mi-cancel');
      const progress   = ovl.querySelector('#tm-mi-progress');
      confirmBtn.disabled = true; cancelBtn.disabled = true; progress.style.display = 'block';
      const overrideChecked = ovl.querySelector('#tm-mi-override').checked;
      let startDate, days;
      if (overrideChecked) {
        startDate = ovl.querySelector('#tm-mi-start').value;
        days = parseInt(ovl.querySelector('#tm-mi-days').value, 10) || 14;
      }
      let done = 0, failed = 0;
      for (let i = 0; i < selected.length; i++) {
        const d = selected[i];
        const pad2 = n => String(n).padStart(2, '0');
        progress.textContent = `匯入中 ${i + 1} / ${selected.length}：${d.Name || '未命名'}`;
        let importData = { ...d };
        if (overrideChecked) {
          const s = new Date(startDate);
          const e = new Date(s.getFullYear(), s.getMonth(), s.getDate() + days);
          const fmt = dt => `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())} 00:00:00`;
          importData.StartDate = fmt(s); importData.EndDate = fmt(e);
        }
        try { await app.directSubmitToAPI(importData); done++; }
        catch { failed++; }
        if (i < selected.length - 1) await new Promise(r => setTimeout(r, 800));
      }
      progress.textContent = failed ? `完成：${done} 筆成功，${failed} 筆失敗` : `全部匯入完成，共 ${done} 筆`;
      statusEl.textContent = progress.textContent;
      confirmBtn.textContent = '關閉'; confirmBtn.disabled = false;
      confirmBtn.onclick = close; cancelBtn.disabled = false;
      if (startInputEl && endInputEl) handleFetch(startInputEl, endInputEl);
    };
  }

  function showImportPreviewModal(data) {
    document.getElementById('tm-import-modal')?.remove();
    const pad = n => String(n).padStart(2, '0');
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    const ovl = document.createElement('div');
    ovl.id = 'tm-import-modal';
    ovl.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10010;display:flex;align-items:center;justify-content:center;';
    const modal = document.createElement('div');
    modal.style.cssText = 'background:#fff;border-radius:8px;width:540px;max-height:85vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,.3);font-size:13px;';
    const photos = data.Photos || [];
    const photoHTML = photos.slice(0, 4).map(p =>
      `<img src="${p.Photo}" style="width:80px;height:60px;object-fit:cover;border-radius:4px;border:1px solid #ddd;">`
    ).join('') || '<span style="color:#aaa;">無圖片</span>';
    modal.innerHTML = `
      <div style="background:#2c3e50;color:#fff;padding:14px 20px;border-radius:8px 8px 0 0;display:flex;justify-content:space-between;align-items:center;">
        <span style="font-weight:bold;font-size:14px;">匯入商品預覽</span>
        <span id="tm-import-close" style="cursor:pointer;font-size:18px;opacity:.7;">×</span>
      </div>
      <div style="padding:20px;">
        <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:16px;">
          <tr><td style="padding:5px 8px;color:#888;width:70px;">品名</td><td style="padding:5px 8px;font-weight:600;">${data.Name || '—'}</td></tr>
          <tr style="background:#f7f9fc;"><td style="padding:5px 8px;color:#888;">類別</td><td style="padding:5px 8px;">${data.CategoryName || '—'}</td></tr>
          <tr><td style="padding:5px 8px;color:#888;">起標價</td><td style="padding:5px 8px;">$${Number(data.InitPrice || 0).toLocaleString()}</td></tr>
          <tr style="background:#f7f9fc;"><td style="padding:5px 8px;color:#888;">尺寸</td><td style="padding:5px 8px;">${data.Length || 0} × ${data.Width || 0} × ${data.Height || 0} cm</td></tr>
          <tr><td style="padding:5px 8px;color:#888;">圖片</td><td style="padding:5px 8px;"><div style="display:flex;gap:6px;flex-wrap:wrap;">${photoHTML}</div></td></tr>
        </table>
        <div style="background:#e7f3ff;border:1px solid #b3d9ff;border-radius:6px;padding:14px;margin-bottom:16px;">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-weight:600;margin-bottom:10px;">
            <input type="checkbox" id="tm-import-override" style="transform:scale(1.2);">覆寫競標日期
          </label>
          <div id="tm-import-date-opts" style="display:none;padding-left:4px;">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
              <span style="color:#555;">起標日</span>
              <input type="date" id="tm-import-start" value="${todayStr}" style="padding:5px 8px;border:1px solid #ccc;border-radius:4px;font-size:13px;">
              <span style="color:#555;">競標</span>
              <input type="number" id="tm-import-days" value="14" min="1" max="90" style="width:55px;padding:5px 8px;border:1px solid #ccc;border-radius:4px;font-size:13px;text-align:center;">
              <span style="color:#555;">天</span>
            </div>
          </div>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:10px;">
          <button id="tm-import-cancel" style="padding:7px 20px;border:1px solid #ccc;background:#fff;border-radius:4px;cursor:pointer;">取消</button>
          <button id="tm-import-confirm" style="padding:7px 20px;background:#27ae60;color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:bold;">確認匯入</button>
        </div>
      </div>`;
    ovl.appendChild(modal); document.body.appendChild(ovl);
    const close = () => ovl.remove();
    ovl.querySelector('#tm-import-close').onclick = close;
    ovl.querySelector('#tm-import-cancel').onclick = close;
    ovl.addEventListener('click', e => { if (e.target === ovl) close(); });
    ovl.querySelector('#tm-import-override').onchange = e => {
      ovl.querySelector('#tm-import-date-opts').style.display = e.target.checked ? 'block' : 'none';
    };
    ovl.querySelector('#tm-import-confirm').onclick = async () => {
      const confirmBtn = ovl.querySelector('#tm-import-confirm');
      confirmBtn.textContent = '匯入中...'; confirmBtn.disabled = true;
      let importData = { ...data };
      if (ovl.querySelector('#tm-import-override').checked) {
        const pad2 = n => String(n).padStart(2, '0');
        const startVal = ovl.querySelector('#tm-import-start').value;
        const days = parseInt(ovl.querySelector('#tm-import-days').value, 10) || 14;
        const s = new Date(startVal);
        const e = new Date(s.getFullYear(), s.getMonth(), s.getDate() + days);
        const fmt = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} 00:00:00`;
        importData.StartDate = fmt(s); importData.EndDate = fmt(e);
      }
      try {
        await app.directSubmitToAPI(importData);
        close(); statusEl.textContent = `匯入成功：${data.Name || '商品'}`;
        if (startInputEl && endInputEl) handleFetch(startInputEl, endInputEl);
      } catch (e) { confirmBtn.textContent = '確認匯入'; confirmBtn.disabled = false; statusEl.textContent = `匯入失敗：${e.message}`; }
    };
  }

  // ─── 渲染統計 ──────────────────────────────────────────────────
  function renderStats(data) {
    const body = document.getElementById('tm-db-main');
    if (!body) return;
    body.style.cssText = 'flex:1;overflow-y:auto;padding:20px;';

    const now = new Date();
    const isAbandoned = r => r.WinnerID && !r.IsPay && r.Payment?.MaxDate && new Date(r.Payment.MaxDate) < now;
    const total    = data.length;
    const won      = data.filter(r => r.WinnerID).length;
    const paid     = data.filter(r => r.IsPay).length;
    const got      = data.filter(r => r.IsGet).length;
    const unpaid   = data.filter(r => r.WinnerID && !r.IsPay && !isAbandoned(r)).length;
    const abandoned = data.filter(isAbandoned).length;
    const revenue  = data.filter(r => r.IsPay).reduce((s, r) => s + (r.Payment?.TotalAmount || 0), 0);

    const getQuarter = month => {
      if (month === 3 || month === 4) return 'Q1（3–4月）';
      if (month >= 5 && month <= 7)   return 'Q2（5–7月）';
      if (month >= 8 && month <= 10)  return 'Q3（8–10月）';
      return 'Q4（11–2月）';
    };
    const buildQuarterMap = dateField => {
      const map = {};
      data.forEach(row => {
        const dateStr = (row[dateField] || '').slice(0, 7);
        if (!dateStr) return;
        const [calYear, calMonth] = dateStr.split('-').map(Number);
        const fiscalYear = calMonth <= 2 ? calYear - 1 : calYear;
        const quarter = getQuarter(calMonth);
        const qKey = `${fiscalYear}|${quarter}`;
        if (!map[qKey]) map[qKey] = { year: String(fiscalYear), quarter, total: 0, won: 0, paid: 0, got: 0, revenue: 0 };
        const q = map[qKey];
        q.total++;
        if (row.WinnerID) q.won++;
        if (row.IsPay) { q.paid++; q.revenue += row.Payment?.TotalAmount || 0; }
        if (row.IsGet) q.got++;
      });
      return map;
    };
    const quarterOrder = ['Q1（3–4月）', 'Q2（5–7月）', 'Q3（8–10月）', 'Q4（11–2月）'];
    const buildQuarterTableHTML = qMap => {
      const years = [...new Set(Object.values(qMap).map(q => q.year))].sort((a, b) => b - a);
      if (!years.length) return '<p style="color:#aaa;font-size:12px;">無資料</p>';
      return years.map(year => {
        const quarters = quarterOrder.map(qLabel => qMap[`${year}|${qLabel}`] || { quarter: qLabel, total: 0, won: 0, paid: 0, got: 0, revenue: 0 });
        const yearTotal   = quarters.reduce((s, q) => s + q.total, 0);
        const yearRevenue = quarters.reduce((s, q) => s + q.revenue, 0);
        const qCells = quarters.map(q => `
          <td style="padding:10px 14px;border:1px solid #e0e0e0;vertical-align:top;background:#fff;min-width:120px;">
            <div style="font-size:20px;font-weight:bold;color:#2c3e50;">${q.total}<span style="font-size:11px;font-weight:normal;color:#aaa;"> 筆</span></div>
            <div style="font-size:11px;color:#555;margin-top:4px;line-height:1.8;">得標 ${q.won}　付款 ${q.paid}　取貨 ${q.got}<br><span style="color:#27ae60;font-weight:600;">$${q.revenue.toLocaleString()}</span></div>
          </td>`).join('');
        return `<tr style="background:#f0f2f5;">
          <td style="padding:10px 14px;border:1px solid #e0e0e0;font-weight:bold;font-size:13px;color:#2c3e50;white-space:nowrap;vertical-align:middle;">
            ${year} 年<br><span style="font-size:11px;font-weight:normal;color:#888;">${yearTotal} 筆 / $${yearRevenue.toLocaleString()}</span>
          </td>${qCells}</tr>`;
      }).join('');
    };
    const quarterBlock = (title, color, dateField) => {
      const qMap = buildQuarterMap(dateField);
      return `
        <div style="font-size:13px;font-weight:bold;color:${color};margin-bottom:8px;">${title}</div>
        <div style="margin-bottom:24px;overflow-x:auto;">
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead><tr style="background:${color};color:#fff;">
              <th style="padding:8px 14px;text-align:left;">年度</th>
              <th style="padding:8px 14px;text-align:center;">Q1（3–4月）</th>
              <th style="padding:8px 14px;text-align:center;">Q2（5–7月）</th>
              <th style="padding:8px 14px;text-align:center;">Q3（8–10月）</th>
              <th style="padding:8px 14px;text-align:center;">Q4（11–2月）</th>
            </tr></thead>
            <tbody>${buildQuarterTableHTML(qMap)}</tbody>
          </table>
        </div>`;
    };

    const byMonth = {};
    data.forEach(row => {
      const month = (row.EndDate || '').slice(0, 7);
      if (!month) return;
      if (!byMonth[month]) byMonth[month] = { total: 0, won: 0, paid: 0, got: 0, revenue: 0 };
      const m = byMonth[month];
      m.total++;
      if (row.WinnerID) m.won++;
      if (row.IsPay) { m.paid++; m.revenue += row.Payment?.TotalAmount || 0; }
      if (row.IsGet) m.got++;
    });
    const monthRows = Object.keys(byMonth).sort().reverse().map((month, i) => {
      const m = byMonth[month];
      return `<tr style="background:${i % 2 === 0 ? '#fff' : '#f7f9fc'};">
        <td style="padding:7px 12px;border-bottom:1px solid #eee;">${month}</td>
        <td style="padding:7px 12px;border-bottom:1px solid #eee;text-align:center;">${m.total}</td>
        <td style="padding:7px 12px;border-bottom:1px solid #eee;text-align:center;">${m.won}</td>
        <td style="padding:7px 12px;border-bottom:1px solid #eee;text-align:center;">${m.paid}</td>
        <td style="padding:7px 12px;border-bottom:1px solid #eee;text-align:center;">${m.got}</td>
        <td style="padding:7px 12px;border-bottom:1px solid #eee;text-align:right;">$${m.revenue.toLocaleString()}</td>
      </tr>`;
    }).join('');

    const cardStyle = bg => `background:${bg};color:#fff;border-radius:8px;padding:14px 18px;min-width:110px;text-align:center;`;
    body.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
        <button id="tm-db-back" style="padding:5px 14px;border:1px solid #ccc;background:#fff;border-radius:4px;cursor:pointer;font-size:13px;">← 返回列表</button>
        <span style="font-size:14px;font-weight:bold;color:#2c3e50;">年度統計</span>
        <span style="font-size:12px;color:#888;margin-left:4px;">收入合計：<strong style="color:#27ae60;">$${revenue.toLocaleString()}</strong></span>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:24px;">
        <div style="${cardStyle('#2c3e50')}"><div style="font-size:22px;font-weight:bold;">${total}</div><div style="font-size:11px;opacity:.8;">總筆數</div></div>
        <div style="${cardStyle('#8e44ad')}"><div style="font-size:22px;font-weight:bold;">${won}</div><div style="font-size:11px;opacity:.8;">已得標</div></div>
        <div style="${cardStyle('#27ae60')}"><div style="font-size:22px;font-weight:bold;">${paid}</div><div style="font-size:11px;opacity:.8;">已付款</div></div>
        <div style="${cardStyle('#2980b9')}"><div style="font-size:22px;font-weight:bold;">${got}</div><div style="font-size:11px;opacity:.8;">已取貨</div></div>
        <div style="${cardStyle('#e74c3c')}"><div style="font-size:22px;font-weight:bold;">${unpaid}</div><div style="font-size:11px;opacity:.8;">未付款</div></div>
        <div style="${cardStyle('#7f8c8d')}"><div style="font-size:22px;font-weight:bold;">${abandoned}</div><div style="font-size:11px;opacity:.8;">棄標</div></div>
      </div>
      ${quarterBlock('📅 建立時間分布（上傳件數）', '#4A90E2', 'CreateDate')}
      ${quarterBlock('🎯 截標時間分布（結標件數）', '#ff6b35', 'EndDate')}
      <div style="font-size:13px;font-weight:bold;color:#2c3e50;margin-bottom:8px;">月份明細（依截標日）</div>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead><tr style="background:#2c3e50;color:#fff;">
          <th style="padding:8px 12px;text-align:left;">月份</th>
          <th style="padding:8px 12px;text-align:center;">總筆數</th>
          <th style="padding:8px 12px;text-align:center;">已得標</th>
          <th style="padding:8px 12px;text-align:center;">已付款</th>
          <th style="padding:8px 12px;text-align:center;">已取貨</th>
          <th style="padding:8px 12px;text-align:right;">收入</th>
        </tr></thead>
        <tbody>${monthRows}</tbody>
      </table>`;
    document.getElementById('tm-db-back').onclick = () => renderTable(products);
  }

  async function handleStats(btn) {
    btn.textContent = '載入中...'; btn.disabled = true;
    try { renderStats(await app.enrichWithBids(products)); }
    finally { btn.textContent = '年度統計'; btn.disabled = false; }
  }

  async function handlePrint(btn) {
    btn.textContent = '列印中...'; btn.disabled = true;
    try { window.print(); }
    finally { btn.textContent = '列印表格'; btn.disabled = false; }
  }

  function handleExport() {
    if (!products.length) return;
    app.exportToCSV?.(products);
  }

  // ══════════════════════════════════════════════════════════════
  // UI Builders
  // ══════════════════════════════════════════════════════════════

  function mkPanel() {
    const panel = document.createElement('div');
    panel.className = 'tm-v2-panel';
    const inner = document.createElement('div');
    panel.appendChild(inner);
    return { panel, inner };
  }

  // ─── Header ────────────────────────────────────────────────────
  function buildHeader() {
    const el = document.createElement('div');
    el.style.cssText = 'display:flex;align-items:center;gap:12px;padding:11px 20px;background:#2c3e50;color:#fff;flex-shrink:0;';
    el.innerHTML = `
      <span style="font-size:16px;font-weight:700;letter-spacing:.3px;">新北再生家具後台</span>
      <span style="font-size:11px;font-weight:500;background:rgba(255,255,255,.18);
        color:rgba(255,255,255,.9);padding:3px 10px;border-radius:20px;
        letter-spacing:.5px;white-space:nowrap;">獨立控制頁面版</span>`;
    return el;
  }

  // ─── Toolbar ────────────────────────────────────────────────────
  function buildToolbar(dates) {
    const el = document.createElement('div');
    el.style.cssText = 'display:flex;align-items:center;flex-wrap:wrap;gap:8px;padding:9px 20px;border-bottom:1px solid #e0e0e0;background:#fff;flex-shrink:0;';

    const mkDateInput = value => {
      const input = document.createElement('input');
      input.type = 'date'; input.value = value;
      input.style.cssText = 'padding:5px 8px;width:138px;cursor:pointer;outline:none;border:1px solid #d1d5db;border-radius:4px;font-size:13px;';
      input.onfocus = () => input.style.borderColor = '#3498db';
      input.onblur  = () => input.style.borderColor = '';
      return input;
    };

    startInputEl = mkDateInput(dates.start);
    endInputEl   = mkDateInput(dates.end);

    const fetchBtn = document.createElement('button');
    fetchBtn.textContent = '查詢';
    fetchBtn.style.cssText = 'padding:5px 18px;background:#3498db;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:13px;transition:background .15s;';
    fetchBtn.onmouseenter = () => fetchBtn.style.background = '#2980b9';
    fetchBtn.onmouseleave = () => fetchBtn.style.background = '#3498db';
    fetchBtn.onclick = () => handleFetch(startInputEl, endInputEl);

    statusEl = document.createElement('span');
    statusEl.style.cssText = 'font-size:13px;margin-left:4px;color:#888;';
    statusEl.textContent = '尚未查詢';

    const sep = document.createElement('span');
    sep.style.cssText = 'color:#e0e0e0;margin:0 2px;user-select:none;';
    sep.textContent = '|';

    const mkQuick = (label, months) => {
      const btn = document.createElement('button');
      btn.textContent = label;
      btn.style.cssText = 'padding:4px 10px;border:1px solid #ddd;background:#f5f5f5;border-radius:4px;cursor:pointer;font-size:12px;transition:background .1s,border-color .1s;';
      btn.onmouseenter = () => { btn.style.background = '#e8eaed'; btn.style.borderColor = '#bbb'; };
      btn.onmouseleave = () => { btn.style.background = '#f5f5f5'; btn.style.borderColor = '#ddd'; };
      btn.onclick = () => {
        const end = new Date();
        const start = new Date(end.getFullYear(), end.getMonth() - months, end.getDate());
        const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        startInputEl.value = fmt(start);
        endInputEl.value   = fmt(end);
        handleFetch(startInputEl, endInputEl);
      };
      return btn;
    };

    el.append(startInputEl, endInputEl, fetchBtn, statusEl, sep,
      mkQuick('1個月', 1), mkQuick('3個月', 3), mkQuick('6個月', 6), mkQuick('1年', 12));
    return el;
  }

  // ─── Batch Panel 內容 ───────────────────────────────────────────
  function buildBatchContent(container) {
    container.style.cssText = 'padding:12px 20px;';

    const mkActionRow = label => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:8px;';
      const lbl = document.createElement('span');
      lbl.textContent = label;
      lbl.style.cssText = 'font-size:13px;color:#555;min-width:80px;flex-shrink:0;';
      row.appendChild(lbl);
      return row;
    };

    const mkExecBtn = (color) => {
      const btn = document.createElement('button');
      btn.textContent = '執行';
      btn.disabled = true;
      btn.style.cssText = `padding:4px 16px;background:${color};color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:13px;opacity:.4;transition:opacity .15s;`;
      featureBtns.push(btn);
      return btn;
    };

    const refreshRow = mkActionRow('刷新截標日');
    const refreshBtn = mkExecBtn('#e67e22');
    refreshBtn.onclick = () => handleRefreshEndDate(refreshBtn);
    const daysInput = document.createElement('input');
    daysInput.id = 'tm-refresh-days'; daysInput.type = 'number';
    daysInput.value = '7'; daysInput.min = '1'; daysInput.max = '365';
    daysInput.style.cssText = 'width:48px;padding:4px 6px;border:1px solid #ccc;border-radius:4px;font-size:12px;text-align:center;';
    const daysLbl = document.createElement('span');
    daysLbl.textContent = '天後截標';
    daysLbl.style.cssText = 'font-size:12px;color:#888;';
    refreshRow.append(refreshBtn, daysInput, daysLbl);
    container.appendChild(refreshRow);

    const deleteRow = mkActionRow('批量刪除');
    const deleteBtn = mkExecBtn('#e74c3c');
    deleteBtn.onclick = () => handleBatchDelete(deleteBtn);
    deleteRow.append(deleteBtn);
    container.appendChild(deleteRow);

    const packRow = mkActionRow('打包匯出');
    const packBtn = mkExecBtn('#8e44ad');
    packBtn.onclick = () => handleBatchPack(packBtn);
    packRow.append(packBtn);
    container.appendChild(packRow);

    const importRow = mkActionRow('匯入商品');
    const mkImportBtn = (label, color, handler) => {
      const btn = document.createElement('button');
      btn.textContent = label;
      btn.style.cssText = `padding:4px 14px;background:${color};color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:13px;transition:opacity .1s;`;
      btn.onmouseenter = () => btn.style.opacity = '.85';
      btn.onmouseleave = () => btn.style.opacity = '1';
      btn.onclick = handler;
      return btn;
    };
    importRow.append(
      mkImportBtn('單筆匯入', '#27ae60', handleSingleImport),
      mkImportBtn('多筆匯入', '#2980b9', handleMultiImport),
      mkImportBtn('遠端匯入', '#8e44ad', handleRemoteImport),
    );
    container.appendChild(importRow);
  }

  // ─── View Panel 內容 ────────────────────────────────────────────
  function buildViewContent(container) {
    container.style.cssText = 'padding:12px 20px;display:flex;gap:8px;flex-wrap:wrap;';

    const mkViewBtn = (label, color, handler) => {
      const btn = document.createElement('button');
      btn.textContent = label;
      btn.disabled = true;
      btn.style.cssText = `padding:5px 16px;background:${color};color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:13px;opacity:.4;transition:opacity .15s;`;
      btn.onclick = () => handler(btn);
      featureBtns.push(btn);
      return btn;
    };

    const winnerSortBtn = document.createElement('button');
    winnerSortBtn.textContent = '得標者分組';
    winnerSortBtn.disabled = true;
    winnerSortBtn.style.cssText = 'padding:5px 16px;background:#7f8c8d;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:13px;opacity:.4;transition:all .15s;';
    winnerSortBtn.onclick = () => {
      isSortedByWinner = !isSortedByWinner;
      winnerSortBtn.style.background = isSortedByWinner ? '#2c3e50' : '#7f8c8d';
      winnerSortBtn.textContent = isSortedByWinner ? '得標者分組 ✓' : '得標者分組';
      renderTable(getDisplayData());
      if (isSortedByWinner && app.SheetSync && !app.SheetSync.isSynced()) {
        statusEl.textContent = '同步聯絡人中...';
        app.SheetSync.syncContacts()
          .then(ok => {
            statusEl.textContent = ok ? '聯絡人同步完成' : '聯絡人同步失敗';
            if (isSortedByWinner) renderTable(getDisplayData());
          })
          .catch(() => { statusEl.textContent = '聯絡人同步失敗'; });
      }
    };
    featureBtns.push(winnerSortBtn);

    container.append(
      mkViewBtn('年度統計', '#2980b9', handleStats),
      mkViewBtn('列印表格', '#27ae60', handlePrint),
      mkViewBtn('匯出CSV',  '#16a085', () => handleExport()),
      winnerSortBtn,
    );
  }

  // ─── FeatureBar（含三個 Panel）─────────────────────────────────
  function buildFeatureBar() {
    const featureBarEl = document.createElement('div');
    featureBarEl.style.cssText = 'display:flex;align-items:center;gap:8px;padding:8px 20px;border-bottom:1px solid #e0e0e0;background:#fff;flex-shrink:0;';

    const { panel: qbPanel,    inner: qbInner    } = mkPanel();
    const { panel: batchPanel, inner: batchInner } = mkPanel();
    const { panel: viewPanel,  inner: viewInner  } = mkPanel();

    qbInner.style.cssText = 'padding:14px 20px;';
    const qbContainer = document.createElement('div');
    qbContainer.style.maxWidth = '760px';
    qbInner.appendChild(qbContainer);
    qbInstance = app.QueryBuilder.buildQueryBuilder(qbContainer, (conditions, logic) => {
      activeFilter = { conditions, logic };
      const display = getDisplayData();
      qbInstance.setCount(display.length, products.length);
      renderTable(display);
    });

    buildBatchContent(batchInner);
    buildViewContent(viewInner);

    const allPanels = [qbPanel, batchPanel, viewPanel];
    const allToggleBtns = [];

    const ACTIVE_STYLE   = 'padding:5px 16px;background:#2c3e50;color:#fff;border:1px solid #2c3e50;border-radius:4px;cursor:pointer;font-size:13px;transition:all .15s;';
    const INACTIVE_STYLE = 'padding:5px 16px;background:#f0f0f0;color:#333;border:1px solid #ddd;border-radius:4px;cursor:pointer;font-size:13px;transition:all .15s;';

    const mkToggleBtn = (label, panel) => {
      const btn = document.createElement('button');
      btn.textContent = label;
      btn.style.cssText = INACTIVE_STYLE;
      btn.onclick = () => {
        const isOpen = panel.classList.contains('open');
        allPanels.forEach(p => p.classList.remove('open'));
        allToggleBtns.forEach(b => { b.style.cssText = INACTIVE_STYLE; });
        if (!isOpen) { panel.classList.add('open'); btn.style.cssText = ACTIVE_STYLE; }
      };
      allToggleBtns.push(btn);
      return btn;
    };

    const settingsBtn = document.createElement('button');
    settingsBtn.textContent = '⚙ 設定';
    settingsBtn.style.cssText = INACTIVE_STYLE + 'margin-left:auto;';
    settingsBtn.onclick = () => {
      allPanels.forEach(p => p.classList.remove('open'));
      allToggleBtns.forEach(b => { b.style.cssText = INACTIVE_STYLE; });
      openSettingsSplit();
    };

    featureBarEl.append(
      mkToggleBtn('篩選', qbPanel),
      mkToggleBtn('批次操作', batchPanel),
      mkToggleBtn('檢視', viewPanel),
      settingsBtn,
    );

    return { featureBarEl, qbPanel, batchPanel, viewPanel };
  }

  // ─── 初始化 ────────────────────────────────────────────────────
  function init() {
    const dates = getPageDates();

    const { featureBarEl, qbPanel, batchPanel, viewPanel } = buildFeatureBar();

    const bodyEl = document.createElement('div');
    bodyEl.className = 'tm-db-body';
    bodyEl.style.cssText = 'flex:1;overflow:hidden;display:flex;flex-direction:column;';
    bodyEl.innerHTML = '<div id="tm-db-main" style="flex:1;overflow-y:auto;padding:20px;"><p style="color:#999;font-size:13px;">填入日期後點「查詢」取得資料，再使用上方功能按鈕。</p></div>';

    document.body.append(buildHeader(), buildToolbar(dates), featureBarEl, qbPanel, batchPanel, viewPanel, bodyEl);
  }

  document.addEventListener('DOMContentLoaded', init);

})(window.FurnitureHelper = window.FurnitureHelper || {});
