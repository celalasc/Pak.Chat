import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';

// Use Node.js runtime for file handling compatibility
export const runtime = 'nodejs';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ storageId: string }> }
) {
  try {
    const { storageId } = await params;
    
    // Validate storageId format
    if (!storageId || typeof storageId !== 'string' || storageId.length === 0) {
      // Invalid storageId
      return new Response('Invalid storage ID', { status: 400 });
    }
    
    // Getting file for storageId
    
    // Получаем URL файла из Convex Storage
    const fileUrl = await convex.query(api.attachments.getUrlByStorageId, { 
      storageId 
    });
    
            // Got fileUrl
    
    if (!fileUrl) {
              // File not found
      return new Response('File not found', { status: 404 });
    }
    
    // Перенаправляем на Convex Storage URL
    return Response.redirect(fileUrl, 302);
    
  } catch (error) {
    console.error('API Error getting file:', error);
    
    // Provide more specific error handling
    if (error instanceof Error) {
      if (error.message.includes('Invalid document ID')) {
        return new Response('Invalid storage ID format', { status: 400 });
      }
      if (error.message.includes('not found')) {
        return new Response('File not found', { status: 404 });
      }
    }
    
    return new Response('Internal Server Error', { status: 500 });
  }
} 