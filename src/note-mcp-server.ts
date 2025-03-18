import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fetch from "node-fetch";
import dotenv from "dotenv";

// 環境変数を読み込む
dotenv.config();

// APIのベースURL
const API_BASE_URL = "https://note.com/api";

// note API認証情報（環境変数から取得）
const NOTE_GQL_AUTH_TOKEN = process.env.NOTE_GQL_AUTH_TOKEN || "";
const NOTE_SESSION_V5 = process.env.NOTE_SESSION_V5 || "";

// MCP サーバーインスタンスを作成
const server = new McpServer({
  name: "note-api",
  version: "1.0.0"
});

// APIレスポンスの型定義
interface NoteApiResponse {
  data: {
    notes?: any[];
    notesCount?: number;
    users?: any[];
    usersCount?: number;
    contents?: any[];
    totalCount?: number;
    limit?: number;
    magazines?: any[];
    magazinesCount?: number;
    [key: string]: any;
  };
  comments?: any[];
  [key: string]: any;
}

// APIリクエスト用のヘルパー関数
async function noteApiRequest(path: string, method: string = "GET", body: any = null): Promise<NoteApiResponse> {
  const headers: { [key: string]: string } = {
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36"
  };
  
  // 認証が必要なAPIリクエストにCookieを設定
  const cookies = [];
  if (NOTE_GQL_AUTH_TOKEN) {
    cookies.push(`note_gql_auth_token=${NOTE_GQL_AUTH_TOKEN}`);
  }
  if (NOTE_SESSION_V5) {
    cookies.push(`_note_session_v5=${NOTE_SESSION_V5}`);
  }
  
  if (cookies.length > 0) {
    headers["Cookie"] = cookies.join("; ");
  }
  
  const options: any = {
    method,
    headers,
  };
  
  if (body && (method === "POST" || method === "PUT")) {
    options.body = JSON.stringify(body);
  }
  
  try {
    console.error(`Requesting ${API_BASE_URL}${path}`); // デバッグ用ログ
    const response = await fetch(`${API_BASE_URL}${path}`, options);
    
    if (!response.ok) {
      const text = await response.text();
      console.error(`API error: ${response.status} ${response.statusText}, Body: ${text}`);
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json() as NoteApiResponse;
    return data;
  } catch (error) {
    console.error(`Error calling note API: ${error}`);
    throw error;
  }
}

// 認証状態を確認する関数
function hasAuth() {
  return NOTE_GQL_AUTH_TOKEN !== "" || NOTE_SESSION_V5 !== "";
}

// 1. 記事検索ツール
server.tool(
  "search-notes",
  "記事を検索する",
  {
    query: z.string().describe("検索キーワード"),
    size: z.number().default(10).describe("取得する件数（最大20）"),
    start: z.number().default(0).describe("検索結果の開始位置"),
  },
  async ({ query, size, start }) => {
    try {
      const data = await noteApiRequest(`/v3/searches?context=note&q=${encodeURIComponent(query)}&size=${size}&start=${start}`);
      
      // 結果を見やすく整形
      const formattedNotes = data.data?.notes?.map((note: any) => ({
        id: note.id,
        title: note.name,
        excerpt: note.body?.substr(0, 100) + (note.body?.length > 100 ? '...' : '') || '本文なし',
        user: note.user?.nickname || 'ユーザー不明',
        publishedAt: note.publishAt || '日付不明',
        likesCount: note.likeCount || 0,
        url: `https://note.com/${note.user?.urlname || 'unknown'}/n/${note.key}`
      })) || [];
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              total: data.data?.notesCount || 0,
              notes: formattedNotes
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `検索に失敗しました: ${error}`
          }
        ],
        isError: true
      };
    }
  }
);

