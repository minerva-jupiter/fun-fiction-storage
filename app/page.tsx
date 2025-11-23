import Link from "next/link";
import React from "react";
import { promises as fs } from "node:fs";
import path from "node:path";

interface WorkListItem {
  slug: string;
  title: string;
}

// プロジェクトルートの `works` ディレクトリから作品リストを取得する関数
async function getWorksList(): Promise<WorkListItem[]> {
  const worksDirectory = path.join(process.cwd(), "works");
  let workList: WorkListItem[] = [];

  try {
    // worksディレクトリが存在するか確認
    await fs.access(worksDirectory);
    const files = await fs.readdir(worksDirectory);

    const txtFiles = files.filter((file) => file.endsWith(".txt"));

    for (const file of txtFiles) {
      const slug = path.basename(file, ".txt");
      const filePath = path.join(worksDirectory, file);
      const rawContent = await fs.readFile(filePath, "utf8");

      // コンテンツからタイトルを抽出
      const titleMatch = rawContent.match(/\[chapter:(.+?)\]/);
      const title = titleMatch ? titleMatch[1] : `作品ID: ${slug}`;

      workList.push({ slug, title });
    }
  } catch (error: any) {
    if (error.code === "ENOENT") {
      console.warn(
        `Works directory not found at ${worksDirectory}. No works to list.`,
      );
    } else {
      console.error("Error reading works directory or files:", error);
    }
  }
  return workList;
}

export default async function Home() {
  const works = await getWorksList();

  return (
    <main className="container mx-auto p-4">
      <h1 className="text-4xl font-bold mb-4">
        Welcome to Fun Fiction Storage
      </h1>
      <p className="text-lg text-gray-700 mb-6">
        Explore our collection of stories and share your own.
      </p>

      <h2 className="text-3xl font-bold mb-4">作品一覧</h2>
      {works.length === 0 ? (
        <p className="text-gray-600">現在、作品はありません。</p>
      ) : (
        <ul className="list-disc list-inside space-y-2">
          {works.map((work) => (
            <li key={work.slug}>
              <Link
                href={`/works/${work.slug}`}
                className="text-blue-600 hover:underline"
              >
                {work.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
