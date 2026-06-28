const storeKey = "nelson-cko-2026-v1";
const totalSeconds = 180;
const tricks = window.CKO_TRICKS;
const trickMap = new Map(tricks.map((trick) => [trick.id, trick]));

const state = {
  activeView: "pickView",
  pickRound: "1",
  practiceRound: "1",
  replaceIndex: null,
  levelFilter: "all",
  search: "",
  timeLeft: totalSeconds,
  timerId: null,
  timerState: "ready",
  resultDone: new Set(),
  data: loadState(),
};

const els = {
  round1Count: document.querySelector("#round1Count"),
  round2Count: document.querySelector("#round2Count"),
  round1Score: document.querySelector("#round1Score"),
  round2Score: document.querySelector("#round2Score"),
  planScore: document.querySelector("#planScore"),
  tabs: document.querySelectorAll(".tab"),
  views: document.querySelectorAll(".view-panel"),
  roundButtons: document.querySelectorAll(".round-button"),
  practiceRoundButtons: document.querySelectorAll(".practice-round-button"),
  activeRoundLabel: document.querySelector("#activeRoundLabel"),
  activeRoundScore: document.querySelector("#activeRoundScore"),
  selectedList: document.querySelector("#selectedList"),
  selectionHint: document.querySelector("#selectionHint"),
  searchInput: document.querySelector("#searchInput"),
  levelFilters: document.querySelector("#levelFilters"),
  trickGrid: document.querySelector("#trickGrid"),
  practiceTitle: document.querySelector("#practiceTitle"),
  practiceRoundScore: document.querySelector("#practiceRoundScore"),
  timerText: document.querySelector("#timerText"),
  timerStatus: document.querySelector("#timerStatus"),
  startTimerBtn: document.querySelector("#startTimerBtn"),
  pauseTimerBtn: document.querySelector("#pauseTimerBtn"),
  finishTimerBtn: document.querySelector("#finishTimerBtn"),
  resetTimerBtn: document.querySelector("#resetTimerBtn"),
  practiceTricks: document.querySelector("#practiceTricks"),
  resultPanel: document.querySelector("#resultPanel"),
  resultScore: document.querySelector("#resultScore"),
  resultChecks: document.querySelector("#resultChecks"),
  saveResultBtn: document.querySelector("#saveResultBtn"),
  cancelResultBtn: document.querySelector("#cancelResultBtn"),
  clearRecordsBtn: document.querySelector("#clearRecordsBtn"),
  trainingSummary: document.querySelector("#trainingSummary"),
  statsCards: document.querySelector("#statsCards"),
  priorityList: document.querySelector("#priorityList"),
  completionList: document.querySelector("#completionList"),
  historyList: document.querySelector("#historyList"),
};

init();

function init() {
  normalizeSelections();
  renderLevelFilters();
  bindEvents();
  renderAll();
}

function defaultState() {
  return {
    rounds: { 1: [], 2: [] },
    records: [],
  };
}

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(storeKey));
    if (!parsed || !parsed.rounds || !Array.isArray(parsed.records)) return defaultState();
    return {
      rounds: {
        1: Array.isArray(parsed.rounds["1"]) ? parsed.rounds["1"] : [],
        2: Array.isArray(parsed.rounds["2"]) ? parsed.rounds["2"] : [],
      },
      records: parsed.records,
    };
  } catch {
    return defaultState();
  }
}

function normalizeSelections() {
  const validIds = new Set(tricks.map((trick) => trick.id));
  const round1 = [];
  const used = new Set();

  for (const id of state.data.rounds["1"]) {
    if (!validIds.has(id) || used.has(id) || round1.length >= 5) continue;
    round1.push(id);
    used.add(id);
  }

  const round2 = [];
  for (const id of state.data.rounds["2"]) {
    if (!validIds.has(id) || used.has(id) || round2.length >= 5) continue;
    round2.push(id);
    used.add(id);
  }

  const changed =
    round1.join("|") !== state.data.rounds["1"].join("|") ||
    round2.join("|") !== state.data.rounds["2"].join("|");
  state.data.rounds["1"] = round1;
  state.data.rounds["2"] = round2;
  if (changed) saveState();
}

