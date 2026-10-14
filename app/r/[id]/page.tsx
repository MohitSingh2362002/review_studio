import { database } from '@/lib/database';
import ReviewCustomerPage from './ReviewCustomerPage';
import { Client } from '@/lib/reviews';

export const dynamic = 'force-dynamic';

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let client: Client | null = null;
  try {
    client = await database()
      .prepare('SELECT id, name, niche, city, url, services, image, active, created FROM clients WHERE id=?')
      .bind(id)
      .first<Client>();
  } catch {
    return (
      <main className="message-page">
        <h1>Temporarily unavailable</h1>
        <p>Please try this review link again shortly.</p>
      </main>
    );
  }

  if (!client || !client.active) {
    return (
      <main className="message-page">
        <h1>This review page is unavailable</h1>
        <p>Please contact the business for its current Google review link.</p>
      </main>
    );
  }

  return <ReviewCustomerPage client={client} />;
}
