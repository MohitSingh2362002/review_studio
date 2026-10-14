'use client';

import { useEffect, useRef, useState } from "react";
import "./review-portal.css";

const SpeechRecognition =
  typeof window !== "undefined"
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;

const DEVANAGARI = /[\u0900-\u097F]/;

function normalizeSpeech(s: string) {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isNearDuplicate(a: string, b: string) {
  const x = normalizeSpeech(a);
  const y = normalizeSpeech(b);
  if (!x || !y) return false;
  if (x === y || x.includes(y) || y.includes(x)) return true;
  const A = new Set(x.split(" "));
  const B = new Set(y.split(" "));
  let common = 0;
  A.forEach((w) => {
    if (B.has(w)) common += 1;
  });
  return common / Math.max(A.size, B.size) >= 0.7;
}

const SPEECH_LANGS = [
  { id: "hinglish", code: "hi-IN", roman: true, label: "Hindi bolunga → Hinglish (Roman) me likho" },
  { id: "hindi", code: "hi-IN", roman: false, label: "Hindi (देवनागरी)" },
  { id: "english", code: "en-IN", roman: false, label: "English (India)" },
];

/* Shared: editable textarea + Copy / Clear / Post review */
export function ReviewBox({
  value,
  onChange,
  onClear,
  placeholder,
  rows = 6,
  setError,
  reviewUrl,
  onPostReview,
}: {
  value: string;
  onChange: (v: string) => void;
  onClear: () => void;
  placeholder?: string;
  rows?: number;
  setError?: (err: string) => void;
  reviewUrl?: string;
  onPostReview?: (text: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError?.("Copy nahi ho paya, text select karke manually copy karein");
    }
  }

  async function handlePostReview() {
    if (value.trim()) {
      try {
        await navigator.clipboard.writeText(value);
      } catch {
        // clipboard copy fallback
      }
    }
  }

  return (
    <div className="rg-card">
      <div className="rx-card-top">
        <span className="rx-tag-edit">✍️ Review Draft (Editable)</span>
        <span className="rx-count">{value.trim() ? value.trim().length : 0} characters</span>
      </div>
      <textarea
        className="rg-text"
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      <div className="rg-actions">
        <button type="button" onClick={handleCopy} disabled={!value.trim()}>
          {copied ? "Copied ✓" : "Copy"}
        </button>
        <button type="button" onClick={onClear} disabled={!value}>
          Clear
        </button>
        {reviewUrl && (
          <button
            type="button"
            onClick={() => {
              if (onPostReview) {
                onPostReview(value);
              } else {
                handlePostReview();
                window.open(reviewUrl, '_blank', 'noopener,noreferrer');
              }
            }}
            disabled={!value.trim()}
            className="btn-post-review"
            title="Auto-copies review text and opens Google Review page"
          >
            Post review →
          </button>
        )}
      </div>
    </div>
  );
}

/* Section 1: bol kar review likhein, phir edit karein */
export function VoiceReview({
  active = true,
  reviewUrl = "",
  businessName = "",
  onPostReview,
}: {
  active?: boolean;
  reviewUrl?: string;
  businessName?: string;
  onPostReview?: (text: string) => void;
}) {
  const [text, setText] = useState("");
  const [interim, setInterim] = useState("");
  const [listening, setListening] = useState(false);
  const [converting, setConverting] = useState(false);
  const [langId, setLangId] = useState("hinglish");
  const [error, setError] = useState("");
  const recRef = useRef<any>(null);
  const baseTextRef = useRef("");
  const latestTextRef = useRef("");
  const heardRef = useRef(false);
  const unmountedRef = useRef(false);

  const langCfg = SPEECH_LANGS.find((l) => l.id === langId) || SPEECH_LANGS[0];

  /* Devanagari -> Roman Hinglish (backend: /api/transliterate) */
  async function convertToHinglish(source: string) {
    if (!source || !DEVANAGARI.test(source)) return;
    setConverting(true);
    try {
      const res = await fetch("/api/transliterate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: source }),
      });
      const data: any = await res.json().catch(() => ({}));
      if (!res.ok || !data.text) {
        throw new Error(data.error || "fail");
      }
      if (unmountedRef.current) return;
      if (latestTextRef.current === source) {
        setText(data.text);
        latestTextRef.current = data.text;
        baseTextRef.current = data.text;
      }
    } catch {
      if (!unmountedRef.current) {
        setError(
          'Hinglish conversion nahi ho paya. Devanagari text rakha hai, "Hinglish me convert karein" button se dobara try kar sakte hain.'
        );
      }
    } finally {
      if (!unmountedRef.current) setConverting(false);
    }
  }

  function stop() {
    if (recRef.current) {
      try {
        recRef.current.stop();
      } catch {
        // ignore
      }
    }
    setListening(false);
    setInterim("");
    if (latestTextRef.current !== undefined) {
      setText(latestTextRef.current);
      baseTextRef.current = latestTextRef.current;
    }
  }

  function start() {
    setError("");
    if (!SpeechRecognition) {
      return setError("Is browser me voice input support nahi hai. Chrome ya Edge use karein.");
    }

    baseTextRef.current = text;
    latestTextRef.current = text;
    heardRef.current = false;

    const wantRoman = langCfg.roman;
    const rec = new SpeechRecognition();
    rec.lang = langCfg.code;
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      setListening(true);
      setError("");
    };

    rec.onspeechstart = () => {
      heardRef.current = true;
      setError("");
    };

    rec.onresult = (e: any) => {
      heardRef.current = true;
      const parts: { text: string; isFinal: boolean }[] = [];
      for (let i = 0; i < e.results.length; i++) {
        const transcript = e.results[i][0].transcript.trim();
        if (!transcript) continue;
        const entry = { text: transcript, isFinal: e.results[i].isFinal };
        const last = parts[parts.length - 1];
        if (last && isNearDuplicate(last.text, transcript)) {
          parts[parts.length - 1] = entry;
        } else {
          parts.push(entry);
        }
      }
      const finalChunk = parts.filter((p) => p.isFinal).map((p) => p.text).join(" ");
      const interimChunk = parts.filter((p) => !p.isFinal).map((p) => p.text).join(" ");

      const sessionSpoken = [finalChunk, interimChunk].filter(Boolean).join(" ").trim();
      const base = baseTextRef.current ? baseTextRef.current.trim() : "";
      const updated = base
        ? sessionSpoken
          ? `${base} ${sessionSpoken}`
          : base
        : sessionSpoken;

      latestTextRef.current = updated;
      setText(updated);
      setInterim(interimChunk || sessionSpoken);
    };

    rec.onerror = (e: any) => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setError("Microphone permission block hai. Browser settings me mic allow karein.");
      } else if (e.error === "audio-capture") {
        setError("Microphone nahi mila. Mic connected hai ya nahi check karein.");
      } else if (e.error === "network") {
        setError("Voice recognition ke liye internet connection chahiye (Chrome/Edge recommended).");
      } else if (e.error === "language-not-supported") {
        setError("Ye language is browser me support nahi hai. Doosri language try karein.");
      } else {
        setError(`Voice input me problem aayi (${e.error}), dobara try karein.`);
      }
    };

    rec.onend = () => {
      setListening(false);
      setInterim("");
      if (unmountedRef.current) return;
      if (latestTextRef.current !== undefined) {
        setText(latestTextRef.current);
        baseTextRef.current = latestTextRef.current;
      }
      if (wantRoman) convertToHinglish(latestTextRef.current);
    };

    recRef.current = rec;
    try {
      rec.start();
    } catch {
      setError("Mic start nahi ho paya, dobara try karein.");
    }
  }

  useEffect(() => {
    if (!listening) return undefined;
    const t = setTimeout(() => {
      if (!heardRef.current) {
        setError(
          "Awaaz detect nahi hui. Check karein: system input volume on hai aur browser me mic permission allow hai."
        );
      }
    }, 7000);
    return () => clearTimeout(t);
  }, [listening]);

  useEffect(() => {
    if (!active) stop();
  }, [active]);

  useEffect(() => {
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
      try {
        recRef.current?.abort();
      } catch {
        // ignore
      }
    };
  }, []);

  function handleClear() {
    if (recRef.current) {
      try {
        recRef.current.abort();
      } catch {
        // ignore
      }
    }
    setListening(false);
    setInterim("");
    setText("");
    setError("");
    baseTextRef.current = "";
    latestTextRef.current = "";
  }

  function handleTextChange(newVal: string) {
    setText(newVal);
    baseTextRef.current = newVal;
    latestTextRef.current = newVal;
  }

  const showConvertBtn = DEVANAGARI.test(text) && !listening && !converting;

  return (
    <div className="rg">
      <h2>Bol kar review likhein</h2>
      <p className="rg-sub">
        {businessName ? `Share your experience with ${businessName}. ` : ""}Mic dabayein aur apna experience bolein. Text real-time me box me aayega, jise aap edit bhi kar sakte hain.
      </p>

      <div className="rg-field">
        <label htmlFor="rx-lang">Aap kis language me bol rahe hain?</label>
        <select id="rx-lang" value={langId} onChange={(e) => setLangId(e.target.value)} disabled={listening}>
          {SPEECH_LANGS.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
        </select>
        {langId === "hinglish" && (
          <span className="rx-count">
            Hindi me boliye. Bolte waqt text देवनागरी me dikhega, mic band karte hi Roman Hinglish me badal jayega.
          </span>
        )}
      </div>

      <div className="rx-mic-row">
        <button
          type="button"
          className={listening ? "rx-mic live" : "rx-mic"}
          onClick={listening ? stop : start}
          disabled={converting}
          aria-label={listening ? "Stop recording" : "Start recording"}
          title={listening ? "Recording stop karein" : "Recording shuru karein"}
        >
          {listening ? (
            <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          ) : (
            <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2Z" />
            </svg>
          )}
        </button>
        <div className="rx-mic-info">
          <div className="rx-mic-status-title">
            <strong>
              {converting
                ? "Hinglish me convert ho raha hai..."
                : listening
                  ? "Sun raha hoon... bolte rahein"
                  : "Mic dabakar bolna shuru karein"}
            </strong>
            {listening && (
              <span className="rx-recording-pill">
                <span className="rx-rec-dot" /> LIVE
              </span>
            )}
          </div>
          {listening ? (
            <div className="rx-interim">
              <div className="rx-wave-bars" aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
              </div>
              <span>{interim || "Aapki aawaz record ho rahi hai..."}</span>
            </div>
          ) : (
            <div className="rx-mic-desc">Bolte hi text neeche box me aayega, jise aap direct edit kar sakte hain</div>
          )}
        </div>
      </div>

      {showConvertBtn && (
        <div style={{ marginTop: 12 }}>
          <button type="button" className="chip" onClick={() => convertToHinglish(text)}>
            Hinglish me convert karein
          </button>
        </div>
      )}

      {error && <p className="rg-error">{error}</p>}

      <div className="rx-spacer" />
      <ReviewBox
        value={text}
        onChange={handleTextChange}
        onClear={handleClear}
        placeholder="Aapki boli hui baat yahan text me aayegi. Yahin par aap use edit, add ya modify bhi kar sakte hain."
        setError={setError}
        reviewUrl={reviewUrl}
        onPostReview={onPostReview}
      />
      <p className="rg-note">
        Voice recognition ke baad post karne se pehle ek baar padh kar zaroorat ke mutabiq edit zaroor karein.
      </p>
    </div>
  );
}

/* Section 2: khud se review likhein */
export function ManualReview({
  reviewUrl = "",
  businessName = "",
  onPostReview,
}: {
  reviewUrl?: string;
  businessName?: string;
  onPostReview?: (text: string) => void;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  return (
    <div className="rg">
      <h2>Khud apna review likhein</h2>
      <p className="rg-sub">
        {businessName ? `Share your thoughts on ${businessName}. ` : ""}Apne words me likhein. Jo aapne feel kiya, wahi sabse best aur natural review hota hai.
      </p>

      <ReviewBox
        value={text}
        onChange={setText}
        onClear={() => setText("")}
        placeholder="Yahan apna review likhein... Jaise service, quality, staff ya experience kaisa raha."
        rows={8}
        setError={setError}
        reviewUrl={reviewUrl}
        onPostReview={onPostReview}
      />
      {error && <p className="rg-error">{error}</p>}
    </div>
  );
}