function saveState() {
  localStorage.setItem(storeKey, JSON.stringify(state.data));
}

function bindEvents() {
  els.tabs.forEach((button) => {
    button.addEventListener("click", () => {
      state.activeView = button.dataset.view;
      renderAll();
    });
  });

  els.roundButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.pickRound = button.dataset.round;
      state.replaceIndex = null;
      renderAll();
    });
  });

  els.practiceRoundButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.practiceRound = button.dataset.round;
      resetTimer(false);
      renderAll();
    });
  });

  els.searchInput.addEventListener("input", (event) => {
    state.search = event.target.value.trim();
    renderTrickGrid();
  });

  els.startTimerBtn.addEventListener("click", startTimer);
  els.pauseTimerBtn.addEventListener("click", pauseTimer);
  els.finishTimerBtn.addEventListener("click", finishPracticeNow);
  els.resetTimerBtn.addEventListener("click", () => resetTimer(true));
  els.saveResultBtn.addEventListener("click", savePracticeResult);
  els.cancelResultBtn.addEventListener("click", () => {
    resetTimer(false);
  });

  els.clearRecordsBtn.addEventListener("click", () => {
    if (!state.data.records.length) return;
    const confirmed = window.confirm("只清空练习记录，不会清空两轮选招。确认清空？");
    if (!confirmed) return;
    state.data.records = [];
    saveState();
    renderStats();
  });
}

function renderAll() {
  renderNavigation();
  renderSummary();
  renderSelection();
  renderTrickGrid();
  renderPractice();
  renderStats();
}

function renderNavigation() {
  document.body.dataset.view = state.activeView;
  els.tabs.forEach((button) => {
    button.classList.toggle("active", button.dataset.view === state.activeView);
  });
  els.views.forEach((view) => {
    view.classList.toggle("hidden", view.id !== state.activeView);
  });
  els.roundButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.round === state.pickRound);
  });
  els.practiceRoundButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.round === state.practiceRound);
  });
}

function renderSummary() {
  const round1 = getRoundTricks("1");
  const round2 = getRoundTricks("2");
  const round1Score = sumScore(round1);
  const round2Score = sumScore(round2);
  els.round1Count.textContent = `${round1.length}/5`;
  els.round2Count.textContent = `${round2.length}/5`;
  els.round1Score.textContent = `${formatScore(round1Score)} 分`;
  els.round2Score.textContent = `${formatScore(round2Score)} 分`;
  els.planScore.textContent = `${formatScore(round1Score + round2Score)} 分`;
}

function renderSelection() {
  const selected = getRoundTricks(state.pickRound);
  const otherRound = getOtherRound(state.pickRound);
  const otherCount = state.data.rounds[otherRound].length;
  const replacingTrick = Number.isInteger(state.replaceIndex) ? selected[state.replaceIndex] : null;
  els.activeRoundLabel.textContent = `Round ${state.pickRound}`;
  els.activeRoundScore.textContent = `${formatScore(sumScore(selected))} 分`;
  els.selectionHint.textContent =
    replacingTrick
      ? `正在替换第 ${state.replaceIndex + 1} 招：${replacingTrick.code}。从招式表点一个新招即可替换。`
      : selected.length === 5
        ? "本轮已满 5 招。点某一招的「替换」，再点新招即可更换。"
        : `从右侧选择 5 招。另一轮已选 ${otherCount} 招，不能重复选。`;

  if (!selected.length) {
    els.selectedList.innerHTML = `<li class="muted">还没有选择招式</li>`;
    return;
  }

  els.selectedList.innerHTML = selected
    .map(
      (trick, index) => `
        <li class="${state.replaceIndex === index ? "replacing" : ""}">
          <b>${index + 1}</b>
          <div>
            <span>${trick.code}</span>
            <strong>${trick.zhName}</strong>
          </div>
          <div class="selected-actions">
            <button type="button" data-replace="${index}">${state.replaceIndex === index ? "取消" : "替换"}</button>
            <button type="button" data-remove="${trick.id}">移除</button>
          </div>
        </li>
      `,
    )
    .join("");

  els.selectedList.querySelectorAll("[data-remove]").forEach((button) => {
    button.addEventListener("click", () => toggleTrick(button.dataset.remove));
  });
  els.selectedList.querySelectorAll("[data-replace]").forEach((button) => {
    button.addEventListener("click", () => {
      const nextIndex = Number(button.dataset.replace);
      state.replaceIndex = state.replaceIndex === nextIndex ? null : nextIndex;
      renderAll();
    });
  });
}

