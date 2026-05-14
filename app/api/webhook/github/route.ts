import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    // 管理者権限でSupabaseを操作するためのクライアント
    // ※ Edge FunctionsやAPI Routesでは、サービスロールキーを使用することでセキュリティルール(RLS)をバイパスできます。
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    // GitHubからのWebhookペイロードを取得
    const payload = await request.json();

    // GitHubのイベントタイプを取得 (例: pull_request, push など)
    const eventType = request.headers.get('x-github-event');

    // プルリクエストがマージされた時（またはクローズされた時）をフックする例
    if (eventType === 'pull_request') {
      const { action, pull_request } = payload;

      // PRがマージされた場合のみ処理
      if (action === 'closed' && pull_request.merged) {
        const branchName = pull_request.head.ref; // 例: "feature/task-12345"

        // ブランチ名から task_id を抽出する（運用ルールに合わせて正規表現を調整）
        // ここでは "task-UUID" のような形式を想定
        const taskIdMatch = branchName.match(/task-([a-f0-9\-]+)/);

        if (taskIdMatch && taskIdMatch[1]) {
          const taskId = taskIdMatch[1];

          // Supabaseのtasksテーブルを更新
          const { error } = await supabaseAdmin
            .from('tasks')
            .update({ situation: 'done' }) // 状態を完了にする
            .eq('task_id', taskId);

          if (error) {
            console.error('Supabase Update Error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
          }

          return NextResponse.json({ message: `Task ${taskId} updated successfully.` }, { status: 200 });
        }
      }
    }

    // 該当しないイベントは無視
    return NextResponse.json({ message: 'Event ignored.' }, { status: 200 });
  } catch (error: unknown) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
