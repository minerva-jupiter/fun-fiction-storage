import React from "react";
import Link from "next/link";

interface PixivContentRendererProps {
  rawContent: string;
  currentSlug: string; // page.tsxから渡されるslugを受け取ります
}

const PixivContentRenderer: React.FC<PixivContentRendererProps> = ({
  rawContent,
  currentSlug,
}) => {
  const parseAndRender = () => {
    // すべての Pixiv 記法タグをキャプチャする正規表現。
    // タグ自体をキャプチャグループとして作成し、split がそれらを含めるようにします。
    const tagRegex =
      /(\[newpage\]|\[chapter:.*?\]|\[uploadedimage:\d+\]|\[pixivimage:\d+(?:-\d+)?\]|\[jump:\d+\]|\[\[jumpuri:.*? > .*?\]\]|\[\[rb:.*? > .*?\]\])/g;
    const parts = rawContent.split(tagRegex);

    const elements: React.ReactNode[] = [];
    let currentParagraphContent: React.ReactNode[] = [];

    // 現在構築中の段落を elements 配列にフラッシュするヘルパー関数
    const flushParagraph = () => {
      // 空白のみの段落を避けるためにトリムしてチェック
      const trimmedContent = currentParagraphContent.filter((node) =>
        typeof node === "string" ? node.trim().length > 0 : true,
      );

      if (trimmedContent.length > 0) {
        elements.push(
          <p key={`para-${elements.length}`} className="pixiv-text-paragraph">
            {currentParagraphContent}
          </p>,
        );
        currentParagraphContent = [];
      } else if (currentParagraphContent.length > 0) {
        // 空白文字だけの段落も、意図的な改行の塊とみなし、空の<p>として追加
        elements.push(
          <p
            key={`para-${elements.length}`}
            className="pixiv-empty-paragraph"
          />,
        );
        currentParagraphContent = [];
      }
    };

    parts.forEach((part, index) => {
      // 各 Pixiv タグまたはテキストセグメントを処理します
      if (part === "[newpage]") {
        flushParagraph(); // 新しいブロック要素の前に現在の段落をフラッシュ
        elements.push(<hr key={index} className="pixiv-newpage" />);
      } else if (part.startsWith("[chapter:")) {
        flushParagraph(); // 新しいブロック要素の前に現在の段落をフラッシュ
        const match = part.match(/\[chapter:(.+?)\]/);
        const title = match ? match[1] : "Unknown Chapter";
        elements.push(
          <h2 key={index} className="pixiv-chapter-title">
            {title}
          </h2>,
        );
      } else if (part.startsWith("[uploadedimage:")) {
        flushParagraph(); // 新しいブロック要素の前に現在の段落をフラッシュ
        const match = part.match(/\[uploadedimage:(\d+)\]/);
        const id = match ? match[1] : "unknown";
        elements.push(
          <img
            key={index}
            src={`/api/uploaded-images/${id}`}
            alt={`Uploaded Image ${id}`}
            className="pixiv-uploaded-image"
          />,
        );
      } else if (part.startsWith("[pixivimage:")) {
        flushParagraph(); // 新しいブロック要素の前に現在の段落をフラッシュ
        const match = part.match(/\[pixivimage:(\d+)(?:-(\d+))?\]/);
        if (match) {
          const illustId = match[1];
          const pageNum = match[2]; // オプションのページ番号
          const imageUrl = `/api/pixiv-images/${illustId}${pageNum ? `/${pageNum}` : "/0"}`;
          const pixivLink = `https://www.pixiv.net/artworks/${illustId}${pageNum ? `#${pageNum}` : ""}`;

          elements.push(
            <div key={index} className="pixiv-illustration-container">
              <a href={pixivLink} target="_blank" rel="noopener noreferrer">
                <img
                  src={imageUrl}
                  alt={`Pixiv Illustration ID: ${illustId}${
                    pageNum ? `, Page: ${pageNum}` : ""
                  }`}
                  className="pixiv-illustration-image"
                />
              </a>
              <p className="pixiv-illustration-caption">
                Pixiv ID: {illustId}
                {pageNum ? ` (Page: ${pageNum})` : ""}
              </p>
            </div>,
          );
        }
      } else if (part.startsWith("[jump:")) {
        // インライン要素は currentParagraphContent に追加
        const match = part.match(/\[jump:(\d+)\]/);
        const pageNum = match ? match[1] : "1";
        currentParagraphContent.push(
          <Link
            key={index}
            href={`/works/${currentSlug}#page-${pageNum}`}
            className="pixiv-jump-link"
          >
            ページ {pageNum} へ
          </Link>,
        );
      } else if (part.startsWith("[[jumpuri:")) {
        // インライン要素は currentParagraphContent に追加
        const match = part.match(/\[\[jumpuri:(.+?) > (.+?)\]\]/);
        const title = match ? match[1] : "Link";
        const url = match ? match[2] : "#";
        currentParagraphContent.push(
          <a
            key={index}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="pixiv-external-link"
          >
            {title}
          </a>,
        );
      } else if (part.startsWith("[[rb:")) {
        // インライン要素は currentParagraphContent に追加
        const match = part.match(/\[\[rb:(.+?) > (.+?)\]\]/);
        const base = match ? match[1] : "";
        const ruby = match ? match[2] : "";
        currentParagraphContent.push(
          <ruby key={index} className="pixiv-ruby">
            {base}
            <rp>(</rp>
            <rt>{ruby}</rt>
            <rp>)</rp>
          </ruby>,
        );
      } else {
        // 通常のテキストセグメントを処理
        // 二重改行で段落に分割し、各段落内で一重改行を処理
        const textSegments = part.split(/\n\n/);
        textSegments.forEach((segment, segmentIndex) => {
          // 最初のセグメントでない、かつ前のセグメントが空でなければ、新しい段落フラッシュ
          if (segmentIndex > 0) {
            flushParagraph();
          }

          const lines = segment.split(/\n/);
          lines.forEach((line, lineIndex) => {
            currentParagraphContent.push(
              <React.Fragment
                key={`${index}-${segmentIndex}-${lineIndex}-text`}
              >
                {line}
              </React.Fragment>,
            );
            if (lineIndex < lines.length - 1) {
              // 一重改行があった場合、<br> を追加
              currentParagraphContent.push(
                <br key={`${index}-${segmentIndex}-${lineIndex}-br`} />,
              );
            }
          });
        });
      }
    });

    flushParagraph(); // 最後に残った段落の内容をフラッシュ
    return elements;
  };

  return <div className="pixiv-content-renderer">{parseAndRender()}</div>;
};

export default PixivContentRenderer;