function renderLevelFilters() {
  const levels = ["all", ...Array.from(new Set(tricks.map((trick) => trick.level)))];
  els.levelFilters.innerHTML = levels
    .map((level) => {
      const label = level === "all" ? "全部" : `Level ${level}`;
      return `<button type="button" class="${level === "all" ? "active" : ""}" data-level="${level}">${label}</button>`;
    })
    .join("");

  els.levelFilters.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      state.levelFilter = button.dataset.level;
      els.levelFilters.querySelectorAll("button").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      renderTrickGrid();
    });
  });
}

function renderTrickGrid() {
  const selectedIds = state.data.rounds[state.pickRound];
  const selectedSet = new Set(selectedIds);
  const otherRound = getOtherRound(state.pickRound);
  const otherSelectedSet = new Set(state.data.rounds[otherRound]);
  const roundFull = selectedIds.length >= 5;
  const replacing = Number.isInteger(state.replaceIndex);
  const query = state.search.toLowerCase();

  const filtered = tricks.filter((trick) => {
    const levelMatch = state.levelFilter === "all" || String(trick.level) === state.levelFilter;
    const queryMatch =
      !query ||
      trick.code.toLowerCase().includes(query) ||
      trick.zhName.toLowerCase().includes(query);
    return levelMatch && queryMatch;
  });

  els.trickGrid.innerHTML = filtered
    .map((trick) => {
      const selected = selectedSet.has(trick.id);
      const selectedElsewhere = otherSelectedSet.has(trick.id);
      const replaceTarget = replacing && !selected && !selectedElsewhere;
      const blocked = selectedElsewhere || (roundFull && !selected && !replacing);
      const status = selectedElsewhere
        ? `<em>已在 R${otherRound}</em>`
        : replaceTarget
          ? `<em>点此替换第 ${state.replaceIndex + 1} 招</em>`
          : "";
      return `
        <button type="button" class="trick-card ${selected ? "selected" : ""} ${blocked ? "blocked" : ""} ${replaceTarget ? "replace-target" : ""}" data-trick="${trick.id}" ${blocked ? "disabled" : ""}>
          <span>${trick.code}</span>
          <strong>${trick.zhName}</strong>
          ${status}
        </button>
      `;
    })
    .join("");

  els.trickGrid.querySelectorAll("[data-trick]").forEach((button) => {
    button.addEventListener("click", () => toggleTrick(button.dataset.trick));
  });
}

function toggleTrick(trickId) {
  const round = state.data.rounds[state.pickRound];
  const otherRound = getOtherRound(state.pickRound);
  const index = round.indexOf(trickId);
  const replacing = Number.isInteger(state.replaceIndex);

  if (replacing && index < 0 && !state.data.rounds[otherRound].includes(trickId)) {
    round[state.replaceIndex] = trickId;
    state.replaceIndex = null;
    saveState();
    renderAll();
    return;
  }

  if (index >= 0) {
    round.splice(index, 1);
    if (state.replaceIndex === index || state.replaceIndex >= round.length) {
      state.replaceIndex = null;
    } else if (state.replaceIndex > index) {
      state.replaceIndex -= 1;
    }
  } else if (round.length < 5 && !state.data.rounds[otherRound].includes(trickId)) {
    round.push(trickId);
  }
  saveState();
  renderAll();
}

