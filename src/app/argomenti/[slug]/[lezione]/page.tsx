import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import TopicLessonView from "@/components/TopicLessonView";
import { categoriesById, getTopicBySlug, topics } from "@/content/catalog";
import { getTopicLesson, getTopicLessons } from "@/content/topic-docs";

interface TopicLessonPageProps {
  params: Promise<{ slug: string; lezione: string }>;
}

export function generateStaticParams() {
  return topics.flatMap((topic) =>
    getTopicLessons(topic.id).map((lesson) => ({
      slug: topic.slug,
      lezione: lesson.slug,
    })),
  );
}

export async function generateMetadata({
  params,
}: TopicLessonPageProps): Promise<Metadata> {
  const { slug, lezione } = await params;
  const topic = getTopicBySlug(slug);
  const lesson = topic ? getTopicLesson(topic.id, lezione) : undefined;
  if (!topic || !lesson) {
    return { title: "Lezione non trovata | Il Santo Grahal" };
  }
  return {
    title: `${lesson.title} · ${topic.title} | Il Santo Grahal`,
    description: lesson.description,
  };
}

export default async function TopicLessonPage({
  params,
}: TopicLessonPageProps) {
  const { slug, lezione } = await params;
  const topic = getTopicBySlug(slug);
  const lesson = topic ? getTopicLesson(topic.id, lezione) : undefined;
  if (!topic || !lesson) {
    notFound();
  }

  const lessons = getTopicLessons(topic.id);
  const category = categoriesById.get(topic.primaryCategory);

  return (
    <main className="flex min-h-screen flex-col">
      <SiteHeader />
      <TopicLessonView
        topicSlug={topic.slug}
        topicTitle={topic.title}
        categoryTitle={category?.title ?? "Argomento"}
        lesson={lesson}
        lessons={lessons}
      />
      <SiteFooter />
    </main>
  );
}
