// LLM-facing schema for document artifacts. The model emits this shape;
// transformToUniverDoc lifts it into the Univer IDocumentData snapshot used
// by the embedded editor. Edits made in the editor are persisted as the raw
// Univer snapshot (see isUniverDocSnapshot below) — on subsequent renders we
// detect that shape and pass it through unchanged.

export type DocumentSection = {
  heading?: string;
  paragraphs?: string[];
  bullets?: string[];
};

export type DocumentData = {
  title: string;
  subtitle?: string;
  sections: DocumentSection[];
};

const PARA_BREAK = '\r';
const SECTION_BREAK = '\n';

type TextRun = { st: number; ed: number; ts?: { fs?: number; bl?: number } };
type Paragraph = {
  startIndex: number;
  paragraphStyle?: { spaceAbove?: { v: number }; spaceBelow?: { v: number } };
  bullet?: { listType: string; listId: string };
};

function appendRun(
  stream: string,
  paragraphs: Paragraph[],
  textRuns: TextRun[],
  text: string,
  opts: { fs?: number; bold?: boolean; bullet?: boolean } = {}
): string {
  const start = stream.length;
  const next = stream + text + PARA_BREAK;
  const end = next.length - 1;
  if (opts.bold || opts.fs) {
    textRuns.push({
      st: start,
      ed: end,
      ts: {
        ...(opts.fs ? { fs: opts.fs } : {}),
        ...(opts.bold ? { bl: 1 } : {}),
      },
    });
  }
  paragraphs.push({
    startIndex: end,
    ...(opts.bullet
      ? { bullet: { listType: 'BULLET_LIST', listId: 'list-default' } }
      : {}),
  });
  return next;
}

export function transformToUniverDoc(dataJson: string): object {
  // Pass-through for already-saved Univer snapshots.
  const parsed = JSON.parse(dataJson);
  if (isUniverDocSnapshot(parsed)) return parsed;

  const data = parsed as DocumentData;
  let stream = '';
  const paragraphs: Paragraph[] = [];
  const textRuns: TextRun[] = [];

  if (data.title) {
    stream = appendRun(stream, paragraphs, textRuns, data.title, { fs: 28, bold: true });
  }
  if (data.subtitle) {
    stream = appendRun(stream, paragraphs, textRuns, data.subtitle, { fs: 12 });
  }

  for (const section of data.sections ?? []) {
    if (section.heading) {
      stream = appendRun(stream, paragraphs, textRuns, section.heading, { fs: 18, bold: true });
    }
    for (const p of section.paragraphs ?? []) {
      stream = appendRun(stream, paragraphs, textRuns, p, { fs: 12 });
    }
    for (const b of section.bullets ?? []) {
      stream = appendRun(stream, paragraphs, textRuns, b, { fs: 12, bullet: true });
    }
  }

  // Final section break is required by Univer's document model.
  stream += SECTION_BREAK;
  const sectionBreaks = [{ startIndex: stream.length - 1 }];

  return {
    id: `doc_${Date.now()}`,
    rev: 1,
    body: {
      dataStream: stream,
      paragraphs,
      sectionBreaks,
      textRuns,
    },
    documentStyle: {
      pageSize: { width: 595, height: 842 },
      marginTop: 72,
      marginBottom: 72,
      marginLeft: 90,
      marginRight: 90,
    },
  };
}

export function isUniverDocSnapshot(v: unknown): boolean {
  return (
    !!v &&
    typeof v === 'object' &&
    'body' in (v as any) &&
    typeof (v as any).body?.dataStream === 'string'
  );
}
