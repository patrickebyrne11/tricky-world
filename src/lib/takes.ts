import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_PUBLISHABLE_KEY, PUBLIC_SUPABASE_URL } from 'astro:env/client';

type VoteChoice = 'agree' | 'disagree';

interface Take {
  id: string;
  body: string;
  created_at: string;
  agree_count: number;
  disagree_count: number;
  viewer_choice: VoteChoice | null;
}

interface Elements {
  app: HTMLElement;
  authForm: HTMLFormElement;
  authSignedIn: HTMLElement;
  authSignedOut: HTMLElement;
  authStatus: HTMLElement;
  emailInput: HTMLInputElement;
  list: HTMLUListElement;
  listStatus: HTMLElement;
  signOutButton: HTMLButtonElement;
  submitForm: HTMLFormElement;
  submitPanel: HTMLElement;
  submitStatus: HTMLElement;
  takeBody: HTMLTextAreaElement;
  userEmail: HTMLElement;
}

const configured = Boolean(PUBLIC_SUPABASE_URL && PUBLIC_SUPABASE_PUBLISHABLE_KEY);

function friendlyAuthError(message: string): string {
  if (message.toLowerCase().includes('rate limit')) {
    return 'Rate limit exceeded — hold your horses, you’re burning my server or something.';
  }

  return message;
}

function required<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Missing Hot Takes element: ${selector}`);
  return element;
}

function getElements(): Elements {
  const app = required<HTMLElement>(document, '[data-takes-app]');
  return {
    app,
    authForm: required(app, '[data-auth-form]'),
    authSignedIn: required(app, '[data-auth-signed-in]'),
    authSignedOut: required(app, '[data-auth-signed-out]'),
    authStatus: required(app, '[data-auth-status]'),
    emailInput: required(app, '[data-auth-email]'),
    list: required(app, '[data-takes-list]'),
    listStatus: required(app, '[data-list-status]'),
    signOutButton: required(app, '[data-sign-out]'),
    submitForm: required(app, '[data-submit-form]'),
    submitPanel: required(app, '[data-submit-panel]'),
    submitStatus: required(app, '[data-submit-status]'),
    takeBody: required(app, '[data-take-body]'),
    userEmail: required(app, '[data-user-email]'),
  };
}

function createVoteButton(
  client: SupabaseClient,
  take: Take,
  choice: VoteChoice,
  session: Session | null,
  refresh: () => Promise<void>,
): HTMLButtonElement {
  const button = document.createElement('button');
  const selected = take.viewer_choice === choice;
  const label = choice === 'agree' ? 'Agree' : 'Disagree';
  button.type = 'button';
  button.className = 'vote-button';
  button.dataset.choice = choice;
  button.setAttribute('aria-pressed', String(selected));
  button.textContent = label;
  button.disabled = !session;
  button.title = session ? `${label} with this take` : 'Sign in to vote';

  button.addEventListener('click', async () => {
    button.disabled = true;
    const { error } = await client.rpc('cast_vote', { p_take_id: take.id, p_choice: choice });
    if (error) {
      window.alert(error.message);
      button.disabled = false;
      return;
    }
    await refresh();
  });

  return button;
}

function renderTakes(
  client: SupabaseClient,
  elements: Elements,
  takes: Take[],
  session: Session | null,
  refresh: () => Promise<void>,
): void {
  elements.list.replaceChildren();

  for (const take of takes) {
    const total = take.agree_count + take.disagree_count;
    const agreePercent = total === 0 ? 50 : Math.round((take.agree_count / total) * 100);
    const disagreePercent = total === 0 ? 50 : 100 - agreePercent;

    const item = document.createElement('li');
    item.className = 'take-card';

    const body = document.createElement('p');
    body.className = 'take-body';
    body.textContent = take.body;

    const split = document.createElement('div');
    split.className = 'vote-split';
    split.setAttribute('aria-label', `${agreePercent}% agree, ${disagreePercent}% disagree`);

    const agreeBar = document.createElement('span');
    agreeBar.className = 'agree-bar';
    agreeBar.style.width = `${agreePercent}%`;
    const disagreeBar = document.createElement('span');
    disagreeBar.className = 'disagree-bar';
    disagreeBar.style.width = `${disagreePercent}%`;
    split.append(agreeBar, disagreeBar);

    const numbers = document.createElement('p');
    numbers.className = 'vote-numbers';
    numbers.textContent = total === 0
      ? 'No votes yet'
      : `${agreePercent}% agree · ${disagreePercent}% disagree · ${total} ${total === 1 ? 'vote' : 'votes'}`;

    const actions = document.createElement('div');
    actions.className = 'take-actions';
    actions.append(
      createVoteButton(client, take, 'agree', session, refresh),
      createVoteButton(client, take, 'disagree', session, refresh),
    );

    item.append(body, split, numbers, actions);
    elements.list.append(item);
  }

  elements.listStatus.textContent = takes.length === 0 ? 'No approved takes yet.' : '';
}

export async function mountTakesApp(): Promise<void> {
  const elements = getElements();
  if (!configured) {
    elements.app.dataset.state = 'unconfigured';
    elements.authSignedOut.hidden = true;
    elements.listStatus.textContent = 'The board is not connected yet. Add the public Supabase environment variables.';
    return;
  }

  const client = createClient(PUBLIC_SUPABASE_URL!, PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
  let session: Session | null = null;

  const refreshTakes = async (): Promise<void> => {
    elements.listStatus.textContent = 'Loading takes…';
    const { data, error } = await client.rpc('get_takes');
    if (error) {
      elements.listStatus.textContent = 'The board could not be loaded. Please try again later.';
      return;
    }
    renderTakes(client, elements, (data ?? []) as Take[], session, refreshTakes);
  };

  const renderSession = (nextSession: Session | null): void => {
    session = nextSession;
    const signedIn = Boolean(session);
    elements.authSignedIn.hidden = !signedIn;
    elements.authSignedOut.hidden = signedIn;
    elements.submitPanel.hidden = !signedIn;
    elements.userEmail.textContent = session?.user.email ?? '';
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

  elements.signOutButton.addEventListener('click', async () => {
    await client.auth.signOut();
  });

  elements.submitForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    elements.submitStatus.textContent = 'Submitting…';
    const { error } = await client.rpc('submit_take', { p_body: elements.takeBody.value });
    if (error) {
      elements.submitStatus.textContent = error.message;
      return;
    }
    elements.takeBody.value = '';
    elements.submitStatus.textContent = 'Submitted. It will appear after moderation.';
  });

  const { data } = await client.auth.getSession();
  renderSession(data.session);
  await refreshTakes();

  client.auth.onAuthStateChange((_event, nextSession) => {
    renderSession(nextSession);
    window.setTimeout(() => void refreshTakes(), 0);
  });
}
