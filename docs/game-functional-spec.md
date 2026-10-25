# KeyFlows Game — Functional Specification

**Status:** Implementation in progress; Product, Marketing, UI/UX, and Frontend reviews complete
**Working title:** The Little Journey
**Section label:** Games
**Launch games:** The Little Journey and Garden Bloom
**Scope:** A graphically rich, static, account-free typing game for children and adults. This specification describes intended behavior; it does not constitute release approval by itself.

## Product intent

The Little Journey makes typing practice feel like an illustrated adventure while keeping the words and typing skill at the center. It should appeal to children learning keyboarding, as well as adults who type for work, study, reading, and everyday communication. Passage complexity should be selectable without collecting age, name, school, or other child identifiers.

**Promise:** “Type a little. Explore a little.” Type a short passage and watch a friendly world unfold. It is a playful way to practice typing; it does not promise faster typing, better comprehension, or school outcomes.

The key distinction is that typing drives the game. There is no click-to-complete, automatic progress, or score granted for simply opening a round.

## MVP recommendation

Launch two distinct illustrated games that share one typing, scoring, timer, accessibility, and storage engine:

- **The Little Journey:** a friendly traveler rides a little train through a richly layered storybook world: colorful town, countryside, forest, and a lighthouse destination. Correct typing moves the train through the scenery.
- **Garden Bloom:** the garden stays still as a scene; each fully correct word blooms the next flower. Finishing the passage fills the garden with color. This is a word-completion growth mechanic, distinct from the train’s character-by-character route movement.
- **Quick Play / Surprise me:** start a short bundled passage selected randomly from any theme at the chosen complexity. Avoid the player’s recent passages while alternatives exist. Do not store passage text or send it to a service.
- **Choose a passage:** Easy, Steady, or More challenging passage complexity, plus Work, Study, Reading, Everyday life, or Surprise me. These choices are not an age or grade assessment; they affect content and length, not scoring rules. Do not claim a grade level unless educators review the passages.
- **Round length:** untimed by default, especially for children. Offer an optional gentle timer for players who choose it; never make a timer necessary to win.
- **Passage content:** original, age-appropriate short sentences and ordinary prose: simple stories, messages, study notes, work writing, and everyday details. Avoid mature, frightening, violent, romantic, political, or sensitive material; do not ask players to share personal details. Do not use programming-language examples as the default content.
- **Key feedback:** a small optional visual QWERTY keyboard lights the key the player just pressed. Correct presses use a positive state; incorrect presses use an error state. A soft local typing sound is enabled by default and can be disabled in Settings. Never highlight the next target key before the user presses it.

The worlds should feel highly graphical and inviting, not like a plain line with a progress dot. Build each as a polished 2D scene with layered inline SVG and CSS; small Canvas effects are optional if they remain cheap and accessible. The passage must remain in a stable, high-contrast panel above the scenery in the visual hierarchy. Checkpoint movement, lighting, garden growth, and scene reveals happen only after confirmed correct typing; no idle animation or click can advance play. Keep motion restrained and user-adjustable so children, adults, and reduced-motion users can focus.

Visual gameplay sequence: in The Little Journey, the train moves a small, deterministic step for each newly confirmed correct character; fully correct words light route checkpoints and the final correct character brings the train to the lighthouse. In Garden Bloom, the bee is decorative and stays in place; each completed word blooms the next flower, and finishing the passage completes the garden. An incorrect entry may pulse the typed character and pressed virtual key briefly, but must not move either scene or reveal scenery. Pause, timeout, and completion freeze scene motion. Use reserved SVG aspect ratios and local/CSS fallbacks; animate only small SVG/CSS states with transforms/opacity, without a perpetual animation loop or per-keystroke DOM rebuild.

The visual keyboard is feedback only. It is not clickable and does not replace the device’s keyboard. On small screens it can be hidden or collapsed, and it must never cover the passage or input controls. No remote images, fonts, APIs, WebGL, accounts, public rankings, ads, or chat are required.

## Player flow and states

