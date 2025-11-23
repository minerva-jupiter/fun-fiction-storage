import { notFound } from "next/navigation";
import PixivContentRenderer from "../../../components/PixivContentRenderer"; // 正しいインポートパス
import React from "react";
import { promises as fs } from "node:fs";
import path from "node:path";

interface FictionData {
  title: string;
  rawContent: string;
}

// この関数はビルド時に実行され、生成する静的ページのパスを決定します。
export async function generateStaticParams() {
  // worksディレクトリをプロジェクトルート直下を指すように変更します。
  const worksDirectory = path.join(process.cwd(), "works");
  console.log(
    "generateStaticParams: Checking works directory at",
    worksDirectory,
  );
  let slugs: string[] = [];

  try {
    // worksディレクトリが存在するか確認
    await fs.access(worksDirectory); // ディレクトリが存在しない場合はエラーをスロー
    console.log("generateStaticParams: Works directory exists.");

    const files = await fs.readdir(worksDirectory);
    console.log("generateStaticParams: Files found in works directory:", files);

    slugs = files
      .filter((file) => file.endsWith(".txt"))
      .map((file) => path.basename(file, ".txt"));
    //console.log("generateStaticParams: Detected slugs:", slugs);
  } catch (error: any) {
    if (error.code === "ENOENT") {
      console.error(
        "generateStaticParams: Works directory not found at",
        worksDirectory,
      );
    } else {
      console.error(
        "generateStaticParams: Error reading works directory for generateStaticParams:",
        error,
      );
    }
    slugs = [];
  }

  return slugs.map((slug) => ({
    slug: slug,
  }));
}

// このコンポーネントは URL から slug を受け取ります
// paramsがPromiseであるというエラーに対応するため、propsからparamsを受け取り、awaitで解決します
export default async function Page(props: {
  params: Promise<{ slug: string }> | { slug: string };
}) {
  //console.log("Page component: Raw props.params received:", props.params);

  let resolvedParams: { slug: string };
  if (props.params instanceof Promise) {
    resolvedParams = await props.params;
    console.log(
      "Page component: Props.params was a Promise, resolved to:",
      resolvedParams,
    );
  } else {
    resolvedParams = props.params;
    console.log(
      "Page component: Props.params was a plain object:",
      resolvedParams,
    );
  }

  const { slug } = resolvedParams;

  //console.log("Page component: Slug derived:", slug);

  if (!slug) {
    console.error("Page component: Slug is undefined or null, rendering 404.");
    notFound(); // slugがundefinedの場合は404ページを表示
  }

  // コンテンツとタイトルを取得
  const fictionData = await getFictionContent(slug);

  if (!fictionData || !fictionData.rawContent) {
    console.error(
      `Page component: Content for slug ${slug} is empty or null, rendering 404.`,
    );
    notFound();
  }

  // Pixiv 記法を使用した実際のレンダリングロジック
  return (
    <div className="pixiv-novel-container">
      <h1>{fictionData.title}</h1>
      <PixivContentRenderer
        rawContent={fictionData.rawContent}
        currentSlug={slug}
      />
    </div>
  );
}

// ファイルシステムからコンテンツとタイトルを取得する関数
async function getFictionContent(slug: string): Promise<FictionData | null> {
  if (!slug) {
    console.error(
      "getFictionContent: Attempted to read fiction content with undefined slug.",
    );
    return null;
  }
  try {
    // worksディレクトリをプロジェクトルート直下を指すように変更します。
    const filePath = path.join(process.cwd(), "works", `${slug}.txt`);
    console.log("getFictionContent: Attempting to read file from:", filePath);
    const rawContent = await fs.readFile(filePath, "utf8");
    console.log(
      `getFictionContent: Successfully read file for slug ${slug}. Content length: ${rawContent.length}`,
    );

    // タイトルを抽出するロジック
    const titleMatch = rawContent.match(/\\[chapter:(.+?)\\]/);
    const title = titleMatch ? titleMatch[1] : `作品ID: ${slug}`; // 最初の[chapter:...]をタイトルとし、なければデフォルト

    return { rawContent, title };
  } catch (error) {
    console.error(
      `getFictionContent: Error reading file for slug ${slug}:`,
      error,
    );
    return null;
  }
}
