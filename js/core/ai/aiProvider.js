/**
 * AIProvider is the seam for swapping the local rule-based engine for a
 * real LLM later (OpenAI/Claude/Gemini) without touching any module that
 * consumes insights. See docs/AI_ARCHITECTURE.md.
 *
 * Every method is async and returns plain data (never DOM), so both the
 * Mock provider and a future network-backed provider satisfy identical
 * call sites.
 */
export class AIProvider {
  async generateInsight(context) { throw new Error('not implemented'); }
  async summarize(text, opts) { throw new Error('not implemented'); }
  async classify(text, categories) { throw new Error('not implemented'); }
  async recommend(context) { throw new Error('not implemented'); }
  async simulateConversation(scenario, turns) { throw new Error('not implemented'); }
}
