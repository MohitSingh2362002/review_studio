'use client';
import {Client} from '@/lib/reviews';
import {activityDays, dashboardStats, savedReviews, profileIssues} from '@/lib/dashboard';

export function DesignIcon({name}: {name: string}) {
  return <img className="design-icon" src={`/figma/${name}.svg`} alt="" aria-hidden="true"/>;
}

type Props = {clients: Client[]; loading: boolean; error: string; mode?: 'overview'|'insights'; onAdd: () => void; onView: (view: string) => void; onProfile: (id: string) => void; onRetry: () => void};

export default function GlassOverview({clients, loading, error, mode = 'overview', onAdd, onView, onProfile, onRetry}: Props) {
  const stats = dashboardStats(clients), days = activityDays(clients, mode === 'insights' ? 'reviews' : 'profiles');
  const max = Math.max(1, ...days.map(d => d.value)), activity = days.reduce((sum, d) => sum + d.value, 0);
  const highlights = clients.filter(c => savedReviews(c).rating > 0).sort((a, b) => savedReviews(b).rating - savedReviews(a).rating || savedReviews(b).count - savedReviews(a).count).slice(0, 3);
  const metrics = [
    {label: 'Active review pages', value: stats.active, note: 'Every business in view', flag: `${stats.total} total`},
    {label: 'Google connected', value: stats.connected, note: 'Imported business profiles', flag: stats.total ? `${Math.round(stats.connected / stats.total * 100)}%` : 'Connect'},
    {label: 'Google reviews', value: stats.reviews, note: 'Total in saved Google snapshots', flag: 'Synced'},
    {label: 'Needs attention', value: stats.attention.length, note: 'Profile setup and sync checks', flag: 'Review'},
  ];
  const readiness = [
    {label: 'Active review pages', count: stats.active},
    {label: 'Primary keywords added', count: stats.keywords},
    {label: 'Services configured', count: stats.services},
  ];
  const actions = [
    {title: 'Complete your business profiles', subtitle: `${stats.attention.length} profiles need attention`, view: 'attention'},
    {title: 'Connect or refresh Google profiles', subtitle: `${stats.connected} businesses connected`, view: 'google'},
    {title: 'Create and share a review standee', subtitle: 'Three print-ready QR designs', view: 'qr'},
  ];
  return <section className="glass-overview">
    <div className="glass-heading"><div><h1>{mode === 'insights' ? 'Your review insights, at a glance.' : 'A clearer business day, at a glance.'}</h1><p>{mode === 'insights' ? 'Understand the Google reviews saved in your workspace.' : 'Turn business profiles, reviews and QR codes into confident action.'}</p></div><button className="glass-primary" onClick={onAdd}>+ &nbsp; Add business</button></div>
    {error && <div className="form-error" role="alert">{error} <button className="text-btn" onClick={onRetry}>Try again</button></div>}
    <div className="glass-metrics" aria-busy={loading}>{metrics.map((m, i) => <article className="glass-surface metric-card" key={m.label}><p>{m.label}</p><strong>{loading ? '—' : m.value.toLocaleString('en-IN')}</strong><span className={i === 3 ? 'metric-flag amber' : 'metric-flag'}>{m.flag}</span><small>{m.note}</small></article>)}</div>
    <div className="glass-dashboard-grid">
      <section className="glass-surface pulse-panel"><div className="glass-panel-title"><div><h2>{mode === 'insights' ? 'Review pulse' : 'Business pulse'}</h2><p>{mode === 'insights' ? 'Loaded Google reviews · Last 7 days' : 'New business profiles added · Last 7 days'}</p></div><span className="chart-legend"><img src="/figma/legend-dot.svg" alt=""/>Your workspace</span></div>
        <div className="pulse-chart" role="img" aria-label={days.map(d => `${d.label} ${d.date}: ${d.value}`).join(', ')}>{days.map((d, i) => <div className="pulse-column" key={d.key}><div className="pulse-track" title={`${d.date}: ${d.value}`}><div className={`pulse-value ${i === 5 ? 'dark' : ''}`} style={{height: `${d.value / max * 100}%`}}/>{d.value > 0 && <span>{d.value}</span>}</div><small>{d.label}</small></div>)}</div>
        {!loading && activity === 0 && <p className="chart-empty">{mode === 'insights' ? 'No loaded reviews dated in the last 7 days. Sync Google to refresh.' : 'No profiles added in the last 7 days.'}</p>}
      </section>
      <section className="glass-surface highlights-panel"><div className="glass-panel-title"><div><h2>Business highlights</h2><p>{highlights.length ? 'Your highest-rated synced profiles' : 'Better connections start with a real experience'}</p></div></div><div className="highlights-photo"><img src="/figma/team.png" alt="Three smiling people"/></div>
        <div className="highlight-ranks">{highlights.length ? highlights.map((c, i) => <button key={c.id} onClick={() => onProfile(c.id)}><span>{String(i + 1).padStart(2, '0')}</span><div><b>{c.name}</b><small>{savedReviews(c).rating.toFixed(1)} / 5 · {savedReviews(c).count} reviews</small></div></button>) : [{title: 'Add a profile', subtitle: 'Your business details', run: onAdd}, {title: 'Create a QR', subtitle: 'Ready to print', run: () => onView('qr')}, {title: 'Connect Google', subtitle: 'Import your profiles', run: () => onView('google')}].map((a, i) => <button key={a.title} onClick={a.run}><span>0{i + 1}</span><div><b>{a.title}</b><small>{a.subtitle}</small></div></button>)}</div>
      </section>
      <section className="glass-surface readiness-panel"><div className="glass-panel-title"><div><h2>Profile insight</h2><p>Prepare every business for its next customer experience.</p></div></div><div className="readiness-banner"><b>{stats.total ? `${stats.total - stats.attention.length} of ${stats.total} business profiles are ready to share` : 'Your next business profile starts here'}</b><p>{stats.total ? 'Readiness checks review links, services, keywords, active status and sync warnings.' : 'Add a business, configure services and keywords, then create its review QR.'}</p></div>
        <div className="readiness-rows">{readiness.map(r => {const percent = stats.total ? Math.round(r.count / stats.total * 100) : null; return <button key={r.label} onClick={() => onView('businesses')}><span>{r.label}</span><b>{percent === null ? '—' : `${percent}%`}</b><span className={`readiness-badge ${percent === 100 ? 'good' : 'watch'}`}>{percent === null ? 'Get started' : percent === 100 ? 'On track' : `${r.count} of ${stats.total}`}</span></button>;})}</div>
      </section>
      <section className="glass-surface focus-panel"><div className="glass-panel-title"><div><h2>Today’s focus</h2><p>Three actions for your business workspace</p></div></div><div className="focus-list">{actions.map((a, i) => <button key={a.view} onClick={() => onView(a.view)}><span>0{i + 1}</span><div><b>{a.title}</b><small>{a.subtitle}</small></div><span className="focus-arrow">→</span></button>)}</div><button className="glass-primary" onClick={() => onView('businesses')}>Open business workspace</button></section>
    </div>
  </section>;
}

export function AttentionPanel({clients, onProfile}: {clients: Client[]; onProfile: (id: string) => void}) {
  const needs = dashboardStats(clients).attention;
  return <section><div className="glass-heading"><div><h1>Give every profile a strong start.</h1><p>Review missing settings, paused pages and Google sync warnings.</p></div></div><div className="glass-surface attention-list">{needs.length ? needs.map(c => <button onClick={() => onProfile(c.id)} key={c.id}><span className="business-avatar">{c.name.slice(0, 2).toUpperCase()}</span><span><b>{c.name}</b><small>{profileIssues(c).join(' · ')}</small></span><span>Review →</span></button>) : <div className="empty"><h3>{clients.length ? 'Your profiles are ready' : 'Your workspace is clear'}</h3><p>{clients.length ? 'There are no pending profile setup checks.' : 'Profile setup checks will appear after you add a business.'}</p></div>}</div></section>;
}
