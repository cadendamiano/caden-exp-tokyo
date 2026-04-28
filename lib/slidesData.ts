// LLM-facing schema for slide-deck artifacts. The model emits this shape;
// transformToUniverSlide lifts it into the Univer ISlideData snapshot used by
// the embedded presentation editor. Once a deck has been edited, we persist
// the raw Univer snapshot back into the artifact's dataJson and round-trip it
// directly on subsequent renders (see isUniverSlideSnapshot).

export type SlideLayout = 'title' | 'bullets' | 'two-col' | 'image';

export type Slide = {
  title?: string;
  bullets?: string[];
  notes?: string;
  layout?: SlideLayout;
  body?: string;
  rightColumn?: string[];
};

export type SlidesData = {
  title?: string;
  slides: Slide[];
};

const PAGE_W = 720;
const PAGE_H = 405;
const PAD_X = 40;

// Univer IPageElement element types — text shapes are represented as RichText.
const ELEMENT_TYPE_TEXT = 5;

type PageElement = {
  id: string;
  zIndex: number;
  left: number;
  top: number;
  width: number;
  height: number;
  title: string;
  description: string;
  elementType: number;
  richText: { text: string; fs: number; bl?: number };
};

function textElement(
  id: string,
  zIndex: number,
  bounds: { left: number; top: number; width: number; height: number },
  text: string,
  opts: { fs?: number; bold?: boolean; title?: string } = {}
): PageElement {
  return {
    id,
    zIndex,
    ...bounds,
    title: opts.title ?? id,
    description: '',
    elementType: ELEMENT_TYPE_TEXT,
    richText: {
      text,
      fs: opts.fs ?? 14,
      ...(opts.bold ? { bl: 1 } : {}),
    },
  };
}

function buildPage(slide: Slide, idx: number) {
  const pageId = `page_${idx}`;
  const elements: Record<string, PageElement> = {};
  let z = 1;

  // Title spans the top of every layout that has one.
  if (slide.title) {
    elements[`${pageId}_title`] = textElement(
      `${pageId}_title`,
      z++,
      { left: PAD_X, top: 30, width: PAGE_W - PAD_X * 2, height: 50 },
      slide.title,
      { fs: 28, bold: true, title: 'Title' }
    );
  }

  const layout = slide.layout ?? (slide.bullets?.length ? 'bullets' : 'title');

  if (layout === 'bullets' && slide.bullets?.length) {
    const text = slide.bullets.map(b => `• ${b}`).join('\n');
    elements[`${pageId}_bullets`] = textElement(
      `${pageId}_bullets`,
      z++,
      { left: PAD_X, top: 100, width: PAGE_W - PAD_X * 2, height: PAGE_H - 140 },
      text,
      { fs: 16, title: 'Bullets' }
    );
  } else if (layout === 'two-col') {
    const halfW = (PAGE_W - PAD_X * 3) / 2;
    if (slide.bullets?.length) {
      elements[`${pageId}_left`] = textElement(
        `${pageId}_left`,
        z++,
        { left: PAD_X, top: 100, width: halfW, height: PAGE_H - 140 },
        slide.bullets.map(b => `• ${b}`).join('\n'),
        { fs: 14, title: 'Left column' }
      );
    }
    if (slide.rightColumn?.length) {
      elements[`${pageId}_right`] = textElement(
        `${pageId}_right`,
        z++,
        { left: PAD_X * 2 + halfW, top: 100, width: halfW, height: PAGE_H - 140 },
        slide.rightColumn.map(b => `• ${b}`).join('\n'),
        { fs: 14, title: 'Right column' }
      );
    }
  } else if (layout === 'title') {
    if (slide.body) {
      elements[`${pageId}_body`] = textElement(
        `${pageId}_body`,
        z++,
        { left: PAD_X, top: PAGE_H / 2, width: PAGE_W - PAD_X * 2, height: 80 },
        slide.body,
        { fs: 18, title: 'Body' }
      );
    }
  } else if (layout === 'image') {
    elements[`${pageId}_caption`] = textElement(
      `${pageId}_caption`,
      z++,
      { left: PAD_X, top: PAGE_H - 60, width: PAGE_W - PAD_X * 2, height: 30 },
      slide.body ?? '',
      { fs: 12, title: 'Caption' }
    );
  }

  return {
    id: pageId,
    pageType: 0,
    zIndex: idx + 1,
    title: slide.title ?? `Slide ${idx + 1}`,
    pageElements: elements,
    pageSize: { width: PAGE_W, height: PAGE_H },
    pageBackgroundFill: { rgb: '#FFFFFF' },
  };
}

export function transformToUniverSlide(dataJson: string): object {
  const parsed = JSON.parse(dataJson);
  if (isUniverSlideSnapshot(parsed)) return parsed;

  const data = parsed as SlidesData;
  const pages: Record<string, object> = {};
  const pageOrder: string[] = [];

  data.slides.forEach((slide, idx) => {
    const page = buildPage(slide, idx);
    pages[page.id] = page;
    pageOrder.push(page.id);
  });

  return {
    id: `slide_${Date.now()}`,
    title: data.title ?? 'Deck',
    pageSize: { width: PAGE_W, height: PAGE_H },
    body: { pages, pageOrder },
    rev: 1,
  };
}

export function isUniverSlideSnapshot(v: unknown): boolean {
  return (
    !!v &&
    typeof v === 'object' &&
    'body' in (v as any) &&
    !!(v as any).body?.pages &&
    Array.isArray((v as any).body?.pageOrder)
  );
}
