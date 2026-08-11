import { AIProvider } from './aiProvider.js';

/**
 * Deterministic, offline, local-rules implementation of AIProvider. Used
 * by default so the whole app works with zero external dependencies and
 * zero API keys. Swappable via Owner > AI Settings for a future
 * OpenAIProvider / ClaudeProvider / GeminiProvider — see docs/AI_ARCHITECTURE.md.
 */
export class MockAIProvider extends AIProvider {
  async generateInsight(context) {
    // context: { facts: string[], subject }
    const facts = context.facts || [];
    if (!facts.length) return `Sem sinais suficientes sobre "${context.subject}" ainda.`;
    return `Com base em ${facts.length} sinal(is) recentes sobre ${context.subject}: ${facts[0]}`;
  }

  async summarize(text, opts = {}) {
    const maxLen = opts.maxLen || 220;
    const clean = (text || '').trim().replace(/\s+/g, ' ');
    return clean.length > maxLen ? clean.slice(0, maxLen - 1) + '…' : clean;
  }

  async classify(text, categories) {
    const lower = (text || '').toLowerCase();
    let best = categories[0];
    let bestScore = -1;
    for (const cat of categories) {
      const score = (cat.keywords || []).reduce((acc, kw) => acc + (lower.includes(kw.toLowerCase()) ? 1 : 0), 0);
      if (score > bestScore) { bestScore = score; best = cat; }
    }
    return { category: best.value || best, confidence: bestScore > 0 ? Math.min(0.9, 0.4 + bestScore * 0.15) : 0.2 };
  }

  async recommend(context) {
    return (context.options || []).map((o) => ({ ...o, score: o.score ?? Math.random() })).sort((a, b) => b.score - a.score);
  }

  async simulateConversation(scenario, turns = []) {
    const responses = {
      CASUAL: ["That sounds great, tell me more.", "Oh really? How was that?", "Nice! What's next for you?"],
      WORK: ["Can you clarify the timeline for that?", "Let's align on next steps.", "I'll follow up with the team."],
      MEETING: ["Let's take that offline.", "Can you share the doc before EOD?", "Who owns the follow-up action?"],
      INTERVIEW: ["Can you walk me through a specific example?", "What was the measurable impact?", "How did you handle the pushback?"],
      TECHNICAL: ["Can you explain the tradeoffs of that approach?", "How would this scale?", "What would you do differently now?"],
      LEADERSHIP: ["How did you get buy-in from stakeholders?", "How did you handle the disagreement?", "What did you learn from that?"],
    };
    const pool = responses[scenario] || responses.CASUAL;
    return turns.map((_, i) => pool[i % pool.length]);
  }
}

export const mockAIProvider = new MockAIProvider();
