import { env, authStatus } from "../config/environment.js";
import { API_BASE_URL } from "../config/api-config.js";
import fetch from "node-fetch";

// 動的セッション情報を保持する変数
let activeSessionCookie: string | null = null;
let activeXsrfToken: string | null = null;

export function getActiveSessionCookie(): string | null {
  return activeSessionCookie;
}

export function getActiveXsrfToken(): string | null {
  return activeXsrfToken;
}

export function setActiveSessionCookie(cookie: string): void {
  activeSessionCookie = cookie;
}

export function setActiveXsrfToken(token: string): void {
  activeXsrfToken = token;
}

export function hasAuth(): boolean {
  return activeSessionCookie !== null || authStatus.anyAuth;
}

// noteへのログイン処理を行う関数
export async function loginToNote(): Promise<boolean> {
  if (!env.NOTE_EMAIL || !env.NOTE_PASSWORD) {
    console.error("メールアドレスまたはパスワードが設定されていません。");
    return false;
  }

  const loginPath = "/v1/sessions/sign_in";
  const loginUrl = `${API_BASE_URL}${loginPath}`;

  try {
    if (env.DEBUG) {
      console.error(`Attempting login to ${loginUrl}`);
    }
    
    const response = await fetch(loginUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36",
        "Accept": "application/json",
      },
      body: JSON.stringify({ login: env.NOTE_EMAIL, password: env.NOTE_PASSWORD }),
    });

    const responseText = await response.text();
    if (env.DEBUG) {
      console.error(`Login response: ${response.status} ${response.statusText}`);
      console.error(`Login response headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()))}`);
      console.error(`Login response body: ${responseText}`);
    }

    if (!response.ok) {
      console.error(`Login failed: ${response.status} ${response.statusText} - ${responseText}`);
      return false;
    }

    // レスポンスボディからトークン情報取得を試みる
    try {
      const responseData = JSON.parse(responseText);
      if (responseData && responseData.data && responseData.data.token) {
        activeSessionCookie = `_note_session_v5=${responseData.data.token}`;
        if (env.DEBUG) console.error("Session token found in response body:", responseData.data.token);
        console.error("Login successful. Session token obtained from response body.");
      }
    } catch (e) {
      if (env.DEBUG) console.error("Failed to parse response body as JSON:", e);
    }

    // Set-Cookieヘッダーからの取得方法も残す
    const setCookieHeader = response.headers.get("set-cookie");
    if (setCookieHeader) {
      if (env.DEBUG) console.error("Set-Cookie header:", setCookieHeader);
      const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
      
      cookies.forEach(cookieStr => {
        if (cookieStr.includes("_note_session_v5=")) {
          activeSessionCookie = cookieStr.split(';')[0];
          if (env.DEBUG) console.error("Session cookie set:", activeSessionCookie);
        }
        if (cookieStr.includes("XSRF-TOKEN=")) { 
          activeXsrfToken = cookieStr.split(';')[0].split('=')[1];
          if (env.DEBUG) console.error("XSRF token from cookie:", activeXsrfToken);
        }
      });
      
      const responseXsrfToken = response.headers.get("x-xsrf-token");
      if (responseXsrfToken) {
          activeXsrfToken = responseXsrfToken;
          if (env.DEBUG) console.error("XSRF Token from header:", activeXsrfToken);
      } else if (env.DEBUG && !activeXsrfToken) {
          console.error("XSRF Token not found in initial login headers.");
      }
    }
    
    if (!activeSessionCookie) {
      console.error("Login succeeded but session cookie was not found.");
      return false;
    }
    
    console.error("Login successful. Session cookie obtained.");
    
    // セッションクッキーが取得できたら、current_userリクエストでXSRFトークンを取得する
    if (activeSessionCookie && !activeXsrfToken) {
      console.error("Trying to obtain XSRF token from current_user API...");
      try {
        const currentUserResponse = await fetch(`${API_BASE_URL}/v2/current_user`, {
          method: "GET",
          headers: {
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36",
            "Cookie": activeSessionCookie
          },
        });
        
        // XSRFトークンをヘッダーから取得
        const xsrfToken = currentUserResponse.headers.get("x-xsrf-token");
        if (xsrfToken) {
          activeXsrfToken = xsrfToken;
          console.error("XSRF token successfully obtained from current_user API.");
          if (env.DEBUG) console.error("XSRF Token:", activeXsrfToken);
        } else {
          // Set-Cookieヘッダーからも確認
          const currentUserSetCookie = currentUserResponse.headers.get("set-cookie");
          if (currentUserSetCookie) {
            const cookies = Array.isArray(currentUserSetCookie) ? currentUserSetCookie : [currentUserSetCookie];
            cookies.forEach(cookieStr => {
              if (cookieStr.includes("XSRF-TOKEN=")) { 
                activeXsrfToken = cookieStr.split(';')[0].split('=')[1];
                console.error("XSRF token found in current_user response cookies.");
                if (env.DEBUG) console.error("XSRF Token from cookie:", activeXsrfToken);
              }
            });
          }
          
          if (!activeXsrfToken) {
            console.error("Could not obtain XSRF token from current_user API.");
          }
        }
      } catch (error) {
        console.error("Error fetching current_user for XSRF token:", error);
      }
    }
    
    return activeSessionCookie !== null;
  } catch (error) {
    console.error("Error during login:", error);
    return false;
  }
}

// 認証ヘッダーを構築する関数
export function buildAuthHeaders(): { [key: string]: string } {
  const headers: { [key: string]: string } = {};

  // 認証設定 - 環境変数のCookieを優先使用
  if (authStatus.hasCookie) {
    const cookies = [];
    if (env.NOTE_SESSION_V5) {
      cookies.push(`_note_session_v5=${env.NOTE_SESSION_V5}`);
      if (env.DEBUG) console.error("Using session cookie from .env file");
    }
    if (cookies.length > 0) {
      headers["Cookie"] = cookies.join("; ");
    }
  } else if (activeSessionCookie) {
    headers["Cookie"] = activeSessionCookie;
    if (env.DEBUG) console.error("Using dynamically obtained session cookie");
  }

  // XSRFトークンの設定
  if (activeXsrfToken) {
    headers["X-XSRF-TOKEN"] = activeXsrfToken;
  } else if (env.NOTE_XSRF_TOKEN) {
    headers["X-XSRF-TOKEN"] = env.NOTE_XSRF_TOKEN;
  }

  return headers;
}