# note.com MCP Server

このMCPサーバーは、note.comのAPIを利用して記事の閲覧や投稿、ユーザー情報の取得などをClaude Desktopから実行できるようにするものです。

## 機能

このMCPサーバーでは以下の機能が利用できます：

- 記事の検索と閲覧
- ユーザーの検索とプロフィール閲覧
- 記事の投稿（下書き）
- コメントの閲覧と投稿
- スキの管理（取得・追加・削除）
- マガジンの検索と閲覧
- カテゴリー記事の閲覧
- PV統計情報の取得
- コンテンツアイデアの生成と競合分析

## セットアップ

### 必要なもの

- Node.js (v16以上)
- npm または yarn
- Claude Desktop
- note.comのアカウント（投稿機能を使う場合）

### インストール手順

1. このリポジトリをクローンまたはダウンロードする
   ```
   git clone https://github.com/yourusername/note-mcp-server.git
   cd note-mcp-server
   ```

2. 依存パッケージをインストール
   ```
   npm install
   ```

3. ソースファイルをsrcディレクトリに移動
   ```
   mkdir -p src
   mv note-mcp-server.ts src/
   ```

4. `.env.example`ファイルをコピーして`.env`ファイルを作成
   ```
   cp .env.example .env
   ```

5. `.env`ファイルを編集して必要な環境変数を設定（noteのCookieトークンなど）

6. TypeScriptをビルド
   ```
   npm run build
   ```

### 認証情報の取得

noteの認証を必要とする機能（記事投稿、コメント、スキなど）を利用するには、以下の手順でCookieトークンを取得します：

1. ブラウザでnote.comにログインする
2. ブラウザの開発者ツール（F12）を開く
3. アプリケーションタブ（Application）を選択
4. 左側のメニューからCookies→「https://note.com」を選択
5. 以下のCookie値をコピーして`.env`ファイルに設定：
   - `note_gql_auth_token`
   - `_note_session_v5`（先頭のアンダースコアに注意）

**注意**: 少なくとも一つのCookieトークンが必要です。両方あれば理想的ですが、どちらか一方でも多くの機能は動作します。

### Claude Desktopとの連携

1. Claude Desktopをインストールして起動

2. Claude Desktopの設定ファイルを開く:
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`

3. 設定ファイルに以下の内容を追加（パスは実際のパスに変更してください）:

```json
{
  "mcpServers": {
    "note-api": {
      "command": "node",
      "args": [
        "/Users/heavenlykiss0820/noteMCP/build/note-mcp-server.js"
      ],
      "env": {
        "NOTE_GQL_AUTH_TOKEN": "あなたのトークン",
        "NOTE_SESSION_V5": "あなたのセッションv5トークン"
      }
    }
  }
}
```

4. Claude Desktopを再起動

## 使い方

以下のようなクエリをClaude Desktopで試すことができます：

- 「noteで『プログラミング』に関する人気記事を検索して」
- 「私のnoteアカウントの最新記事のPV数を教えて」
- 「ユーザー『username』の記事を分析して、人気の要因を教えて」
- 「マーケティングについての記事のアイデアを5つ考えて」

## 利用可能なツール

このMCPサーバーでは以下のツールが利用できます：

### 記事関連
- **search-notes**: キーワードで記事を検索
- **get-note**: 記事IDから詳細情報を取得
- **post-draft-note**: 下書き記事を投稿
- **get-category-notes**: カテゴリーの記事一覧を取得

### ユーザー関連
- **search-users**: ユーザーを検索
- **get-user**: ユーザー詳細情報を取得
- **get-user-notes**: ユーザーの記事一覧を取得

### インタラクション
- **get-comments**: 記事のコメント一覧を取得
- **post-comment**: 記事にコメントを投稿
- **get-likes**: 記事のスキ一覧を取得
- **like-note**: 記事にスキをつける
- **unlike-note**: 記事のスキを削除

### マガジン関連
- **search-magazines**: マガジンを検索
- **get-magazine**: マガジンの詳細を取得

### 統計
- **get-stats**: PV統計情報を取得

## プロンプトテンプレート

このサーバーには以下のプロンプトテンプレートも含まれています：

- **note-search**: noteでキーワード検索し記事を要約
- **competitor-analysis**: 競合ユーザーの分析
- **content-idea-generation**: 指定トピックの記事アイデア生成
- **article-analysis**: 指定記事の文章や構成の分析

## 認証が必要な機能

以下の機能を利用するには、noteのアカウントとCookieトークンが必要です：

- 記事投稿
- コメント投稿
- スキをつける/削除
- PV統計情報取得

## 注意事項

- このサーバーはnote.comの非公式APIを利用しています
- APIの仕様変更により、一部または全部の機能が動作しなくなる可能性があります
- Cookie認証は有効期限があるため、定期的に更新が必要です
- note.comの利用規約を遵守して使用してください

## ライセンス

MIT