function renderPractice() {
  const selected = getRoundTricks(state.practiceRound);
  els.practiceTitle.textContent = `R${state.practiceRound} 练习`;
  els.practiceRoundScore.textContent = `${formatScore(sumScore(selected))} 分`;
  renderTimer();

  if (!selected.length) {
    els.practiceTricks.innerHTML = `<div class="empty-state">Round ${state.practiceRound} 还没有选招。先去「选招」页面选择 5 招。</div>`;
    els.startTimerBtn.disabled = true;
    els.finishTimerBtn.disabled = true;
    return;
  }

  els.startTimerBtn.disabled = selected.length !== 5;
  els.finishTimerBtn.disabled = selected.length !== 5 || state.timerState === "ended";
  els.practiceTricks.innerHTML = selected
    .map(
      (trick, index) => `
        <article class="practice-card">
          <b>${index + 1}</b>
          <span>${trick.code}</span>
          <strong>${trick.zhName}</strong>
        </article>
      `,
    )
    .join("");
}

function renderTimer() {
  els.timerText.textContent = formatTime(state.timeLeft);
  const statusMap = {
    ready: "准备开始",
    running: "练习中",
    paused: "已暂停",
    ended: "时间到，记录完成情况",
  };
  els.timerStatus.textContent = statusMap[state.timerState];
  els.startTimerBtn.textContent = state.timerState === "paused" ? "继续" : "开始";
  els.pauseTimerBtn.disabled = state.timerState !== "running";
  els.finishTimerBtn.disabled = getRoundTricks(state.practiceRound).length !== 5 || state.timerState === "ended";
}

function startTimer() {
  if (state.timerState === "running") return;
  if (getRoundTricks(state.practiceRound).length !== 5) return;

  if (state.timerState === "ready") {
    playTone("start");
  }

  state.timerState = "running";
  els.resultPanel.classList.add("hidden");
  clearInterval(state.timerId);
  state.timerId = setInterval(() => {
    state.timeLeft -= 1;
    if (state.timeLeft <= 0) {
      state.timeLeft = 0;
      finishTimer();
    }
    renderTimer();
  }, 1000);
  renderTimer();
}

function pauseTimer() {
  if (state.timerState !== "running") return;
  clearInterval(state.timerId);
  state.timerState = "paused";
  renderTimer();
}

function resetTimer(play = false) {
  clearInterval(state.timerId);
  state.timerId = null;
  state.timeLeft = totalSeconds;
  state.timerState = "ready";
  state.resultDone.clear();
  els.resultPanel.classList.add("hidden");
  if (play) playTone("reset");
  renderPractice();
}

function finishTimer() {
  clearInterval(state.timerId);
  state.timerId = null;
  state.timerState = "ended";
  playTone("end");
  openResultPanel();
}

function finishPracticeNow() {
  if (getRoundTricks(state.practiceRound).length !== 5) return;
  clearInterval(state.timerId);
  state.timerId = null;
  state.timerState = "ended";
  playTone("end");
  renderTimer();
  openResultPanel();
}

function openResultPanel() {
  const selected = getRoundTricks(state.practiceRound);
  state.resultDone = new Set(selected.map((trick) => trick.id));
  els.resultChecks.innerHTML = selected
    .map(
      (trick) => `
        <article class="check-card">
          <label>
            <input type="checkbox" data-done="${trick.id}" checked />
            <span>
              <span>${trick.code}</span>
              <strong>${trick.zhName}</strong>
            </span>
          </label>
        </article>
      `,
    )
    .join("");

  els.resultChecks.querySelectorAll("[data-done]").forEach((input) => {
    input.addEventListener("change", () => {
      if (input.checked) state.resultDone.add(input.dataset.done);
      else state.resultDone.delete(input.dataset.done);
      updateResultScore();
    });
  });
  els.resultPanel.classList.remove("hidden");
  updateResultScore();
}

