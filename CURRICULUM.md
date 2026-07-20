# Curriculum

Ordered by increasing difficulty. Each type is chosen to build on something already learned — see "Connects to" on each entry. Order is a plan, not a contract: it can shift based on what the [[learning-records]] show, but this is the default path.

Source for the canonical list of clue types: [Best For Puzzles tutorial index](https://bestforpuzzles.com/cryptic-crossword-tutorial/) (fetched 2026-07-18), cross-checked against the Guardian's beginner guide (see [Resources](resources.html)).

## Done

| # | Clue type | Lesson | Learning record |
|---|-----------|--------|------------------|
| 1 | Hidden word | [0001](lessons/0001-anatomy-of-a-cryptic-clue.html) | [0001](learning-records/0001-hidden-word-clues.md) — full unaided success |
| 2 | Anagram | [0002](lessons/0002-anagram-clues.html) | [0002](learning-records/0002-anagram-clues.md) — full unaided success |
| 3 | Double definition | [0003](lessons/0003-double-definitions.html) | [0003](learning-records/0003-double-definitions.md) — 2/3 unaided (missed idiomatic sense) |
| 4 | Charade | [0004](lessons/0004-charades.html) | [0004](learning-records/0004-charades.md) — full unaided success |
| 5 | Container / Insertion | [0005](lessons/0005-containers.html) | [0005](learning-records/0005-containers.md) — 1/2 unaided (needed a hint) |
| 6 | Reversal | [0006](lessons/0006-reversals.html) | pending — awaiting report |
| 7 | Subtraction | [0007](lessons/0007-subtraction.html) | pending — awaiting report |
| 8 | Bits and Pieces | [0008](lessons/0008-bits-and-pieces.html) | pending — awaiting report |
| 9 | Homophones | [0009](lessons/0009-homophones.html) | pending — awaiting report |
| 10 | Cryptic Definitions | [0010](lessons/0010-cryptic-definitions.html) | pending — awaiting report |
| 11 | Complex Clues | [0011](lessons/0011-complex-clues.html) | pending — awaiting report |
| 12 | &Lit Clues | [0012](lessons/0012-and-lit-clues.html) | pending — awaiting report |

Lessons 6–12 were all built in one batch on 2026-07-18, ahead of the usual one-lesson-per-report pace. **Order is still adaptive** — if a learning record shows a type landed badly, revisit that lesson (or insert extra drill reps) before pushing further down the list, rather than treating "built" as "mastered."

## After Lesson 12: the Drill

Once all twelve lessons are done, [drill/index.html](drill/index.html) is mixed practice: hundreds of real, published clues per type (sourced from [cryptics.georgeho.org](https://cryptics.georgeho.org/), not generated), selectable by type or random, with a two-tier hint system, optional per-clue timer, no-repeat queues, and mastery scoring per type and overall. It also carries a standing cheat sheet and a resources section (other guides, free puzzles, communities, US vs UK conventions). It's meant to be revisited indefinitely, not "completed" — there's no lesson-style learning record for it, just the in-page mastery stats (stored per-browser in localStorage).

## Pending

None — all twelve planned clue types now have a lesson. This section is kept as a placeholder in case a new type (e.g. a further &lit variant, or Ximenean-style cluing conventions) gets added later.

## Sequencing rationale

Why each lesson sits where it does, for future reference if the order ever needs revisiting:

| # | Clue type | Connects to |
|---|-----------|-------------|
| 6 | Reversal | Hidden word, Anagram — same family: one part, one letter-level transformation, no combining. Simplest remaining type, good landing spot after the two-part container jump. |
| 7 | Subtraction | Container — the mirror image of Lesson 5: instead of inserting a piece, you remove one. |
| 8 | Bits and Pieces | Hidden word, Subtraction — extends "pick out specific letters" and "take letters away" to single-letter extraction used inside a charade. |
| 9 | Homophones | Double definition — first trick that isn't purely letter-based; uses sound instead of spelling, same lateral-thinking muscle as double definitions. |
| 10 | Cryptic definitions | Double definition — hardest of the "simple" types: no separate wordplay at all. Placed after homophones so vocabulary/idiom sense has had more reps. |
| 11 | Complex clues | All of the above — two or more mechanisms chained in one clue. A synthesis step, not a new mechanic. |
| 12 | &Lit clues | All of the above — the whole clue is simultaneously definition and wordplay. Needs total fluency in every prior type to even recognize, so it caps the curriculum. |

## Notes

- This list omits "The difference between cryptic and straight clues" and "Conclusion" from the source index — those are framing, not clue types.
- Update the Done table (and add a new Pending-table row's replacement) each time a lesson ships and its learning record lands.
