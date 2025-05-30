import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { noteApiRequest } from "../utils/api-client.js";
import { formatNote, formatComment, formatLike } from "../utils/formatters.js";
import { 
  createSuccessResponse, 
  createErrorResponse, 
  createAuthErrorResponse,
  handleApiError 
} from "../utils/error-handler.js";
import { hasAuth } from "../utils/auth.js";
import { env } from "../config/environment.js";

export function registerNoteTools(server: McpServer) {
  // 1. 記事詳細取得ツール
  server.tool(
    "get-note",
    "記事の詳細情報を取得する",
    {
      noteId: z.string().describe("記事ID（例: n4f0c7b884789）"),
    },
    async ({ noteId }) => {
      try {
        const params = new URLSearchParams({
          draft: "true",
          draft_reedit: "false",
          ts: Date.now().toString()
        });
        
        const data = await noteApiRequest(
          `/v3/notes/${noteId}?${params.toString()}`, 
          "GET",
          null,
          true
        );

        const noteData = data.data || {};
        const formattedNote = formatNote(noteData);

        return createSuccessResponse(formattedNote);
      } catch (error) {
        return handleApiError(error, "記事取得");
      }
    }
  );

  // 2. コメント一覧取得ツール
  server.tool(
    "get-comments",
    "記事へのコメント一覧を取得する",
    {
      noteId: z.string().describe("記事ID"),
    },
    async ({ noteId }) => {
      try {
        const data = await noteApiRequest(`/v1/note/${noteId}/comments`);

        let formattedComments: any[] = [];
        if (data.comments) {
          formattedComments = data.comments.map(formatComment);
        }

        return createSuccessResponse({
          comments: formattedComments
        });
      } catch (error) {
        return handleApiError(error, "コメント取得");
      }
    }
  );

  // 3. スキ取得ツール
  server.tool(
    "get-likes",
    "記事のスキ一覧を取得する",
    {
      noteId: z.string().describe("記事ID"),
    },
    async ({ noteId }) => {
      try {
        const data = await noteApiRequest(`/v3/notes/${noteId}/likes`);

        let formattedLikes: any[] = [];
        if (data.data && data.data.likes) {
          formattedLikes = data.data.likes.map(formatLike);
        }

        return createSuccessResponse({
          likes: formattedLikes
        });
      } catch (error) {
        return handleApiError(error, "スキ一覧取得");
      }
    }
  );

  // 4. 記事投稿ツール（下書き保存）
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
        if (!hasAuth()) {
          return createAuthErrorResponse();
        }

        console.error("下書き保存リクエスト内容:");

        // 試行1: 最新のAPI形式で試行
        try {
          console.error("試行1: 最新のAPI形式");
          const postData1 = {
            title: title,
            body: body,
            status: "draft",
            tags: tags || [],
            publish_at: null,
            eyecatch_image: null,
            price: 0,
            is_magazine_note: false
          };

          console.error(`リクエスト内容: ${JSON.stringify(postData1, null, 2)}`);

          let endpoint = "";
          if (id) {
            endpoint = `/v3/notes/${id}/draft`;
          } else {
            endpoint = `/v3/notes/draft`;
          }

          const data = await noteApiRequest(endpoint, "POST", postData1, true);
          console.error(`成功: ${JSON.stringify(data, null, 2)}`);

          return createSuccessResponse({
            success: true,
            data: data,
            message: "記事を下書き保存しました（試行1）"
          });
        } catch (error1) {
          console.error(`試行1でエラー: ${error1}`);

          // 試行2: 旧APIエンドポイント
          try {
            console.error("試行2: 旧APIエンドポイント");
            const postData2 = {
              title,
              body,
              tags: tags || [],
            };

            console.error(`リクエスト内容: ${JSON.stringify(postData2, null, 2)}`);

            const endpoint = id
              ? `/v1/text_notes/draft_save?id=${id}&user_id=${env.NOTE_USER_ID}`
              : `/v1/text_notes/draft_save?user_id=${env.NOTE_USER_ID}`;

            const data = await noteApiRequest(endpoint, "POST", postData2, true);
            console.error(`成功: ${JSON.stringify(data, null, 2)}`);

            return createSuccessResponse({
              success: true,
              data: data,
              message: "記事を下書き保存しました（試行2）"
            });
          } catch (error2) {
            console.error(`試行2でエラー: ${error2}`);
            return createErrorResponse(
              `記事の投稿に失敗しました:\n試行1エラー: ${error1}\n試行2エラー: ${error2}\n\nセッションの有効期限が切れている可能性があります。.envファイルのCookie情報を更新してください。`
            );
          }
        }
      } catch (error) {
        console.error(`下書き保存処理全体でエラー: ${error}`);
        return handleApiError(error, "記事投稿");
      }
    }
  );

  // 5. コメント投稿ツール
  server.tool(
    "post-comment",
    "記事にコメントを投稿する",
    {
      noteId: z.string().describe("記事ID"),
      text: z.string().describe("コメント本文"),
    },
    async ({ noteId, text }) => {
      try {
        if (!hasAuth()) {
          return createAuthErrorResponse();
        }

        const data = await noteApiRequest(`/v1/note/${noteId}/comments`, "POST", { text }, true);

        return createSuccessResponse({
          message: "コメントを投稿しました",
          data: data
        });
      } catch (error) {
        return handleApiError(error, "コメント投稿");
      }
    }
  );

  // 6. スキをつけるツール
  server.tool(
    "like-note",
    "記事にスキをする",
    {
      noteId: z.string().describe("記事ID"),
    },
    async ({ noteId }) => {
      try {
        if (!hasAuth()) {
          return createAuthErrorResponse();
        }

        await noteApiRequest(`/v3/notes/${noteId}/likes`, "POST", {}, true);

        return createSuccessResponse({
          message: "スキをつけました"
        });
      } catch (error) {
        return handleApiError(error, "スキ");
      }
    }
  );

  // 7. スキを削除するツール
  server.tool(
    "unlike-note",
    "記事のスキを削除する",
    {
      noteId: z.string().describe("記事ID"),
    },
    async ({ noteId }) => {
      try {
        if (!hasAuth()) {
          return createAuthErrorResponse();
        }

        await noteApiRequest(`/v3/notes/${noteId}/likes`, "DELETE", {}, true);

        return createSuccessResponse({
          message: "スキを削除しました"
        });
      } catch (error) {
        return handleApiError(error, "スキ削除");
      }
    }
  );

  // 8. 自分の記事一覧（下書きを含む）取得ツール
  server.tool(
    "get-my-notes",
    "自分の記事一覧（下書きを含む）を取得する",
    {
      page: z.number().default(1).describe("ページ番号（デフォルト: 1）"),
      perPage: z.number().default(20).describe("1ページあたりの表示件数（デフォルト: 20）"),
      status: z.enum(["all", "draft", "public"]).default("all").describe("記事の状態フィルター（all:すべて, draft:下書きのみ, public:公開済みのみ）"),
    },
    async ({ page, perPage, status }) => {
      try {
        if (!env.NOTE_USER_ID) {
          return createErrorResponse("環境変数 NOTE_USER_ID が設定されていません。.envファイルを確認してください。");
        }

        const params = new URLSearchParams({
          page: page.toString(),
          per_page: perPage.toString(),
          draft: "true",
          draft_reedit: "false",
          ts: Date.now().toString()
        });

        if (status === "draft") {
          params.set("status", "draft");
        } else if (status === "public") {
          params.set("status", "public");
        }

        const data = await noteApiRequest(
          `/v2/note_list/contents?${params.toString()}`,
          "GET",
          null,
          true
        );

        if (env.DEBUG) {
          console.error(`API Response: ${JSON.stringify(data, null, 2)}`);
        }

        let formattedNotes: any[] = [];
        let totalCount = 0;

        if (data.data && data.data.notes && Array.isArray(data.data.notes)) {
          formattedNotes = data.data.notes.map((note: any) => {
            const isDraft = note.status === "draft";
            const noteKey = note.key || "";
            const noteId = note.id || "";
            
            const draftTitle = note.noteDraft?.name || "";
            const title = note.name || draftTitle || "(無題)";
            
            let excerpt = "";
            if (note.body) {
              excerpt = note.body.length > 100 ? note.body.substring(0, 100) + '...' : note.body;
            } else if (note.peekBody) {
              excerpt = note.peekBody;
            } else if (note.noteDraft?.body) {
              const textContent = note.noteDraft.body.replace(/<[^>]*>/g, '');
              excerpt = textContent.length > 100 ? textContent.substring(0, 100) + '...' : textContent;
            }
            
            const publishedAt = note.publishAt || note.publish_at || note.displayDate || note.createdAt || '日付不明';
            
            return {
              id: noteId,
              key: noteKey,
              title: title,
              excerpt: excerpt,
              publishedAt: publishedAt,
              likesCount: note.likeCount || 0,
              commentsCount: note.commentsCount || 0,
              status: note.status || "unknown",
              isDraft: isDraft,
              format: note.format || "",
              url: `https://note.com/${env.NOTE_USER_ID}/n/${noteKey}`,
              editUrl: `https://note.com/${env.NOTE_USER_ID}/n/${noteKey}/edit`,
              hasDraftContent: note.noteDraft ? true : false,
              lastUpdated: note.noteDraft?.updatedAt || note.createdAt || "",
              user: {
                id: note.user?.id || env.NOTE_USER_ID,
                name: note.user?.name || note.user?.nickname || "",
                urlname: note.user?.urlname || env.NOTE_USER_ID
              }
            };
          });
        }

        totalCount = data.data?.totalCount || 0;

        return createSuccessResponse({
          total: totalCount,
          page: page,
          perPage: perPage,
          status: status,
          totalPages: Math.ceil(totalCount / perPage),
          hasNextPage: page * perPage < totalCount,
          hasPreviousPage: page > 1,
          draftCount: formattedNotes.filter((note: any) => note.isDraft).length,
          publicCount: formattedNotes.filter((note: any) => !note.isDraft).length,
          notes: formattedNotes
        });
      } catch (error) {
        return handleApiError(error, "記事一覧取得");
      }
    }
  );

  // 9. 記事編集ページを開くツール
  server.tool(
    "open-note-editor",
    "記事の編集ページを開く",
    {
      noteId: z.string().describe("記事ID（例: n1a2b3c4d5e6）"),
    },
    async ({ noteId }) => {
      try {
        if (!env.NOTE_USER_ID) {
          return createErrorResponse("環境変数 NOTE_USER_ID が設定されていません。.envファイルを確認してください。");
        }

        let noteKey = noteId;
        if (noteId.startsWith('n')) {
          noteKey = noteId;
        }

        const editUrl = `https://note.com/${env.NOTE_USER_ID}/n/${noteKey}/edit`;

        return createSuccessResponse({
          status: "success",
          editUrl: editUrl,
          message: `編集ページのURLを生成しました。以下のURLを開いてください：\n${editUrl}`
        });
      } catch (error) {
        return handleApiError(error, "編集ページURL生成");
      }
    }
  );
}