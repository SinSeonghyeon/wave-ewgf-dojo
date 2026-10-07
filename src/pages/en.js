// Guide and privacy page copy (English). tools/build-site.js renders each entry as a static page at /en/<slug>.
// Each page's updated (YYYY-MM-DD) is its shown last-updated date, JSON-LD dateModified and sitemap lastmod. Change the copy → change the date.
// Body links `href="@guide/ewgf/"` point at a page in the same language, `href="@"` at the practice app. Slugs must match ko.js and ja.js.
module.exports = {
  ui: {
    siteName: 'Mishima Dojo',
    practice: 'Practice',
    guides: 'Guides',
    privacy: 'Privacy policy',
    updated: 'Last updated',
    home: 'All guides',
    next: 'Read next',
    open: 'Practice it now in Mishima Dojo',
    contact: 'Contact',
    watch: 'Watch on YouTube',
    copy: '© 2026 Seonghyeon Shin. All rights reserved. Unofficial fan-made practice tool.',
  },
  pages: [
    {
      slug: 'guide/',
      updated: '2026-10-01',
      title: 'Tekken Mishima Input Guides — EWGF, Wave Dash, Backdash, d/f+2 Link',
      description: 'Free frame-by-frame guides to the Tekken 8 Mishima inputs: EWGF, wave dash, Korean backdash and the d/f+2 → EWGF link, with notation and a practice order.',
      lead: 'These guides explain the inputs behind Mishima Dojo\'s practice modes. Start with the notation, then open the guide for the move you are working on.',
      body: `
<h2>About these guides</h2>
<p>Mishima Dojo is a free browser tool that judges the core inputs of Tekken\'s Mishima-style characters frame by frame. The practice screen only has room for short verdicts, so these guides explain <strong>why</strong> an input is judged the way it is and in what order to practise. Every guide follows the same rules the app actually uses.</p>
<p>The site is an unofficial fan project. It judges keyboard, gamepad and leverless (hitbox) inputs without the game running; it never connects to the game and does not act like a macro.</p>

<h2>Notation</h2>
<p>All guides use numpad notation, assuming your character faces right.</p>
<div class="table"><table>
<tr><th>Numpad</th><th>Direction</th><th>Tekken notation</th></tr>
<tr><td><code>6</code></td><td>forward →</td><td>f</td></tr>
<tr><td><code>4</code></td><td>back ←</td><td>b</td></tr>
<tr><td><code>2</code></td><td>down ↓</td><td>d</td></tr>
<tr><td><code>3</code></td><td>down-forward ↘</td><td>d/f</td></tr>
<tr><td><code>1</code></td><td>down-back ↙</td><td>d/b</td></tr>
<tr><td><code>N</code></td><td>neutral (stick released)</td><td>n</td></tr>
</table></div>
<p>Buttons are 1 (left punch, LP), 2 (right punch, RP), 3 (left kick, LK) and 4 (right kick, RK). “Button 2” in the text means RP. <code>+</code> means pressed together, a space means one after another. One frame (1f) is 1/60 of a second, about 16.67ms.</p>

<h2>Guides</h2>
<ul class="cards">
<li><a href="@guide/ewgf/">EWGF input guide</a><p>The just-frame rule behind f,N,d,d/f+2, why you get a plain WGF, the no-neutral 623 route and the f,N,d/f+2 shortcut.</p></li>
<li><a href="@guide/wave-dash/">Wave dash guide</a><p>How to separate the cancel forward from the start forward in 6N23 6 N, the two ways a chain breaks, and how to build speed.</p></li>
<li><a href="@guide/wsc/">Wave-cancel WS upper guide</a><p>Cancelling a wave dash with back and pressing RP as you rise: back on frame 8, 9 or 10 and the RP gap that goes with each.</p></li>
<li><a href="@guide/backdash/">Korean backdash guide</a><p>Retreating fast with 414 N, cancel timing and the sidestep-cancel mistake.</p></li>
<li><a href="@guide/giwon-link/">d/f+2 → EWGF link guide</a><p>Neutral on frame 48 and EWGF by frame 49 after d/f+2 recovers.</p></li>
<li><a href="@guide/frames/">Frames and input judging</a><p>The 60Hz grid, why a browser is not the game, and device timing errors.</p></li>
</ul>

<h2>Suggested order</h2>
<ol>
<li>Read <strong>frames</strong> first. Once “the same frame” makes sense, everything else is easier.</li>
<li>Practise a standing <strong>EWGF</strong>. Use EWGF ×20 to see your success rate and button-timing histogram.</li>
<li>Practise the <strong>wave dash</strong> in Wave 10s, then join both in Wave EWGF ×10 once the chain holds.</li>
<li>Move on to the <strong>backdash</strong> and the <strong>d/f+2 link</strong> when you are comfortable.</li>
</ol>

<h2>Who runs this and how to reach us</h2>
<p>Mishima Dojo is run by an individual developer who plays Tekken. If a verdict feels different from the game or a guide gets something wrong, please write to the address below. What the site stores is described in the <a href="@privacy/">privacy policy</a>.</p>
`,
    },
    {
      slug: 'guide/ewgf/',
      updated: '2026-10-01',
      title: 'EWGF Input Guide — the f,N,d,d/f+2 Just Frame',
      description: 'A frame-by-frame guide to the Tekken Electric Wind God Fist (EWGF, f,N,d,d/f+2): why you get a normal WGF, the 623 route, the f,N,d/f+2 shortcut, device tips and a practice plan.',
      lead: 'The hard part of the EWGF is not the motion but pressing d/f and button 2 in the same frame. This guide is about catching that one frame.',
      body: `
<h2>What the EWGF is</h2>
<p>The Electric Wind God Fist (EWGF) is the signature move shared by Mishima-style characters. The command is <code>f,N,d,d/f+2</code>, written <code>6N23+2</code> on this site. With the same motion, button 2 in the <strong>same frame</strong> as d/f gives the EWGF; one frame late gives the normal Wind God Fist (WGF). The EWGF is faster and safe on block, which is why every Mishima player drills it.</p>

<h2>Four pieces of the input</h2>
<div class="table"><table>
<tr><th>Step</th><th>Input</th><th>What it does</th></tr>
<tr><td>1</td><td><code>6</code></td><td>A short forward tap that starts the crouch dash.</td></tr>
<tr><td>2</td><td><code>N</code></td><td>Release to neutral, separating forward from down.</td></tr>
<tr><td>3</td><td><code>2</code></td><td>Down, ready to roll into d/f.</td></tr>
<tr><td>4</td><td><code>3+2</code></td><td>d/f and button 2 in the same frame.</td></tr>
</table></div>
<p>Steps 1–3 are the crouch dash (wind god step). Nearly all of the difficulty sits in step 4: the moment you roll into d/f and the moment you press the button must land within 16.67ms.</p>

<h2>Why you get a normal WGF</h2>
<p>Mishima Dojo rounds each input time to the nearest cell of a 60Hz grid and compares cells. There are three outcomes.</p>
<ul>
<li><strong>Same cell</strong>: EWGF.</li>
<li><strong>Button in a later cell</strong>: WGF. This is the most common miss, usually from pressing the button after d/f is “fully in”.</li>
<li><strong>Button in an earlier cell</strong>: the button came before d/f and the attempt is shown as a miss.</li>
</ul>
<p>The ms value in the result shows how far the button was from d/f. If it is always positive (late), press earlier; if negative, a touch later. EWGF ×20 charts these values as a histogram so you can see which way your misses lean.</p>

<h3>Turning it into a feel</h3>
<ul>
<li>Do not press after d/f; treat <strong>rolling from d into d/f and the button as one motion</strong>.</li>
<li>On keyboard or leverless, hold down and press forward and the button <strong>together</strong> as a chord.</li>
<li>On a stick, trying to stop exactly on d/f makes you late. Press as the stick passes d/f; you do not need to park it there.</li>
</ul>

<h2>The no-neutral 623</h2>
<p><code>6 2 3+2</code>, going straight from forward to down without neutral, is also accepted as an EWGF. Mishima Dojo judges it on the same path and shows the skipped neutral as 0 in the input log. Some fast hands prefer 623, but on a stick the path from forward to down can brush d/f and scramble the command, so pick whichever is more reliable on your device.</p>

<h2>The f,N,d/f+2 shortcut (Mist Step EWGF)</h2>
<p>This route skips down entirely: <code>6 N 3+2</code>. With one step fewer it is, in theory, the quickest way to get the move out, which is why it is used for tight punishes. Mishima Dojo counts it as a success when d/f and button 2 share a cell, and additionally marks it <strong>fastest</strong> when forward and neutral each lasted no more than one frame.</p>
<p class="note">“Fastest” on this site means the input conditions were met. It does not guarantee a particular startup frame in the game or that a specific punish works.</p>

<h2>Practice plan</h2>
<ol>
<li>Repeat a standing EWGF in <strong>free practice</strong>. When d/f and +2 appear on one line of the input log, they were in the same frame.</li>
<li>Record your rate and average offset in <strong>EWGF ×20</strong>. Move on once you pass about 80%.</li>
<li>After the wave dash, use <strong>Wave EWGF ×10</strong> to finish a dash with an EWGF. A lower rate than standing is normal.</li>
<li>In matches you will often dash forward (<code>6 N</code>) straight into an EWGF to close distance. The app labels this as a dash EWGF.</li>
</ol>

<h2>Common mistakes</h2>
<ul>
<li><strong>Missing 6N2</strong>: pressing only d/f+2 gives a different move (d/f+2), not the EWGF. Start again from forward.</li>
<li><strong>Button too early</strong>: over-correcting a late habit into an early one. Adjust in small steps until the histogram centres on 0.</li>
<li><strong>Holding down too long</strong>: hesitating on down breaks the rhythm and the button timing with it. If the input log shows a long hold on down, just pass through it.</li>
</ul>
`,
    },
    {
      slug: 'guide/wave-dash/',
      updated: '2026-10-01',
      title: 'Wave Dash Guide — 6N23 6 N and the Cancel Forward',
      description: 'How the Tekken Mishima wave dash (chained crouch dashes, f,N,d,d/f f N) works: separating the cancel forward from the start forward, why chains break, and a plan to build speed.',
      lead: 'The wave dash chains crouch dashes without a break. The key is the “cancel forward” that comes right after d/f.',
      body: `
<h2>What the wave dash is</h2>
<p>The crouch dash (wind god step), <code>6N23</code>, slides the character forward in a low stance. On its own it ends with a short recovery, but a forward input straight after d/f cancels that recovery so the next dash can start at once. Chained together this is the wave dash:</p>
<p><code>6N23 6 N 6N23 6 N 6N23 …</code></p>
<p>Done quickly, the character surges forward in low waves, ducking highs while closing distance.</p>

<h2>Why forward appears twice</h2>
<p>The confusing part is that the forward after d/f and the forward that starts the next dash are <strong>two different inputs</strong>.</p>
<div class="table"><table>
<tr><th>Input</th><th>Name</th><th>Role</th></tr>
<tr><td><code>6N23</code></td><td>crouch dash</td><td>Slides forward.</td></tr>
<tr><td><code>6</code></td><td>cancel forward</td><td>Right after d/f, cancels the recovery. Not a dash.</td></tr>
<tr><td><code>N</code></td><td>neutral</td><td>Separates the cancel from the next start.</td></tr>
<tr><td><code>6N23</code></td><td>next dash</td><td>Starts again from a new forward.</td></tr>
</table></div>
<p>So one cycle is <code>6 N 2 3 6 N</code>, with forward twice. If you go straight down from the cancel forward, it doubles as the start forward and the next dash does not come out.</p>

<h2>Two ways a chain breaks</h2>
<p>When the chain breaks, Mishima Dojo names the cause.</p>
<h3>Missing cancel 6</h3>
<p>You started the next <code>6N23</code> right after d/f without a forward in between. The previous dash\'s recovery is still there, so the chain breaks. Practise flicking forward once right after d/f.</p>
<h3>Missing start 6</h3>
<p>You reused the cancel forward as the next start forward. Release the cancel forward to neutral, then press <strong>forward once more</strong>. As a rhythm: “forward, release, forward”.</p>

<h2>Skipping neutral (623)</h2>
<p>Skipping the neutral after the start forward, <code>623</code>, is also accepted. Mishima Dojo counts it on the same path as <code>6N23</code> and shows the skipped neutral as 0 in the input log. As you speed up, 623 creeps in naturally; just remember the neutral after the cancel forward is still required.</p>

<h2>Building speed</h2>
<ol>
<li><strong>Accuracy first</strong>: in free practice, get ten dashes in a row without a break. When it breaks, read the named cause.</li>
<li><strong>Rhythm</strong>: count three beats, “dash – cancel – release”. The input log shows how many frames each direction was held, so check you are not sitting on any direction.</li>
<li><strong>Wave 10s</strong>: counts crouch dashes over ten seconds and records dashes per second and your best chain. Check the speed chart for slowing down near the end.</li>
<li><strong>Wave EWGF ×10</strong>: three or more wave dashes finished with an EWGF, the match-like test of speed and timing together.</li>
</ol>

<h2>Device tips</h2>
<ul>
<li><strong>Keyboard / leverless</strong>: tapping the forward key twice is clear-cut, so the cancel and start forwards are easy to separate. Make d/f by pressing forward while holding down.</li>
<li><strong>Stick</strong>: when returning from the cancel forward to neutral, use short finger motions so the stick does not bounce into another direction.</li>
<li><strong>Gamepad</strong>: the d-pad has cleaner direction boundaries than an analogue stick. Inputs can be remapped in settings.</li>
</ul>
<p class="note">The on-screen movement is illustration only. The site counts input order and timing; it does not reproduce in-game distance.</p>
`,
    },
    {
      slug: 'guide/wsc/',
      updated: '2026-10-01',
      title: 'Wave-Cancel WS Upper Guide — Back on Frame 8–10, Then RP',
      description: 'A frame-by-frame guide to the Tekken Mishima wave-cancel while-standing upper: back input on frame 8, 9 or 10 after d/f, the matching RP gaps, common mistakes and how to practise.',
      lead: 'Cancel a wave dash with back, then press RP as you rise to get the while-standing upper. When the command is right but nothing comes out, the timing is almost always the reason.',
      video: {id: 'bu4R8n7Y4J4', title: '웨캔기어 사용법, 커맨드는 맞는데 왜 안 될까? | 철권'}, videoNote: 'Video in Korean.',
      body: `
<h2>What it is</h2>
<p>The wave-cancel WS upper cuts the crouching state of a wave dash (<code>6N23</code>) with back (4), then presses RP while rising to get the while-standing move. Conceptually:</p>
<p><code>6 N 2 3 … 4 … RP</code></p>
<p>The <code>…</code> marks a gap; it does not mean holding d/f or back. The hard part is not the command but getting <strong>two gaps</strong> right at once.</p>

<h2>Two windows: A and B</h2>
<div class="table"><table>
<tr><th>Window</th><th>Measures</th></tr>
<tr><td>A</td><td>From the wave's last d/f (3) to back (4)</td></tr>
<tr><td>B</td><td>From back (4) to RP</td></tr>
</table></div>
<p>A counts the d/f frame itself as <strong>1f</strong>, so A=8f is the moment 7 frames have passed. B counts the back frame as 0 and starts from the next frame.</p>

<h2>Success table</h2>
<p>The later A is, the wider the RP gap you are allowed.</p>
<div class="table"><table>
<tr><th>A (back)</th><th>B (RP gap)</th><th>Successes</th></tr>
<tr><td>8f</td><td>1f</td><td>8+1</td></tr>
<tr><td>9f</td><td>1–2f</td><td>9+1, 9+2</td></tr>
<tr><td>10f</td><td>1–3f</td><td>10+1, 10+2, 10+3</td></tr>
</table></div>
<p>It is <strong>not</strong> “any A of 8–10f with any B of 1–3f”: 8+2 and 9+3 fail. At first, aiming A late, near 10f, gives B the most room.</p>
<p class="note">This table summarises the operator's own tests with a while-standing RP in Tekken 8. It is not guaranteed for every character, while-standing move or game version. The site judges input gaps only and does not claim which move comes out in the game when it fails.</p>

<h2>Directions allowed between inputs</h2>
<ul>
<li><strong>Window A</strong>: holding d/f, neutral, or one forward (6) is fine. Two or more forwards, or any other direction, voids the attempt.</li>
<li><strong>Window B</strong>: hold back or go neutral, then RP. Any other direction fails.</li>
<li><strong>Back+RP together</strong>: B becomes 0 and fails. RP must come at least one frame after back.</li>
</ul>
<p>Chaining another wave dash replaces the d/f you are timing from, so however many dashes you do, time it from <strong>the last dash's d/f</strong>. Both <code>6N23</code> and the no-neutral <code>623</code> count as the lead-in wave.</p>

<h2>Why the right command does not come out</h2>
<ul>
<li><strong>Back too early (A of 7f or less)</strong>: you cancelled before the dash had travelled. Leave a short beat after d/f.</li>
<li><strong>Back too late (A of 11f or more)</strong>: you missed the cancel point.</li>
<li><strong>RP late</strong>: B is too long for your A. With A=8f the RP has to be on the very next frame.</li>
<li><strong>Back and RP as a chord</strong>: pressing them together makes B=0. Think “back, then RP”.</li>
</ul>

<h2>How to practise</h2>
<ol>
<li>In the <strong>Wave-cancel WS upper</strong> mode, do one wave dash and then the cancel, over and over. The frame table under the stage shows inputs after d/f in cells 1–15f, and the evaluation panel reports A and B separately.</li>
<li>Read whether A was early or late and whether B was early or late, and fix one at a time.</li>
<li>When it feels steady, run the <strong>10-try challenge</strong>. Each task picks 0–3 wave dashes at random; do that many, then land the cancel on the next dash. With a nickname set, the result goes on the leaderboard.</li>
<li>Stopping for more than a second marks the attempt as abandoned and leaves it out of the success rate.</li>
</ol>
`,
    },
    {
      slug: 'guide/backdash/',
      updated: '2026-10-04',
      title: 'Korean Backdash Guide — 414 N and Cancel Timing',
      description: 'How the Tekken Korean backdash (b,N,b,d/b repeated) works: the d/b cancel, the sidestep-cancel mistake, set speed grades and how to practise with Backdash 10s.',
      lead: 'The Korean backdash cancels the backdash recovery with down-back (1) and rolls straight into the next backdash to retreat fast.',
      body: `
<h2>How it works</h2>
<p>A backdash in Tekken is <code>4 N 4</code> (b,N,b). Left alone it has recovery, so the next backdash cannot come out immediately. The Korean backdash cancels that recovery with down-back (1, ↙) and rolls from 1 straight into 4 to start the next <code>4 N 4</code>.</p>
<p><code>4 N 4 1 4 N 4 1 4 N …</code>, written <code>414 N 414 N …</code></p>
<p>Chained well, it opens distance quickly while you keep guarding, making the opponent\'s attacks whiff.</p>

<h2>Cancel timing</h2>
<p>A 1 cancel that is too early or too late both cost you.</p>
<ul>
<li><strong>Too early</strong>: cutting before the backdash has travelled far covers less ground. Even an early cancel keeps the distance already travelled.</li>
<li><strong>About right</strong>: cancel around 11–13f and connect the next backdash quickly. The best cancel depends on the time your hand takes from pressing 1 to the next backdash.</li>
<li><strong>Too late</strong>: the next backdash waits for the recovery to end, wasting time.</li>
</ul>
<p>Mishima Dojo shows how many frames after the backdash your 1 arrived, how long you held 1 and how long the 4 N 4 took, in the “last backdash” bar.</p>
<p class="note">Distance follows a community-measured Tekken 8 curve averaged over five Mishima-style characters; a full backdash travels 0.638 m. Characters and versions may differ, and the uncancelled 26f recovery still needs further in-game verification. Use the Backdash 10s timeline and set evaluation to compare cancel and hand-input times.</p>

<h2>Common mistakes</h2>
<h3>Neutral after 1</h3>
<p>Letting go after 1 and then pressing 4 (<code>1 N 4</code>) breaks the flow. <strong>Roll</strong> from 1 straight into 4.</p>
<h3>Sidestep cancel (2 or 8)</h3>
<p>Cancelling with down (2) or up (8) instead of 1 ends the recovery but mixes in a sidestep, dropping your guard. The site keeps the distance but marks it as a mistake.</p>
<h3>Forward (6)</h3>
<p>Forward during the backdash becomes a forward input and counts as a mistake. On a stick, make sure it does not bounce the other way between 4 and 1.</p>

<h2>Set speed grades</h2>
<p>Mishima Dojo grades each set by <strong>set speed (m/s)</strong>: the distance of that backdash divided by the time until the next one comes out.</p>
<div class="table"><table>
<tr><th>Grade</th><th>Set speed</th></tr>
<tr><td>Very fast</td><td>1.78 m/s or more</td></tr>
<tr><td>Fast</td><td>1.55 m/s or more</td></tr>
<tr><td>OK</td><td>1.23 m/s or more</td></tr>
<tr><td>Slow</td><td>below that</td></tr>
</table></div>

<h2>Practice plan</h2>
<ol>
<li>In <strong>free practice</strong>, repeat <code>4 N 4</code> until the backdash comes out every time. No verdict appears until your first 1 cancel.</li>
<li>Add the 1 cancel and aim for a steady “OK” grade or better.</li>
<li>Use <strong>Backdash 10s</strong> to record how far you retreat in ten seconds (m). Ties on the leaderboard go to the player with more “Very fast” sets.</li>
</ol>
`,
    },
    {
      slug: 'guide/giwon-link/',
      updated: '2026-10-01',
      title: 'd/f+2 → EWGF Link Guide — EWGF by Frame 49',
      description: 'A frame-by-frame guide to linking d/f+2 into EWGF in Tekken: pre-input forward on frames 40–46, neutral on 48, EWGF by 49, and how to practise it.',
      lead: 'This is a link, not a move: an EWGF entered the moment d/f+2 recovers.',
      body: `
<h2>d/f+2 and the link</h2>
<p><strong>d/f+2</strong> is right punch pressed while holding down-forward. It shares a hand shape with the EWGF, so when you aim for an EWGF but drop the <code>f,N,d</code> you get this move instead. Mishima Dojo accepts it as d/f+2 and also tells you that the <code>6N23</code> was missing if you meant an EWGF.</p>
<p>The <strong>link</strong> is landing d/f+2 and then entering an EWGF as soon as its recovery ends. Nothing cancels or buffers it for you; the EWGF input must be finished within a set frame.</p>

<h2>Frame reference</h2>
<p>Count the d/f+2 input frame as 1f.</p>
<div class="table"><table>
<tr><th>Frame</th><th>Phase</th><th>What to do</th></tr>
<tr><td>1f</td><td>d/f+2 input</td><td><code>3+2</code></td></tr>
<tr><td>2f –</td><td>startup and recovery</td><td>No walking, dashing or moves come out.</td></tr>
<tr><td>40 – 46f</td><td>pre-input</td><td>The forward can be entered early here</td></tr>
<tr><td>48f</td><td>neutral</td><td>The first frame you can act. Neutral goes here</td></tr>
<tr><td>49f</td><td>attack</td><td>An EWGF out by this frame succeeds</td></tr>
</table></div>
<p>The quickest flow is <strong>forward on 40–46f → neutral on 48f → d, d/f+2 by 49f</strong>. Note that 47f is not part of the pre-input window.</p>
<p class="note">The 48f/49f targets and the pre-input window match what the operator checked in the game. The site\'s startup and recovery lengths themselves are approximations, and it does not simulate whether the hit connects or the opponent\'s grounded/airborne state. A success means “input conditions met”.</p>

<h2>What carries through recovery</h2>
<p>Not everything you press during recovery survives.</p>
<ul>
<li><strong>Directions</strong>: the only direction that carries past recovery is the <strong>start forward</strong>. Neutral, down and d/f must come after recovery ends.</li>
<li><strong>Buttons</strong>: only <strong>one</strong> button pressed in the short window just before recovery ends is kept. Pressing again overwrites it.</li>
</ul>
<p>So entering all of <code>6N23</code> early does not work. Put only the forward in early and enter the rest quickly once recovery ends.</p>

<h2>Any EWGF route counts</h2>
<p>For the link Mishima Dojo looks at one thing: <strong>on which frame the EWGF came out</strong>. <code>6N23+2</code>, the no-neutral <code>623+2</code> and the shortcut <code>6N3+2</code> are all EWGFs, and any of them out by 49f succeeds. The shortcut is shorter, so 49f is easier to reach with it.</p>

<h2>How to practise</h2>
<ol>
<li>In the <strong>d/f+2 → EWGF link</strong> mode, hit the dummy with d/f+2. It doubles over, and the gauge under its feet shows when recovery ends.</li>
<li>In the frame table under the stage, read the grey <strong>pre-input</strong>, gold <strong>neutral</strong> and red <strong>attack</strong> bands to see which cell each input landed in.</li>
<li>A late EWGF makes the dummy crumple weakly; a success launches it and the app pops “Demon Slayer Link!”.</li>
<li>When it feels steady, run the <strong>10-try challenge</strong> for success rate and best streak. With a nickname set, the result goes on the leaderboard.</li>
</ol>
`,
    },
    {
      slug: 'guide/frames/',
      updated: '2026-10-01',
      title: 'Frames and Input Judging — the 60Hz Grid and Input Lag',
      description: 'What a frame is in fighting games and how Mishima Dojo judges inputs on a 60Hz grid: why a browser differs from the game, device timing errors and how to reduce them.',
      lead: 'What “one-frame just input” means, and how a browser practice tool measures it.',
      body: `
<h2>What a frame is</h2>
<p>Tekken runs at 60 frames per second. One frame is about 16.67ms, and startup, recovery and frame advantage are all given in frames. A “just” move like the EWGF needs two inputs in the <strong>same frame</strong>. Two inputs close in time can still fail if they straddle a frame boundary, and two a little further apart succeed if they fall in the same frame.</p>

<h2>Mishima Dojo\'s 60Hz grid</h2>
<p>Mishima Dojo places the input times the browser records on a shared 60Hz grid.</p>
<ol>
<li>The keyboard uses the key event time; a gamepad uses the time the pad reports.</li>
<li>Each time is rounded to the nearest 16.67ms cell.</li>
<li>Two inputs with the same cell number are in the same frame.</li>
</ol>
<p>This differs from “success if the gap is under N ms”. A 5ms gap across a cell boundary is two frames; a 12ms gap inside one cell is one frame. The game also reads input per frame, so this is closer to how the game behaves. The grid does not depend on your monitor\'s refresh rate, so a 144Hz screen uses the same standard.</p>

<h2>Why it is not identical to the game</h2>
<p>A browser cannot see the game\'s frame timing, so the site\'s grid and the game\'s grid are offset from each other. An input near a boundary can succeed here and fail in the game, or the other way round. What matters is <strong>your success rate and error distribution over many tries</strong>, not a single result. A high rate with errors clustered near 0 carries over to the game.</p>

<h2>Timing error by device</h2>
<div class="table"><table>
<tr><th>Device</th><th>Character</th><th>Tip</th></tr>
<tr><td>Keyboard / leverless</td><td>Key event times are fairly accurate, and chords are easy.</td><td>A diagonal is two keys: hold down first, then press forward.</td></tr>
<tr><td>Gamepad</td><td>The browser reads the pad periodically, which can add a few ms of error.</td><td>The d-pad has cleaner direction boundaries than an analogue stick.</td></tr>
<tr><td>Stick</td><td>Usually recognised as a gamepad. Passing between directions easily registers stray diagonals.</td><td>Directions and buttons can be remapped in settings.</td></tr>
<tr><td>Phone touch</td><td>On-screen touch buttons.</td><td>Precision is low; use it only to learn the shape of an input.</td></tr>
</table></div>

<h2>Reading the input log</h2>
<p>The input log on the left of the practice screen lists the newest input at the top. Inputs in the same 60Hz cell share one line, so <code>↘+2</code> means d/f and button 2 were in the same frame. A direction line shows how many frames it was held; a button-only line shows the gap from the previous input. If an EWGF came out as a WGF, you will see ↘ and +2 on separate lines.</p>

<h2>Reducing error</h2>
<ul>
<li>Close heavy tabs and programs while practising. A busy browser can handle input events late.</li>
<li>Use a wired connection for wireless pads when you can.</li>
<li>Keep laptops on mains power to avoid power-saving delays.</li>
</ul>
`,
    },
    {
      slug: 'privacy/',
      updated: '2026-10-01',
      title: 'Privacy Policy',
      description: 'What Mishima Dojo stores, how it uses browser storage, advertising (Google AdSense) cookies, and how to delete your data.',
      lead: 'Mishima Dojo (mishimaryu.com, “the site”) has no accounts and handles only the minimum information the service needs.',
      body: `
<h2>1. Operator</h2>
<p>The site is run by an individual, Seonghyeon Shin. Questions about personal data and deletion requests go to <a href="mailto:tlstjdgus3@gmail.com">tlstjdgus3@gmail.com</a>.</p>

<h2>2. Data stored in your browser</h2>
<p>The following is stored in your browser\'s storage (localStorage). Your nickname and ownership token are also sent for server authentication; leaderboard records, posts and votes are sent when you use the server features described below.</p>
<ul>
<li>Settings (language, sound, key and pad bindings, display options)</li>
<li>Practice records, best records per mode, running statistics, achievements, outfits and daily rewards</li>
<li>Which announcements you have read and which posts you liked or disliked</li>
<li>Your nickname and a random token that proves you own it</li>
</ul>
<p>“Reset records &amp; achievements” in settings resets practice records, statistics, achievements and outfits; it keeps settings, your nickname and token. Clearing the site\'s data in your browser removes locally stored information but does not delete server records. It also removes your ownership token, so you will lose access to actions that require proof of ownership, such as deleting your leaderboard records.</p>

<h2>3. Data stored on the server</h2>
<p>For the leaderboard, message board and visitor count, the following is stored on Cloudflare (Workers and D1). No names, email addresses or phone numbers are collected.</p>
<div class="table"><table>
<tr><th>Feature</th><th>Stored</th><th>When</th></tr>
<tr><td>Nickname</td><td>Nickname, ownership token, time registered</td><td>When you choose a nickname</td></tr>
<tr><td>Leaderboard</td><td>Nickname, mode, score and details, display language, time</td><td>When you finish a timed mode</td></tr>
<tr><td>Message board</td><td>Nickname, post and reply text, time, likes and dislikes</td><td>When you post or vote</td></tr>
<tr><td>Visitor count</td><td>A per-day total</td><td>On your first visit of the day (nothing that identifies you)</td></tr>
</table></div>
<p>Nicknames, leaderboard records and posts are visible to other visitors. Please do not include anything that identifies you.</p>

<h2>4. IP addresses and access logs</h2>
<p>The site\'s server uses your IP address briefly for rate limiting posts, nickname registration and votes, and does not store it in its database. GitHub Pages (GitHub, Inc.), which serves the site, and Cloudflare, Inc., which runs the server, may process access logs such as IP addresses and browser information for security and operation under their own policies.</p>

<h2>5. Advertising and cookies (Google AdSense)</h2>
<p>The site may show Google AdSense ads.</p>
<ul>
<li>Third-party vendors, including Google, use cookies to serve ads based on your prior visits to this site or other websites.</li>
<li>Google\'s use of advertising cookies enables it and its partners to serve ads based on your visits to this site and/or other sites on the Internet.</li>
<li>You can opt out of personalised advertising in <a href="https://adssettings.google.com/" rel="noopener">Google Ads Settings</a>, and opt out of third-party vendors\' cookies for personalised advertising at <a href="https://www.aboutads.info/choices/" rel="noopener">www.aboutads.info</a>.</li>
<li>See <a href="https://policies.google.com/technologies/partner-sites" rel="noopener">how Google uses information from sites that use its services</a>.</li>
</ul>
<p>Apart from advertising, the site itself uses no tracking cookies or analytics tools.</p>

<h2>6. External services</h2>
<ul>
<li><strong>Google Fonts</strong>: loading fonts sends your IP address and similar data to Google.</li>
<li><strong>YouTube</strong>: some guides embed videos from the operator's channel in privacy-enhanced mode (youtube-nocookie.com). YouTube does not store viewing information before you press play; once you play a video, Google's privacy policy applies.</li>
<li><strong>Donation links</strong>: Ko-fi and KakaoPay are external sites; anything you enter there follows their policies. The site receives no donor information.</li>
</ul>

<h2>7. Retention and deletion</h2>
<ul>
<li>You can delete your own leaderboard record with the delete button on your row.</li>
<li>To delete posts, replies or a nickname, email the operator; requests are handled after confirmation.</li>
<li>Other server data is kept while the service runs and deleted when it closes.</li>
<li>The operator may hide or delete fraudulent records and inappropriate posts.</li>
</ul>

<h2>8. Children</h2>
<p>The site does not knowingly collect personal information from children under 14. Please do not put identifying information in nicknames or posts.</p>

<h2>9. Changes</h2>
<p>If this policy changes, the new text and date will be posted on this page.</p>
<p>Effective: October 1, 2026</p>
`,
    },
  ],
};
