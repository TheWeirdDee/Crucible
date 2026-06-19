# Provider Routing — Partner Prize Source of Truth (PRD v2 §6.1)

Every agent's LLM call is tagged with its provider in logs. This table is the README's
provider section. Three providers across six agents → eligible for BOTH partner prizes.

| Agent | Provider | Model | Why this role |
|---|---|---|---|
| @RedLead | Anthropic | Claude Sonnet 4.6 | high-stakes reasoning + tool use (recruitment) |
| @Judge | Anthropic | Claude Sonnet 4.6 | neutral state tracking, verdict authoring |
| @Architect | AI/ML API | GPT-4.1 | code reading / surface mapping |
| @ReentrancySpec | AI/ML API | GPT-4.1 | exploit code generation |
| @Engineer | Featherless AI | DeepSeek-V3 | fast patch generation |
| @AccessSpec | Featherless AI | Llama-3.3-70B | fast exploit generation |

## Partner prize checklist
- [ ] AI/ML API routes @Architect + @ReentrancySpec — promo code from kickoff, $10/person
- [ ] Featherless AI routes @Engineer + @AccessSpec — promo code from kickoff, $25/person
- [ ] Every call logs `provider=` tag
- [ ] README documents this table
- [ ] Cancel any billing-enabled partner service after the hackathon (AI/ML API may require it)

## Note
If a provider's credits/keys fail at build time, the routing can collapse to fewer
providers WITHOUT breaking the product — but you lose partner-prize eligibility for the
missing one. Keep the spread if at all possible; it's $2k+ in prizes and credits.