function updateResultScore() {
  const doneTricks = [...state.resultDone].map((id) => trickMap.get(id)).filter(Boolean);
  els.resultScore.textContent = `${formatScore(sumScore(doneTricks))} 分`;
}

function savePracticeResult() {
  const planned = getRoundTricks(state.practiceRound);
  if (planned.length !== 5) return;
  const completedIds = [...state.resultDone];
  const completed = completedIds.map((id) => trickMap.get(id)).filter(Boolean);
  const record = {
    id: `practice-${Date.now()}`,
    round: state.practiceRound,
    date: new Date().toISOString(),
    plannedIds: planned.map((trick) => trick.id),
    completedIds,
    score: sumScore(completed),
    maxScore: sumScore(planned),
  };
  state.data.records.unshift(record);
  saveState();
  resetTimer(false);
  state.activeView = "statsView";
  renderAll();
}

function renderStats() {
  renderTrainingSummary();
  els.statsCards.innerHTML = ["1", "2"].map((round) => renderRoundStats(round)).join("");
  renderPriorityList();
  renderCompletionList();
  renderHistoryList();
}

function renderTrainingSummary() {
  const todayKey = getDateKey(new Date());
  const recentKeys = new Set();
  for (let i = 0; i < 7; i += 1) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    recentKeys.add(getDateKey(date));
  }

  const practicedDays = new Set(state.data.records.map((record) => getDateKey(new Date(record.date))));
  const todayCount = state.data.records.filter((record) => getDateKey(new Date(record.date)) === todayKey).length;
  const recentCount = state.data.records.filter((record) => recentKeys.has(getDateKey(new Date(record.date)))).length;
  const streak = getPracticeStreak(practicedDays);

  els.trainingSummary.innerHTML = `
    <article>
      <span>今天</span>
      <strong>${todayCount}</strong>
      <small>轮</small>
    </article>
    <article>
      <span>近 7 天</span>
      <strong>${recentCount}</strong>
      <small>轮</small>
    </article>
    <article>
      <span>连续</span>
      <strong>${streak}</strong>
      <small>天</small>
    </article>
  `;
}

function renderRoundStats(round) {
  const records = state.data.records.filter((record) => record.round === round);
  const count = records.length;
  const average = count ? records.reduce((sum, record) => sum + record.score, 0) / count : 0;
  const best = count ? Math.max(...records.map((record) => record.score)) : 0;
  const latest = count ? records[0].score : 0;
  return `
    <article class="stat-card">
      <p class="eyebrow">Round ${round}</p>
      <h3>平均得分</h3>
      <strong>${formatScore(average)}</strong>
      <div class="stat-row">
        <span>次数 ${count}</span>
        <span>最高 ${formatScore(best)}</span>
        <span>最近 ${formatScore(latest)}</span>
      </div>
    </article>
  `;
}

function renderPriorityList() {
  const selected = [...getRoundTricks("1"), ...getRoundTricks("2")];
  if (!selected.length) {
    els.priorityList.innerHTML = `<div class="empty-state">选招后这里会自动列出最该练的 3 招。</div>`;
    return;
  }

  const priorities = selected
    .map((trick) => {
      const attempts = state.data.records.filter((record) => record.plannedIds.includes(trick.id));
      const done = attempts.filter((record) => record.completedIds.includes(trick.id));
      const rate = attempts.length ? done.length / attempts.length : 0;
      const priority = trick.score * (1 - rate) + (attempts.length ? 0 : trick.score * 0.45);
      return { trick, attempts: attempts.length, done: done.length, rate, priority };
    })
    .sort((a, b) => b.priority - a.priority || b.trick.score - a.trick.score)
    .slice(0, 3);

  els.priorityList.innerHTML = priorities
    .map((item, index) => {
      const rateText = item.attempts ? `${Math.round(item.rate * 100)}%` : "还没记录";
      const detail = item.attempts ? `${item.done}/${item.attempts} 次完成` : "先建立一次练习记录";
      return `
        <article class="priority-item">
          <b>${index + 1}</b>
          <div>
            <span>${item.trick.code}</span>
            <strong>${item.trick.zhName}</strong>
            <small>${detail}</small>
          </div>
          <em>${rateText}</em>
        </article>
      `;
    })
    .join("");
}

