// ─── Manga Translator Web · /api/translate ──────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { translateWithOpenAI, translateBatchWithOpenAI } from '@/lib/openai';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, texts, targetLang = 'en', batch = false, model } = body;

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY is not configured on the server.' },
        { status: 500 },
      );
    }

    // Batch mode
    if (batch && Array.isArray(texts)) {
      const nonEmpty = texts.filter((t: string) => t?.trim());
      if (nonEmpty.length === 0) {
        return NextResponse.json({ translations: texts.map(() => '') });
      }

      const translations = await translateBatchWithOpenAI(nonEmpty, targetLang, model);
      return NextResponse.json({ translations });
    }

    // Single text
    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json(
        { error: 'Missing required field: text' },
        { status: 400 },
      );
    }

    const translation = await translateWithOpenAI(text.trim(), targetLang, model);
    return NextResponse.json({ translation });

  } catch (error: any) {
    console.error('[Translate API Error]', error);
    return NextResponse.json(
      { error: error.message || 'Translation failed' },
      { status: 500 },
    );
  }
}
