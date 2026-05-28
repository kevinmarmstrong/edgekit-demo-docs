import '@kevinmarmstrong/edgekit-ui'
import { chromeAI } from '@kevinmarmstrong/edgekit'
import type { EdgeChat } from '@kevinmarmstrong/edgekit-ui'
import { createKnowledgeSkill, createKnowledgeTool, createMarkdownMemoryStore } from '@kevinmarmstrong/edgekit-knowledge'
import { createMissionProfile, validateMissionProfile } from '@kevinmarmstrong/edgekit-skills'
import './styles.css'

const store = createMarkdownMemoryStore({
  documents: [
    {
      id: 'runtime',
      source: 'Runtime guarantees',
      content: `# Runtime guarantees
Edgekit keeps app state owned by the host app. It tries Chrome AI first, then WebLLM, then an explicit app-owned fallback or no-model path. Risky mutations should use approvals, telemetry, and audit events.`,
    },
    {
      id: 'knowledge',
      source: 'Knowledge Access',
      content: `# Knowledge Access
Knowledge Skills package app-owned sources as searchable tools with citations, freshness, and synthesis expectations. Retrieval output should be grounded and cite the source label.`,
    },
    {
      id: 'skills',
      source: 'Skills and Mission Profiles',
      content: `# Skills and Mission Profiles
Skills describe one capability with tools, examples, policy, and synthesis expectations. Mission Profiles assemble Skills for one localized workflow in the host app.`,
    },
  ],
})

const source = {
  id: 'edgekit-docs',
  label: 'Edgekit docs subset',
  description: 'Small external demo corpus for Knowledge Access.',
  search: async (query: string) => {
    const records = await store.search(query, { input: query, session: {} })
    return records.map(record => ({
      id: record.id,
      title: record.title ?? record.id,
      excerpt: record.body,
      source: record.source ?? record.title,
      uri: `https://github.com/kevinmarmstrong/edgekit`,
      citations: [{ label: record.source ?? record.title, excerpt: record.body.slice(0, 180) }],
    }))
  },
  freshness: async () => ({ stale: false, updatedAt: '2026-05-28T00:00:00.000Z' }),
}

const knowledgeTools = createKnowledgeTool({
  name: 'searchEdgekitDocs',
  source,
  defaultTopK: 3,
})

const knowledgeSkill = createKnowledgeSkill({
  id: 'edgekit-docs-qa',
  name: 'Edgekit Docs Q&A',
  description: 'Answer Edgekit architecture, runtime, and Knowledge Access questions from app-owned docs.',
  source,
  toolName: 'searchEdgekitDocs',
  citationRequired: true,
  freshnessRequired: true,
  requiredFacts: ['runtime boundary', 'provider cascade', 'host-owned state', 'citations'],
})

const profile = createMissionProfile({
  id: 'external-docs-v1',
  mission: 'docs-qa',
  version: '0.3.0',
  systemPrompt: 'Answer Edgekit documentation questions from the registered Knowledge Access tool. Cite the source label and say when the corpus is insufficient.',
  tools: knowledgeTools,
  requiredTools: ['searchEdgekitDocs'],
  defaults: { toolChoice: 'required', downloadPolicy: 'never', maxSteps: 3 },
  synthesis: { requiredAttributes: ['answer', 'citation', 'freshness'], style: 'explicit' },
  meta: { description: 'External docs Q&A demo for Edgekit v0.3.0' },
})

const root = document.querySelector<HTMLElement>('#app')
if (root) {
  root.innerHTML = `
    <header>
      <a href="https://github.com/kevinmarmstrong/edgekit">edgekit</a>
      <span>External docs Q&A demo</span>
    </header>
    <section class="hero">
      <div>
        <p class="eyebrow">Knowledge Access</p>
        <h1>Ground answers in app-owned docs with citations.</h1>
        <p>This external demo packages a tiny documentation corpus as a Knowledge Skill, registers it as a tool, and keeps the no-model fallback honest when browser AI is unavailable.</p>
      </div>
      <edge-chat id="docs-agent" placeholder="Ask: how does Edgekit handle model fallback and host state?"></edge-chat>
    </section>
    <section class="grid">
      <div>
        <h2>Corpus</h2>
        <ul>
          <li>Runtime guarantees</li>
          <li>Knowledge Access</li>
          <li>Skills and Mission Profiles</li>
        </ul>
      </div>
      <div>
        <h2>Mission Profile</h2>
        <pre id="profile"></pre>
      </div>
    </section>
  `
}

const chat = document.querySelector<EdgeChat>('#docs-agent')
chat?.configure({
  sessionId: 'external-docs-demo',
  model: [chromeAI()],
  downloadPolicy: 'never',
  onNoModel: ({ input }) => fallbackAnswer(input),
})
chat?.applyMissionProfile(profile)
chat?.registerTools(knowledgeTools)

const validation = validateMissionProfile(profile, { registeredTools: Object.keys(knowledgeTools) })
const profileEl = document.querySelector<HTMLElement>('#profile')
if (profileEl) {
  profileEl.textContent = JSON.stringify({
    validation: validation.ok ? 'ok' : validation.errors,
    skill: knowledgeSkill.id,
    requiredTools: profile.requiredTools,
    synthesis: profile.synthesis,
  }, null, 2)
}

function fallbackAnswer(input: string) {
  const rawRecords = store.search(input, { input, session: {} })
  const records = Array.isArray(rawRecords) ? rawRecords : []
  if (!records.length) return 'Basic mode: the demo corpus did not contain enough evidence for that question.'
  return [
    'Basic mode: Knowledge Access found grounded docs without a model-backed synthesis step.',
    ...records.slice(0, 2).map(record => `- ${record.title}: ${record.body.replace(/\s+/g, ' ').slice(0, 220)} [${record.source ?? record.title}]`),
  ].join('\n')
}