// 2. 記事詳細取得ツール
server.tool(
  "get-note",
  "記事の詳細情報を取得する",
  {
    noteId: z.string().describe("記事ID（例: n4f0c7b884789）"),
  },
  async ({ noteId }) => {
    try {
      const data = await noteApiRequest(`/v3/notes/${noteId}`);
      
      // 結果を見やすく整形
      const note = data.data || {};
      const formattedNote = {
        id: note.id,
        title: note.name,
        body: note.body,
        user: {
          id: note.user?.id,
          name: note.user?.nickname,
          urlname: note.user?.urlname,
          bio: note.user?.bio,
        },
        publishedAt: note.publishAt,
        likesCount: note.likeCount,
        commentsCount: note.commentsCount,
        status: note.status,
        url: `https://note.com/${note.user?.urlname || 'unknown'}/n/${note.key}`
      };
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(formattedNote, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `記事の取得に失敗しました: ${error}`
          }
        ],
        isError: true
      };
    }
  }
);

// 3. ユーザー検索ツール
server.tool(
  "search-users",
  "ユーザーを検索する",
  {
    query: z.string().describe("検索キーワード"),
    size: z.number().default(10).describe("取得する件数（最大20）"),
    start: z.number().default(0).describe("検索結果の開始位置"),
  },
  async ({ query, size, start }) => {
    try {
      const data = await noteApiRequest(`/v3/searches?context=user&q=${encodeURIComponent(query)}&size=${size}&start=${start}`);
      
      // 結果を見やすく整形
      const formattedUsers = data.data?.users?.map((user: any) => ({
        id: user.id,
        nickname: user.nickname,
        urlname: user.urlname,
        bio: user.profile?.bio || '',
        followersCount: user.followersCount || 0,
        followingCount: user.followingCount || 0,
        notesCount: user.notesCount || 0,
        url: `https://note.com/${user.urlname}`
      })) || [];
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              total: data.data?.usersCount || 0,
              users: formattedUsers
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `検索に失敗しました: ${error}`
          }
        ],
        isError: true
      };
    }
  }
);

// 4. ユーザー詳細取得ツール
server.tool(
  "get-user",
  "ユーザーの詳細情報を取得する",
  {
    username: z.string().describe("ユーザー名（例: princess_11）"),
  },
  async ({ username }) => {
    try {
      const data = await noteApiRequest(`/v3/users/${username}`);
      
      // 結果を見やすく整形
      const user = data.data || {};
      const formattedUser = {
        id: user.id,
        nickname: user.nickname,
        urlname: user.urlname,
        bio: user.profile?.bio || '',
        followersCount: user.followersCount || 0,
        followingCount: user.followingCount || 0,
        notesCount: user.notesCount || 0,
        url: `https://note.com/${user.urlname}`
      };
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(formattedUser, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `ユーザーの取得に失敗しました: ${error}`
          }
        ],
        isError: true
      };
    }
  }
);

// 5. ユーザーの記事一覧取得ツール
server.tool(
  "get-user-notes",
  "ユーザーの記事一覧を取得する",
  {
    username: z.string().describe("ユーザー名"),
    page: z.number().default(1).describe("ページ番号"),
  },
  async ({ username, page }) => {
    try {
      const data = await noteApiRequest(`/v2/creators/${username}/contents?kind=note&page=${page}`);
      
      // 結果を見やすく整形
      const formattedNotes = data.data?.contents?.map((note: any) => ({
        id: note.id,
        title: note.name,
        excerpt: note.body?.substr(0, 100) + (note.body?.length > 100 ? '...' : '') || '本文なし',
        publishedAt: note.publishAt || '日付不明',
        likesCount: note.likeCount || 0,
        commentsCount: note.commentsCount || 0,
        url: `https://note.com/${username}/n/${note.key}`
      })) || [];
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              username,
              page,
              totalPages: data.data?.totalCount && data.data?.limit ? Math.ceil(data.data.totalCount / data.data.limit) : 1,
              notes: formattedNotes
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `記事一覧の取得に失敗しました: ${error}`
          }
        ],
        isError: true
      };
    }
  }
);

