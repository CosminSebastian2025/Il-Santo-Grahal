// Accesso in sola lettura al catalogo: schede, categorie, collegamenti e statistiche.
import { categories, categoriesById } from "@/content/categories";
import { topics } from "@/content/topics";
import { docLinksByTopic } from "@/content/doc-links";
import type {
  Category,
  CategoryId,
  ContentLink,
  Topic,
  TopicSummary,
} from "@/content/types";
import { getSectionById, getSortedPages } from "@/lib/sections";

export { categories, categoriesById, topics };
export type { Category, CategoryId, ContentLink, Topic, TopicSummary };

const topicsById = new Map(topics.map((topic) => [topic.id, topic]));
const topicsBySlug = new Map(topics.map((topic) => [topic.slug, topic]));

export function getTopicById(id: string): Topic | undefined {
  return topicsById.get(id);
}

export function getTopicBySlug(slug: string): Topic | undefined {
  return topicsBySlug.get(slug);
}

export function getTopicsByCategory(categoryId: CategoryId): Topic[] {
  return topics.filter(
    (topic) =>
      topic.primaryCategory === categoryId ||
      topic.secondaryCategories.includes(categoryId),
  );
}

export function getRelatedTopics(topic: Topic): Topic[] {
  return topic.relatedTopics
    .map((id) => topicsById.get(id))
    .filter((related): related is Topic => related !== undefined);
}

export interface ResolvedDocLink extends ContentLink {
  href: string;
  sectionTitle: string;
  pageTitle: string;
}

// Trasforma i riferimenti ai percorsi in link statici verificati sul manifest.
export function getDocumentLinks(topicId: string): ResolvedDocLink[] {
  const links = docLinksByTopic[topicId] ?? [];

  return links.flatMap((link) => {
    const section = getSectionById(link.sectionId);
    if (!section) {
      return [];
    }
    const page = link.pageId
      ? section.pages.find((candidate) => candidate.id === link.pageId)
      : getSortedPages(section)[0];
    if (!page) {
      return [];
    }
    return [
      {
        ...link,
        href: `/documenti/${section.id}/${page.id}/`,
        sectionTitle: section.title,
        pageTitle: page.title,
      },
    ];
  });
}

export interface CategoryStats {
  category: Category;
  total: number;
  presente: number;
  parziale: number;
  assente: number;
}

export function getCategoryStats(): CategoryStats[] {
  return categories.map((category) => {
    const items = topics.filter(
      (topic) => topic.primaryCategory === category.id,
    );
    return {
      category,
      total: items.length,
      presente: items.filter((topic) => topic.coverageStatus === "presente").length,
      parziale: items.filter((topic) => topic.coverageStatus === "parziale").length,
      assente: items.filter((topic) => topic.coverageStatus === "assente").length,
    };
  });
}

export function getCoverageTotals() {
  return {
    total: topics.length,
    presente: topics.filter((topic) => topic.coverageStatus === "presente").length,
    parziale: topics.filter((topic) => topic.coverageStatus === "parziale").length,
    assente: topics.filter((topic) => topic.coverageStatus === "assente").length,
  };
}

export function getTopicsByCoverage(status: Topic["coverageStatus"]): Topic[] {
  return topics.filter((topic) => topic.coverageStatus === status);
}
