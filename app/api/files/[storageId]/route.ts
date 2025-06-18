import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import { NextRequest } from 'next/server';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(
  request: NextRequest,
  { params }: { params: { storageId: string } }
) {
  try {
    const { storageId } = params;
    
    console.log('API: Getting file for storageId:', storageId);
    
    // Получаем URL файла из Convex Storage
    const fileUrl = await convex.query(api.attachments.getUrlByStorageId, { 
      storageId 
    });
    
    console.log('API: Got fileUrl:', fileUrl);
    
    if (!fileUrl) {
      console.log('API: File not found for storageId:', storageId);
      return new Response('File not found', { status: 404 });
    }
    
    // Перенаправляем на Convex Storage URL
    return Response.redirect(fileUrl, 302);
    
  } catch (error) {
    console.error('API Error getting file:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
} 