1. **Games landing:** show both playable games as selectable illustrated cards, estimated play time, passage complexity/theme choices, a still preview of the selected world, the local-only privacy note, and a clear start action. No sign-in, age entry, name, or profile is required.
2. **Ready:** show the passage preview and simple rules. Do not highlight a target key. Start on the Start button or first meaningful keystroke; the untimed mode begins without a countdown.
3. **Playing:** render the passage with the same readable, scroll-following cursor behavior as practice. Typing alone moves the train or restores the garden. Show plain-text progress, pause, restart, and exit controls. Optional timer appears only when selected.
4. **Paused:** freeze the timer and preserve the cursor and current errors. Resume only after an explicit action. Pause on navigation away or a hidden tab so the round does not continue unseen.
5. **Completed:** show the train arriving at the lighthouse or the garden coming into bloom only when the entire prompt is entered correctly. Stop the timer and record the result once. Show the local journey title. Offer retry, another game, another passage, or exit.
6. **Time reached:** if an optional timed round is unfinished, end with neutral wording such as “Round complete” and show progress reached. Save an aggregate partial result marked incomplete, not a win. Offer retry or exit without punishing streaks.
7. **Exit:** pause and open a confirmation with **Resume** and **Discard and exit**. Discarding returns to Game landing without saving the round.
8. **Storage unavailable:** continue play normally, show the score for the current page, and explain that the result could not be saved.
9. **Reload:** the active round exists only in memory. Reload abandons it and does not save typed text or a result. On return, show a brief “Unfinished round wasn’t saved” message and let the player start again; do not imply progress was restored.

## Typing and game rules

- Each key entry is checked against the current passage character. Spaces, punctuation, and capitalization must match.
- A wrong character is shown at its typed position and receives immediate error feedback. The input cursor advances so the mistake remains visible, but the traveler stops at the first uncorrected error. The displayed text cursor follows that first uncorrected character, not the advanced input index, so a later word is never highlighted prematurely. Later correct characters can be entered, but do not move the route until the earlier error is fixed.
- Route position is derived from the contiguous correctly typed prefix. Backspace removes the most recent typed position; correcting an earlier error therefore erases the suffix after it too. After the error is corrected, the player retypes that suffix and the traveler advances along the contiguous correct prefix one character at a time. The original mistake remains in the session error and accuracy totals, consistent with KeyFlows scoring.
- A checkpoint appears for each fully correct word, including its following space; the final word completes at the prompt end. Checkpoints are keyed to word position and reflect current route position; backspacing may deactivate later checkpoints, but retyping never grants duplicate points or rewards.
- A held key must not repeatedly award progress unless browser key-repeat is intentionally handled and tested. Modifier-only keys do not enter the passage.
- Backspace removes the most recent typed position and updates visible route progress. It does not erase a previous mistake from the accuracy calculation.
- The round is won only when the entire prompt is correct. A timed round that reaches its deadline first ends as incomplete, not as a win.
- Accuracy uses the existing attempt-based formula: correctly typed keystrokes ÷ all attempted keystrokes × 100. Backspace is not an attempt; a wrong keystroke remains in the denominator/error count after correction. Star thresholds use this final accuracy, so passage length must be adequate and the tiers must be tested with beginner typists.
- Use an inclusive deadline rule. Compare the trusted key event’s normalized monotonic timestamp (`KeyboardEvent.timeStamp`, normalized to the `performance.now()` time origin; use `performance.now()` only as a fallback) against the deadline. If the timeout callback runs before the matching final input is processed, defer finalization until that key/input task has been handled. An event timestamped at or before the deadline may win; an event after it cannot.
- Clipboard paste, context-menu paste, drag/drop, and mobile paste are blocked during a round with this message: “Paste isn’t available in a game round. Type the passage to move your journey.” IME composition remains supported. Validate this fairness rule with users before release.
- Retrying the same round resets the timer, prompt state, route, selection feedback, and score state. It creates a separate session. Quick Play selects a fresh passage.
- Prevent duplicate completion and duplicate result writes from fast input, repeated clicks, or timer/input races.

## Scoring and rewards

Completion and discovering the illustrated destination are the primary rewards. Every completed run receives a positive local title (e.g. **Lighthouse Explorer** or **Garden Grown**), with a clickable explanation. An optional careful-typing badge is additive and never replaces or downgrades the completion title. These titles are not ordered by skill and do not compare players. Do not use random loot, lost streaks, countdown pressure, forced retries, escalating rewards, global ranks, or speed-only competition.

For the first release, every completed round gets its game-specific positive title. Optionally show **Careful typing** when the completed run meets the visible threshold of 95% accuracy. This badge is additive, not a child’s overall rank or ability label. Test the threshold with beginner typists; if it discourages children, remove it and keep the completion title only.

