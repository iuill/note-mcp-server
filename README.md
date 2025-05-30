# note.com MCP Server

このMCPサーバーは、note.comのAPIを利用して記事の閲覧や投稿、ユーザー情報の取得などをClaude Desktopから実行できるようにするものです。

## 機能

このMCPサーバーでは以下の機能が利用できます：

- 記事の検索と閲覧（新着順・人気順・急上昇でのソートに対応）
- ユーザーやハッシュタグを含めたnote全体検索
- ユーザーの検索とプロフィール閲覧
- 記事の詳細分析（エンゲージメント分析、コンテンツ分析、価格分析など）
- 自分の記事一覧（下書き含む）の取得
- 記事の投稿と編集（下書き）
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

1. このリポジトリをクローンする
   ```
   git clone https://github.com/shimayuz/note-mcp-server.git
   cd note-mcp-server
   ```

2. 依存パッケージをインストール
   ```
   npm install
   ```

3. 環境設定ファイルを作成
   ```
   cp .env.example .env
   ```
   作成した`.env`ファイルを編集し、必要に応じて認証情報を設定します（認証情報の設定方法については後述）

4. TypeScriptをビルド
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

### 検索と閲覧（認証不要）
- 「noteで『プログラミング』に関する人気記事を検索して」
- 「noteで『プログラミング』の記事を新着順で検索して」
- 「ユーザー『username』の記事を分析して、人気の要因を教えて」
- 「noteでプログラミングに興味があるユーザーとハッシュタグを全体検索して」
- 「プログラミングに関する記事を詳細分析して、エンゲージメントの傾向を教えて」

### アイデア生成（認証不要）
- 「マーケティングについての記事のアイデアを5つ考えて」
- 「プログラミングに関する記事を書きたいので、アウトラインを考えて」

### 認証ありの場合のみ使える機能：
- 「私のnoteの下書き記事一覧を取得して」
- 「下書き記事のID: n12345の編集ページを開きたい」
- 「タイトル『テスト記事』、本文『これはテストです』で下書き記事を作成して」
- 「私のnoteアカウントの最新記事のPV数を教えて」
- 「この記事にスキをつけて」
- 「この記事にコメントを投稿して」

## 利用可能なツール

このMCPサーバーでは以下のツールが利用できます：

### 検索関連（認証なしで利用可能）
- **search-notes**: キーワードで記事を検索（ソート順は `sort` パラメータで指定可能）
- **search-all**: note全体検索（ユーザー、ハッシュタグ、記事など）
- **analyze-notes**: 記事の詳細分析（競合分析、エンゲージメント分析、コンテンツタイプ分析など）

### 記事関連（認証なしで利用可能）
- **get-note**: 記事IDから詳細情報を取得（下書き記事も取得可能）
- **get-category-notes**: カテゴリーの記事一覧を取得

### ユーザー関連（認証なしで利用可能）
- **search-users**: ユーザーを検索
- **get-user**: ユーザー詳細情報を取得
- **get-user-notes**: ユーザーの記事一覧を取得

### マガジン関連（認証なしで利用可能）
- **search-magazines**: マガジンを検索
- **get-magazine**: マガジンの詳細を取得

### 自分の記事関連（認証必須）
- **get-my-notes**: 自分の記事一覧（下書き含む）を取得
- **post-draft-note**: 下書き記事を投稿・更新
- **open-note-editor**: 記事の編集ページURLを生成

### インタラクション（認証必須）
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

## 制限事項と注意点

このMCPサーバーには以下の制限事項があります：

### APIの制限

- **下書き保存機能（post-draft-note）**: note.comのAPI変更により、下書き保存のAPIエンドポイントが変更されることがあります。保存エラーが発生した場合は、エラーメッセージを確認してください。

- **検索結果の上限**: 単一の検索リクエストで取得できる結果は最大20件程度です。より多くの結果を取得する場合は、`start`パラメータを使用してページネーションを行ってください。

- **認証情報の更新**: Cookieベースの認証を使用している場合、Cookieの有効期限（1～2週間程度）が切れると認証が必要な機能が使えなくなります。定期的にCookie値を更新してください。

### 機能の制限

- **analyze-notes ツール**: 記事の詳細分析機能は、note.com APIが提供するデータに基づいています。一部の分析指標（例：実際の閲覧数など）は、APIから提供されない場合は利用できません。

- **ソートパラメータ**: `sort`パラメータでは、`new`（新着順）、`popular`（人気順）、`hot`（急上昇）の3種類のソートが利用できますが、note.comのAPI変更により、一部のソートオプションが機能しない場合があります。

- **get-my-notes**: 下書き記事の取得については、note.comのAPI実装によっては一部の情報が取得できない場合があります。

### 新機能の使用例

#### 記事詳細分析ツールの例

```
// 基本的な使用例
analyze-notes(query: "ChatGPT")

// 詳細なオプション指定
analyze-notes(
  query: "AIツール", 
  size: 30, 
  sort: "popular", 
  includeUserDetails: true,
  analyzeContent: true,
  priceRange: "paid"
)

// カテゴリと日付範囲の指定
analyze-notes(
  query: "プログラミング", 
  category: "technology",
  dateRange: "3m",  // 3ヶ月以内
  sort: "new"
)
```

#### ソートパラメータの使用例

```
// 新着順で記事を検索
search-notes(query: "AI", sort: "new")

// 人気順で全体検索
search-all(query: "プログラミング", context: "user,hashtag,note", sort: "popular")

// 急上昇（デフォルト）で検索
search-notes(query: "ChatGPT")
```

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
- Cookie認証は有効期限があるため、定期的に更新が必要ですが、ログイン認証で定期的にトークンは更新できる様にしています。
- note.comの利用規約を遵守して使用してください
- まだまだ発展途上のため、エラー等あるかもしれません。ぜひ見つけたらissueで教えてください。

## ライセンス

MIT