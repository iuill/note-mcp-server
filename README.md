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
- メンバーシップ情報の取得と閲覧
- コンテンツアイデアの生成と競合分析

## 認証について

このサーバーでは、ほとんどの読み取り機能（記事検索、ユーザー情報など）は**認証なしで利用できます**。一方、以下の機能を使用するには**note.comの認証情報**が必要です：

- 記事投稿（下書き）
- コメント投稿
- スキをつける/削除する
- PV統計情報の取得
- メンバーシップ情報の取得

## セットアップ

### 必要なもの

- Node.js (v18以上)
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

3. ソースファイルをsrcディレクトリに移動（既にsrcディレクトリにある場合は不要）
   ```
   mkdir -p src
   mv note-mcp-server.ts src/
   ```

4. `.env.example`ファイルをコピーして`.env`ファイルを作成
   ```
   cp .env.example .env
   ```

5. 必要に応じて、`.env`ファイルを編集して認証情報を設定（後述）

6. TypeScriptをビルド
   ```
   npm run build
   ```

### 認証情報の設定方法

投稿やスキ、メンバーシップ情報取得などの機能を使うには、以下のいずれかの方法で認証情報を設定します：

#### 方法１：メールアドレスとパスワードによる認証（推奨）

`.env`ファイルにあなたのnote.comアカウントのメールアドレスとパスワードを設定します：

```
NOTE_EMAIL=note.comのメールアドレス
NOTE_PASSWORD=note.comのパスワード
NOTE_USER_ID=自分のnote.comのID（ログイン後のページnote.com/{userID}/で確認できます）
```

この方法のメリットは、Cookieのように期限切れしないことです。サーバー起動時に自動的に認証されます。

#### 方法２：Cookieベースの認証（代替方法）

以下の手順でCookieを取得してください：

1. ブラウザでnote.comにログインする
2. ブラウザの開発者ツール（F12）を開く
3. アプリケーションタブ（Application）を選択
4. 左側のメニューからCookies→「https://note.com」を選択
5. 以下のCookie値をコピーして`.env`ファイルに設定：
   - `_note_session_v5`（先頭のアンダースコアに注意）
   - `note_xsrf_token`（必要に応じて）

**注意**: Cookie認証は有効期限があるため、定期的に更新する必要があります。

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
        "/path/to/noteMCP/build/note-mcp-server.js"
      ],
      "env": {
        "NOTE_EMAIL": "note.comのメールアドレス",
        "NOTE_PASSWORD": "note.comのパスワード",
        "NOTE_USER_ID": "あなたのuser ID",
        "DEBUG": "true"
      }
    }
  }
}
```

または、Cookie認証を利用する場合は以下のように設定します(非推奨)

```json
{
  "mcpServers": {
    "note-api": {
      "command": "node",
      "args": [
        "/path/to/noteMCP/build/note-mcp-server.js"
      ],
      "env": {
        "NOTE_SESSION_V5": "あなたのセッションv5トークン",
        "NOTE_XSRF_TOKEN": "あなたのxsrfトークン",
        "DEBUG": "true"
      }
    }
  }
}
```

認証が不要な場合（検索・閲覧のみ）は、`env`部分は省略できます。

```json
{
  "mcpServers": {
    "note-api": {
      "command": "node",
      "args": [
        "/path/to/noteMCP/build/note-mcp-server.js"
      ]
    }
  }
}
```

4. Claude Desktopを再起動

## 使い方

以下のようなクエリをClaude Desktopで試すことができます：

- 「noteで『プログラミング』に関する人気記事を検索して」
- 「ユーザー『username』の記事を分析して、人気の要因を教えて」
- 「マーケティングについての記事のアイデアを5つ考えて」
- 「プログラミングに関する記事を書きたいので、アウトラインを考えて」

**認証ありの場合のみ使える機能：**
- 「私のnoteアカウントの最新記事のPV数を教えて」
- 「この記事にスキをつけて」
- 「この記事にコメントを投稿して」

## 利用可能なツール

このMCPサーバーでは以下のツールが利用できます：

### 記事関連（認証なしで利用可能）
- **search-notes**: キーワードで記事を検索
- **get-note**: 記事IDから詳細情報を取得
- **get-category-notes**: カテゴリーの記事一覧を取得

### ユーザー関連（認証なしで利用可能）
- **search-users**: ユーザーを検索
- **get-user**: ユーザー詳細情報を取得
- **get-user-notes**: ユーザーの記事一覧を取得

### マガジン関連（認証なしで利用可能）
- **search-magazines**: マガジンを検索
- **get-magazine**: マガジンの詳細を取得

### インタラクション（認証必須）
- **post-draft-note**: 下書き記事を投稿
- **get-comments**: 記事のコメント一覧を取得（認証なしでも可能なケースあり）
- **post-comment**: 記事にコメントを投稿
- **get-likes**: 記事のスキ一覧を取得（認証なしでも可能なケースあり）
- **like-note**: 記事にスキをつける
- **unlike-note**: 記事のスキを削除

### 統計（認証必須）
- **get-stats**: PV統計情報を取得

### メンバーシップ関連（認証必須）
- **get-membership-summaries**: 加入済みメンバーシップ一覧を取得
- **get-membership-plans**: メンバーシッププラン情報を取得
- **get-membership-notes**: メンバーシップの記事一覧を取得

## トラブルシューティング

### サーバーが起動しない
- `.env`ファイルが正しく設定されているか確認
- Node.jsのバージョンが18以上か確認（`node -v`コマンドで確認）
- 依存パッケージがインストールされているか確認（`npm install`を実行）
- `npm run build`でTypeScriptがビルドできているか確認

### 認証エラーが発生する
- Cookie値が最新か確認（期限が切れている可能性あり）
- 両方のCookie値（`note_gql_auth_token`と`_note_session_v5`）を設定してみる
- 認証が必要な機能か確認

### APIエラーが発生する
- note.comの仕様変更の可能性があります
- 最新版のサーバーを入手するか、エラーが発生した部分のコードを確認・修正してください

## 注意事項

- このサーバーはnote.comの非公式APIを利用しています
- APIの仕様変更により、一部または全部の機能が動作しなくなる可能性があります
- Cookie認証は有効期限があるため、定期的に更新が必要です
- note.comの利用規約を遵守して使用してください

## ライセンス

MIT