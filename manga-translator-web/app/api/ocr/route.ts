// ─── Manga Translator Web · /api/ocr ────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import Tesseract from 'tesseract.js';

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
    const contentType = request.headers.get('content-type') || '';

    let imageSource: string | Buffer;
    let languages: string[] = ['jpn', 'kor', 'chi_sim'];

    if (contentType.includes('application/json')) {
      const body = await request.json();
      const { imageUrl, langs } = body;

      if (!imageUrl) {
        return NextResponse.json(
          { error: 'Missing required field: imageUrl' },
          { status: 400 },
        );
      }

      imageSource = imageUrl;
      if (langs && Array.isArray(langs)) languages = langs;

    } else if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('image') as File | null;
      const langs = formData.get('langs') as string | null;

      if (!file) {
        return NextResponse.json(
          { error: 'Missing required file: image' },
          { status: 400 },
        );
      }

      const bytes = await file.arrayBuffer();
      imageSource = Buffer.from(bytes);
      if (langs) languages = langs.split(',').map(l => l.trim());

    } else {
      return NextResponse.json(
        { error: 'Unsupported content type. Use application/json or multipart/form-data.' },
        { status: 415 },
      );
    }

    // Run OCR
    const worker = await Tesseract.createWorker(languages);
    const result = await worker.recognize(imageSource);
    await worker.terminate();

    return NextResponse.json({
      text: result.data.text.trim(),
      confidence: result.data.confidence,
      languages,
    });

  } catch (error: any) {
    console.error('[OCR API Error]', error);
    return NextResponse.json(
      { error: error.message || 'OCR processing failed' },
      { status: 500 },
    );
  }
}
