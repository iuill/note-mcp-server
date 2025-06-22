import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express, { Request, Response } from "express";

// 設定とユーティリティ
import { env, authStatus } from "./config/environment.js";
import { loginToNote } from "./utils/auth.js";

// ツールとプロンプトの登録
import { registerAllTools } from "./tools/index.js";
import { registerPrompts } from "./prompts/prompts.js";

/**
 * ◤◢◤◢◤◢◤◢◤◢◤◢◤◢
 * note API MCP Server (Refactored & HTTP)
 * 
 * 機能別に分割・リファクタリングされたnote API MCPサーバー (Streamable HTTP対応版)
 * - 設定管理の分離
 * - 型定義の整理
 * - 機能別ツール分割
 * - 共通ユーティリティの抽出
 * - エラーハンドリングの統一
 * - Streamable HTTP Transport対応
 * ◤◢◤◢◤◢◤◢◤◢◤◢◤◢
 */

/**
 * サーバーのコア初期化処理 (認証のみ)
 */
async function initializeServerCore(): Promise<void> {
  console.error("◤◢◤◢◤◢◤◢◤◢◤◢◤◢");
  console.error("🚀 note API MCP Server v2.1.0 コア初期化中...");
  console.error("◤◢◤◢◤◢◤◢◤◢◤◢◤◢");

  console.error("✅ コアコンポーネントの初期化が完了しました");
}

/**
 * 認証処理の実行
 */
async function performAuthentication(): Promise<void> {
  console.error("◤◢◤◢◤◢◤◢◤◢◤◢◤◢");
  console.error("🔐 認証処理を実行中...");
  console.error("◤◢◤◢◤◢◤◢◤◢◤◢◤◢");

  if (env.NOTE_EMAIL && env.NOTE_PASSWORD) {
    console.error("📧 メールアドレスとパスワードからログイン試行中...");
    const loginSuccess = await loginToNote();
    if (loginSuccess) {
      console.error("✅ ログイン成功: セッションCookieを取得しました");
    } else {
      console.error("❌ ログイン失敗: メールアドレスまたはパスワードが正しくない可能性があります");
    }
  }

  console.error("◤◢◤◢◤◢◤◢◤◢◤◢◤◢");
  if (authStatus.hasCookie || authStatus.anyAuth) {
    console.error("🔓 認証情報が設定されています");
    console.error("✨ 認証が必要な機能も利用できます");
  } else {
    console.error("⚠️  警告: 認証情報が設定されていません");
    console.error("👀 読み取り機能のみ利用可能です");
    console.error("📝 投稿、コメント、スキなどの機能を使うには.envファイルに認証情報を設定してください");
  }
  console.error("◤◢◤◢◤◢◤◢◤◢◤◢◤◢");
}

/**
 * Expressアプリケーションをセットアップし、MCPリクエストを処理するルーターを設定する。
 */
async function setupExpressApp(): Promise<express.Express> {
  const app = express();
  app.use(express.json());

  // MCPリクエストハンドラ
  app.all("/mcp", async (req: Request, res: Response) => {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    // POSTメソッド以外は受付ない
    if (req.method !== "POST") {
      return res.status(405).json({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: `Method not allowed: ${req.method}`,
        },
        id: null
      });
    }

    // リクエストごとに新しいMCPサーバーインスタンスを作成
    const requestServer = new McpServer({
      name: "note-api-http",
      version: "2.1.0"
    });

    try {
      // ツールとプロンプトの登録
      registerAllTools(requestServer);
      registerPrompts(requestServer);

      res.on('close', () => {
        console.error('🔌 HTTP Request closed, cleaning up transport...');
        transport.close();
        requestServer.close();
      });

      await requestServer.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error: any) {
      console.error('💥 Error handling MCP request:', error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal server error',
          },
          id: null,
        });
      }
    }
  });

  return app;
}

/**
 * サーバーを起動するメイン関数
 */