// 6. 記事投稿ツール（下書き保存）
server.tool(
  "post-draft-note",
  "下書き状態の記事を投稿する",
  {
    title: z.string().describe("記事のタイトル"),
    body: z.string().describe("記事の本文"),
    tags: z.array(z.string()).optional().describe("タグ（最大10個）"),
    id: z.string().optional().describe("既存の下書きID（既存の下書きを更新する場合）"),
  },
  async ({ title, body, tags, id }) => {
    try {
      // 認証が必要なエンドポイント
      if (!hasAuth()) {
        return {
          content: [
            {
              type: "text",
              text: "認証情報がないため、投稿できません。NOTE_GQL_AUTH_TOKEN または NOTE_SESSION_V5 環境変数を設定してください。"
            }
          ],
          isError: true
        };
      }
      
      const postData = {
        title,
        body,
        tags: tags || [],
      };
      
      const endpoint = id 
        ? `/v1/text_notes/draft_save?id=${id}`
        : "/v1/text_notes/draft_save";
      
      const data = await noteApiRequest(endpoint, "POST", postData);
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `記事の投稿に失敗しました: ${error}`
          }
        ],
        isError: true
      };
    }
  }
);

// 7. コメント取得ツール
server.tool(
  "get-comments",
  "記事へのコメント一覧を取得する",
  {
    noteId: z.string().describe("記事ID"),
  },
  async ({ noteId }) => {
    try {
      const data = await noteApiRequest(`/v1/note/${noteId}/comments`);
      
      // 結果を見やすく整形
      const formattedComments = data.comments?.map((comment: any) => ({
        id: comment.id,
        text: comment.text,
        createdAt: comment.created_at,
        user: {
          id: comment.user.id,
          nickname: comment.user.nickname,
          urlname: comment.user.urlname
        }
      })) || [];
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              noteId,
              totalComments: formattedComments.length,
              comments: formattedComments
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `コメントの取得に失敗しました: ${error}`
          }
        ],
        isError: true
      };
    }
  }
);

