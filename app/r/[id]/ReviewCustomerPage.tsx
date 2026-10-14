'use client';

import { useState } from "react";
import ReviewGenerator from "./ReviewGenerator";
import { VoiceReview, ManualReview } from "./ExtraReviewSections";
import { Client } from "@/lib/reviews";
import { Check } from "lucide-react";
import "./review-portal.css";

const TABS = [
  {
    id: "ai",
    label: "AI drafts",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      </svg>
    ),
  },
  {
    id: "voice",
    label: "Bol kar likhein",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" x2="12" y1="19" y2="22" />
      </svg>
    ),
  },
  {
    id: "manual",
    label: "Khud likhein",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
        <path d="m15 5 4 4" />
      </svg>
    ),
  },
];

export default function ReviewCustomerPage({ client }: { client: Client }) {
  const [tab, setTab] = useState("ai");
  const [toast, setToast] = useState(false);

  async function handlePostReview(text: string) {
    if (!text.trim()) return;

    // 1. Copy review text to clipboard
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }

    // 2. Show toast notification
    setToast(true);

    // 3. Smoothly redirect to Google Review page after user sees toast
    if (client.url) {
      setTimeout(() => {
        window.location.href = client.url;
      }, 850);
    }
  }

  return (
    <div className="rx-page">
      {/* Business Branding Card */}
      <header className="rx-biz-card">
        {client.image ? (
          <img
            src={client.image}
            alt={client.name}
            className="rx-biz-avatar"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="rx-biz-avatar">
            {client.name.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="rx-biz-info">
          <span className="rx-biz-tag">
            {client.niche || "Google Review Assistant"}
          </span>
          <h1 className="rx-biz-name">{client.name}</h1>
          <p className="rx-biz-loc">
            {client.city ? `📍 ${client.city} · ` : ""}Your experience in your words
          </p>
        </div>
      </header>

      {/* Tabs Switcher */}
      <div className="rx-tabs" role="tablist" aria-label="Review options">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-controls={`panel-${t.id}`}
            aria-selected={tab === t.id}
            className={tab === t.id ? "rx-tab on" : "rx-tab"}
            onClick={() => setTab(t.id)}
          >
            <span className="rx-tab-icon">{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div
        id="panel-ai"
        role="tabpanel"
        aria-labelledby="tab-ai"
        className="rx-tab-panel"
        hidden={tab !== "ai"}
      >
        <ReviewGenerator
          businessName={client.name}
          reviewUrl={client.url}
          services={client.services}
          onPostReview={handlePostReview}
        />
      </div>

      <div
        id="panel-voice"
        role="tabpanel"
        aria-labelledby="tab-voice"
        className="rx-tab-panel"
        hidden={tab !== "voice"}
      >
        <VoiceReview
          active={tab === "voice"}
          reviewUrl={client.url}
          businessName={client.name}
          onPostReview={handlePostReview}
        />
      </div>

      <div
        id="panel-manual"
        role="tabpanel"
        aria-labelledby="tab-manual"
        className="rx-tab-panel"
        hidden={tab !== "manual"}
      >
        <ManualReview
          reviewUrl={client.url}
          businessName={client.name}
          onPostReview={handlePostReview}
        />
      </div>

      {/* Direct Google Review Action */}
      {client.url && (
        <div className="rx-direct-google">
          <a href={client.url} target="_blank" rel="noopener noreferrer">
            Direct Google par review likhein →
          </a>
          <p>Google par jaakar apna star rating chunein aur review submit karein.</p>
        </div>
      )}

      {/* Sleek Toast Notification */}
      {toast && (
        <div
          className="rx-toast-container"
          role="status"
          onClick={() => {
            if (client.url) window.location.href = client.url;
          }}
        >
          <div className="rx-toast">
            <div className="rx-toast-icon">
              <Check size={20} />
            </div>
            <div className="rx-toast-content">
              <p className="rx-toast-title">Review text copied! ✓</p>
              <p className="rx-toast-sub">Opening Google Review... Just paste & submit!</p>
            </div>
            <div className="rx-toast-progress" />
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="rx-footer">
        Powered by <b>Review Studio</b><br />
        Independent review assistant · Not affiliated with Google
      </footer>
    </div>
  );
}
