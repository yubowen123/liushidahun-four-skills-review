/* Public production records, rendered as text to preserve the frozen prompts. */
(() => {
  'use strict';
  let dataset = null;
  let currentClipId = null;
  const $ = id => document.getElementById(id);
  const labels = {'漫剧老李':'漫剧老李','DramaSkills':'DramaSkills','李先生':'李先生','yyyskills':'yyyskills'};
  function el(tag, text, cls) {
    const n = document.createElement(tag);
    if (text !== undefined && text !== null) n.textContent = String(text);
    if (cls) n.className = cls;
    return n;
  }
  function link(url, text) {
    const a = el('a', text); a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer'; return a;
  }
  function promptBox(prompt, title) {
    const details = el('details');
    details.append(el('summary', title));
    if (typeof prompt === 'string' && prompt.length) {
      const pre = el('pre', prompt, 'actual-prompt');
      const copy = el('button', '复制原文'); copy.type = 'button';
      copy.addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(prompt); copy.textContent = '已复制'; }
        catch (_) { const r = document.createRange(); r.selectNodeContents(pre); const s = window.getSelection(); s.removeAllRanges(); s.addRange(r); copy.textContent = '已选中原文，请复制'; }
      });
      details.append(copy, pre);
    } else details.append(el('p', '本地记录未解析到该资产的生成提示词，未补写或推断。', 'caption'));
    return details;
  }
  function assetCard(a, reference) {
    const c = el('article', null, 'card reference-card');
    const title = reference ? (a.marker || ('参考 ' + a.order)) + ' · ' + (a.name || a.id || '素材') : (a.name || a.id || '资产');
    c.append(el('h4', title));
    if (a.id) c.append(el('p', a.id, 'caption'));
    const url = a.url;
    if (typeof url === 'string' && /^https:\/\//.test(url)) {
      const isAudio = /audio|音频/i.test(a.kind || '') || /\.(mp3|wav|m4a|aac)(\?|$)/i.test(url);
      if (isAudio) { const audio = el('audio'); audio.controls = true; audio.preload = 'none'; audio.src = url; c.append(audio); }
      else { const image = el('img'); image.src = a.thumbnailUrl || url; image.alt = a.name || a.id || '实际参考素材'; image.loading = 'lazy'; image.decoding = 'async'; image.addEventListener('error', () => { image.alt = '预览暂不可用，请打开原始素材链接'; }); c.append(image); }
      c.append(link(url, isAudio ? '打开实际音频' : '打开实际原图'));
    } else c.append(el('p', '当前记录未提供可公开打开的素材地址。', 'caption'));
    if (a.kind) c.append(el('p', '类型：' + a.kind, 'caption'));
    if (a.model) c.append(el('p', [a.model,a.resolution,a.aspect].filter(Boolean).join(' · '), 'caption'));
    if (a.duty) c.append(el('p', '参考职责：' + a.duty));
    if (!reference && Array.isArray(a.usedByClips)) c.append(el('p', a.usedByClips.length ? '用于 ' + a.usedByClips.length + ' 个原片：' + a.usedByClips.join('、') : '未出现在本次78原片的参考绑定中。', 'caption'));
    if (a.archived) c.append(el('p', '归档旧版；不代表当前仿真人视频已使用。', 'pill'));
    if (a.unresolved) c.append(el('p', '引用仍有未解析项，未据此补造素材。', 'caption'));
    if (!a.prompt && /截图|snapshot|frame/i.test(a.kind || '')) c.append(el('p', '这是实际前片截图，没有另行出图提示词。', 'caption'));
    else c.append(promptBox(a.prompt, '查看该资产的真实生成提示词'));
    return c;
  }
  window.renderProductionEvidence = (_route, clipId) => {
    currentClipId = clipId;
    if (!dataset) return;
    const c = dataset.clips.find(x => x.id === clipId);
    const box = $('production-evidence-content'); box.replaceChildren();
    if (!c) { box.append(el('p', '未找到此片段的冻结记录。')); return; }
    $('production-evidence-title').textContent = c.branch + ' · ' + c.id + ' 的真实输入';
    const audioText = c.generateAudio === false ? '该原片未生成声音，完整片声音路径见报告' : c.generateAudio === true ? '视频原生声音' : c.technical && c.technical.audioStreams > 0 ? '实际原片含音轨，请求未显式记录声音开关' : '声音开关未记录'; const meta = ['Seedance 2.5', c.duration + '秒', c.resolution, c.aspect, c.mode, audioText];
    box.append(el('p', meta.filter(Boolean).join(' · '), 'caption'));
    const p = promptBox(c.prompt, '查看本段实际提交的视频提示词'); p.open = true; box.append(p);
    const refs = c.references || [];
    box.append(el('h3', '实际绑定参考 · ' + refs.length + '项'));
    box.append(el('p', '按本段实际绑定次序展示。生成资产、真实前片截图和音频分别标明；没有把未入模的故事板补作视频参考。', 'caption'));
    const grid = el('div', null, 'reference-grid'); refs.forEach(a => grid.append(assetCard(a, true))); box.append(grid);
    if (c.note) box.append(el('p', c.note, 'note'));
  };
  function renderAssets() {
    if (!dataset) return;
    const branch = $('asset-route-filter').value;
    const query = $('asset-search').value.trim().toLowerCase();
    const list = dataset.assets.filter(a => (!branch || a.branch === branch) && (!query || [a.id,a.name,a.prompt].filter(Boolean).join(' ').toLowerCase().includes(query)));
    $('asset-result-count').textContent = '当前 ' + list.length + ' / ' + dataset.assets.length + ' 张仿真人图片；包括补充与修订版本。';
    const grid = $('all-assets-grid'); grid.replaceChildren(); list.forEach(a => grid.append(assetCard(a, false)));
  }
  window.renderMasterProductionEvidence = routeKey => {
    if (!dataset) return;
    const branch = {laoli:'漫剧老李',drama:'DramaSkills',mrli:'李先生',yyy:'yyyskills'}[routeKey];
    const clips = dataset.clips.filter(c=>c.branch===branch);
    $('production-evidence-title').textContent = branch + ' · 完整成片的输入';
    const box = $('production-evidence-content'); box.replaceChildren();
    box.append(el('p', '当前播放完整成片，由下列 ' + clips.length + ' 个原片按序组成。选择任一段，即可查看该段原片、实际提示词与参考。', 'note'));
    const nav = el('div',null,'controls');
    clips.forEach((c,n)=>{const b=el('button',c.id);b.type='button';b.addEventListener('click',()=>loadClip(n));nav.append(b)});
    box.append(nav);
  };
  const embedded = document.getElementById('production-evidence-json');
  const ready = embedded ? Promise.resolve(JSON.parse(embedded.textContent)) : fetch('evidence-data.json?v=20261108-real-only').then(r => { if (!r.ok) throw Error('HTTP ' + r.status); return r.json(); });
  ready.then(data => {
    dataset = data;
    $('evidence-load-status').textContent = '已载入 ' + data.clips.length + ' 段真实视频提示词与 ' + data.assets.length + ' 张库存资产记录。';
    const select = $('asset-route-filter');
    [...new Set(data.assets.map(a => a.branch))].forEach(b => { const o = el('option', labels[b] || b); o.value = b; select.append(o); });
    select.addEventListener('change', renderAssets); $('asset-search').addEventListener('input', renderAssets);
    renderAssets();
    const id = currentClipId || (typeof playlists !== 'undefined' ? playlists[route][index].id : data.clips[0].id);
    if (typeof master !== 'undefined' && master) window.renderMasterProductionEvidence(route);
    else window.renderProductionEvidence(null, id);
  }).catch(() => { $('evidence-load-status').textContent = '生产记录暂未载入，请刷新页面；完整分析与成片仍可查看。'; });
})();
