const edgeRuntime = (globalThis as typeof globalThis & {
  Deno: {
    env: { get(name: string): string | undefined };
    serve(handler: (request: Request) => Response | Promise<Response>): void;
  };
}).Deno;

interface TakeRecord {
  id: string;
  body: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

interface InsertWebhookPayload {
  type: 'INSERT';
  table: 'takes';
  schema: 'public';
  record: TakeRecord;
  old_record: null;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;',
    };
    return entities[character];
  });
}

function isPendingTake(payload: unknown): payload is InsertWebhookPayload {
  if (!payload || typeof payload !== 'object') return false;

  const candidate = payload as Partial<InsertWebhookPayload>;
  return candidate.type === 'INSERT'
    && candidate.schema === 'public'
    && candidate.table === 'takes'
    && typeof candidate.record?.id === 'string'
    && typeof candidate.record.body === 'string'
    && typeof candidate.record.created_at === 'string'
    && candidate.record.status === 'pending';
}

edgeRuntime.serve(async (request: Request): Promise<Response> => {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const webhookSecret = edgeRuntime.env.get('HOT_TAKES_WEBHOOK_SECRET');
  const resendApiKey = edgeRuntime.env.get('RESEND_API_KEY');
  const moderatorEmail = edgeRuntime.env.get('MODERATOR_EMAIL');

  if (!webhookSecret || !resendApiKey || !moderatorEmail) {
    console.error('Missing one or more notification secrets.');
    return new Response('Notification service is not configured', { status: 500 });
  }

  if (request.headers.get('x-webhook-secret') !== webhookSecret) {
    return new Response('Unauthorized', { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  // The webhook fires for every take insert. Approved seed/system rows do not
  // need moderation mail, so acknowledge them without calling the provider.
  if (!isPendingTake(payload)) {
    return new Response(null, { status: 204 });
  }

  const { record } = payload;
  const fromEmail = edgeRuntime.env.get('NOTIFICATION_FROM_EMAIL')
    ?? 'Tricky World <onboarding@resend.dev>';
  const moderationUrl = edgeRuntime.env.get('MODERATION_URL');
  const reviewLine = moderationUrl
    ? `\n\nReview it in Supabase Studio: ${moderationUrl}`
    : '\n\nReview it in the Supabase Studio takes table.';

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
      // Makes a repeated delivery of the same database event safe.
      'Idempotency-Key': `pending-take/${record.id}`,
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [moderatorEmail],
      subject: 'A Hot Take needs approval',
      text: `A new Hot Take is waiting for review:\n\n“${record.body}”\n\nTake ID: ${record.id}${reviewLine}`,
      html: `
        <h1>A Hot Take needs approval</h1>
        <blockquote>${escapeHtml(record.body)}</blockquote>
        <p><strong>Take ID:</strong> ${escapeHtml(record.id)}</p>
        ${moderationUrl
          ? `<p><a href="${escapeHtml(moderationUrl)}">Review it in Supabase Studio</a></p>`
          : '<p>Review it in the Supabase Studio takes table.</p>'}
      `,
    }),
  });

  if (!response.ok) {
    const providerResponse = await response.text();
    console.error(`Resend rejected the notification (${response.status}): ${providerResponse}`);
    return new Response('Email provider rejected the notification', { status: 502 });
  }

  return new Response(null, { status: 204 });
});
