# AI Architecture

## Interface (`js/core/ai/aiProvider.js`)

```js
class AIProvider {
  async generateInsight(context)                 // { facts: string[], subject } -> string
  async summarize(text, opts)                     // -> string
  async classify(text, categories)                 // -> { category, confidence }
  async recommend(context)                          // { options: [] } -> ranked options
  async simulateConversation(scenario, turns)         // -> string[] (simulated turns)
}
```

Every module that wants "AI" calls one of these five methods against whatever
provider `getActiveAiProvider()` (`js/core/ai/aiProviderFactory.js`) resolves —
never a concrete provider class directly.

## MockAIProvider (active today)

`js/core/ai/mockAIProvider.js` implements the interface with deterministic, offline,
zero-dependency logic: keyword-overlap classification, truncation-based
summarization, scenario-keyed canned conversational turns for the Meeting/Interview/
Shadow English simulators. This is enough to make every "AI" feature in the spec
functional end-to-end without any external API key, cost, or network dependency.

## Rule-based intelligence services (also "AI" in spirit, more deterministic in practice)

These are not literally `AIProvider` calls but are the actual analytical engines
behind the "insight" features — implemented as plain functions over Repository reads,
which is the more testable and explainable approach for rule-driven logic:

- **AI Chief of Staff** (`js/core/ai/chiefOfStaff.js`) — reads Tasks, Projects,
  English sessions, Work meetings, Decisions and returns severity-tagged insights
  (overdue tasks, module concentration, stalled projects, English under target,
  meeting overload, decisions due for review).
- **Cross-Module Insight Service** (`js/core/ai/crossModuleInsights.js`) — rules that
  only make sense reading two+ modules together: Finance+Travel budget overrun,
  Jobs+English (interview soon, no prep logged), Jobs+Career (skill gap vs. postings),
  Church+Calendar (events with no owner), Family+Calendar (upcoming child events),
  Work+Career (high activity, no logged achievements). Each rule also pushes into the
  Notification Center via `notifyOnce` (idempotent — re-running never duplicates).
- Module-specific engines: `churchIntelligence.js`, `financeIntelligence.js`
  (Spending Intelligence, Forecast, Financial Decision Agent), `workIntelligence.js`
  (Daily Brief, Weekly Review, Jira dashboard, Timesheet), `careerIntelligence.js`
  (Evidence Engine, Drift Detector), `jobIntelligence.js` (Fit Score / Match Engine),
  `englishIntelligence.js` (dashboard scoring, weakness aggregation),
  `skillGapRadar.js` (Job demand × Career level × Studies coverage).

All of the above are pure functions of the current database state — no hidden
mutation, easy to unit test (see Admin → Test Runner), and trivially replaceable by an
LLM call later (e.g. `chiefOfStaff.js`'s per-rule logic could become a single prompt
that receives the same underlying facts and returns the same insight shape).

## Owner → AI Settings

`js/modules/ownerModule.js` (AI Settings tab) lets the Owner choose a provider
(`MOCK`/`OPENAI`/`CLAUDE`/`GEMINI`), model, and temperature, and paste an API key.
Today, selecting anything other than `MOCK` shows an explicit warning and the app
keeps using `MockAIProvider` — no request is silently sent anywhere. This UI exists so
the switch is a pure configuration change once a real provider class is implemented,
not a rebuild of every screen that consumes `AIProvider`.

**No API key is ever hardcoded.** If a key is saved, only a masked tail
(`••••••••ab12`) is redisplayed — see `docs/SECURITY.md` for why IndexedDB storage of
a real key would not be safe and should wait for the Supabase migration.

## Adding a real provider later

1. Create `js/core/ai/openAiProvider.js` (or similar) implementing `AIProvider`'s five
   methods, calling the real API with the stored key/model/temperature.
2. In `aiProviderFactory.js`'s `getActiveAiProvider()`, branch on
   `settings.provider` and return the matching instance.
3. Nothing else changes — every call site already goes through
   `getActiveAiProvider()`.