// 8. コメント投稿ツール
server.tool(
  "post-comment",
  "記事にコメントを投稿する",
  {
    noteId: z.string().describe("記事ID"),
    text: z.string().describe("コメント本文"),
  },
  async ({ noteId, text }) => {
    try {
      // 認証が必要なエンドポイント
      if (!hasAuth()) {
        return {
          content: [
            {
              type: "text",
              text: "認証情報がないため、コメントできません。NOTE_GQL_AUTH_TOKEN または NOTE_SESSION_V5 環境変数を設定してください。"
            }
          ],
          isError: true
        };
      }
      
      const data = await noteApiRequest(`/v1/note/${noteId}/comments`, "POST", { text });
      
      return {
        content: [
          {
            type: "text",
            text: `コメントを投稿しました：\n${JSON.stringify(data, null, 2)}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `コメントの投稿に失敗しました: ${error}`
          }
        ],
        isError: true
      };
    }
  }
);

// 9. いいね取得ツール
server.tool(
  "get-likes",
  "記事のいいね一覧を取得する",
  {
    noteId: z.string().describe("記事ID"),
  },
  async ({ noteId }) => {
    try {
      const data = await noteApiRequest(`/v3/notes/${noteId}/likes`);
      
      // 結果を見やすく整形
      const formattedLikes = data.data?.likes?.map((like: any) => ({
        id: like.id,
        createdAt: like.createdAt,
        user: {
          id: like.user?.id,
          nickname: like.user?.nickname,
          urlname: like.user?.urlname
        }
      })) || [];
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              noteId,
              totalLikes: formattedLikes.length,
              likes: formattedLikes
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `いいね一覧の取得に失敗しました: ${error}`
          }
        ],
        isError: true
      };
    }
  }
);

// 10. いいねをつけるツール
server.tool(
  "like-note",
  "記事にいいねをする",
  {
    noteId: z.string().describe("記事ID"),
  },
  async ({ noteId }) => {
    try {
      // 認証が必要なエンドポイント
      if (!hasAuth()) {
        return {
          content: [
            {
              type: "text",
              text: "認証情報がないため、いいねできません。NOTE_GQL_AUTH_TOKEN または NOTE_SESSION_V5 環境変数を設定してください。"
            }
          ],
          isError: true
        };
      }
      
      const data = await noteApiRequest(`/v3/notes/${noteId}/likes`, "POST");
      
      return {
        content: [
          {
            type: "text",
            text: "いいねをつけました"
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `いいねに失敗しました: ${error}`
          }
        ],
        isError: true
      };
    }
  }
);

// 11. いいねを削除するツール
server.tool(
  "unlike-note",
  "記事のいいねを削除する",
  {
    noteId: z.string().describe("記事ID"),
  },
  async ({ noteId }) => {
    try {
      // 認証が必要なエンドポイント
      if (!hasAuth()) {
        return {
          content: [
            {
              type: "text",
              text: "認証情報がないため、いいねの削除ができません。NOTE_GQL_AUTH_TOKEN または NOTE_SESSION_V5 環境変数を設定してください。"
            }
          ],
          isError: true
        };
      }
      
      const data = await noteApiRequest(`/v3/notes/${noteId}/likes`, "DELETE");
      
      return {
        content: [
          {
            type: "text",
            text: "いいねを削除しました"
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `いいねの削除に失敗しました: ${error}`
          }
        ],
        isError: true
      };
    }
  }
);

// 12. マガジン検索ツール
server.tool(
  "search-magazines",
  "マガジンを検索する",
  {
    query: z.string().describe("検索キーワード"),
    size: z.number().default(10).describe("取得する件数（最大20）"),
    start: z.number().default(0).describe("検索結果の開始位置"),
  },
  async ({ query, size, start }) => {
    try {
      const data = await noteApiRequest(`/v3/searches?context=magazine&q=${encodeURIComponent(query)}&size=${size}&start=${start}`);
      
      // 結果を見やすく整形
      const formattedMagazines = data.data?.magazines?.map((magazine: any) => ({
        id: magazine.id,
        name: magazine.name,
        description: magazine.description || '',
        user: magazine.user?.nickname || 'ユーザー不明',
        notesCount: magazine.notesCount || 0,
        url: `https://note.com/m/${magazine.urlname}`
      })) || [];
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              total: data.data?.magazinesCount || 0,
              magazines: formattedMagazines
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `検索に失敗しました: ${error}`
          }
        ],
        isError: true
      };
    }
  }
);

// 13. マガジン詳細取得ツール
server.tool(
  "get-magazine",
  "マガジンの詳細情報を取得する",
  {
    magazineId: z.string().describe("マガジンID（例: m4f0c7b884789）"),
  },
  async ({ magazineId }) => {
    try {
      const data = await noteApiRequest(`/v3/magazines/${magazineId}`);
      
      // 結果を見やすく整形
      const magazine = data.data || {};
      const formattedMagazine = {
        id: magazine.id,
        name: magazine.name,
        description: magazine.description || '',
        user: {
          id: magazine.user?.id,
          name: magazine.user?.nickname,
          urlname: magazine.user?.urlname,
        },
        notesCount: magazine.notesCount || 0,
        url: `https://note.com/m/${magazine.urlname}`
      };
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(formattedMagazine, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `マガジンの取得に失敗しました: ${error}`
          }
        ],
        isError: true
      };
    }
  }
);

