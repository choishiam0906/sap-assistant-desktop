import type { SearchResult } from "./hybridSearch.js";

export class FollowUpGenerator {
  generate(query: string, results: SearchResult[]): string[] {
    if (results.length === 0) {
      return [];
    }

    const keywords = this.extractKeywords(query, results);
    const suggestions: string[] = [];

    if (keywords.length >= 1) {
      suggestions.push(`이 문서의 ${keywords[0]} 부분에 대해 더 알려주세요`);
    }

    if (keywords.length >= 2) {
      suggestions.push(`${keywords[0]}과 ${keywords[1]}의 차이점은 뭔가요?`);
    }

    if (keywords.length >= 3) {
      suggestions.push(`${keywords[0]}, ${keywords[1]}, ${keywords[2]}를 종합적으로 설명해주세요`);
    }

    return suggestions.slice(0, 3);
  }

  private extractKeywords(query: string, results: SearchResult[]): string[] {
    const stopWords = new Set([
      "이", "그", "저", "것", "수", "것이", "등", "및", "또는", "그리고",
      "때문에", "하면서", "따라", "해서", "해야", "할", "있는", "있다",
      "없는", "없다", "어떤", "어느", "어디", "언제", "왜", "뭐", "뭔가",
      "하나", "둘", "셋", "넷", "다섯", "여섯", "일곱", "여덟", "아홉", "열",
    ]);

    const words = query.toLowerCase().split(/[\s\-_.,:!?;'"()[\]{}/<>]+/).filter(Boolean);
    const keywordCounts = new Map<string, number>();

    for (const word of words) {
      if (word.length > 2 && !stopWords.has(word)) {
        keywordCounts.set(word, (keywordCounts.get(word) ?? 0) + 1);
      }
    }

    for (const result of results) {
      const title = result.documentTitle?.toLowerCase() || "";
      const titleWords = title.split(/[\s\-_.,:!?;'"()[\]{}/<>]+/).filter(Boolean);

      for (const word of titleWords) {
        if (word.length > 2 && !stopWords.has(word)) {
          keywordCounts.set(word, (keywordCounts.get(word) ?? 0) + 1);
        }
      }
    }

    return [...keywordCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([word]) => word);
  }
}