function renderCompletionList() {
  const selected = [...getRoundTricks("1"), ...getRoundTricks("2")];
  if (!selected.length) {
    els.completionList.innerHTML = `<div class="empty-state">选招后这里会显示每招完成率。</div>`;
    return;
  }

  els.completionList.innerHTML = selected
    .map((trick) => {
      const attempts = state.data.records.filter((record) => record.plannedIds.includes(trick.id));
      const done = attempts.filter((record) => record.completedIds.includes(trick.id));
      const rate = attempts.length ? Math.round((done.length / attempts.length) * 100) : 0;
      return `
        <article class="completion-item">
          <span>${trick.code}</span>
          <div>
            <strong>${trick.zhName}</strong>
            <div class="meter" aria-hidden="true"><i style="width: ${rate}%"></i></div>
          </div>
          <strong>${rate}%</strong>
        </article>
      `;
    })
    .join("");
}

function renderHistoryList() {
  if (!state.data.records.length) {
    els.historyList.innerHTML = `<div class="empty-state">还没有保存练习记录。</div>`;
    return;
  }

  els.historyList.innerHTML = state.data.records
    .slice(0, 12)
    .map((record) => {
      const date = new Date(record.date);
      const completed = `${record.completedIds.length}/5`;
      return `
        <article class="history-item">
          <span>Round ${record.round}</span>
          <strong>${date.toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })} · 完成 ${completed}</strong>
          <strong>${formatScore(record.score)} 分</strong>
        </article>
      `;
    })
    .join("");
}

function getRoundTricks(round) {
  return state.data.rounds[round].map((id) => trickMap.get(id)).filter(Boolean);
}

function getOtherRound(round) {
  return round === "1" ? "2" : "1";
}

function getDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getPracticeStreak(practicedDays) {
  let streak = 0;
  const cursor = new Date();
  while (practicedDays.has(getDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function sumScore(items) {
  return items.reduce((sum, item) => sum + item.score, 0);
}

function formatScore(score) {
  return Number.isInteger(score) ? String(score) : score.toFixed(1);
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

function playTone(type) {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const context = new AudioContext();
    const now = context.currentTime;
    const gain = context.createGain();
    gain.connect(context.destination);

    const notes =
      type === "end"
        ? [
            [520, 0, 0.18],
            [390, 0.2, 0.22],
            [260, 0.44, 0.3],
          ]
        : type === "start"
          ? [
              [440, 0, 0.11],
              [660, 0.13, 0.14],
              [880, 0.3, 0.18],
            ]
          : [[320, 0, 0.08]];

    notes.forEach(([frequency, offset, duration]) => {
      const osc = context.createOscillator();
      const noteGain = context.createGain();
      osc.type = "sine";
      osc.frequency.value = frequency;
      noteGain.gain.setValueAtTime(0.0001, now + offset);
      noteGain.gain.exponentialRampToValueAtTime(0.18, now + offset + 0.02);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, now + offset + duration);
      osc.connect(noteGain);
      noteGain.connect(gain);
      osc.start(now + offset);
      osc.stop(now + offset + duration + 0.03);
    });

    setTimeout(() => context.close(), 1200);
  } catch {
    // Audio is optional; practice flow should keep working if the browser blocks it.
  }
}