// 14. カテゴリー記事一覧取得ツール
server.tool(
  "get-category-notes",
  "カテゴリーに含まれる記事一覧を取得する",
  {
    category: z.string().describe("カテゴリー名（例: tech）"),
    page: z.number().default(1).describe("ページ番号"),
  },
  async ({ category, page }) => {
    try {
      const data = await noteApiRequest(`/v3/categories/${category}/notes?page=${page}`);
      
      // 結果を見やすく整形
      const formattedNotes = data.data?.notes?.map((note: any) => ({
        id: note.id,
        title: note.name,
        excerpt: note.body?.substr(0, 100) + (note.body?.length > 100 ? '...' : '') || '本文なし',
        user: note.user?.nickname || 'ユーザー不明',
        publishedAt: note.publishAt || '日付不明',
        likesCount: note.likeCount || 0,
        url: `https://note.com/${note.user?.urlname || 'unknown'}/n/${note.key}`
      })) || [];
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              category,
              page,
              notes: formattedNotes
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `カテゴリー記事一覧の取得に失敗しました: ${error}`
          }
        ],
        isError: true
      };
    }
  }
);

// 15. PV統計情報取得ツール
server.tool(
  "get-stats",
  "ダッシュボードのPV統計情報を取得する",
  {
    filter: z.enum(["all", "day", "week", "month"]).default("all").describe("期間フィルター"),
    page: z.number().default(1).describe("ページ番号"),
    sort: z.enum(["pv", "date"]).default("pv").describe("ソート方法（pv: PV数順, date: 日付順）"),
  },
  async ({ filter, page, sort }) => {
    try {
      // 認証が必要なエンドポイント
      if (!hasAuth()) {
        return {
          content: [
            {
              type: "text",
              text: "認証情報がないため、統計情報を取得できません。NOTE_GQL_AUTH_TOKEN または NOTE_SESSION_V5 環境変数を設定してください。"
            }
          ],
          isError: true
        };
      }
      
      const data = await noteApiRequest(`/v1/stats/pv?filter=${filter}&page=${page}&sort=${sort}`);
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `統計情報の取得に失敗しました: ${error}`
          }
        ],
        isError: true
      };
    }
  }
);

// プロンプトの追加
// 検索用のプロンプトテンプレート
server.prompt(
  "note-search",
  {
    query: z.string().describe("検索したいキーワード"),
  },
  ({ query }) => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: `note.comで「${query}」に関する記事を検索して、要約してください。特に参考になりそうな記事があれば詳しく教えてください。`
      }
    }]
  })
);

// 競合分析プロンプト
server.prompt(
  "competitor-analysis",
  {
    username: z.string().describe("分析したい競合のユーザー名"),
  },
  ({ username }) => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: `note.comの「${username}」というユーザーの記事を分析して、以下の観点から教えてください：\n\n- 主なコンテンツの傾向\n- 人気記事の特徴\n- 投稿の頻度\n- エンゲージメントの高い記事の特徴\n- 差別化できそうなポイント`
      }
    }]
  })
);

// アイデア生成プロンプト
server.prompt(
  "content-idea-generation",
  {
    topic: z.string().describe("記事のトピック"),
  },
  ({ topic }) => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: `「${topic}」に関するnote.comの記事のアイデアを5つ考えてください。各アイデアには以下を含めてください：\n\n- キャッチーなタイトル案\n- 記事の概要（100文字程度）\n- 含めるべき主なポイント（3-5つ）\n- 差別化できるユニークな切り口`
      }
    }]
  })
);

// 記事分析プロンプト
server.prompt(
  "article-analysis",
  {
    noteId: z.string().describe("分析したい記事のID"),
  },
  ({ noteId }) => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: `note.comの記事ID「${noteId}」の内容を分析して、以下の観点から教えてください：\n\n- 記事の主なテーマと要点\n- 文章の構成と特徴\n- エンゲージメントを得ている要素\n- 改善できそうなポイント\n- 参考にできる文章テクニック`
      }
    }]
  })
);

// サーバーの起動
async function main() {
  // STDIOトランスポートを作成して接続
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("note API MCP Server is running on stdio transport");
  
  // 認証状態を表示
  if (hasAuth()) {
    console.error("認証情報が設定されています。認証が必要な機能も利用できます。");
  } else {
    console.error("警告: 認証情報が設定されていません。一部の機能は利用できません。");
  }
}

main().catch(error => {
  console.error("Fatal error:", error);
  process.exit(1);
});