In the Game section, hide WPM during play and behind a **More stats** action on results by default for every player; do not infer age. If opened, show it only after at least three seconds, label net and raw WPM separately, and use the formulas already documented in KeyFlows. Emphasize completion, accuracy, and effort. Do not call typing speed a measure of work, study productivity, reading comprehension, or school outcomes.

## Results

At round end, show:

- Completed or partial status and passage progress.
- Accuracy, correct characters, mistakes, and elapsed time.
- Net and raw WPM only when the player opens **More stats** and the run is long enough for a reliable reading.
- A positive local title for every completed round, such as **Lighthouse Explorer** or **Garden Grown**, with a clickable **Why this title?** explanation. Partial rounds receive neutral supportive copy and no failure rank.
- An optional additive badge such as **Careful typing · 95% accuracy**. It is not a rank, never downgrades the completion title, and only appears when its visible rule is met.
- Game-specific completed checkpoints or scene progress.
- One session-informed next practice suggestion, using existing local adaptive logic.
- Actions for retry, quick play, choosing another context, and exit.

Use friendly, age-appropriate copy: “You reached the lighthouse!” or “Your garden is in bloom!” The game is typing practice, not a reading-comprehension or school assessment. Do not show global/public rankings, include a share card, or prompt children to disclose personal information. The displayed title is local and personal, never compared with other players. Sharing is out of scope for the child-inclusive MVP because the static site has no reliable way to distinguish a child from an adult. A later sharing feature requires a separate product and privacy review.

## Accessibility and device behavior

- Use semantic headings, labeled buttons, visible focus, and an accessible typing input.
- Keep keyboard focus in the typing input during play except when the player opens controls or a dialog. Do not steal focus after pause or navigation.
- Correct and incorrect feedback must use text, shape, or pattern as well as color. Do not announce every key to screen readers; announce start, pause, completion, and round end.
- Keep the high-contrast passage and current cursor above decorative art in the visual hierarchy. Use readable type (18px or larger where feasible), short line lengths, clear word spacing, and large predictable controls. Illustration labels must not be tiny or required to understand the rules.
- Meet WCAG AA contrast targets for text and essential controls: at least 4.5:1 for normal text and 3:1 for large text and non-text controls.
- The virtual keyboard is `aria-hidden` if it is only visual feedback. Its purpose and visibility control must still be clearly labeled. Do not flash or animate rapidly; honor reduced motion.
- Provide a **Focus mode** that de-emphasizes or hides scenery and a **Reduce visual effects** setting. Reduced-motion mode replaces translation, camera movement, shake, and transitions with a static scene state and a clear text checkpoint.
- The game must work at 320px width, 200% zoom, and in landscape. Keep the current word and cursor visible as the passage scrolls.
- Mobile players use the native software keyboard. Do not make the visual keymap a tap-to-type control.
- Support IME composition without duplicate input. Do not intercept browser or operating-system shortcuts.
- No auto-moving background, flashing, loud sound, rapid camera motion, or animated decoration that competes with the passage. Any optional sound is off by default and can be disabled.

## Local data and privacy

Store only aggregate results in the existing versioned local storage: date, game ID/name, passage theme/complexity, duration, complete/incomplete status, progress, accuracy, correct and incorrect counts, optional WPM, local title, and any careful-typing badge. Do not save per-keystroke streams or typed passages. The product now offers a CSV spreadsheet export and a separate JSON full backup/restore; extend both with validated game summaries and include game data in reset after schema validation is updated. Explain that results stay in this browser and do not sync across devices.

Do not collect a child’s name, age, school, teacher, account, or contact details. No ads, open chat, social prompts, cross-site tracking, or child analytics in the static MVP. Parents/teachers can view aggregate results only on the browser where play occurred; there is no classroom dashboard or student record system. The game must work without an account, server, API key, external font, or remote asset. Global competition, verified identities, multiplayer, and cross-device sync remain out of scope.

## Edge cases and negative paths

