'use client';

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
    // 全体のレイアウトは app/layout.tsx で管理されるようになったため、
    // ここでは単純にコンテンツを返します。
    return <>{children}</>;
}
