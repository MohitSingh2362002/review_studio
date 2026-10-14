
const STYLES: Record<string, string> = {
  short: "1-2 sentences, direct, opens with a verdict",
  detailed: "4-5 sentences going deep on the focus aspect, plus at most one other aspect",
  story: "narrates the experience in order (what the customer needed, what happened, how it ended) using only the given details",
  professional: "polite, formal, measured tone",
  casual: "relaxed and conversational, like telling a friend; one emoji at most, and only if the rating is 4-5",
};
const STYLE_KEYS = Object.keys(STYLES);
const LANGUAGES = ["English", "Hindi", "Hinglish"];
const TONES = ["Casual", "Professional", "Enthusiastic"];

const SYSTEM_PROMPT = `You write customer review drafts that the customer will edit and post themselves. Use ONLY the details provided.

Sentiment rules (most important):
- The star rating decides the overall sentiment. 4-5 stars: positive. 3 stars: balanced, mention both what was good and what was not. 1-2 stars: clearly dissatisfied, but polite and constructive. For 1-2 stars do NOT praise the business, do NOT say "recommend", and do NOT use enthusiastic words or emojis.
- Aspects under "Liked" are praise and aspects under "Problems" are complaints. Never turn a problem into praise or the other way round.
- Never mention the star number or write "x/5".

Content rules:
- Never invent events, prices, names, dates, staff names or backstory. If few details are given, stay general and short instead of padding with generic hype.
- Each draft must read as if a different person wrote it: different opening word, sentence length and structure. No two drafts may start with the same word.
- Each draft centres on its assigned focus aspect. Do not list all aspects as a comma-separated list. Avoid filler like "top-notch", "seamless", "exceeded expectations", "highly recommend" unless the rating is 4-5 and it genuinely fits.
- If the customer wrote a note, build on their own words and keep their meaning.
- Write in the requested language. "Hinglish" means Hindi in Roman script mixed with English, in natural everyday phrasing (e.g. "Service bahut badhiya thi, staff kafi polite tha").
- Return valid JSON only, with no markdown fences and no extra text.`;

