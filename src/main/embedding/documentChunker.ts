export interface ChunkOptions {
  maxTokens: number;
  overlap: number;
  preserveCodeBlocks: boolean;
}

export interface Chunk {
  text: string;
  index: number;
  tokenCount: number;
}

const DEFAULT_OPTIONS: ChunkOptions = {
  maxTokens: 512,
  overlap: 50,
  preserveCodeBlocks: true,
};

// 토큰 수 추정 — tiktoken 의존 없이 경량 근사치 (영문 ~4자/토큰, 한글 ~2자/토큰)
function estimateTokens(text: string): number {
  // 한글 비율 기반 가중치 적용
  const koreanChars = (text.match(/[\uAC00-\uD7AF]/g) || []).length;
  const totalChars = text.length;
  const koreanRatio = totalChars > 0 ? koreanChars / totalChars : 0;
  const charsPerToken = 4 - koreanRatio * 2; // 영문 4, 한글 2
  return Math.ceil(totalChars / charsPerToken);
}

/**
 * 문서 텍스트를 임베딩에 적합한 청크로 분할한다.
 * - 문단 경계 우선 분할
 * - 코드 블록 보존
 * - 토큰 수 기반 크기 제어
 */
export class DocumentChunker {
  chunk(text: string, options?: Partial<ChunkOptions>): Chunk[] {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    if (!text.trim()) return [];

    const segments = opts.preserveCodeBlocks
      ? this.splitPreservingCodeBlocks(text)
      : this.splitByParagraph(text);

    return this.mergeSegmentsIntoChunks(segments, opts);
  }

  countTokens(text: string): number {
    return estimateTokens(text);
  }

  /** 코드 블록(```)을 하나의 세그먼트로 보존하면서 분할 */
  private splitPreservingCodeBlocks(text: string): string[] {
    const segments: string[] = [];
    const codeBlockRegex = /```[\s\S]*?```/g;
    let lastIndex = 0;

    for (const match of text.matchAll(codeBlockRegex)) {
      const before = text.slice(lastIndex, match.index);
      if (before.trim()) {
        segments.push(...this.splitByParagraph(before));
      }
      segments.push(match[0]);
      lastIndex = match.index! + match[0].length;
    }

    const remaining = text.slice(lastIndex);
    if (remaining.trim()) {
      segments.push(...this.splitByParagraph(remaining));
    }

    return segments;
  }

  /** 빈 줄(\\n\\n) 기준 문단 분할 */
  private splitByParagraph(text: string): string[] {
    return text
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean);
  }

  /** 세그먼트를 maxTokens 이내 청크로 병합, overlap 적용 */
  private mergeSegmentsIntoChunks(segments: string[], opts: ChunkOptions): Chunk[] {
    const chunks: Chunk[] = [];
    let currentText = "";
    let currentTokens = 0;

    for (const segment of segments) {
      const segTokens = estimateTokens(segment);

      // 단일 세그먼트가 maxTokens 초과 시 문장 단위로 재분할
      if (segTokens > opts.maxTokens) {
        if (currentText) {
          chunks.push({ text: currentText, index: chunks.length, tokenCount: currentTokens });
          currentText = "";
          currentTokens = 0;
        }
        const subChunks = this.splitLargeSegment(segment, opts.maxTokens);
        for (const sub of subChunks) {
          chunks.push({ text: sub, index: chunks.length, tokenCount: estimateTokens(sub) });
        }
        continue;
      }

      if (currentTokens + segTokens > opts.maxTokens && currentText) {
        chunks.push({ text: currentText, index: chunks.length, tokenCount: currentTokens });
        // overlap: 이전 청크의 마지막 부분을 다음 청크에 포함
        if (opts.overlap > 0) {
          const overlapText = this.extractOverlap(currentText, opts.overlap);
          currentText = overlapText + "\n\n" + segment;
          currentTokens = estimateTokens(currentText);
        } else {
          currentText = segment;
          currentTokens = segTokens;
        }
      } else {
        currentText = currentText ? currentText + "\n\n" + segment : segment;
        currentTokens = estimateTokens(currentText);
      }
    }

    if (currentText.trim()) {
      chunks.push({ text: currentText, index: chunks.length, tokenCount: currentTokens });
    }

    return chunks;
  }

  /** 큰 세그먼트를 문장 경계에서 분할 */
  private splitLargeSegment(text: string, maxTokens: number): string[] {
    const sentences = text.split(/(?<=[.!?。])\s+/);
    const chunks: string[] = [];
    let current = "";

    for (const sentence of sentences) {
      const combined = current ? current + " " + sentence : sentence;
      if (estimateTokens(combined) > maxTokens && current) {
        chunks.push(current);
        current = sentence;
      } else {
        current = combined;
      }
    }
    if (current.trim()) {
      chunks.push(current);
    }
    return chunks;
  }

  /** 텍스트 끝에서 overlap 토큰 분량의 텍스트 추출 */
  private extractOverlap(text: string, overlapTokens: number): string {
    const words = text.split(/\s+/);
    const result: string[] = [];
    let tokens = 0;

    for (let i = words.length - 1; i >= 0 && tokens < overlapTokens; i--) {
      result.unshift(words[i]);
      tokens = estimateTokens(result.join(" "));
    }

    return result.join(" ");
  }
}