- Empty or whitespace-only passage: block start and explain how to choose a passage.
- Very long word, newline, punctuation, or numbers: preserve cursor visibility and score rules without clipping.
- Wrong first character, several mistakes, correction, and a wrong final character: no premature checkpoint or win.
- Backspace at the beginning: no negative index or progress.
- Fast typing at the deadline when the timeout callback fires first, double-click Start, double completion, and retry during a result dialog: one clear outcome and one result record.
- Paste from keyboard shortcut, context menu, drag/drop, or mobile clipboard: block it with the specified explanation; IME composition still works.
- Composition text, non-US layouts, unmapped keys, mobile native keyboards, and browser shortcuts: preserve normal input behavior; the visual keymap may skip unmapped keys without blocking play.
- Pause, tab hidden, browser blur, route change, reload, storage quota failure, and storage disabled: no hidden timer or broken page. A reload abandons the in-memory round; do not claim it resumes.
- Short and longer passages, one wrong character, corrected errors, Easy/Steady/More challenging content, grayscale/color-vision differences, and child-friendly readability: no premature win, confusing score, or required personal information.
- Reduced motion, Focus mode, keyboard-only use, screen readers, and color-vision differences: game remains understandable and playable without relying on the animated art.

## Acceptance criteria and UAT gate

1. Both The Little Journey and Garden Bloom are playable. A wrong character moves the text cursor to show the error but not the traveler/flowers; Backspace and correction restores progress without removing the error penalty.
2. The virtual keyboard lights only the key just pressed, reflects correct/incorrect feedback within one frame, and clears its state promptly. No expected key is highlighted before input.
3. Correct case, spaces, punctuation, Backspace, IME composition, and held-key behavior are consistent with the documented rules and do not double-count.
4. Correct typing alone moves the selected scene; idle time, clicking, and animation never create progress. The train route and garden bloom clearly differ; each word checkpoint appears once and backspacing/retyping cannot farm rewards.
5. Exact completion reaches the destination or blooms the final garden flower and wins once; an incomplete optional timed round saves a partial aggregate result and never shows a win. Retries reset the round; pause/resume freezes and restores remaining time.
6. The no-timer mode can always be completed. WPM is not shown for runs under three seconds; child-facing results prioritize completion and care over speed.
7. Every completed game awards a positive local title with a clickable rule explanation; no title compares players. The optional careful-typing badge is additive and transparent. WPM remains hidden until the player chooses **More stats**.
8. A final key event timestamped at/before the deadline can win even if the timeout callback runs first; later input cannot alter the result.
9. At 320px and 200% zoom, and with native mobile keyboard open, the passage, cursor, controls, and plain-text progress remain reachable. Screen-reader, keyboard-only, reduced-motion, Focus mode, and grayscale checks pass.
10. Scene progression has no continuous animation loop, no remote asset requests, and no text-area overlay; storage failure does not block play. CSV/JSON export, restore, and reset include validated aggregate game summaries.
11. Marketing and Product sign off on both games, copy, passage levels/themes, and local title rules; QA completes positive, negative, timing-boundary, storage, child-inclusive, accessibility, and responsive UAT before release.

## Success measures and research

Start with a small, supervised user test with appropriate adult consent and set baselines before calling the game successful. Do not collect child identifiers or keystroke traces in research notes. The static MVP has no app telemetry; any aggregate behavior in UAT is observed by the research team and is not sent by the product. If analytics are proposed later, require clear consent and a separate privacy review first. Track only aggregate behavior:

- Round starts that reach a completed or partial result.
- Accuracy and corrected-error patterns compared with the player’s own previous rounds.
- Optional next-exercise starts and random-passage usage.
- Whether players understand their personal game title and how it was earned.
- Repeat play without using time spent alone as a success measure.
- Usability and accessibility issues for the passage, route animation, and pressed-key feedback.

Include children, caregivers/teachers, corporate users, students, and readers in UAT. Ask children to explain the goal, correct/error feedback, pause/exit, win/incomplete state, game differences, and local title in their own words. Test wrong key → type two more characters → backspace those two and the error → correct the error → retype the two characters; verify the traveler stays at the first error, then advances through each retyped correct character and checkpoints are not farmed. Confirm children can choose either game and understand Garden Bloom differs through flower growth rather than just the art. Check whether Easy/Steady/More challenging passages feel suitable without claiming a grade level; check that art is engaging but does not hide or distract from text. Ask adult users whether passages fit work, study, reading, and everyday typing. Verify nobody feels punished by an incomplete run, optional badge, or missed day. Treat retention and learning benefits as hypotheses until user research supports them.
