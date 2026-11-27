import { i18n } from '../i18n';
import { randomUUID } from 'node:crypto';
import { shell } from 'electron';
import type {
  OAuthClientInformationContext,
  OAuthClientMetadata,
  OAuthClientProvider,
  OAuthDiscoveryState,
  StoredOAuthClientInformation,
  StoredOAuthTokens,
} from '@modelcontextprotocol/client';
import type { SupabaseOAuthCredentials } from '../../db/schema';

export const SUPABASE_REDIRECT_URL = 'http://127.0.0.1:53682/oauth/callback';

export class SupabaseOAuthProvider implements OAuthClientProvider {
  private clients: Map<string, StoredOAuthClientInformation>;

  private savedTokens?: StoredOAuthTokens;

  private verifier?: string;

  private discovery?: OAuthDiscoveryState;

  private expiresAt?: number;

  lastState?: string;

  readonly redirectUrl = SUPABASE_REDIRECT_URL;

  readonly clientMetadata: OAuthClientMetadata = {
    client_name: 'Sive',
    redirect_uris: [SUPABASE_REDIRECT_URL],
    application_type: 'native',
  };

  constructor(
    credentials: SupabaseOAuthCredentials = { clients: {} },
    private onChange: (credentials: SupabaseOAuthCredentials) => void | Promise<void> = () => {},
    private interactive = true,
  ) {
    this.clients = new Map(Object.entries(credentials.clients));
    this.savedTokens = credentials.tokens;
    this.expiresAt = credentials.expiresAt;
  }

  get credentials(): SupabaseOAuthCredentials {
    return {
      clients: Object.fromEntries(this.clients),
      tokens: this.savedTokens,
      expiresAt: this.expiresAt,
    };
  }

  get accessToken() {
    return this.savedTokens?.access_token;
  }

  clientInformation(ctx?: OAuthClientInformationContext) {
    return ctx ? this.clients.get(ctx.issuer) : undefined;
  }

  async saveClientInformation(info: StoredOAuthClientInformation, ctx?: OAuthClientInformationContext) {
    if (!ctx) throw new Error(i18n('errors.oauth.issuerMissing'));
    this.clients.set(ctx.issuer, info);
    await this.onChange(this.credentials);
  }

  tokens() {
    return this.savedTokens;
  }

  async saveTokens(tokens: StoredOAuthTokens) {
    this.savedTokens = tokens;
    this.expiresAt = tokens.expires_in ? Date.now() + tokens.expires_in * 1000 : undefined;
    await this.onChange(this.credentials);
  }

  state() {
    this.lastState = randomUUID();
    return this.lastState;
  }

  async redirectToAuthorization(url: URL) {
    if (!this.interactive) throw new Error(i18n('errors.supabase.authorizationExpired'));
    if (url.protocol !== 'https:') throw new Error(i18n('errors.oauth.httpsRequired'));
    await shell.openExternal(url.toString());
  }

  saveCodeVerifier(verifier: string) {
    this.verifier = verifier;
  }

  codeVerifier() {
    if (!this.verifier) throw new Error(i18n('errors.oauth.verifierMissing'));
    return this.verifier;
  }

  saveDiscoveryState(state: OAuthDiscoveryState) {
    this.discovery = state;
  }

  discoveryState() {
    return this.discovery;
  }

  async invalidateCredentials(scope: 'all' | 'client' | 'tokens' | 'verifier' | 'discovery') {
    if (scope === 'all' || scope === 'client') this.clients.clear();
    if (scope === 'all' || scope === 'tokens') {
      this.savedTokens = undefined;
      this.expiresAt = undefined;
    }
    if (scope === 'all' || scope === 'verifier') this.verifier = undefined;
    if (scope === 'all' || scope === 'discovery') this.discovery = undefined;
    if (scope === 'all' || scope === 'client' || scope === 'tokens') await this.onChange(this.credentials);
  }
}
