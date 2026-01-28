import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      manus: !!process.env.MANUS_API_KEY,
      anthropic: !!process.env.ANTHROPIC_API_KEY,
      blob: !!process.env.BLOB_READ_WRITE_TOKEN,
    },
  });
}
