import { NextRequest, NextResponse } from 'next/server';
import { fetchQuery } from 'convex/nextjs';
import { api } from '@/convex/_generated/api';

export const maxDuration = 300; // 5 минут для генерации изображений
// Use Node.js runtime for stable development and production
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { prompt, model, apiKeys, userId, size, quality, count, format, compression, useDirectApi } = await req.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    const apiKey = apiKeys?.openai;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key is required' },
        { status: 400 }
      );
    }

    // Получаем настройки генерации изображений пользователя
    let userSettings = null;
    if (userId) {
      try {
        userSettings = await fetchQuery(api.userSettings.getByFirebaseUid, { 
          firebaseUid: userId 
        });
      } catch (error) {
        console.warn('Failed to fetch user settings:', error);
      }
    }

    // Используем настройки пользователя или переданные параметры
    const imageSize = size || userSettings?.imageGenerationSize || '1024x1024';
    const imageQuality = quality || userSettings?.imageGenerationQuality || 'medium';
    const imageCount = count || userSettings?.imageGenerationCount || 1;
    const imageFormat = format || userSettings?.imageGenerationFormat || 'jpeg';
    const imageCompression = compression || userSettings?.imageGenerationCompression || 80;
    let imageModel = userSettings?.imageGenerationModel || 'gpt-image-1';
    // Начиная с этой версии поддерживается только gpt-image-1
    if (imageModel !== 'gpt-image-1') {
      imageModel = 'gpt-image-1';
    }

    // Генерация GPT Image 1 через Images API
    let imageData = [] as any[];

    // GPT Image 1 generation via Responses API
    const imageGenerationTool: any = {
      type: "image_generation",
      size: imageSize === 'auto' ? undefined : imageSize,
      quality: imageQuality === 'auto' ? undefined : 
               imageQuality === 'standard' ? 'medium' : 
               ['low', 'medium', 'high'].includes(imageQuality) ? imageQuality : 'medium',
      output_format: imageFormat,
    };

    // Add compression for JPEG/WebP
    if ((imageFormat === 'jpeg' || imageFormat === 'webp') && imageCompression !== 80) {
      imageGenerationTool.output_compression = imageCompression;
    }

    const responseParams = {
      model: 'gpt-4.1-mini', // Используем gpt-4.1-mini с image generation tool
      input: prompt,
      tools: [imageGenerationTool],
    };

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(responseParams),
    });

    let data;
    if (!response.ok) {
      let errorDetails = 'Unknown error';
      try {
        const errorText = await response.text();
        errorDetails = errorText;
      } catch (readError) {
        console.error('Failed to read error response:', readError);
        errorDetails = `HTTP ${response.status} ${response.statusText}`;
      }
      throw new Error(`OpenAI Responses API error: ${errorDetails}`);
    }

    try {
      data = await response.json();
    } catch (parseError) {
      console.error('Failed to parse response JSON:', parseError);
      throw new Error('Invalid response format from OpenAI API');
    }
    
    // Извлекаем изображения из ответа
    const imageOutputs = data.output?.filter((output: any) => output.type === 'image_generation_call') || [];
    
    imageData = imageOutputs.map((img: any, index: number) => ({
      id: `gpt-image-${Date.now()}-${index}`,
      result: img.result, // base64 data
      revisedPrompt: prompt, // Responses API не возвращает revised prompt
    }));
    
    if (imageData.length === 0) {
      return NextResponse.json(
        { error: 'No images were generated' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      images: imageData,
      settings: {
        model: imageModel,
        size: imageSize,
        quality: imageQuality,
        count: imageData.length,
        format: imageFormat,
        compression: imageCompression,
      }
    });

  } catch (error) {
    console.error('Image generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate image' },
      { status: 500 }
    );
  }
} 