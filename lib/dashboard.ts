import {Client, splitEntries} from './reviews';

export function savedReviews(client: Client) {
  try {
    const data = JSON.parse(client.review_data || '{}');
    return {
      count: Math.max(0, Number(data.totalReviewCount) || 0),
      rating: Number(data.averageRating) || 0,
      reviews: Array.isArray(data.reviews) ? data.reviews : [],
    };
  } catch { return {count: 0, rating: 0, reviews: []}; }
}

export function profileIssues(client: Client): string[] {
  const issues: string[] = [];
  if (!client.url) issues.push('Add a Google review link');
  if (!splitEntries(client.services).length) issues.push('Add services or products');
  if (!splitEntries(client.keywords).length) issues.push('Add primary keywords');
  if (!client.active) issues.push('Review page is paused');
  try { if (JSON.parse(client.sync_warnings || '[]').length) issues.push('Check Google sync warnings'); } catch {}
  return issues;
}

export function dashboardStats(clients: Client[]) {
  return {
    total: clients.length,
    active: clients.filter(c => c.active).length,
    connected: clients.filter(c => c.google_location).length,
    reviews: clients.reduce((sum, c) => sum + savedReviews(c).count, 0),
    keywords: clients.filter(c => splitEntries(c.keywords).length).length,
    services: clients.filter(c => splitEntries(c.services).length).length,
    attention: clients.filter(c => profileIssues(c).length),
  };
}

export function activityDays(clients: Client[], mode: 'profiles'|'reviews', now = new Date()) {
  const key = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  const days = Array.from({length: 7}, (_, i) => {
    const date = new Date(now); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - 6 + i);
    return {key: key(date), label: date.toLocaleDateString('en', {weekday: 'short'}), date: date.toLocaleDateString('en'), value: 0};
  });
  const timestamps = mode === 'profiles' ? clients.map(c => c.created) : clients.flatMap(c => savedReviews(c).reviews.map((r: {created?: string}) => r.created));
  for (const timestamp of timestamps) {
    if (!timestamp) continue;
    const date = new Date(timestamp);
    if (date > now || Number.isNaN(date.getTime())) continue;
    const day = days.find(d => d.key === key(date));
    if (day) day.value++;
  }
  return days;
}
