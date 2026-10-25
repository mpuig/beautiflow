import type { SafetyRecording, ReplayCase, ReplayStep } from '../scripts/record-diagram-safety.ts'
const esc = (value: unknown) => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

export function sourceDiff(before: string, after: string) {
  if (before === after) return [{ kind: 'context', text: 'No source changes from the original.' }]
  const a = before.trimEnd().split('\n'), b = after.trimEnd().split('\n')
  const table = Array.from({ length: a.length + 1 }, () => Array<number>(b.length + 1).fill(0))
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) table[i]![j] = a[i] === b[j] ? table[i + 1]![j + 1]! + 1 : Math.max(table[i + 1]![j]!, table[i]![j + 1]!)
  const lines: { kind: string; text: string }[] = []
  let i = 0, j = 0
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) { lines.push({ kind: 'context', text: ` ${a[i++]}` }); j++ }
    else if (j < b.length && (i === a.length || table[i]![j + 1]! > table[i + 1]![j]!)) lines.push({ kind: 'added', text: `+${b[j++]}` })
    else lines.push({ kind: 'removed', text: `-${a[i++]}` })
  }
  return lines
}
function state(step: ReplayStep) { return step.receipt?.state ?? step.output?.state ?? 'original' }
function stage(item: ReplayCase, step: ReplayStep, index: number) {
  const initial = item.steps[0]!
  const unchanged = step.hash === initial.hash
  const refused = step.exitCode === 2
  return `<div class="stage" id="${item.id}-stage-${index}" ${index === item.steps.length - 1 ? '' : 'hidden'}>
    <div class="stage-title"><h3>${esc(step.name)}</h3><span class="state ${refused ? 'refused' : ''}">${esc(state(step))}${step.exitCode === null ? '' : ` · exit ${step.exitCode}`}</span></div>
    <p class="pan-note">On small screens, scroll each diagram sideways or open its SVG.</p><div class="comparison">
      <figure><figcaption>Original <a href="recording/${initial.diagram}" target="_blank" rel="noopener">Open SVG</a></figcaption><div class="diagram-window" tabindex="0" role="group" aria-label="Original diagram. Scroll sideways on small screens."><img src="recording/${initial.diagram}" alt="Original hotel request path: staff, cell API, membership check and tenant records." width="900" height="260" loading="lazy"></div></figure>
      <figure><figcaption>Selected step <a href="recording/${step.diagram}" target="_blank" rel="noopener">Open SVG</a></figcaption><div class="diagram-window" tabindex="0" role="group" aria-label="Selected diagram. Scroll sideways on small screens."><img src="recording/${step.diagram}" alt="${esc(step.name)}: ${unchanged ? 'original diagram unchanged' : item.id === 'stale' ? 'diagram unchanged; collaborator comment retained in source' : 'API renamed to Tenant API; relationships retained'}." width="900" height="260" loading="lazy"></div></figure>
    </div>
    <div class="proof-line"><strong>${unchanged ? 'Source matches original bytes.' : item.id === 'stale' ? 'Collaborator’s source retained.' : 'Source changed; relationships retained.'}</strong><a href="recording/${item.id}/step-${index}.mmd" download>Download this source</a></div>
    ${refused ? `<p class="refusal"><strong>${esc(step.output?.error?.code)}</strong> ${esc(step.output?.error?.message ?? step.output?.message ?? '')}</p>` : ''}
    ${step.command ? `<pre class="command" tabindex="0" aria-label="Recorded command"><code>$ ${esc(step.command)}</code></pre>` : '<p class="start-note">Starting fixture. No CLI operation has run yet.</p>'}
    <div class="evidence-grid">
      <div><h4>Source diff <span>original → selected step</span></h4><pre class="diff" tabindex="0" aria-label="Source diff"><code>${sourceDiff(initial.source, step.source).map((line) => `<span class="${line.kind}">${esc(line.text)}</span>`).join('\n')}</code></pre></div>
      <div class="fingerprints"><h4>SHA-256 <span>full source bytes</span></h4><dl><dt>Original</dt><dd><code>${esc(initial.hash)}</code></dd><dt>Selected step</dt><dd><code>${esc(step.hash)}</code></dd></dl><p>${item.id === 'stale' && refused ? 'The current hash differs from the planned hash. Refusal is the expected result, not a failed demonstration.' : unchanged ? 'Equal hashes accompany an exact byte comparison in the recorder.' : 'The receipt also binds the action file hash. Open its snapshot below.'}</p><a href="recording/${item.id}/step-${index}.json" download>Download step evidence</a></div>
    </div>
    <details><summary>Actual CLI response${step.output ? '' : ' (none for this step)'}</summary><pre tabindex="0"><code>${esc(JSON.stringify(step.output, null, 2))}</code></pre></details>
    <details><summary>Receipt snapshot${step.receipt ? ` · ${esc(step.receipt.state)}` : ' · no receipt written'}</summary><pre tabindex="0"><code>${esc(JSON.stringify(step.receipt, null, 2))}</code></pre></details>
  </div>`
}
export function safetyPage(recording: SafetyRecording) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="Replay real Beautiflow CLI transactions: a supported edit, two refusals and an exact rollback. Inspect the source, receipts and hashes."><title>Don’t Break the Diagram — Beautiflow</title><link rel="stylesheet" href="site.css"><script src="app.js" defer></script></head>
<body><a class="skip-link" href="#bench">Skip to evidence bench</a>
<header><a class="brand" href="../">Beautiflow</a><nav aria-label="Related sites"><a href="../examples.html#workflows">Examples</a><a href="../boring-diagrams/">Boring AWS Diagrams</a><a href="../docs/cli/">CLI reference</a></nav></header>
<main><div class="intro"><h1>Don’t break<br>the diagram.</h1><div><p class="lead">Give your agent an edit.<br>Make the runtime check it.</p><p>Replay four real CLI runs. Compare the diagram, source diff and receipt at every step. Nothing on this page edits a file.</p><a href="#bench" class="jump">Inspect the evidence</a></div></div>
<nav class="case-index" aria-label="Recorded cases">${recording.cases.map((item) => `<a href="#${item.id}" data-case="${item.id}"><strong>${esc(item.title)}</strong><span>${esc(item.outcome)}</span></a>`).join('')}</nav>
<div id="bench" tabindex="-1"><p class="replay-note">Recorded evidence, not a live terminal. Choose a step to inspect its captured state.</p><noscript><p>JavaScript is off. Showing the final snapshot of all four cases; sources, evidence and reproduction downloads still work.</p></noscript>
${recording.cases.map((item) => `<section class="case" id="${item.id}" aria-labelledby="${item.id}-title"><div class="case-heading"><h2 id="${item.id}-title">${esc(item.title)}</h2><p>${esc(item.description)}</p></div>
<div class="step-rail" hidden role="group" aria-label="${esc(item.title)}: recorded steps">${item.steps.map((step, index) => `<button type="button" data-step="${index}" aria-controls="${item.id}-stage-${index}" aria-pressed="${index === item.steps.length - 1}"><span>${index + 1}</span>${esc(step.name)}</button>`).join('')}</div>
<div class="step-controls" hidden><button type="button" data-previous>Previous step</button><p class="step-status" aria-live="polite"></p><button type="button" data-next>Next step</button></div>
${item.steps.map((step, index) => stage(item, step, index)).join('')}
<details class="reproduce"><summary>Reproduce this case locally</summary><p>Download these three files into a <strong>new directory</strong> with Beautiflow 1.0.1 on your PATH. Read the script before running it. It edits <code>source.mmd</code> and writes a local receipt. For refused operations, the script expects exit code 2.</p><div class="downloads"><a download href="recording/${item.id}/original.mmd">original.mmd</a><a download href="recording/${item.id}/actions.json">actions.json</a><a download href="recording/${item.id}/reproduce.sh">reproduce.sh</a></div><pre tabindex="0"><code>sh reproduce.sh</code></pre>${item.id === 'rollback' ? '<p>To compare the restored file directly: <code>cmp original.mmd source.mmd</code>. Exit 0 means the bytes match.</p>' : ''}</details>
</section>`).join('')}</div>
<section class="limits"><h2>What the evidence proves.</h2><div><p>These runs demonstrate source-preserving architecture transforms, input-hash checks, mechanical verification and explicit rollback. The hotel path is an illustrative, deliberately small fixture, not a projection of the complete AWS gallery.</p><p><strong>No visual attestation.</strong> The finished receipt records <code>visualInspected: false</code>. A mechanical check does not establish visual quality, working tenant isolation, IAM policy or deployed AWS correctness. Architecture does not support automatic polish.</p><p><strong>Rollback is explicit.</strong> It restores the recorded snapshot; it is not a merge or a guarantee against overwriting later work. Inspect current files before requesting rollback. Receipts are local control files, not signed security attestations.</p><p><strong>Raw evidence.</strong> Downloaded receipt snapshots contain absolute paths from a temporary recording workspace. Do not commit those receipts into your own project or try to resume them. Reproduce with the inputs and script to create fresh local receipts.</p></div></section>
<footer><div><strong>${esc(recording.version)}</strong><p>Recorded ${esc(recording.recordedAt)}. Replay is read-only and works from static files.</p><a download href="recording/recording.json">Download the complete recording</a></div><details><summary>Recording provenance</summary><p>${esc(recording.provenance)}</p><p>Executable SHA-256</p><code>${esc(recording.executableSha256)}</code></details><a href="../">Back to Beautiflow</a></footer>
</main></body></html>`
}
