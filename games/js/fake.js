/* =========================================================================
   摸鱼司 · 假装工作
   三种伪装，按 Tab 轮换，记住上次用的那种：
     sheet  表格：选中格会自己挪、公式栏跟着变，还有一位同事的光标在别处编辑
     code   代码：编辑器里光标在闪，底部终端的测试一行一行跑完
     notes  会议纪要：文档末尾的光标慢慢打字
   全部是通用样式，不模仿任何真实软件的名字和标志。
   动起来的东西都很慢：这是给老板看的，不是给自己看的。
   ========================================================================= */
(function (w) {
  'use strict';
  var MG = w.MG;

  var KINDS = ['sheet', 'code', 'notes'];
  var KEY = 'mg.fake';
  var root = null;
  var timers = [];
  var current = 'sheet';

  try { var saved = w.localStorage.getItem(KEY); if (KINDS.indexOf(saved) >= 0) current = saved; } catch (e) {}

  function L() { return MG.i18n && MG.i18n.lang === 'en' ? 'en' : 'zh'; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
  function every(fn, ms) { timers.push(setInterval(fn, ms)); }
  function stopAll() { timers.forEach(function (t) { clearTimeout(t); clearInterval(t); }); timers = []; }
  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + MG.pad2(d.getMonth() + 1) + '-' + MG.pad2(d.getDate());
  }

  /* ---------------------------------------------------------------- 文案 */
  var T = {
    zh: {
      sheetFile: '2026 Q4 经营数据汇总',
      menus: ['文件', '编辑', '视图', '插入', '格式', '数据', '工具', '帮助'],
      share: '共享',
      saved: '所有更改已保存',
      cols: ['区域', '负责人', 'Q3 实际', 'Q4 目标', '达成率', '环比', '渠道费用', '近 6 周', '备注'],
      regions: ['华东', '华南', '华北', '西南', '华中', '西北', '东北', '海外'],
      owners: ['王成', '李静', '张磊', '陈曦', '刘洋', '赵敏', '孙浩', '周婷'],
      remarks: ['', '待复核', '', '口径调整', '', '', '新渠道', '汇率按月均'],
      total: '合计',
      tabs: ['汇总', '区域明细', '数据源', '校验'],
      ready: '就绪',
      sum: '求和', avg: '平均值', count: '计数',
      chart: '季度达成（%）',
      editing: '正在编辑',
      codeExplorer: '资源管理器',
      codeTerminal: '终端', codeProblems: '问题', codeOutput: '输出',
      notesFile: '周会纪要 ' + today(),
      notes: {
        title: '周会纪要',
        meta: today() + ' · 10:00–10:45 · 3 号会议室',
        people: '参会：王成、李静、张磊、陈曦、刘洋',
        h1: '一、上周进展',
        p1: ['华东、华北 Q4 达成率超过 90%，西南因口径调整暂按 87.5% 计。', '新渠道上线两周，转化率 3.2%，略高于预期。', '数据源迁移完成，旧报表下周一停更。'],
        h2: '二、本周重点',
        p2: ['渠道费用复核（财务周三前给结论）', '区域明细表补齐近 6 周趋势', '准备月度经营分析会材料'],
        h3: '三、待办',
        todo: [['王成', '确认西南口径，周三前同步'], ['李静', '更新渠道费用表'], ['张磊', '整理客户反馈 Top 10']],
        comment: '@王成 这里的数据和财务口径再对一下？',
        commentBy: '李静',
        typing: '下周会议改到周四上午，地点不变。'
      },
      hintCycle: 'Tab 换一个', hintBack: 'Esc 返回'
    },
    en: {
      sheetFile: 'Q4 2026 Operating Summary',
      menus: ['File', 'Edit', 'View', 'Insert', 'Format', 'Data', 'Tools', 'Help'],
      share: 'Share',
      saved: 'All changes saved',
      cols: ['Region', 'Owner', 'Q3 actual', 'Q4 target', 'Attainment', 'MoM', 'Channel cost', 'Last 6 wks', 'Notes'],
      regions: ['East', 'South', 'North', 'Southwest', 'Central', 'Northwest', 'Northeast', 'Overseas'],
      owners: ['C. Wang', 'J. Li', 'L. Zhang', 'X. Chen', 'Y. Liu', 'M. Zhao', 'H. Sun', 'T. Zhou'],
      remarks: ['', 'to review', '', 'restated', '', '', 'new channel', 'FX monthly avg'],
      total: 'Total',
      tabs: ['Summary', 'By region', 'Source', 'Checks'],
      ready: 'Ready',
      sum: 'Sum', avg: 'Average', count: 'Count',
      chart: 'Quarterly attainment (%)',
      editing: 'editing',
      codeExplorer: 'EXPLORER',
      codeTerminal: 'TERMINAL', codeProblems: 'PROBLEMS', codeOutput: 'OUTPUT',
      notesFile: 'Weekly sync ' + today(),
      notes: {
        title: 'Weekly sync — notes',
        meta: today() + ' · 10:00–10:45 · Room 3',
        people: 'Attendees: C. Wang, J. Li, L. Zhang, X. Chen, Y. Liu',
        h1: '1. Last week',
        p1: ['East and North are above 90% of Q4 target; Southwest is counted at 87.5% after the restatement.', 'The new channel has been live for two weeks at a 3.2% conversion rate, slightly above plan.', 'Data source migration is done; the old report stops updating next Monday.'],
        h2: '2. This week',
        p2: ['Review channel costs (finance to confirm by Wednesday)', 'Add the six-week trend to the regional sheet', 'Prepare the monthly business review deck'],
        h3: '3. Action items',
        todo: [['C. Wang', 'Confirm the Southwest numbers by Wednesday'], ['J. Li', 'Update the channel cost sheet'], ['L. Zhang', 'Summarise the top 10 customer issues']],
        comment: '@C. Wang can we double-check this against finance?',
        commentBy: 'J. Li',
        typing: 'Next week’s sync moves to Thursday morning, same room.'
      },
      hintCycle: 'Tab to switch', hintBack: 'Esc to return'
    }
  };

  /* -------------------------------------------------------------- 表格 */
  var DATA = [
    [1284.6, 1420.0, 6.2, 184.2], [986.2, 1050.0, 4.8, 142.7], [1102.4, 1180.0, 3.1, 151.0], [612.8, 700.0, 2.4, 96.4],
    [742.5, 800.0, 3.9, 101.8], [388.1, 430.0, 1.7, 58.3], [455.9, 520.0, -0.8, 66.1], [530.2, 560.0, 5.6, 88.9]
  ];
  var COLS = 'ABCDEFGHIJKL'.split('');

  function fmt(n) { return n.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }); }

  function spark(i) {
    var pts = [];
    for (var k = 0; k < 6; k++) pts.push((k * 12) + ',' + (14 - ((Math.sin(i * 1.7 + k * 0.9) + 1) * 5 + k * 0.6)).toFixed(1));
    return '<svg class="fk-spark" viewBox="0 0 62 16"><polyline points="' + pts.join(' ') + '"/></svg>';
  }

  function renderSheet(t) {
    var rows = '';
    var totQ3 = 0, totQ4 = 0, totCost = 0;
    DATA.forEach(function (d, i) {
      totQ3 += d[0]; totQ4 += d[1]; totCost += d[3];
      var rate = d[0] / d[1] * 100;
      rows += '<tr><th>' + (i + 2) + '</th>' +
        '<td class="l">' + esc(t.regions[i]) + '</td><td class="l">' + esc(t.owners[i]) + '</td>' +
        '<td data-c="C' + (i + 2) + '">' + fmt(d[0]) + '</td><td>' + fmt(d[1]) + '</td>' +
        '<td class="' + (rate >= 90 ? 'good' : 'warn') + '">' + rate.toFixed(1) + '%</td>' +
        '<td class="' + (d[2] >= 0 ? 'up' : 'down') + '">' + (d[2] >= 0 ? '+' : '') + d[2].toFixed(1) + '%</td>' +
        '<td>' + fmt(d[3]) + '</td><td class="c">' + spark(i) + '</td><td class="l muted">' + esc(t.remarks[i]) + '</td>' +
        '<td></td><td></td><td></td></tr>';
    });
    rows += '<tr class="tot"><th>10</th><td class="l">' + esc(t.total) + '</td><td class="l">—</td><td>' + fmt(totQ3) + '</td><td>' + fmt(totQ4) +
      '</td><td>' + (totQ3 / totQ4 * 100).toFixed(1) + '%</td><td class="up">+3.8%</td><td>' + fmt(totCost) + '</td><td></td><td></td><td></td><td></td><td></td></tr>';
    for (var r = 11; r <= 34; r++) rows += '<tr><th>' + r + '</th>' + new Array(13).join('<td></td>') + '</tr>';

    var head = '<tr><th></th>' + COLS.map(function (c) { return '<th>' + c + '</th>'; }).join('') + '</tr>' +
      '<tr class="hdr"><th>1</th>' + t.cols.map(function (c) { return '<td class="l">' + esc(c) + '</td>'; }).join('') + '<td></td><td></td><td></td></tr>';

    var bars = [78, 84, 81, 88, 86, 91].map(function (v, i) {
      return '<rect x="' + (14 + i * 30) + '" y="' + (100 - v) + '" width="18" height="' + v + '" rx="2"/>';
    }).join('');

    return '' +
      '<div class="fk-app fk-sheet">' +
      '<div class="fk-title"><span class="fk-logo sheet"></span><b>' + esc(t.sheetFile) + '</b><span class="fk-star">☆</span>' +
      '<span class="fk-saved">' + esc(t.saved) + '</span><span class="fk-sp"></span>' +
      '<span class="fk-avatars"><i style="background:#c98f72">李</i><i style="background:#7f9cc4">张</i></span>' +
      '<span class="fk-share">' + esc(t.share) + '</span></div>' +
      '<div class="fk-menu">' + t.menus.map(function (m) { return '<span>' + esc(m) + '</span>'; }).join('') + '</div>' +
      '<div class="fk-tools"><span>↶</span><span>↷</span><span>100%</span><i></i><span>¥</span><span>%</span><span>.0</span><i></i><span>Sans</span><span>10</span><i></i><b>B</b><em>I</em><u>U</u><i></i><span>⊞</span><span>≡</span></div>' +
      '<div class="fk-fx"><span class="fk-ref">C2</span><span class="fk-fxi">fx</span><span class="fk-formula">1284.6</span></div>' +
      '<div class="fk-gridwrap"><table class="fk-grid">' + head + rows + '</table>' +
      '<div class="fk-sel"></div><div class="fk-peer"><span>' + esc(t.owners[1]) + '</span></div>' +
      '<div class="fk-chart"><div class="fk-chart-t">' + esc(t.chart) + '</div><svg viewBox="0 0 200 110">' +
      '<path d="M8 100H196M8 70H196M8 40H196" stroke="#e3e3e3"/><g fill="#4f8a6f">' + bars + '</g></svg></div>' +
      '</div>' +
      '<div class="fk-tabs"><span>+</span><span>≡</span>' + t.tabs.map(function (n, i) { return '<span class="' + (i ? '' : 'on') + '">' + esc(n) + '</span>'; }).join('') + '</div>' +
      '<div class="fk-status"><span>' + esc(t.ready) + '</span><span class="fk-sp"></span><span class="fk-stat">' +
      esc(t.sum) + ': 6,103.7</span></div>' +
      '</div>';
  }

  function liveSheet(t) {
    var wrap = root.querySelector('.fk-gridwrap');
    var grid = root.querySelector('.fk-grid');
    var sel = root.querySelector('.fk-sel');
    var peer = root.querySelector('.fk-peer');
    var ref = root.querySelector('.fk-ref');
    var formula = root.querySelector('.fk-formula');
    var stat = root.querySelector('.fk-stat');

    function cell(r, c) { return grid.rows[r] && grid.rows[r].cells[c]; }
    function place(el, r, c) {
      var td = cell(r, c);
      if (!td) return;
      el.style.left = td.offsetLeft + 'px';
      el.style.top = td.offsetTop + 'px';
      el.style.width = td.offsetWidth + 'px';
      el.style.height = td.offsetHeight + 'px';
    }

    /* 选中格的「剧本」：看几个数，再看合计的公式 */
    var script = [
      [2, 3, 'C2', '1284.6'],
      [2, 6, 'F2', '=(C2-Q3!C2)/Q3!C2'],
      [5, 5, 'E5', '=C5/D5'],
      [10, 4, 'D10', '=SUM(D2:D9)'],
      [10, 5, 'E10', '=C10/D10'],
      [7, 7, 'G7', '58.3'],
      [10, 7, 'G10', '=SUM(G2:G9)'],
      [4, 3, 'C4', '1102.4']
    ];
    var k = 0;
    function step() {
      var s = script[k % script.length];
      place(sel, s[0], s[1]);
      ref.textContent = s[2];
      formula.textContent = s[3];
      var col = s[1];
      var vals = [];
      for (var r = 2; r <= 9; r++) { var v = parseFloat((cell(r, col) || {}).textContent); if (!isNaN(v)) vals.push(v); }
      if (vals.length && (col === 3 || col === 4 || col === 7)) {
        var sum = vals.reduce(function (a, b) { return a + b; }, 0);
        stat.textContent = t.sum + ': ' + fmt(sum) + '   ' + t.avg + ': ' + fmt(sum / vals.length) + '   ' + t.count + ': ' + vals.length;
      } else {
        stat.textContent = t.count + ': ' + (vals.length || 1);
      }
      k++;
    }
    var pk = 0;
    var peerSpots = [[6, 9], [7, 9], [8, 9], [3, 8], [9, 4]];
    function peerStep() { var p = peerSpots[pk++ % peerSpots.length]; place(peer, p[0], p[1]); }

    step(); peerStep();
    every(step, 3800);
    every(peerStep, 7000);
    wrap.scrollTop = 0;
  }

  /* -------------------------------------------------------------- 代码 */
  var CODE = [
    ['c', '// Run the recipe on the peer against the current working tree.'],
    ['', '<k>pub async fn</k> <f>verify</f>(peer: &amp;<t>Peer</t>, recipe: &amp;<t>Recipe</t>) -&gt; <t>Result</t>&lt;<t>Outcome</t>&gt; {'],
    ['', '    <k>let</k> base = repo::<f>head_commit</f>()?;'],
    ['', '    <k>let</k> patch = <t>Patch</t>::<f>from_worktree</f>(&amp;base, <t>Untracked</t>::<t>Include</t>)?;'],
    ['', '    <f>log</f>!(<s>"verify {} + {} file(s)"</s>, base.<f>short</f>(), patch.<f>len</f>());'],
    ['', ''],
    ['', '    <k>let mut</k> session = peer.<f>open</f>(<s>"verify"</s>).<k>await</k>?;'],
    ['', '    session.<f>ensure_worktree</f>(&amp;base).<k>await</k>?;'],
    ['', '    session.<f>apply</f>(&amp;patch).<k>await</k>?;'],
    ['', ''],
    ['', '    <k>for</k> (i, step) <k>in</k> recipe.steps.<f>iter</f>().<f>enumerate</f>() {'],
    ['', '        <f>progress</f>!(<s>"[{}/{}] {}"</s>, i + <n>1</n>, recipe.steps.<f>len</f>(), step);'],
    ['', '        <k>let</k> status = session.<f>run</f>(step).<k>await</k>?;'],
    ['', '        <k>if</k> !status.<f>success</f>() {'],
    ['', '            <k>return</k> <t>Ok</t>(<t>Outcome</t>::<f>failed</f>(status, session.<f>diagnostics</f>()));'],
    ['', '        }'],
    ['', '    }'],
    ['', ''],
    ['', '    <t>Ok</t>(<t>Outcome</t>::<f>passed</f>(session.<f>elapsed</f>()))'],
    ['', '}'],
    ['', ''],
    ['c', '#[cfg(test)]'],
    ['', '<k>mod</k> tests {'],
    ['', '    <k>use super</k>::*;'],
    ['', ''],
    ['', '    #[tokio::test]'],
    ['', '    <k>async fn</k> <f>applies_untracked_files</f>() {'],
    ['', '        <k>let</k> fx = <t>Fixture</t>::<f>new</f>().<f>with_untracked</f>(<s>"notes.md"</s>);'],
    ['', '        <f>assert</f>!(fx.<f>patch</f>().<f>contains</f>(<s>"notes.md"</s>));'],
    ['', '    }'],
    ['', '}']
  ];
  var TESTS = [
    'patch::tests::applies_untracked_files', 'patch::tests::skips_ignored_paths', 'patch::tests::binary_files_roundtrip',
    'peer::tests::reconnects_after_relay_drop', 'peer::tests::rejects_unknown_ticket', 'verify::tests::exit_code_is_peers',
    'verify::tests::streams_diagnostics', 'verify::tests::reuses_worktree', 'ctx::tests::three_way_merge_markdown',
    'ctx::tests::keeps_both_on_conflict', 'config::tests::parses_recipes', 'config::tests::rejects_empty_recipe'
  ];

  function renderCode(t) {
    var lines = CODE.map(function (l, i) {
      return '<div class="fk-ln' + (i === 12 ? ' cur' : '') + '"><span class="fk-no">' + (i + 1) + '</span><span class="fk-src' + (l[0] === 'c' ? ' cm' : '') + '">' + (l[1] || '&nbsp;') + (i === 12 ? '<span class="fk-caret"></span>' : '') + '</span></div>';
    }).join('');
    var tree = [
      ['▾ sync-work', 0, 0], ['▾ src', 1, 0], ['main.rs', 2, 0], ['verify.rs', 2, 1], ['patch.rs', 2, 0], ['peer.rs', 2, 0], ['ctx.rs', 2, 0],
      ['config.rs', 2, 0], ['▸ tests', 1, 0], ['Cargo.toml', 1, 0], ['README.md', 1, 0], ['syncwork.toml', 1, 0]
    ].map(function (f) { return '<div class="fk-file' + (f[2] ? ' on' : '') + '" style="padding-left:' + (10 + f[1] * 12) + 'px">' + esc(f[0]) + '</div>'; }).join('');
    return '' +
      '<div class="fk-app fk-code">' +
      '<div class="fk-cbar"><span class="fk-dots"><i></i><i></i><i></i></span><span class="fk-sp"></span><span>verify.rs — sync-work</span><span class="fk-sp"></span></div>' +
      '<div class="fk-cbody">' +
      '<div class="fk-rail"><i class="on"></i><i></i><i></i><i></i></div>' +
      '<div class="fk-tree"><div class="fk-tree-h">' + esc(t.codeExplorer) + '</div>' + tree + '</div>' +
      '<div class="fk-main">' +
      '<div class="fk-ctabs"><span>main.rs</span><span class="on">verify.rs</span><span>patch.rs</span></div>' +
      '<div class="fk-crumbs">src › verify.rs › verify</div>' +
      '<div class="fk-editor">' + lines + '</div>' +
      '<div class="fk-term"><div class="fk-term-h"><span>' + esc(t.codeProblems) + '</span><span>' + esc(t.codeOutput) + '</span><span class="on">' + esc(t.codeTerminal) + '</span></div>' +
      '<div class="fk-term-b"><div><span class="p">~/projects/sync-work</span> $ cargo test --workspace</div></div></div>' +
      '</div></div>' +
      '<div class="fk-cstatus"><span>⎇ main</span><span>✓ 0  ⚠ 0</span><span class="fk-sp"></span><span>Ln 13, Col 41</span><span>Rust</span><span>UTF-8</span></div>' +
      '</div>';
  }

  function liveCode() {
    var body = root.querySelector('.fk-term-b');
    var lines = ['   Compiling sync-work v0.1.0 (/projects/sync-work)', '    Finished test profile [unoptimized + debuginfo] in 3.84s', '     Running unittests src/main.rs', '', 'running ' + TESTS.length + ' tests'];
    TESTS.forEach(function (n) { lines.push('test ' + n + ' ... <g>ok</g>'); });
    lines.push('', 'test result: <g>ok</g>. ' + TESTS.length + ' passed; 0 failed; 0 ignored; finished in 1.62s', '');
    var i = 0;
    function add() {
      if (!root || i >= lines.length) {
        /* 跑完歇一会儿，再来一遍：看起来像在反复改代码、反复测 */
        later(function () { body.innerHTML = '<div><span class="p">~/projects/sync-work</span> $ cargo test --workspace</div>'; i = 0; later(add, 900); }, 9000);
        return;
      }
      var d = document.createElement('div');
      d.innerHTML = lines[i++].replace(/<g>/g, '<span class="ok">').replace(/<\/g>/g, '</span>') || '&nbsp;';
      body.appendChild(d);
      body.scrollTop = body.scrollHeight;
      later(add, i < 5 ? 700 : 420);
    }
    later(add, 900);
  }

  /* -------------------------------------------------------------- 纪要 */
  function renderNotes(t) {
    var n = t.notes;
    var ul = function (list) { return '<ul>' + list.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>'; };
    return '' +
      '<div class="fk-app fk-notes">' +
      '<div class="fk-title"><span class="fk-logo doc"></span><b>' + esc(t.notesFile) + '</b><span class="fk-star">☆</span>' +
      '<span class="fk-saved">' + esc(t.saved) + '</span><span class="fk-sp"></span>' +
      '<span class="fk-avatars"><i style="background:#c98f72">李</i><i style="background:#9a8fc4">陈</i></span>' +
      '<span class="fk-share">' + esc(t.share) + '</span></div>' +
      '<div class="fk-menu">' + t.menus.map(function (m) { return '<span>' + esc(m) + '</span>'; }).join('') + '</div>' +
      '<div class="fk-tools"><span>↶</span><span>↷</span><span>100%</span><i></i><span>' + (L() === 'en' ? 'Normal text' : '正文') + '</span><i></i><span>Serif</span><span>11</span><i></i><b>B</b><em>I</em><u>U</u><i></i><span>☰</span><span>☑</span></div>' +
      '<div class="fk-desk"><div class="fk-page">' +
      '<h1>' + esc(n.title) + '</h1><p class="fk-meta">' + esc(n.meta) + '</p><p class="fk-meta">' + esc(n.people) + '</p>' +
      '<h2>' + esc(n.h1) + '</h2>' + ul(n.p1) +
      '<h2>' + esc(n.h2) + '</h2>' + ul(n.p2).replace('<li>', '<li><mark>').replace('</li>', '</mark></li>') +
      '<h2>' + esc(n.h3) + '</h2><ul class="fk-todo">' + n.todo.map(function (x, i) { return '<li class="' + (i === 1 ? 'done' : '') + '"><span class="box"></span><b>@' + esc(x[0]) + '</b> ' + esc(x[1]) + '</li>'; }).join('') + '</ul>' +
      '<p class="fk-typing"><span class="fk-typed"></span><span class="fk-caret"></span></p>' +
      '</div>' +
      '<div class="fk-comment"><b>' + esc(n.commentBy) + '</b><span>' + esc(n.comment) + '</span></div>' +
      '</div></div>';
  }

  function liveNotes(t) {
    var el = root.querySelector('.fk-typed');
    var text = t.notes.typing;
    var i = 0;
    function type() {
      if (!root) return;
      if (i <= text.length) {
        el.textContent = text.slice(0, i++);
        later(type, 140 + Math.random() * 160);
      } else {
        later(function () { i = 0; type(); }, 12000);
      }
    }
    later(type, 1200);
  }

  /* -------------------------------------------------------------- 外壳 */
  function render() {
    if (!root) return;
    stopAll();
    var t = T[L()];
    var html = current === 'code' ? renderCode(t) : current === 'notes' ? renderNotes(t) : renderSheet(t);
    /* 手机上没有 Tab / Esc：这行小字本身就能点 */
    root.innerHTML = html + '<div class="fk-hint"><span data-act="cycle">' + esc(t.hintCycle) + '</span> · <span data-act="back">' + esc(t.hintBack) + '</span></div>';
    root.dataset.kind = current;
    if (current === 'sheet') later(function () { liveSheet(t); }, 30);
    else if (current === 'code') liveCode();
    else liveNotes(t);
  }

  var ICONS = {
    sheet: '<rect x="3" y="4" width="26" height="24" rx="3" fill="#2f7d55"/><path d="M3 11h26M3 17h26M3 23h26M12 4v24M21 4v24" stroke="#fff" stroke-opacity=".55" stroke-width="1.4"/>',
    code: '<rect x="3" y="4" width="26" height="24" rx="4" fill="#2b313a"/><path d="M12 11l-5 5 5 5M20 11l5 5-5 5" fill="none" stroke="#9fd0b4" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
    notes: '<path d="M7 3h13l6 6v20H7z" fill="#4a78c2"/><path d="M20 3v6h6" fill="#a9c2ea"/><path d="M11 15h11M11 19h11M11 23h7" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>'
  };

  MG.fake = {
    show: function (el) {
      root = el;
      if (!el.dataset.bound) {
        el.dataset.bound = '1';
        el.addEventListener('click', function (e) {
          var a = e.target && e.target.closest ? e.target.closest('[data-act]') : null;
          if (!a) return;
          if (a.dataset.act === 'cycle') { MG.fake.cycle(); if (MG.fake.onSwitch) MG.fake.onSwitch(); }
          else if (MG.fake.onBack) MG.fake.onBack();
        });
      }
      render();
    },
    hide: function () { stopAll(); if (root) root.innerHTML = ''; root = null; },
    cycle: function () {
      current = KINDS[(KINDS.indexOf(current) + 1) % KINDS.length];
      try { w.localStorage.setItem(KEY, current); } catch (e) {}
      render();
    },
    rerender: render,
    tabTitle: function () {
      var t = T[L()];
      return current === 'code' ? 'verify.rs — sync-work' : current === 'notes' ? t.notesFile : t.sheetFile;
    },
    tabIcon: function () {
      return 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">' + ICONS[current] + '</svg>');
    }
  };
})(window);
