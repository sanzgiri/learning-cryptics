// Drill app: serves real clues from DRILL_DATA (drill/data.js), tracks
// no-repeat queues and mastery scoring per type in localStorage.
(function () {
  "use strict";

  var STORAGE_KEY = "learning_cryptics_drill_v1";

  var TYPE_ORDER = [
    "hidden", "anagram", "doubledef", "charade", "container", "reversal",
    "subtraction", "bitsandpieces", "homophone", "crypticdef", "complex", "andlit"
  ];

  // One-line mechanic reminders for Hint 1 (type reveal) and Hint 2 (generic
  // "what to look for" without giving away the answer's letters).
  var TYPE_INFO = {
    hidden: {
      label: "Hidden word",
      mechanic: "The answer runs across consecutive letters somewhere in the clue, ignoring word breaks.",
      hint2: "Read straight through the fodder letter by letter, ignoring the spaces, hunting for a run that matches the enumeration."
    },
    anagram: {
      label: "Anagram",
      mechanic: "An anagram indicator signals that a fodder word's letters get shuffled to spell the answer.",
      hint2: "Count the fodder's letters — they must match the answer's letters exactly, just rearranged."
    },
    doubledef: {
      label: "Double definition",
      mechanic: "No wordplay indicator at all — the clue is two separate, genuine definitions of the same word, back to back.",
      hint2: "Split the clue into two halves. Each half should work as its own honest definition of the answer."
    },
    charade: {
      label: "Charade",
      mechanic: "The answer is built by gluing two or more short parts together, left to right, each with its own definition.",
      hint2: "Look for a natural cut point splitting the wordplay into two (or more) smaller real words or abbreviations."
    },
    container: {
      label: "Container",
      mechanic: "One part is split open and another part is inserted inside it.",
      hint2: "Find the container/contents indicator, then work out which part holds and which part enters."
    },
    reversal: {
      label: "Reversal",
      mechanic: "A fodder word, read backwards letter by letter, spells the answer (or part of it).",
      hint2: "Find the word being reversed, then spell it backwards letter by letter and check the count."
    },
    subtraction: {
      label: "Subtraction",
      mechanic: "One or more letters are removed from a fodder word, leaving the answer behind.",
      hint2: "Work out whether the indicator removes from the start, middle, end, or both ends of the fodder."
    },
    bitsandpieces: {
      label: "Bits and Pieces",
      mechanic: "Only some of the letters of a word are used — e.g. every other letter, rather than the whole word.",
      hint2: "Look for an indicator like 'regularly', 'oddly', or 'alternately' pointing at every other letter."
    },
    homophone: {
      label: "Homophone",
      mechanic: "A fodder word, spelled and meaning something different, is pronounced identically to the answer.",
      hint2: "Say the fodder's meaning out loud — the answer sounds the same but is spelled differently."
    },
    crypticdef: {
      label: "Cryptic definition",
      mechanic: "A single definition, deliberately phrased to mislead — no separate wordplay half to lean on.",
      hint2: "There's no indicator to find. Reread the whole clue looking for a stretched or twisted meaning."
    },
    complex: {
      label: "Complex clue",
      mechanic: "Two or more wordplay tricks are stacked in the same clue.",
      hint2: "Identify each mechanism separately, then resolve them from the inside out."
    },
    andlit: {
      label: "&Lit clue",
      mechanic: "The whole clue works simultaneously as the definition AND as the wordplay — no separate definition tail.",
      hint2: "Don't look for a separate definition. The whole phrase should read as one honest description, while also encoding the wordplay."
    }
  };

  var els = {};
  var state = {
    progress: null,
    currentType: null,
    currentItem: null,
    hintsUsed: 0,
    revealed: false,
    checkedCorrect: false,
    timerStart: null,
    timerInterval: null
  };

  function normalize(s) {
    return (s || "").toUpperCase().replace(/[^A-Z]/g, "");
  }

  function loadProgress() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore corrupt storage */ }
    return { types: {}, timedMode: false };
  }

  function saveProgress() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress));
    } catch (e) { /* storage full or unavailable; drill still works this session */ }
  }

  function shuffledRange(n) {
    var arr = [];
    for (var i = 0; i < n; i++) arr.push(i);
    for (var j = arr.length - 1; j > 0; j--) {
      var k = Math.floor(Math.random() * (j + 1));
      var tmp = arr[j]; arr[j] = arr[k]; arr[k] = tmp;
    }
    return arr;
  }

  function ensureTypeState(type) {
    if (!state.progress.types[type]) {
      var n = DRILL_DATA.clues[type].length;
      state.progress.types[type] = {
        order: shuffledRange(n),
        idx: 0,
        stats: { attempted: 0, unaided: 0, hinted: 0, revealed: 0, timedMs: 0, timedCount: 0 }
      };
    }
    return state.progress.types[type];
  }

  function nextClueForType(type) {
    var ts = ensureTypeState(type);
    var pool = DRILL_DATA.clues[type];
    var newLap = false;
    if (ts.idx >= ts.order.length) {
      ts.order = shuffledRange(pool.length);
      ts.idx = 0;
      newLap = true;
    }
    var itemIdx = ts.order[ts.idx];
    ts.idx += 1;
    saveProgress();
    return { item: pool[itemIdx], newLap: newLap };
  }

  function pickRandomType() {
    return TYPE_ORDER[Math.floor(Math.random() * TYPE_ORDER.length)];
  }

  function startTimer() {
    stopTimer();
    state.timerStart = Date.now();
    els.timerDisplay.textContent = "0.0s";
    state.timerInterval = setInterval(function () {
      var elapsed = (Date.now() - state.timerStart) / 1000;
      els.timerDisplay.textContent = elapsed.toFixed(1) + "s";
    }, 100);
  }

  function stopTimer() {
    if (state.timerInterval) {
      clearInterval(state.timerInterval);
      state.timerInterval = null;
    }
  }

  function elapsedMs() {
    return state.timerStart ? (Date.now() - state.timerStart) : 0;
  }

  function loadClue() {
    stopTimer();
    var type = els.typeSelect.value === "random" ? pickRandomType() : els.typeSelect.value;
    var result = nextClueForType(type);
    state.currentType = type;
    state.currentItem = result.item;
    state.hintsUsed = 0;
    state.revealed = false;
    state.checkedCorrect = false;

    els.typeBadge.textContent = els.typeSelect.value === "random"
      ? "Random → " + TYPE_INFO[type].label
      : TYPE_INFO[type].label;
    els.clueText.textContent = result.item.c;
    els.guessInput.value = "";
    els.guessInput.disabled = false;
    els.feedback.className = "feedback";
    els.feedback.textContent = "";
    els.hint1.className = "hint";
    els.hint1.textContent = "";
    els.hint2.className = "hint";
    els.hint2.textContent = "";
    els.parsing.className = "parsing";
    els.parsing.textContent = "";
    els.checkBtn.disabled = false;
    els.hintBtn.disabled = false;
    els.hintBtn.textContent = "Hint 1 (type)";
    els.revealBtn.disabled = false;
    els.guessInput.focus();

    if (result.newLap) {
      showToast("Completed a full round of " + TYPE_INFO[type].label + " (" +
        DRILL_DATA.clues[type].length + " clues) — reshuffled for another round.");
    } else {
      hideToast();
    }

    if (els.timedToggle.checked) {
      els.timerRow.style.display = "block";
      startTimer();
    } else {
      els.timerRow.style.display = "none";
      state.timerStart = null;
    }

    renderStats();
  }

  function showToast(msg) {
    els.toast.textContent = msg;
    els.toast.className = "callout visible";
  }
  function hideToast() {
    els.toast.className = "callout";
    els.toast.textContent = "";
  }

  function recordOutcome(kind) {
    var ts = ensureTypeState(state.currentType);
    ts.stats.attempted += 1;
    ts.stats[kind] += 1;
    if (els.timedToggle.checked && state.timerStart) {
      ts.stats.timedMs += elapsedMs();
      ts.stats.timedCount += 1;
    }
    saveProgress();
    renderStats();
  }

  function handleCheck() {
    if (state.checkedCorrect || state.revealed) return;
    var guess = normalize(els.guessInput.value);
    if (!guess) {
      els.feedback.className = "feedback visible incorrect";
      els.feedback.textContent = "Type an answer first.";
      return;
    }
    if (guess === state.currentItem.a) {
      state.checkedCorrect = true;
      stopTimer();
      els.feedback.className = "feedback visible correct";
      els.feedback.textContent = "Correct.";
      els.checkBtn.disabled = true;
      els.guessInput.disabled = true;
      recordOutcome(state.hintsUsed > 0 ? "hinted" : "unaided");
    } else {
      els.feedback.className = "feedback visible incorrect";
      els.feedback.textContent = "Not quite — try again, or use a hint.";
    }
  }

  function handleHint() {
    if (state.revealed || state.checkedCorrect) return;
    var info = TYPE_INFO[state.currentType];
    if (state.hintsUsed === 0) {
      els.hint1.className = "hint visible";
      els.hint1.textContent = "Type: " + info.label + " — " + info.mechanic;
      state.hintsUsed = 1;
      els.hintBtn.textContent = "Hint 2 (wordplay)";
    } else if (state.hintsUsed === 1) {
      var defnText = state.currentItem.d ? ("Definition: “" + state.currentItem.d + "”. ") : "";
      els.hint2.className = "hint visible";
      els.hint2.textContent = defnText + info.hint2;
      state.hintsUsed = 2;
      els.hintBtn.disabled = true;
      els.hintBtn.textContent = "No more hints";
    }
  }

  function handleReveal() {
    if (state.checkedCorrect) return;
    state.revealed = true;
    stopTimer();
    var item = state.currentItem;
    var extra = "";
    if (item.x) {
      if (state.currentType === "charade") extra = " Breakdown hint from source: “" + item.x + "”.";
      else if (state.currentType === "container") extra = " Indicator: “" + item.x + "”.";
      else if (state.currentType === "complex" || state.currentType === "andlit") extra = " Mechanisms at work: " + item.x.replace(/\+/g, " + ") + ".";
    }
    els.parsing.className = "parsing visible";
    els.parsing.innerHTML = "Answer: <strong>" + item.a + "</strong>." +
      (item.d ? " Definition: “" + item.d + "”." : "") + extra;
    els.feedback.className = "feedback visible correct";
    els.feedback.textContent = "Revealed.";
    els.checkBtn.disabled = true;
    els.hintBtn.disabled = true;
    els.revealBtn.disabled = true;
    els.guessInput.disabled = true;
    recordOutcome("revealed");
  }

  function fmtPct(n, d) {
    if (!d) return "—";
    return Math.round((n / d) * 100) + "%";
  }
  function fmtTime(ms, count) {
    if (!count) return "—";
    return (ms / count / 1000).toFixed(1) + "s avg";
  }

  function renderStats() {
    var rows = [];
    var totals = { attempted: 0, unaided: 0, hinted: 0, revealed: 0, timedMs: 0, timedCount: 0 };
    TYPE_ORDER.forEach(function (type) {
      var ts = state.progress.types[type];
      var s = ts ? ts.stats : { attempted: 0, unaided: 0, hinted: 0, revealed: 0, timedMs: 0, timedCount: 0 };
      totals.attempted += s.attempted;
      totals.unaided += s.unaided;
      totals.hinted += s.hinted;
      totals.revealed += s.revealed;
      totals.timedMs += s.timedMs;
      totals.timedCount += s.timedCount;
      var solved = s.unaided + s.hinted;
      rows.push(
        "<tr><td>" + TYPE_INFO[type].label + "</td>" +
        "<td>" + s.attempted + "</td>" +
        "<td>" + s.unaided + "</td>" +
        "<td>" + s.hinted + "</td>" +
        "<td>" + s.revealed + "</td>" +
        "<td>" + fmtPct(solved, s.attempted) + "</td>" +
        "<td>" + fmtTime(s.timedMs, s.timedCount) + "</td></tr>"
      );
    });
    var solvedTotal = totals.unaided + totals.hinted;
    els.statsBody.innerHTML = rows.join("");
    els.statsTotal.innerHTML =
      "<tr><td><strong>Overall</strong></td>" +
      "<td>" + totals.attempted + "</td>" +
      "<td>" + totals.unaided + "</td>" +
      "<td>" + totals.hinted + "</td>" +
      "<td>" + totals.revealed + "</td>" +
      "<td>" + fmtPct(solvedTotal, totals.attempted) + "</td>" +
      "<td>" + fmtTime(totals.timedMs, totals.timedCount) + "</td></tr>";
  }

  function resetProgress() {
    if (!confirm("Reset all drill progress and scores? This can't be undone.")) return;
    state.progress = { types: {}, timedMode: els.timedToggle.checked };
    saveProgress();
    renderStats();
    loadClue();
  }

  function toggleCheatSheet() {
    var visible = els.cheatSheet.classList.toggle("visible");
    els.cheatBtn.textContent = visible ? "Hide cheat sheet" : "Show cheat sheet";
  }

  function init() {
    els.typeSelect = document.getElementById("type-select");
    els.typeBadge = document.getElementById("type-badge");
    els.clueText = document.getElementById("clue-text");
    els.guessInput = document.getElementById("guess-input");
    els.checkBtn = document.getElementById("check-btn");
    els.hintBtn = document.getElementById("hint-btn");
    els.revealBtn = document.getElementById("reveal-btn");
    els.nextBtn = document.getElementById("next-btn");
    els.feedback = document.getElementById("feedback");
    els.hint1 = document.getElementById("hint1");
    els.hint2 = document.getElementById("hint2");
    els.parsing = document.getElementById("parsing");
    els.toast = document.getElementById("toast");
    els.timedToggle = document.getElementById("timed-toggle");
    els.timerRow = document.getElementById("timer-row");
    els.timerDisplay = document.getElementById("timer-display");
    els.statsBody = document.getElementById("stats-body");
    els.statsTotal = document.getElementById("stats-total");
    els.resetBtn = document.getElementById("reset-btn");
    els.cheatBtn = document.getElementById("cheat-btn");
    els.cheatSheet = document.getElementById("cheat-sheet");

    // Populate type selector
    var randomOpt = document.createElement("option");
    randomOpt.value = "random";
    randomOpt.textContent = "— Random type —";
    els.typeSelect.appendChild(randomOpt);
    TYPE_ORDER.forEach(function (type) {
      var opt = document.createElement("option");
      opt.value = type;
      opt.textContent = TYPE_INFO[type].label + " (" + DRILL_DATA.clues[type].length + ")";
      els.typeSelect.appendChild(opt);
    });
    els.typeSelect.value = "random";

    state.progress = loadProgress();
    els.timedToggle.checked = !!state.progress.timedMode;

    els.checkBtn.addEventListener("click", handleCheck);
    els.guessInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); handleCheck(); }
    });
    els.hintBtn.addEventListener("click", handleHint);
    els.revealBtn.addEventListener("click", handleReveal);
    els.nextBtn.addEventListener("click", loadClue);
    els.typeSelect.addEventListener("change", loadClue);
    els.timedToggle.addEventListener("change", function () {
      state.progress.timedMode = els.timedToggle.checked;
      saveProgress();
    });
    els.resetBtn.addEventListener("click", resetProgress);
    els.cheatBtn.addEventListener("click", toggleCheatSheet);

    renderStats();
    loadClue();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
