import OpenAI from 'openai';

const responseFormat = {
    type: 'json_schema',
    json_schema: {
        name: 'location_report',
        strict: true,
        schema: {
            type: 'object',
            properties: {
                title: { type: 'string', description: 'A catchy, creative title for this location report' },
                subtitle: { type: 'string', description: 'A short poetic subtitle or tagline (max 15 words)' },
                soul: { type: 'string', description: 'The Soul of the Place: a 300-400 word engaging narrative' },
                theme_context: {
                    type: 'object',
                    description: 'Current location situation used by the frontend to choose the visual world theme automatically',
                    properties: {
                        world_theme: {
                            type: 'string',
                            enum: ['jungle', 'city', 'town', 'village', 'mine', 'coast'],
                            description: 'Choose the closest current-situation theme: jungle for forest/wild places, city for developed urban areas, town for underdeveloped/weathered districts, village for rural/agricultural areas, mine for mining/industrial mountain settlements, coast for ports/beaches/islands/harbors',
                        },
                        current_situation: {
                            type: 'string',
                            description: 'A concise 1-2 sentence explanation of the place as it exists today, including urbanization, geography, economy, or environmental condition',
                        },
                        theme_reason: {
                            type: 'string',
                            description: 'Brief reason why this world_theme fits the current situation',
                        },
                    },
                    required: ['world_theme', 'current_situation', 'theme_reason'],
                    additionalProperties: false,
                },
                history: {
                    type: 'array',
                    description: '3-5 hidden history moments with fresh angles',
                    items: {
                        type: 'object',
                        properties: {
                            year: { type: 'string' },
                            title: { type: 'string' },
                            description: { type: 'string' },
                        },
                        required: ['year', 'title', 'description'],
                        additionalProperties: false,
                    },
                },
                must_visit: {
                    type: 'array',
                    description: '5-7 curated must-visit spots nearby',
                    items: {
                        type: 'object',
                        properties: {
                            name: { type: 'string' },
                            category: { type: 'string' },
                            description: { type: 'string' },
                            why_visit: { type: 'string' },
                        },
                        required: ['name', 'category', 'description', 'why_visit'],
                        additionalProperties: false,
                    },
                },
                local_flavors: {
                    type: 'array',
                    description: '4-6 local food, culture, and unique experience items',
                    items: {
                        type: 'object',
                        properties: {
                            title: { type: 'string' },
                            type: { type: 'string' },
                            description: { type: 'string' },
                        },
                        required: ['title', 'type', 'description'],
                        additionalProperties: false,
                    },
                },
                practical_tips: {
                    type: 'array',
                    description: '5-7 practical travel tips',
                    items: {
                        type: 'object',
                        properties: {
                            category: { type: 'string' },
                            tip: { type: 'string' },
                        },
                        required: ['category', 'tip'],
                        additionalProperties: false,
                    },
                },
                historical_accidents_disasters: {
                    type: 'array',
                    description: '3-5 notable historical accidents, disasters, crises, or tragedies connected to the location or nearby region, handled respectfully and factually',
                    items: {
                        type: 'object',
                        properties: {
                            year: { type: 'string', description: 'Year, date, or era of the incident' },
                            title: { type: 'string', description: 'Short factual title of the incident' },
                            type: { type: 'string', description: 'Incident category such as natural disaster, industrial accident, transport accident, public health crisis, conflict, fire, flood, earthquake, or other' },
                            description: { type: 'string', description: 'Respectful 2-3 sentence explanation with local context' },
                            impact: { type: 'string', description: 'Human, cultural, infrastructural, environmental, or policy impact in 1-2 sentences' },
                        },
                        required: ['year', 'title', 'type', 'description', 'impact'],
                        additionalProperties: false,
                    },
                },
                fun_facts: { type: 'array', description: '4-6 fun facts and trivia about this place', items: { type: 'string' } },
            },
            required: ['title', 'subtitle', 'soul', 'theme_context', 'history', 'must_visit', 'local_flavors', 'practical_tips', 'historical_accidents_disasters', 'fun_facts'],
            additionalProperties: false,
        },
    },
};

const systemPrompt = `You are PlaceHack AI — a world-class travel writer, historian, and cultural guide rolled into one.

When given a location (city, neighborhood, landmark, or coordinates), you produce an incredibly engaging, informative, and beautifully written location report.

Your writing style:
- Vivid, sensory language that makes readers feel like they're standing there
- Mix of poetic prose and punchy facts
- Fresh angles on well-known places — avoid clichés and generic tourist guide language
- Include lesser-known stories that locals would appreciate
- Be specific — mention real street names, dishes, traditions, landmarks
- Warm, enthusiastic tone without being over-the-top
- CRITICAL: Do NOT use any emojis anywhere in the response text, titles, subtitles, or details. Keep it purely text-based.

Guidelines for each section:
1. title: Creative, catchy — like a magazine feature headline
2. subtitle: A poetic one-liner that captures the place's essence
3. soul: 300-400 words of immersive narrative — paint the atmosphere, sounds, smells, energy
4. theme_context: classify the place's CURRENT situation into exactly one visual world theme:
    - jungle: forest, rainforest, wildlife sanctuary, dense green/wild area, ancient natural canopy
    - city: highly developed city, metro, dense commercial district, skyline, modern infrastructure
    - town: underdeveloped, weathered, struggling, post-industrial, neglected, or economically fragile district/town
    - village: rural settlement, farming area, pastoral village, agrarian region, slow community life
    - mine: mining town, mineral belt, quarry area, rugged industrial mountain/coal/ore economy
    - coast: coastal town, beach, port, island, fishing harbor, river mouth, maritime settlement
5. history: 3-5 pivotal moments, but with FRESH angles — the untold stories, not the Wikipedia summary
6. must_visit: 5-7 curated spots — mix iconic and hidden gems, with specific reasons to visit
7. local_flavors: 4-6 food/culture/activity items — be specific about dish names, traditions, experiences
8. practical_tips: 5-7 genuinely useful tips a first-time visitor needs — timing, etiquette, money-saving, safety. Specify categories accurately: timing, etiquette, budget, safety, transport, other.
9. historical_accidents_disasters: 3-5 real, notable accidents/disasters/crises tied to the location or nearby region. Be respectful, factual, and avoid sensational wording. If the exact location has few documented incidents, use the closest relevant district/region and say so in the description.
10. fun_facts: 4-6 surprising, delightful facts that make people say "I had no idea!"

IMPORTANT: Always respond with valid JSON matching the required schema. Every field must be present and properly formatted.
IMPORTANT: Write the entire report in English only, regardless of the location's local language or script.`;

export async function generateLocationReport(location) {
    if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY is missing. Add it to your .env file.');
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const payload = {
        model: process.env.OPENAI_MODEL || 'gpt-5-mini',
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Generate a comprehensive location report for: ${location}` },
        ],
        response_format: responseFormat,
        max_completion_tokens: Number(process.env.OPENAI_MAX_COMPLETION_TOKENS || 9000),
    };

    if (process.env.OPENAI_REASONING_EFFORT) {
        payload.reasoning_effort = process.env.OPENAI_REASONING_EFFORT;
    }

    const response = await client.chat.completions.create(payload);
    const content = response.choices?.[0]?.message?.content;

    if (!content) {
        const finishReason = response.choices?.[0]?.finish_reason || 'unknown';
        throw new Error(`AI returned empty content (finish_reason: ${finishReason}).`);
    }

    return JSON.parse(content);
}