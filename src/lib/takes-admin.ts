import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_PUBLISHABLE_KEY, PUBLIC_SUPABASE_URL } from 'astro:env/client';

type ModerationStatus = 'approved' | 'rejected';

interface PendingTake {
  id: string;
  body: string;
  created_at: string;
}

interface AdminElements {
  accessStatus: HTMLElement;
  app: HTMLElement;
  authForm: HTMLFormElement;
  authStatus: HTMLElement;
  emailInput: HTMLInputElement;
  list: HTMLUListElement;
  listStatus: HTMLElement;
  queue: HTMLElement;
  refreshAccessButton: HTMLButtonElement;
  signedIn: HTMLElement;
  signedOut: HTMLElement;
  signOutButton: HTMLButtonElement;
  userEmail: HTMLElement;
}

const configured = Boolean(PUBLIC_SUPABASE_URL && PUBLIC_SUPABASE_PUBLISHABLE_KEY);

function required<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Missing Hot Takes admin element: ${selector}`);
  return element;
}

function getElements(): AdminElements {
  const app = required<HTMLElement>(document, '[data-admin-app]');
  return {
    accessStatus: required(app, '[data-admin-access-status]'),
    app,
    authForm: required(app, '[data-admin-auth-form]'),
    authStatus: required(app, '[data-admin-auth-status]'),
    emailInput: required(app, '[data-admin-email]'),
    list: required(app, '[data-admin-list]'),
    listStatus: required(app, '[data-admin-list-status]'),
    queue: required(app, '[data-admin-queue]'),
    refreshAccessButton: required(app, '[data-admin-refresh-access]'),
    signedIn: required(app, '[data-admin-signed-in]'),
    signedOut: required(app, '[data-admin-signed-out]'),
    signOutButton: required(app, '[data-admin-sign-out]'),
    userEmail: required(app, '[data-admin-user-email]'),
  };
}

function friendlyAuthError(message: string): string {
  if (message.toLowerCase().includes('rate limit')) {
    return 'Rate limit exceeded — hold your horses, you’re burning my server or something.';
  }
  return message;
}

function formatSubmittedAt(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function createPendingCard(
  client: SupabaseClient,
  take: PendingTake,
  refresh: () => Promise<void>,
): HTMLLIElement {
  const item = document.createElement('li');
  item.className = 'pending-card';

  const body = document.createElement('p');
  body.className = 'pending-body';
  body.textContent = take.body;

  const meta = document.createElement('p');
  meta.className = 'pending-meta';
  meta.textContent = `Submitted ${formatSubmittedAt(take.created_at)}`;

  const status = document.createElement('p');
  status.className = 'status';
  status.setAttribute('aria-live', 'polite');

  const actions = document.createElement('div');
  actions.className = 'moderation-actions';

  const moderate = async (nextStatus: ModerationStatus): Promise<void> => {
    if (nextStatus === 'rejected' && !window.confirm('Reject this take?')) return;

    for (const button of actions.querySelectorAll('button')) button.disabled = true;
    status.textContent = nextStatus === 'approved' ? 'Approving…' : 'Rejecting…';
    const { error } = await client.rpc('moderate_take', {
      p_take_id: take.id,
      p_status: nextStatus,
    });

    if (error) {
      status.textContent = error.message;
      for (const button of actions.querySelectorAll('button')) button.disabled = false;
      return;
    }

    await refresh();
  };

  const approveButton = document.createElement('button');
  approveButton.type = 'button';
  approveButton.textContent = 'Approve';
  approveButton.addEventListener('click', () => void moderate('approved'));

  const rejectButton = document.createElement('button');
  rejectButton.type = 'button';
  rejectButton.className = 'reject-button';
  rejectButton.textContent = 'Reject';
  rejectButton.addEventListener('click', () => void moderate('rejected'));

  actions.append(approveButton, rejectButton);
  item.append(body, meta, actions, status);
  return item;
}

export async function mountTakesAdmin(): Promise<void> {
  const elements = getElements();
  if (!configured) {
    elements.signedOut.hidden = true;
    elements.authStatus.textContent = 'The moderation page is not connected to Supabase.';
    return;
  }

  const client = createClient(PUBLIC_SUPABASE_URL!, PUBLIC_SUPABASE_PUBLISHABLE_KEY!);

  const loadPendingTakes = async (): Promise<void> => {
    elements.queue.hidden = true;
    elements.accessStatus.textContent = 'Checking moderator access…';
    const { data, error } = await client.rpc('get_pending_takes');

    if (error) {
      elements.accessStatus.textContent = error.message.includes('Moderator access required')
        ? 'This account does not have moderator access.'
        : `The moderation queue could not be loaded: ${error.message}`;
      return;
    }

    const takes = (data ?? []) as PendingTake[];
    elements.accessStatus.textContent = '';
    elements.queue.hidden = false;
    elements.list.replaceChildren(
      ...takes.map((take) => createPendingCard(client, take, loadPendingTakes)),
    );
    elements.listStatus.textContent = takes.length === 0 ? 'Nothing waiting. You’re all caught up.' : '';
  };

  const renderSession = (session: Session | null): void => {
    const signedIn = Boolean(session);
    elements.signedIn.hidden = !signedIn;
    elements.signedOut.hidden = signedIn;
    elements.queue.hidden = true;
    elements.userEmail.textContent = session?.user.email ?? '';
    if (session) void loadPendingTakes();
  };

  elements.authForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    elements.authStatus.textContent = 'Sending sign-in link…';
    const redirectUrl = new URL(window.location.href);
    redirectUrl.hash = '';
    redirectUrl.search = '';
    const { error } = await client.auth.signInWithOtp({
      email: elements.emailInput.value,
      options: { emailRedirectTo: redirectUrl.toString() },
    });
    elements.authStatus.textContent = error
      ? friendlyAuthError(error.message)
      : 'Check your email for a sign-in link.';
  });

  elements.refreshAccessButton.addEventListener('click', async () => {
    elements.accessStatus.textContent = 'Refreshing access…';
    const { data, error } = await client.auth.refreshSession();
    if (error) {
      elements.accessStatus.textContent = error.message;
      return;
    }
    renderSession(data.session);
  });

  elements.signOutButton.addEventListener('click', async () => {
    await client.auth.signOut();
  });

  const { data } = await client.auth.getSession();
  renderSession(data.session);

  client.auth.onAuthStateChange((_event, session) => {
    window.setTimeout(() => renderSession(session), 0);
  });
}
