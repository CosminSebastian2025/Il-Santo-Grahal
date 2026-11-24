"use client";

// Rendering Markdown condiviso da documenti dei corsi e lezioni del catalogo.
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import "highlight.js/styles/github.css";

interface MarkdownArticleProps {
  content: string;
}

export default function MarkdownArticle({ content }: MarkdownArticleProps) {
  return (
    <article className="prose prose-lg max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeHighlight]}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}
