import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // The file ID is actually part of a URL stored in the frontend
    // This route could be used to redirect or proxy file downloads
    // For now, since we're using Vercel Blob with public access,
    // files can be downloaded directly from their URLs

    return NextResponse.json(
      { error: 'Direct download not implemented. Use the file URL from the iteration record.' },
      { status: 501 }
    );
  } catch (error) {
    console.error('File download error:', error);
    return NextResponse.json(
      { error: 'Failed to download file' },
      { status: 500 }
    );
  }
}
