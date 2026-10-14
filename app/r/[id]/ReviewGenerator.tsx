'use client';

import { useState } from "react";
import "./review-portal.css";

const DEFAULT_LIKED_OPTIONS = ["Service", "Quality", "Price", "Staff", "Delivery", "Support", "Ambience"];
const ISSUE_OPTIONS = [
  "Slow service",
  "Poor quality",
  "Overpriced",
  "Rude staff",
  "Late delivery",
  "No response",
  "Not as described",
];
const TONES = ["Casual", "Professional", "Enthusiastic"];
const LANGUAGES = ["English", "Hindi", "Hinglish"];
const STYLE_LABELS: Record<string, string> = {
  short: "Short & sweet",
  detailed: "Detailed",
  story: "Story style",
  professional: "Professional",
  casual: "Casual",
};

async function callApi(payload: any) {
  const res = await fetch("/api/reviews", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Review draft generate nahi ho paya");
  return data.reviews || [];
}

export default function ReviewGenerator({
  businessName = "",
  reviewUrl = "",
  services = "",
  onPostReview,
}: {
  businessName?: string;
  reviewUrl?: string;
  services?: string;
  onPostReview?: (text: string) => void;
}) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [liked, setLiked] = useState<string[]>([]);
  const [issues, setIssues] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [tone, setTone] = useState("Casual");
  const [language, setLanguage] = useState("English");

  const [reviews, setReviews] = useState<{ style: string; text: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [regenStyle, setRegenStyle] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  // Combine default liked options with any custom business services
  const customServices = services
    ? services.split(/[,\n\r]+/).map((s) => s.trim()).filter(Boolean)
    : [];
  const likedOptions = Array.from(new Set([...customServices, ...DEFAULT_LIKED_OPTIONS]));

  const payload = {
    businessName: businessName || "this business",
    rating,
    liked: rating >= 3 ? liked : [],
    issues: rating > 0 && rating <= 3 ? issues : [],
    note,
    tone,
    language,
  };

  const toggle = (setter: React.Dispatch<React.SetStateAction<string[]>>, c: string) =>
    setter((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!rating) return setError("Pehle star rating select karein");
    setError("");
    setLoading(true);
    setReviews([]);
    try {
      const generated = await callApi(payload);
      setReviews(generated);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRegenerate(style: string) {
    setRegenStyle(style);
    setError("");
    try {
      const [fresh] = await callApi({ ...payload, styles: [style] });
      if (fresh) {
        setReviews((prev) => prev.map((r) => (r.style === style ? fresh : r)));
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRegenStyle(null);
    }
  }

  function updateText(style: string, text: string) {
    setReviews((prev) => prev.map((r) => (r.style === style ? { ...r, text } : r)));
  }

  async function handleCopy(style: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(style);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      setError("Copy nahi ho paya, text select karke manually copy karein");
    }
  }

  async function handlePostReview(text: string) {
    if (text.trim()) {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        // fallback
      }
    }
  }

  return (
    <div className="rg">
      <h2>Aapka experience kaisa raha?</h2>
      <p className="rg-sub">
        {businessName ? `Rate your visit to ${businessName}. ` : ""}Bas kuch details batayein, hum 5 alag review drafts taiyaar kar denge.
      </p>

      <form onSubmit={handleGenerate} className="rg-form">
        <div className="rg-field">
          <label>Rating</label>
          <div className="rg-stars" onMouseLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                type="button"
                key={n}
                className={n <= (hover || rating) ? "star on" : "star"}
                onMouseEnter={() => setHover(n)}
                onClick={() => setRating(n)}
                aria-label={`${n} star`}
              >
                ★
              </button>
            ))}
          </div>
        </div>

        {rating === 0 && <p className="rg-sub">Pehle star rating select karein.</p>}

        {rating >= 3 && (
          <div className="rg-field">
            <label>{rating === 3 ? "Kya achha raha?" : "Kya pasand aaya?"}</label>
            <div className="rg-chips">
              {likedOptions.map((c) => (
                <button
                  type="button"
                  key={c}
                  className={liked.includes(c) ? "chip on" : "chip"}
                  onClick={() => toggle(setLiked, c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {rating > 0 && rating <= 3 && (
          <div className="rg-field">
            <label>{rating === 3 ? "Kya kharab raha?" : "Kya problem aayi?"}</label>
            <div className="rg-chips">
              {ISSUE_OPTIONS.map((c) => (
                <button
                  type="button"
                  key={c}
                  className={issues.includes(c) ? "chip bad on" : "chip"}
                  onClick={() => toggle(setIssues, c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="rg-field">
          <label htmlFor="rg-note">Apne words me experience (jitna detail, utna natural draft)</label>
          <textarea
            id="rg-note"
            rows={2}
            maxLength={300}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Service time par mili aur staff bahut helpful tha"
          />
        </div>

        <div className="rg-row">
          <div className="rg-field">
            <label>Tone</label>
            <div className="rg-chips">
              {TONES.map((t) => (
                <button
                  type="button"
                  key={t}
                  className={tone === t ? "chip on" : "chip"}
                  onClick={() => setTone(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="rg-field">
            <label htmlFor="rg-lang">Language</label>
            <select id="rg-lang" value={language} onChange={(e) => setLanguage(e.target.value)}>
              {LANGUAGES.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </div>
        </div>

        <button className="rg-primary" type="submit" disabled={loading || !rating}>
          {loading ? "Generating 5 review drafts..." : "Generate 5 review drafts"}
        </button>
      </form>

      {error && <p className="rg-error">{error}</p>}

      {loading && (
        <div className="rg-results">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="rg-card skeleton" />
          ))}
        </div>
      )}

      {reviews.length > 0 && (
        <>
          <p className="rg-note">
            Ye AI drafts hain. Jo draft pasand aaye, use edit karein aur Post review button dabayein:
          </p>
          <div className="rg-results">
            {reviews.map((r) => (
              <div key={r.style} className="rg-card">
                <div className="rg-card-head">
                  <span className="rg-tag">{STYLE_LABELS[r.style] || r.style}</span>
                </div>
                <textarea
                  className="rg-text"
                  value={r.text}
                  rows={4}
                  onChange={(e) => updateText(r.style, e.target.value)}
                  disabled={regenStyle === r.style}
                />
                <div className="rg-actions">
                  <button type="button" onClick={() => handleCopy(r.style, r.text)}>
                    {copied === r.style ? "Copied ✓" : "Copy"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRegenerate(r.style)}
                    disabled={regenStyle === r.style}
                  >
                    {regenStyle === r.style ? "..." : "Regenerate"}
                  </button>
                  {reviewUrl && (
                    <button
                      type="button"
                      className="btn-post-review"
                      onClick={() => {
                        if (onPostReview) {
                          onPostReview(r.text);
                        } else {
                          handlePostReview(r.text);
                          window.open(reviewUrl, '_blank', 'noopener,noreferrer');
                        }
                      }}
                      title="Copies text and opens Google Review"
                    >
                      Post review →
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
