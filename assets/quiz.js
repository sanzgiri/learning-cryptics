// Reusable clue-practice widget. Wires up any .clue-practice block that has
// a [data-answer] attribute, a .guess-input, .check-btn, .reveal-btn,
// .feedback and .parsing element. Optionally a .hint-btn plus one or more
// .hint elements (inside a .hints wrapper) for progressive hints shown one
// at a time before the full reveal.
(function () {
  function normalize(s) {
    return (s || "").toUpperCase().replace(/[^A-Z]/g, "");
  }

  function wire(block) {
    var answer = normalize(block.getAttribute("data-answer"));
    var input = block.querySelector(".guess-input");
    var checkBtn = block.querySelector(".check-btn");
    var hintBtn = block.querySelector(".hint-btn");
    var revealBtn = block.querySelector(".reveal-btn");
    var feedback = block.querySelector(".feedback");
    var parsing = block.querySelector(".parsing");
    var hints = block.querySelectorAll(".hint");

    function showFeedback(text, cls) {
      feedback.textContent = text;
      feedback.className = "feedback visible " + cls;
    }

    if (checkBtn) {
      checkBtn.addEventListener("click", function () {
        var guess = normalize(input.value);
        if (!guess) {
          showFeedback("Type an answer first.", "incorrect");
          return;
        }
        if (guess === answer) {
          showFeedback("Correct.", "correct");
        } else {
          showFeedback("Not quite — try again, or reveal the parsing.", "incorrect");
        }
      });
      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          checkBtn.click();
        }
      });
    }

    if (hintBtn && hints.length) {
      var hintIndex = 0;
      hintBtn.addEventListener("click", function () {
        if (hintIndex >= hints.length) return;
        hints[hintIndex].className = "hint visible";
        hintIndex += 1;
        if (hintIndex >= hints.length) {
          hintBtn.textContent = "No more hints";
          hintBtn.disabled = true;
        } else {
          hintBtn.textContent = "Hint (" + (hintIndex + 1) + "/" + hints.length + ")";
        }
      });
    }

    if (revealBtn) {
      revealBtn.addEventListener("click", function () {
        parsing.className = "parsing visible";
        showFeedback("Answer: " + block.getAttribute("data-answer"), "correct");
      });
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".clue-practice[data-answer]").forEach(wire);
  });
})();