function clean(str: unknown, max: number): string {
  return String(str ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function list(arr: unknown): string[] {
  return Array.isArray(arr)
    ? arr.slice(0, 8).map((c) => clean(c, 40)).filter(Boolean)
    : [];
}

function validate(body: any) {
  const rating = Number(body?.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { error: "Rating 1-5 is required" };

  const liked = rating >= 3 ? list(body.liked) : [];
  const issues = rating <= 3 ? list(body.issues) : [];

  const language = LANGUAGES.includes(body.language) ? body.language : "English";
  const tone = TONES.includes(body.tone) ? body.tone : "Casual";
  const styles = Array.isArray(body.styles) && body.styles.length
    ? body.styles.filter((s: string) => STYLE_KEYS.includes(s))
    : STYLE_KEYS;
  if (!styles.length) return { error: "Invalid styles" };

  return {
    value: {
      businessName: clean(body.businessName, 80) || "this business",
      rating,
      liked,
      issues,
      note: clean(body.note, 300),
      language,
      tone,
      styles,
    },
  };
}

function buildUserPrompt(v: {
  businessName: string;
  rating: number;
  liked: string[];
  issues: string[];
  note: string;
  language: string;
  tone: string;
  styles: string[];
}) {
  const sentiment = v.rating >= 4 ? "POSITIVE" : v.rating === 3 ? "MIXED" : "NEGATIVE";
  const pool = v.rating <= 2 ? v.issues : v.rating === 3 ? [...v.liked, ...v.issues] : v.liked;
  const start = Math.floor(Math.random() * Math.max(pool.length, 1));
  const styleLines = v.styles
    .map((s, i) => {
      const idx = STYLE_KEYS.indexOf(s);
      const focus = pool.length ? pool[(start + idx) % pool.length] : "overall experience";
      return `${i + 1}. "${s}": ${STYLES[s]}. Focus aspect: ${focus}`;
    })
    .join("\n");

  const lowNoDetails =
    v.rating <= 2 && !v.issues.length && !v.note
      ? "\nNo specific problem was given: write a short, general, polite expression of dissatisfaction without inventing any cause."
      : "";

  return `Business: ${v.businessName}
Star rating: ${v.rating}/5 (sentiment: ${sentiment})
Liked: ${v.liked.length ? v.liked.join(", ") : "none"}
Problems: ${v.issues.length ? v.issues.join(", ") : "none"}
Customer note in their own words: ${v.note || "none"}
Language: ${v.language}
Tone preference: ${v.tone} (never override the sentiment above with the tone)${lowNoDetails}

Write exactly ${v.styles.length} review draft(s), one per style:
${styleLines}

Output format:
{"reviews":[{"style":"<style key>","text":"<review text>"}]}`;
}

function parseReviews(raw: string, allowedStyles: string[]) {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON found");
  const data = JSON.parse(raw.slice(start, end + 1));
  const reviews = (data.reviews || [])
    .filter((r: any) => allowedStyles.includes(r.style) && typeof r.text === "string" && r.text.trim())
    .map((r: any) => ({ style: r.style, text: r.text.trim() }));
  if (reviews.length !== allowedStyles.length) throw new Error("Incomplete reviews");
  return reviews;
}

// Fallback drafts if AI provider is unavailable
function fallbackReviews(v: { businessName: string; rating: number; liked: string[]; issues: string[]; note: string; styles: string[] }) {
  const details = v.note || (v.liked.length ? `loved the ${v.liked.join(' and ')}` : v.issues.length ? `experienced issues with ${v.issues.join(' and ')}` : 'had an experience');
  return v.styles.map((style) => {
    switch (style) {
      case 'short':
        return { style, text: v.rating >= 4 ? `Great experience at ${v.businessName}! Highly impressed with the quality.` : `My visit to ${v.businessName} could have been better.` };
      case 'detailed':
        return { style, text: `Visited ${v.businessName} recently. ${details}. The overall handling was ${v.rating >= 4 ? 'very satisfactory and smooth' : 'disappointing in a few areas'}. Appreciate the effort.` };
      case 'story':
        return { style, text: `I needed assistance from ${v.businessName}. When I arrived, ${details}. In the end, the result was ${v.rating >= 4 ? 'exactly what I was hoping for' : 'not up to standard'}.` };
      case 'professional':
        return { style, text: `Regarding my recent engagement with ${v.businessName}: the overall standard was ${v.rating >= 4 ? 'commendable' : 'below expectations'}. Specifically, ${details}. Thank you.` };
      case 'casual':
      default:
        return { style, text: `Had a decent interaction with ${v.businessName}! ${details}. Definitely ${v.rating >= 4 ? 'worth checking out.' : 'needs some improvement.'}` };
    }
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { value, error } = validate(body);
    if (error || !value) return Response.json({ error }, { status: 400 });

    const apiKey =
      process.env.GROQ_API_KEY ||
      (globalThis as any).env?.GROQ_API_KEY ||
      "";

    const model = process.env.GROQ_MODEL || (globalThis as any).env?.GROQ_MODEL || "qwen/qwen3.8-27b";


    if (!apiKey) {
      return Response.json({ reviews: fallbackReviews(value) });
    }

    // Call Groq API via standard OpenAI-compatible completions
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          signal: AbortSignal.timeout(20000),
          body: JSON.stringify({
            model,
            temperature: 0.85,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: buildUserPrompt(value) },
            ],
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          console.error("Groq API error:", errData);
          if (response.status === 401) {
            return Response.json({ error: "Groq API Key invalid hai." }, { status: 401 });
          }
          throw new Error(`Groq status ${response.status}`);
        }

        const data = await response.json() as any;
        const text = data?.choices?.[0]?.message?.content || "";
        const reviews = parseReviews(text, value.styles);
        return Response.json({ reviews });
      } catch (err: any) {
        console.warn(`Groq attempt ${attempt} failed:`, err.message);
      }
    }

    // If both attempts failed, return safe fallback drafts so user flow never breaks
    return Response.json({ reviews: fallbackReviews(value) });
  } catch (err: any) {
    console.error("Reviews API error:", err);
    return Response.json({ error: "Review drafts generate nahi ho paye. Kripya dobara koshish karein." }, { status: 500 });
  }
}