async function main(): Promise<void> {
  try {
    console.error("◤◢◤◢◤◢◤◢◤◢◤◢◤◢");
    console.error("🌟 note API MCP Server v2.1.0 (HTTP) を起動準備中...");
    console.error("◤◢◤◢◤◢◤◢◤◢◤◢◤◢");

    // 1. コア機能の初期化
    await initializeServerCore();
    
    // 2. 認証処理
    await performAuthentication();
    
    // 3. Expressアプリケーションのセットアップ
    const app = await setupExpressApp();
    
    // 4. HTTPサーバーの起動
    const port = parseInt(env.HTTP_PORT || "3000", 10); // 環境変数からポート取得、デフォルト3000

    app.listen(port, () => {
    console.error("◤◢◤◢◤◢◤◢◤◢◤◢◤◢");
      console.error(`🎉 note API MCP Server v2.1.0 が正常に起動しました!`);
      console.error(`📡 Streamable HTTP transport で稼働中: http://localhost:${port}/mcp`);
    console.error("◤◢◤◢◤◢◤◢◤◢◤◢◤◢");

    // 利用可能な機能の概要表示
    console.error("\n📋 利用可能な機能:");
    console.error("🔍 検索機能:");
    console.error("  - search-notes: 記事検索");
    console.error("  - analyze-notes: 記事分析");
    console.error("  - search-users: ユーザー検索");
    console.error("  - search-magazines: マガジン検索");
    console.error("  - search-all: 全体検索");
    
    console.error("\n📝 記事機能:");
    console.error("  - get-note: 記事詳細取得");
    console.error("  - post-draft-note: 下書き投稿");
    console.error("  - get-comments: コメント取得");
    console.error("  - post-comment: コメント投稿");
    console.error("  - like-note / unlike-note: スキ操作");
    console.error("  - get-my-notes: 自分の記事一覧");
    
    console.error("\n👥 ユーザー機能:");
    console.error("  - get-user: ユーザー詳細取得");
    console.error("  - get-user-notes: ユーザーの記事一覧");
    console.error("  - get-stats: PV統計取得");
    
    console.error("\n🎪 メンバーシップ機能:");
    console.error("  - get-membership-summaries: 加入メンバーシップ一覧");
    console.error("  - get-membership-plans: 自分のプラン一覧");
    console.error("  - get-membership-notes: メンバーシップ記事一覧");
    console.error("  - get-circle-info: サークル情報取得");
    
    console.error("\n📚 その他機能:");
    console.error("  - get-magazine: マガジン詳細取得");
    console.error("  - list-categories: カテゴリー一覧");
    console.error("  - list-hashtags: ハッシュタグ一覧");
    console.error("  - get-notice-counts: 通知件数");

    console.error("\n💭 プロンプト:");
    console.error("  - note-search: 記事検索プロンプト");
    console.error("  - competitor-analysis: 競合分析");
    console.error("  - content-idea-generation: アイデア生成");
    console.error("  - article-analysis: 記事分析");
    console.error("  - membership-strategy: メンバーシップ戦略");
    console.error("  - content-calendar: コンテンツカレンダー");

    console.error("\n◤◢◤◢◤◢◤◢◤◢◤◢◤◢");
    console.error("🎯 Ready for requests!");
    console.error("◤◢◤◢◤◢◤◢◤◢◤◢◤◢");

      if (env.DEBUG) {
        console.error("\n📂 デバッグ情報:");
        console.error("  - 設定: src/config/");
        console.error("  - 型定義: src/types/");
        console.error("  - ユーティリティ: src/utils/");
        console.error("  - ツール: src/tools/");
        console.error("  - プロンプト: src/prompts/");
      }
    });

    // graceful shutdown
    process.on("SIGINT", async () => {
      console.error("Shutting down server...");
      process.exit(0);
    });

  } catch (error: any) {
    console.error("◤◢◤◢◤◢◤◢◤◢◤◢◤◢");
    console.error("💥 Fatal error during server startup:");
    console.error(error);
    console.error("◤◢◤◢◤◢◤◢◤◢◤◢◤◢");
    process.exit(1);
  }
}

// メイン処理の実行
main().catch((error: any) => {
  console.error("◤◢◤◢◤◢◤◢◤◢◤◢◤◢");
  console.error("💥 Fatal error:");
  console.error(error);
  console.error("◤◢◤◢◤◢◤◢◤◢◤◢◤◢");
  process.exit(1);
});

// ファイル情報の表示（開発用）
if (env.DEBUG) {
  console.error("📂 リファクタリング情報:");
  console.error("📁 設定: src/config/");
  console.error("🏷️  型定義: src/types/");
  console.error("🔧 ユーティリティ: src/utils/");
  console.error("🛠️  ツール: src/tools/");
  console.error("💭 プロンプト: src/prompts/");
  console.error("🚀 メインサーバー: src/note-mcp-server-refactored.ts");
}