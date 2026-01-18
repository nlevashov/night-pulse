import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { getGmailTokens, saveGmailTokens, GmailTokens } from '@/lib/storage/secure';
import { GOOGLE_CLIENT_ID, GOOGLE_REVERSED_CLIENT_ID } from '@/lib/config';

// Enable web browser redirect
WebBrowser.maybeCompleteAuthSession();

// Google OAuth configuration
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/userinfo.email',
];

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

/**
 * Initiate Google OAuth sign in
 */
export async function signInWithGoogle(): Promise<GmailTokens | null> {
  try {
    // For iOS, use reversed client ID as redirect URI
    const redirectUri = `${GOOGLE_REVERSED_CLIENT_ID}:/oauthredirect`;

    const request = new AuthSession.AuthRequest({
      clientId: GOOGLE_CLIENT_ID,
      scopes: SCOPES,
      redirectUri,
      usePKCE: true,
    });

    const result = await request.promptAsync(discovery);

    if (result.type === 'success' && result.params.code) {
      // Exchange code for tokens
      const tokenResult = await AuthSession.exchangeCodeAsync(
        {
          clientId: GOOGLE_CLIENT_ID,
          code: result.params.code,
          redirectUri,
          extraParams: {
            code_verifier: request.codeVerifier!,
          },
        },
        discovery,
      );

      const tokens: GmailTokens = {
        accessToken: tokenResult.accessToken,
        refreshToken: tokenResult.refreshToken,
        expiresAt: tokenResult.expiresIn
          ? Date.now() + tokenResult.expiresIn * 1000
          : undefined,
      };

      await saveGmailTokens(tokens);
      return tokens;
    }

    return null;
  } catch (error) {
    console.error('Google sign in error:', error);
    return null;
  }
}

/**
 * Get user email from Google
 */
export async function getUserEmail(accessToken: string): Promise<string | null> {
  try {
    const response = await fetch(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.email || null;
  } catch (error) {
    console.error('Get user email error:', error);
    return null;
  }
}

/**
 * Refresh access token if expired
 */
export async function refreshTokenIfNeeded(): Promise<string | null> {
  const tokens = await getGmailTokens();

  if (!tokens) {
    return null;
  }

  // Check if token is still valid (with 5 minute buffer)
  if (tokens.expiresAt && tokens.expiresAt > Date.now() + 5 * 60 * 1000) {
    return tokens.accessToken;
  }

  // Need to refresh
  if (!tokens.refreshToken) {
    return null;
  }

  try {
    const response = await fetch(discovery.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        grant_type: 'refresh_token',
        refresh_token: tokens.refreshToken,
      }).toString(),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    const newTokens: GmailTokens = {
      accessToken: data.access_token,
      refreshToken: tokens.refreshToken,
      expiresAt: data.expires_in
        ? Date.now() + data.expires_in * 1000
        : undefined,
    };

    await saveGmailTokens(newTokens);
    return newTokens.accessToken;
  } catch (error) {
    console.error('Token refresh error:', error);
    return null;
  }
}

/**
 * Send email via Gmail API
 */
export async function sendGmailEmail(
  to: string[],
  subject: string,
  body: string,
  attachmentBase64?: string,
  attachmentName?: string,
): Promise<boolean> {
  const accessToken = await refreshTokenIfNeeded();

  if (!accessToken) {
    console.error('No valid Gmail access token');
    return false;
  }

  try {
    // Build the email message
    const boundary = 'nightpulse_boundary_' + Date.now();
    let message = '';

    message += `To: ${to.join(', ')}\r\n`;
    message += `Subject: ${subject}\r\n`;
    message += 'MIME-Version: 1.0\r\n';

    if (attachmentBase64) {
      message += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n\r\n`;
      message += `--${boundary}\r\n`;
      message += 'Content-Type: text/plain; charset="UTF-8"\r\n\r\n';
      message += `${body}\r\n\r\n`;
      message += `--${boundary}\r\n`;
      message += `Content-Type: image/png; name="${attachmentName || 'chart.png'}"\r\n`;
      message += 'Content-Transfer-Encoding: base64\r\n';
      message += `Content-Disposition: attachment; filename="${attachmentName || 'chart.png'}"\r\n\r\n`;
      message += `${attachmentBase64}\r\n`;
      message += `--${boundary}--`;
    } else {
      message += 'Content-Type: text/plain; charset="UTF-8"\r\n\r\n';
      message += body;
    }

    // Encode message to base64url
    const encodedMessage = btoa(unescape(encodeURIComponent(message)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const response = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          raw: encodedMessage,
        }),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Gmail send error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Gmail send error:', error);
    return false;
  }
}
