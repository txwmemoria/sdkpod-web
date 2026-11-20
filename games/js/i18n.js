/* =========================================================================
   摸鱼司 · 文案与双语
   所有用户可见的文案集中在这里（中 / 英），游戏注册表里的字段只作为兜底。
   ========================================================================= */
(function (w) {
  'use strict';
  var MG = w.MG;

  var dict = {
    zh: {
      /* ---------- 应用外壳 ---------- */
      'app.title': '摸鱼司 · 内部效率平台',
      'app.brand': '摸鱼司',
      'app.home': '回到 SDK Pods 主页',
      'app.mark': '摸',
      'app.brandSub': 'Internal Slacking Platform',
      'app.workTime': '累计摸鱼',
      'app.bossKey': '假装工作',
      'app.lang': 'EN',
      'app.langTitle': 'Switch to English',
      'app.soundOn': '声音已开，点一下静音',
      'app.soundOff': '声音已关（办公室友好），点一下打开',
      'app.themeDark': '切换到夜间',
      'app.themeLight': '切换到日间',
      'app.footer': 'SDK Pods 出品 · 纯本地运行 · 无账号 · 成绩只留在这台浏览器里',
      'app.toastMuted': '已静音',
      'app.toastSound': '声音已开，摸鱼请戴耳机',

      /* ---------- 大厅 ---------- */
      'hub.day': '第 {n} 天 · 准时下班（并没有）',
      'hub.h1': '现在有三分钟？',
      'hub.lede': '挑一个直接开玩。老板走近就按 Esc，画面立刻变成季度报表。',
      'hub.hintFirst': '第一次来？右上角「假装工作」那个按钮，或者直接按 Esc。',
      'hub.random': '随便来一局',
      'hub.randomHint': '不知道玩什么就点这个',
      'hub.dailyChip': '今日：{name}',
      'hub.resume': '继续上次：{name}',
      'hub.filterAll': '全部',
      'hub.filterQuick': '1 分钟内',
      'hub.filterEndless': '无尽',
      'hub.emptyFilter': '这个分类下暂时没有游戏。',
      'hub.playedToday': '今天摸了 {t}',
      'hub.stat1': '累计摸鱼时长',
      'hub.stat2': '已开工局数',
      'hub.stat3': '留下最高分',
      'hub.games': '五种摸鱼姿势',
      'hub.count': '{n} 款',
      'hub.gamesHint': '空格开始 · Esc 假装工作 · P 暂停',
      'hub.ach': '摸鱼履历',
      'hub.achHint': '完成对应的局就自动点亮',
      'hub.note': '没有排行榜，也没有服务器——成绩只留在这台电脑上。换浏览器、开无痕模式都会从零开始，这也意味着没人能查到你的摸鱼记录。',
      'hub.placeholderTitle': '空工位',
      'hub.placeholderText': '下一款还在写。都是慢节奏、不晃眼的小游戏，适合工作间隙歇一歇。',
      'hub.placeholderFoot': '敬请期待',
      'hub.best': '最高 {n}',
      'hub.noBest': '还没开工',
      'hub.play': '开一局',

      /* ---------- 今日挑战 ---------- */
      'daily.kicker': '今日限定',
      'daily.desc': '每天换一款，牌面由日期锁定——今天点进来的人，拿到的是同一套题。',
      'daily.best': '今日最高 {n}',
      'daily.none': '今天还没挑战',
      'daily.streak': '连续 {n} 天',
      'daily.cta': '开始挑战',
      'daily.retry': '再战一次',

      /* ---------- 对局页 ---------- */
      'play.score': '分数',
      'play.best': '最高',
      'play.pause': '暂停',
      'play.resume': '继续',
      'play.dailyChip': '今日挑战',
      'play.dailyRunning': '进行中',
      'patart.start': '准备好了吗',
      'play.back': '回大厅',

      /* ---------- 遮罩 ---------- */
      'panel.ready': '准备好了吗？',
      'panel.start': '开始',
      'panel.back': '回大厅',
      'panel.paused': '已暂停',
      'panel.pausedText': '老板路过就按 Esc 切走。回来按空格继续，时间不会偷偷跑掉。',
      'panel.resume': '继续',
      'panel.over': '这一局收工',
      'panel.record': '新纪录',
      'panel.gained': '本局得分',
      'panel.bestAll': '历史最高 {n}',
      'panel.bestNone': '还没有最高分',
      'panel.bestDaily': '今日最高 {n}',
      'panel.again': '再来一局',
      'panel.bestBadge': '最高',
      'panel.achievement': '成就解锁 · {name}',

      /* ---------- 假装工作 ---------- */
      'fake.title': '2026 财年 Q4 经营数据汇总（草案 v3 · 待审）',
      'fake.region': '区域',
      'fake.owner': '负责人',
      'fake.q3': 'Q3 实际',
      'fake.q4': 'Q4 目标',
      'fake.rate': '达成率',
      'fake.mom': '环比',
      'fake.cost': '渠道费用',
      'fake.note': '备注',
      'fake.east': '华东',
      'fake.south': '华南',
      'fake.north': '华北',
      'fake.west': '西南',
      'fake.total': '合计',
      'fake.memo': '备注',
      'fake.memoText': '口径与上月一致；渠道费用待财务复核',
      'fake.pending': '待复核',
      'fake.adjusted': '口径调整',
      'fake.ready': '就绪',
      'fake.saved': '已保存',
      'fake.sheet': 'Sheet1',
      'fake.sheet2': '区域汇总',
      'fake.sheet3': '数据源',
      'fake.sheet4': '校验',
      'fake.selected': '选取区域：A1:H7',
      'fake.escape': 'Esc 返回',

      /* ---------- 通用游戏词 ---------- */
      'ui.combo': '连击',
      'ui.lives': '命',
      'ui.left': '剩余',
      'ui.accuracy': '准确率',
      'ui.level': '等级',
      'ui.lines': '行数',
      'ui.moves': '步数',
      'ui.pairs': '配对',
      'ui.elapsed': '用时',
      'ui.length': '长度',
      'ui.snacks': '零食',
      'ui.cleared': '消除',
      'ui.chain': '连锁',
      'ui.hole': '洞',
      'ui.strokes': '杆数',
      'ui.perfect': '完美',
      'ui.good': '还行',
      'ui.miss': '走神',
      'ui.close': '差一点',
      'ui.caught': '被发现了',

      /* ---------- 各游戏：文案 ---------- */
      'game.boss.name': '老板来了',
      'game.boss.tagline': '60 秒内清掉所有摸鱼证据——只要别点到老板本人。',
      'game.boss.howto': '点零食加分，报表邮件扣分，老板点一次掉一条命。三条命用完就收工。',
      'game.boss.duration': '60 秒',
      'game.boss.tags': ['鼠标', '60 秒'],
      'game.boss.controls': [['鼠标点击', '点道具'], ['数字键 1–9', '对应九宫格'], ['空格 / 回车', '开始 · 继续']],
      'g.boss.fish': '摸鱼',
      'g.boss.coffee': '咖啡',
      'g.boss.snack': '零食',
      'g.boss.tea': '奶茶',
      'g.boss.report': '报表',
      'g.boss.mail': '邮件',
      'g.boss.meeting': '会议',
      'g.boss.boss': '老板',
      'g.boss.caught': '被抓了',
      'g.boss.reason': '上班摸鱼，人赃并获',
      'g.boss.timeup': '下班时间到',
      'g.boss.note': '{reason} · 最高连击 {combo}',

      'game.snake.name': '工位贪吃蛇',
      'game.snake.tagline': '在工位之间蛇形走位，把同事的零食全吃光。',
      'game.snake.howto': '吃零食变长，撞到自己就下班。屏幕边缘是通的，从另一边钻回来。',
      'game.snake.duration': '无尽',
      'game.snake.tags': ['键盘', '无尽'],
      'game.snake.controls': [['方向键 / WASD', '转向'], ['空格 / 回车', '开始 · 继续'], ['手机', '滑动或点右下方向键']],
      'g.snake.note': '吃了 {foods} 份零食 · 长度 {len}',

      'game.timing.name': '摸鱼时机',
      'game.timing.tagline': '老板回头的间隙只有一秒，指针停在哪里，就是今天的心情。',
      'game.timing.howto': '指针左右扫，按空格停进绿窗。连续命中，窗口变窄、速度变快。',
      'game.timing.duration': '无尽',
      'game.timing.tags': ['键盘', '反应', '无尽'],
      'game.timing.controls': [['空格 / 点击', '停下指针'], ['空格 / 回车', '开始 · 继续'], ['P', '暂停']],
      'g.timing.prompt': '空格 / 点击 —— 停在绿色窗口',
      'g.timing.idle': '别被看见',
      'g.timing.lastLife': '最后一命',
      'g.timing.combo': '连击 ×{n}',
      'g.timing.recent': '最近 {n} 次',
      'g.timing.caption': '绿色窗口 = 安全的摸鱼时间，黄区只是被看一眼',
      'g.timing.note': '最高连击 {n}',

      'game.memory.name': '工位配对',
      'game.memory.tagline': '记住谁爱喝什么，是职场第一课。',
      'game.memory.howto': '翻开两张相同的卡片即可配对。步数和用时越少，得分越高。',
      'game.memory.duration': '约 1 分钟',
      'game.memory.tags': ['记忆', '点击'],
      'game.memory.controls': [['鼠标 / 触屏', '翻牌'], ['空格 / 回车', '开始 · 继续'], ['P', '暂停']],
      'g.memory.note': '{moves} 步 · {secs} 秒',

      'game.meeting.name': '会议静音',
      'game.meeting.tagline': '会议第 37 分钟，你只需要在对的时间点一下头。',
      'game.meeting.howto': '音符落到判定线时按 A / S / D / F。漏掉就是走神，会被记进纪要。',
      'game.meeting.duration': '60 秒',
      'game.meeting.tags': ['节奏', '键盘', '60 秒'],
      'game.meeting.controls': [['A S D F', '四条泳道'], ['鼠标 / 触屏', '点泳道'], ['空格 / 回车', '开始 · 继续'], ['P', '暂停']],
      'g.meeting.host': '主持人',
      'g.meeting.talker': '话多的',
      'g.meeting.sheets': '做表的',
      'g.meeting.slacker': '摸鱼的',
      'g.meeting.note': '准确率 {acc}% · 最高连击 {combo}',

      'game.receipt.name': '报销单消消乐',
      'game.receipt.tagline': '把发票排成三个一排，是打工人最后的体面。',
      'game.receipt.howto': '交换相邻票据，三个以上同款消除。连锁越深，报销越快。',
      'game.receipt.duration': '60 秒',
      'game.receipt.tags': ['三消', '鼠标', '60 秒'],
      'game.receipt.controls': [['点击 / 触屏', '选票 · 交换'], ['空格 / 回车', '开始 · 继续'], ['P', '暂停']],
      'g.receipt.note': '消除 {cleared} 张票 · 最高连锁 ×{cascade}',
      'g.receipt.shuffle': '没有可消除的组合，重新洗牌',
      'g.receipt.chain': '连锁 ×{n}',

      'game.tetris.name': '工位叠方块',
      'game.tetris.tagline': '文件柜和显示器从天花板掉下来，横着码满一行就能下班。',
      'game.tetris.howto': '方向键移动，↑ 或 X 旋转，空格直接落底。消行升级，掉落越来越快。',
      'game.tetris.duration': '无尽',
      'game.tetris.tags': ['键盘', '无尽'],
      'game.tetris.controls': [['← →', '左右移动'], ['↑ / X / Z', '旋转'], ['↓', '加速下落'], ['空格', '直接落底 · 开始'], ['手机', '右下方向键']],
      'g.tetris.note': '消除 {lines} 行 · 等级 {level}',

      'game.golf.name': '午休一杆进洞',
      'game.golf.tagline': '午休半小时，三洞高尔夫，球道是你的工位。',
      'game.golf.howto': '按住球往后拖（像弹弓），松手击球。躲开工位隔断，把球推进洞里。三洞打完结算。',
      'game.golf.duration': '约 1 分钟',
      'game.golf.tags': ['拖拽', '3 洞'],
      'game.golf.controls': [['按住拖动', '蓄力 · 瞄准'], ['松手', '击球'], ['空格 / 回车', '开始 · 继续'], ['P', '暂停']],
      'g.golf.holeInfo': '第 {n} 洞 · 标准杆 {par} · 本洞 {strokes} 杆',
      'g.golf.hint': '按住并往后拖，松手击球',
      'g.golf.note': '{strokes} 杆 / {holes} 洞 · 用时 {secs} 秒',
      'g.golf.next': '第 {n} 洞 · 标准杆 {par}',

      'game.printer.name': '打印机排队',
      'game.printer.tagline': '三秒内把单子塞进对的托盘。塞错是卡纸，漏掉是丢单。',
      'game.printer.howto': '单子进入右侧虚线分拣区后，按 1 / 2 / 3 送进对应托盘。卡纸或漏单各扣一条命。',
      'game.printer.duration': '60 秒',
      'game.printer.tags': ['键盘', '反应', '60 秒'],
      'game.printer.controls': [['1 2 3', '报销单 / 合同 / 会议纪要'], ['鼠标 / 触屏', '点托盘'], ['空格 / 回车', '开始 · 继续'], ['P', '暂停']],
      'g.printer.zone': '分拣区 · 按 1 / 2 / 3',
      'g.printer.dept': '行政部',
      'g.printer.speed': '传送速度 ×{n}',
      'g.printer.jam': '卡纸 -1',
      'g.printer.miss': '漏单 -1',
      'g.printer.over': '打印机彻底卡死了',
      'g.printer.timeup': '下班了，剩下的明天再说',
      'g.printer.note': '{reason} · 分拣 {sorted} 张 · 最高连击 {combo}',
      'g.printer.kind1': '报销单',
      'g.printer.kind2': '合同',
      'g.printer.kind3': '会议纪要',

      /* ---------- 成就 ---------- */
      'ach.first.name': '初次摸鱼',
      'ach.first.desc': '完成任意一局游戏',
      'ach.six.name': '全勤',
      'ach.six.desc': '每款游戏各玩一局',
      'ach.memory20.name': '过目不忘',
      'ach.memory20.desc': '《工位配对》20 步内完成',
      'ach.daily.name': '今日打卡',
      'ach.daily.desc': '完成一次今日挑战',
      'ach.streak3.name': '连续摸鱼',
      'ach.streak3.desc': '连续 3 天完成今日挑战',
      'ach.receipt3000.name': '报销达人',
      'ach.receipt3000.desc': '《报销单消消乐》单局 3000 分',
      'ach.golf5.name': '午休选手',
      'ach.golf5.desc': '《午休一杆进洞》三洞 ≤ 5 杆',
      'ach.tetris10.name': '文件柜',
      'ach.tetris10.desc': '《工位叠方块》消除 10 行'
    },

    en: {
      /* ---------- shell ---------- */
      'app.title': 'Slack Inc. · Internal Efficiency Platform',
      'app.brand': 'Slack Inc.',
      'app.home': 'Back to SDK Pods',
      'app.mark': 'S',
      'app.brandSub': 'Internal Slacking Platform',
      'app.workTime': 'Slacked',
      'app.bossKey': 'Boss key',
      'app.lang': '中文',
      'app.langTitle': '切换到中文',
      'app.soundOn': 'Sound on — click to mute',
      'app.soundOff': 'Sound off (office-friendly) — click to enable',
      'app.themeDark': 'Switch to dark',
      'app.themeLight': 'Switch to light',
      'app.footer': 'Made by SDK Pods · runs locally · no account · scores stay in this browser',
      'app.toastMuted': 'Muted',
      'app.toastSound': 'Sound on — headphones recommended',

      /* ---------- hub ---------- */
      'hub.day': 'Day {n} · leaving on time (not really)',
      'hub.h1': 'Got three minutes?',
      'hub.lede': 'Pick one and play. If the boss walks over, hit Esc — the screen turns into a quarterly report.',
      'hub.hintFirst': 'First time? Hit Esc (or the “Boss key” button) and the report appears instantly.',
      'hub.random': 'Surprise me',
      'hub.randomHint': 'Can’t decide? Let it pick',
      'hub.dailyChip': 'Today: {name}',
      'hub.resume': 'Pick up: {name}',
      'hub.filterAll': 'All',
      'hub.filterQuick': 'Under a minute',
      'hub.filterEndless': 'Endless',
      'hub.emptyFilter': 'Nothing in this category yet.',
      'hub.playedToday': '{t} slacked today',
      'hub.stat1': 'Time slacked',
      'hub.stat2': 'Rounds played',
      'hub.stat3': 'Personal bests',
      'hub.games': 'Five ways to slack off',
      'hub.count': '{n} games',
      'hub.gamesHint': 'Space to start · Esc for cover · P to pause',
      'hub.ach': 'Slacking résumé',
      'hub.achHint': 'Clear the matching round and it lights up',
      'hub.note': 'No leaderboard, no server — your scores never leave this machine. New browser, incognito, clean slate. Which also means nobody can audit your slacking.',
      'hub.placeholderTitle': 'Empty desk',
      'hub.placeholderText': 'The next one is in the works. Every game here is slow-paced and easy on the eyes — a short break between tasks.',
      'hub.placeholderFoot': 'Coming soon',
      'hub.best': 'Best {n}',
      'hub.noBest': 'Not played yet',
      'hub.play': 'Play',

      /* ---------- daily ---------- */
      'daily.kicker': 'Today only',
      'daily.desc': 'One game a day, seeded by the date — everyone opening it today gets the exact same board.',
      'daily.best': 'Today’s best {n}',
      'daily.none': 'Not played yet today',
      'daily.streak': '{n}-day streak',
      'daily.cta': 'Play today',
      'daily.retry': 'Go again',

      /* ---------- play ---------- */
      'play.score': 'Score',
      'play.best': 'Best',
      'play.pause': 'Pause',
      'play.resume': 'Resume',
      'play.dailyChip': 'Daily',
      'play.dailyRunning': 'live',
      'play.back': 'Back to hub',

      /* ---------- panels ---------- */
      'panel.ready': 'Ready?',
      'panel.start': 'Start',
      'panel.back': 'Back to hub',
      'panel.paused': 'Paused',
      'panel.pausedText': 'Boss nearby? Press Esc for cover. Come back and hit Space — the clock is paused.',
      'panel.resume': 'Resume',
      'panel.over': 'Round over',
      'panel.record': 'New best',
      'panel.gained': 'This round',
      'panel.bestAll': 'Best ever {n}',
      'panel.bestNone': 'No best yet',
      'panel.bestDaily': 'Today’s best {n}',
      'panel.again': 'Play again',
      'panel.bestBadge': 'BEST',
      'panel.achievement': 'Achievement · {name}',

      /* ---------- fake screen ---------- */
      'fake.title': 'FY2026 Q4 Business Review (draft v3 · pending)',
      'fake.region': 'Region',
      'fake.owner': 'Owner',
      'fake.q3': 'Q3 actual',
      'fake.q4': 'Q4 target',
      'fake.rate': 'Attainment',
      'fake.mom': 'MoM',
      'fake.cost': 'Channel cost',
      'fake.note': 'Notes',
      'fake.east': 'East',
      'fake.south': 'South',
      'fake.north': 'North',
      'fake.west': 'Southwest',
      'fake.total': 'Total',
      'fake.memo': 'Note',
      'fake.memoText': 'Same methodology as last month; channel costs pending finance review',
      'fake.pending': 'pending',
      'fake.adjusted': 'restated',
      'fake.ready': 'Ready',
      'fake.saved': 'Saved',
      'fake.sheet': 'Sheet1',
      'fake.sheet2': 'By region',
      'fake.sheet3': 'Sources',
      'fake.sheet4': 'Checks',
      'fake.selected': 'Selection: A1:H7',
      'fake.escape': 'Esc to exit',

      /* ---------- shared ---------- */
      'ui.combo': 'Combo',
      'ui.lives': 'Lives',
      'ui.left': 'Left',
      'ui.accuracy': 'Accuracy',
      'ui.level': 'Level',
      'ui.lines': 'Lines',
      'ui.moves': 'Moves',
      'ui.pairs': 'Pairs',
      'ui.elapsed': 'Time',
      'ui.length': 'Length',
      'ui.snacks': 'Snacks',
      'ui.cleared': 'Cleared',
      'ui.chain': 'Chain',
      'ui.hole': 'Hole',
      'ui.strokes': 'Strokes',
      'ui.perfect': 'Perfect',
      'ui.good': 'Good',
      'ui.miss': 'Zoned out',
      'ui.close': 'So close',
      'ui.caught': 'Spotted',

      /* ---------- games ---------- */
      'game.boss.name': 'Boss Alert',
      'game.boss.tagline': 'Sixty seconds to clear every trace of slacking — just don’t tap the boss.',
      'game.boss.howto': 'Tap snacks to score. Reports and emails cost points. One tap on the boss costs a life. Three lives.',
      'game.boss.duration': '60 sec',
      'game.boss.tags': ['Mouse', '60 sec'],
      'game.boss.controls': [['Click', 'tap an item'], ['1–9', 'the nine desks'], ['Space / Enter', 'start · resume']],
      'g.boss.fish': 'Slack',
      'g.boss.coffee': 'Coffee',
      'g.boss.snack': 'Snack',
      'g.boss.tea': 'Boba',
      'g.boss.report': 'Report',
      'g.boss.mail': 'Email',
      'g.boss.meeting': 'Meeting',
      'g.boss.boss': 'Boss',
      'g.boss.caught': 'Busted',
      'g.boss.reason': 'Caught red-handed mid-slack',
      'g.boss.timeup': 'Clock out time',
      'g.boss.note': '{reason} · best combo {combo}',

      'game.snake.name': 'Cubicle Snake',
      'game.snake.tagline': 'Slither between desks and eat every snack in the office.',
      'game.snake.howto': 'Eat snacks to grow. Hit yourself and you’re done. The screen wraps, so you can slip out one side and back in the other.',
      'game.snake.duration': 'Endless',
      'game.snake.tags': ['Keyboard', 'Endless'],
      'game.snake.controls': [['Arrows / WASD', 'steer'], ['Space / Enter', 'start · resume'], ['Mobile', 'swipe or use the pad']],
      'g.snake.note': '{foods} snacks · length {len}',

      'game.timing.name': 'Slack Timing',
      'game.timing.tagline': 'The boss looks away for exactly one second. Where the needle stops decides your day.',
      'game.timing.howto': 'The needle sweeps left and right. Hit Space inside the green window. Keep hitting and it narrows and speeds up.',
      'game.timing.duration': 'Endless',
      'game.timing.tags': ['Keyboard', 'Reflex', 'Endless'],
      'game.timing.controls': [['Space / click', 'stop the needle'], ['Space / Enter', 'start · resume'], ['P', 'pause']],
      'g.timing.prompt': 'Space / click — stop inside the green window',
      'g.timing.idle': 'Don’t get caught',
      'g.timing.lastLife': 'Last life',
      'g.timing.combo': 'Combo ×{n}',
      'g.timing.recent': 'Last {n}',
      'g.timing.caption': 'Green window = safe slack time. Amber just means someone glanced over.',
      'g.timing.note': 'Best combo {n}',

      'game.memory.name': 'Desk Match',
      'game.memory.tagline': 'Knowing who drinks what is lesson one of office politics.',
      'game.memory.howto': 'Flip two matching cards to pair them. Fewer moves and less time means a higher score.',
      'game.memory.duration': '~1 min',
      'game.memory.tags': ['Memory', 'Click'],
      'game.memory.controls': [['Mouse / touch', 'flip a card'], ['Space / Enter', 'start · resume'], ['P', 'pause']],
      'g.memory.note': '{moves} moves · {secs}s',

      'game.meeting.name': 'Meeting Mute',
      'game.meeting.tagline': 'Minute 37 of the meeting. All you have to do is nod at the right time.',
      'game.meeting.howto': 'Hit A / S / D / F when a note reaches the line. Miss one and you’re zoned out — on the record.',
      'game.meeting.duration': '60 sec',
      'game.meeting.tags': ['Rhythm', 'Keyboard', '60 sec'],
      'game.meeting.controls': [['A S D F', 'four lanes'], ['Mouse / touch', 'tap a lane'], ['Space / Enter', 'start · resume'], ['P', 'pause']],
      'g.meeting.host': 'Host',
      'g.meeting.talker': 'Talker',
      'g.meeting.sheets': 'Sheets',
      'g.meeting.slacker': 'Slacker',
      'g.meeting.note': 'Accuracy {acc}% · best combo {combo}',

      'game.receipt.name': 'Expense Match',
      'game.receipt.tagline': 'Lining up receipts three in a row is the last dignity of an office worker.',
      'game.receipt.howto': 'Swap adjacent receipts to line up three or more of a kind. Deeper chains clear the books faster.',
      'game.receipt.duration': '60 sec',
      'game.receipt.tags': ['Match-3', 'Mouse', '60 sec'],
      'game.receipt.controls': [['Click / touch', 'select · swap'], ['Space / Enter', 'start · resume'], ['P', 'pause']],
      'g.receipt.note': 'Cleared {cleared} · best chain ×{cascade}',
      'g.receipt.shuffle': 'No moves left — reshuffling',
      'g.receipt.chain': 'Chain ×{n}',

      'game.tetris.name': 'Cubicle Blocks',
      'game.tetris.tagline': 'Filing cabinets fall from the ceiling. Fill a row and you’re one step closer to leaving.',
      'game.tetris.howto': 'Arrows move, ↑ or X rotates, Space drops it. Clear lines, level up, fall faster.',
      'game.tetris.duration': 'Endless',
      'game.tetris.tags': ['Keyboard', 'Endless'],
      'game.tetris.controls': [['← →', 'move'], ['↑ / X / Z', 'rotate'], ['↓', 'soft drop'], ['Space', 'hard drop · start'], ['Mobile', 'on-screen pad']],
      'g.tetris.note': '{lines} lines · level {level}',

      'game.golf.name': 'Lunch Break Golf',
      'game.golf.tagline': 'Half an hour of lunch, three holes of golf, and the fairway is your cubicle.',
      'game.golf.howto': 'Drag back from the ball like a slingshot and release. Dodge the desk dividers and sink it. Three holes, then the score.',
      'game.golf.duration': '~1 min',
      'game.golf.tags': ['Drag', '3 holes'],
      'game.golf.controls': [['Drag', 'aim · power'], ['Release', 'putt'], ['Space / Enter', 'start · resume'], ['P', 'pause']],
      'g.golf.holeInfo': 'Hole {n} · par {par} · {strokes} strokes',
      'g.golf.hint': 'Drag back from the ball, release to putt',
      'g.golf.note': '{strokes} strokes / {holes} holes · {secs}s',
      'g.golf.next': 'Hole {n} · par {par}',

      'game.printer.name': 'Printer Rush',
      'game.printer.tagline': 'Three seconds to file each sheet in the right tray. Wrong tray jams, missed sheet is lost.',
      'game.printer.howto': 'When a sheet enters the dashed sorting zone, press 1 / 2 / 3 for the matching tray. Jams and misses each cost a life.',
      'game.printer.duration': '60 sec',
      'game.printer.tags': ['Keyboard', 'Reflex', '60 sec'],
      'game.printer.controls': [['1 2 3', 'expense / contract / minutes'], ['Mouse / touch', 'tap a tray'], ['Space / Enter', 'start · resume'], ['P', 'pause']],
      'g.printer.zone': 'Sorting zone · press 1 / 2 / 3',
      'g.printer.dept': 'Admin',
      'g.printer.speed': 'Belt speed ×{n}',
      'g.printer.jam': 'Jam −1',
      'g.printer.miss': 'Missed −1',
      'g.printer.over': 'The printer is jammed for good',
      'g.printer.timeup': 'Clock out — the rest can wait',
      'g.printer.note': '{reason} · {sorted} sorted · best combo {combo}',
      'g.printer.kind1': 'Expense',
      'g.printer.kind2': 'Contract',
      'g.printer.kind3': 'Minutes',

      /* ---------- achievements ---------- */
      'ach.first.name': 'First slack',
      'ach.first.desc': 'Finish any round',
      'ach.six.name': 'Perfect attendance',
      'ach.six.desc': 'Play every game once',
      'ach.memory20.name': 'Photographic memory',
      'ach.memory20.desc': 'Finish Desk Match in 20 moves or fewer',
      'ach.daily.name': 'Checked in',
      'ach.daily.desc': 'Finish a daily challenge',
      'ach.streak3.name': 'Three days running',
      'ach.streak3.desc': 'Finish the daily challenge 3 days in a row',
      'ach.receipt3000.name': 'Expense pro',
      'ach.receipt3000.desc': 'Score 3000 in Expense Match',
      'ach.golf5.name': 'Lunch athlete',
      'ach.golf5.desc': 'Finish Lunch Break Golf in 5 strokes or fewer',
      'ach.tetris10.name': 'Filing cabinet',
      'ach.tetris10.desc': 'Clear 10 lines in Cubicle Blocks'
    }
  };

  var lang = 'zh';

  function pick(key) {
    var table = dict[lang] || dict.zh;
    var v = table[key];
    if (v === undefined) v = dict.zh[key];
    return v;
  }

  MG.t = function (key, vars) {
    var v = pick(key);
    if (typeof v !== 'string') return v === undefined ? key : v;
    if (!vars) return v;
    return v.replace(/\{(\w+)\}/g, function (m, name) {
      return vars[name] === undefined ? m : String(vars[name]);
    });
  };

  MG.i18n = {
    lang: lang,
    dict: dict,

    set: function (next, skipSave) {
      lang = next === 'en' ? 'en' : 'zh';
      MG.i18n.lang = lang;
      document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
      document.documentElement.setAttribute('data-lang', lang);
      if (!skipSave && MG.store) {
        MG.store.data.lang = lang;
        try { w.localStorage.setItem('lang', lang); } catch (err) {}
        MG.store.save();
      }
      MG.applyI18n(document);
      if (MG.i18n.onChange) MG.i18n.onChange(lang);
    },

    toggle: function () {
      MG.i18n.set(lang === 'zh' ? 'en' : 'zh');
    },

    onChange: null
  };

  /** 把 data-i18n / data-i18n-title / data-i18n-aria 的元素刷成当前语言 */
  MG.applyI18n = function (root) {
    var scope = root || document;

    var nodes = scope.querySelectorAll('[data-i18n]');
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].textContent = MG.t(nodes[i].getAttribute('data-i18n'));
    }

    var titles = scope.querySelectorAll('[data-i18n-title]');
    for (var j = 0; j < titles.length; j++) {
      titles[j].setAttribute('title', MG.t(titles[j].getAttribute('data-i18n-title')));
    }

    var arias = scope.querySelectorAll('[data-i18n-aria]');
    for (var k = 0; k < arias.length; k++) {
      arias[k].setAttribute('aria-label', MG.t(arias[k].getAttribute('data-i18n-aria')));
    }

    if (scope === document) {
      document.title = MG.t('app.title');
    }
  };

  /** 游戏注册表里的文案：优先取词典，取不到再退回 def 上的旧字段 */
  MG.gtext = function (def) {
    var prefix = 'game.' + def.id + '.';
    var name = MG.t(prefix + 'name');
    var tagline = MG.t(prefix + 'tagline');
    var howto = MG.t(prefix + 'howto');
    var tags = MG.t(prefix + 'tags');
    var duration = MG.t(prefix + 'duration');
    var controls = MG.t(prefix + 'controls');

    return {
      name: typeof name === 'string' ? name : def.name,
      tagline: typeof tagline === 'string' ? tagline : def.tagline,
      howto: typeof howto === 'string' ? howto : def.howto,
      tags: Array.isArray(tags) ? tags : (def.tags || []),
      duration: typeof duration === 'string' ? duration : (def.duration || ''),
      controls: Array.isArray(controls) ? controls : (def.controls || [])
    };
  };

  /** 成就的显示名与说明也走词典 */
  MG.achText = function (ach) {
    var name = MG.t('ach.' + ach.id + '.name');
    var desc = MG.t('ach.' + ach.id + '.desc');
    return {
      name: typeof name === 'string' ? name : ach.name,
      desc: typeof desc === 'string' ? desc : ach.desc
    };
  };

  /** 「3 小时 12 分」/「3h 12m」 */
  MG.durationText = function (ms) {
    var total = Math.floor(Math.max(0, ms) / 1000);
    var zh = MG.i18n.lang === 'zh';

    if (zh) {
      if (total < 60) return total + ' 秒';
      var min = Math.floor(total / 60);
      var h = Math.floor(min / 60);
      return h > 0 ? h + ' 小时 ' + (min % 60) + ' 分' : min + ' 分钟';
    }

    if (total < 60) return total + 's';
    var m = Math.floor(total / 60);
    var hr = Math.floor(m / 60);
    return hr > 0 ? hr + 'h ' + (m % 60) + 'm' : m + 'm';
  };

})(window);
