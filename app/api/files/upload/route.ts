import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { v4 as uuidv4 } from 'uuid';
import { UploadedFile } from '@/types';
import { registerFile } from '@/lib/storage/registry';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const type = formData.get('type') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (type === 'input') {
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      if (!isPdf) {
        return NextResponse.json(
          { error: 'Input files must be PDF' },
          { status: 400 }
        );
      }
    }

    // Generate unique file ID
    const fileId = uuidv4();
    const category = type === 'sample' ? 'samples' : 'inputs';

    // For now, use a temporary run ID since we don't have one yet
    // In production, you might want to create a session ID
    const tempRunId = 'temp-' + uuidv4().slice(0, 8);
    const path = `runs/${tempRunId}/${category}/${fileId}_${file.name}`;

    // Upload to Vercel Blob
    const blob = await put(path, file, {
      access: 'public',
      addRandomSuffix: false,
    });

    const uploadedFile: UploadedFile = {
      id: fileId,
      name: file.name,
      size: file.size,
      type: file.type,
      url: blob.url,
      uploadedAt: new Date(),
    };

    // Register file for lookup by ID
    await registerFile(uploadedFile);

    return NextResponse.json(uploadedFile);
  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
