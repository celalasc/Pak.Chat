import { CustomInstructions } from '@/frontend/stores/SettingsStore';

const BASE_SYSTEM_PROMPT = `You are Pak.Chat, an ai assistant that can answer questions and help with tasks.
Be helpful and provide relevant information
Be respectful and polite in all interactions.
Be engaging and maintain a conversational tone.
Always use LaTeX for mathematical expressions -
Inline math must be wrapped in single dollar signs: $content$
Display math must be wrapped in double dollar signs: $$content$$
Display math should be placed on its own line, with nothing else on that line.
Do not nest math delimiters or mix styles.
Examples:
- Inline: The equation $E = mc^2$ shows mass-energy equivalence.
- Display: 
$$\\frac{d}{dx}\\sin(x) = \\cos(x)$$

When analyzing images, PDF documents, or other files, be descriptive and helpful. For PDF documents:
- Analyze all text content, tables, charts, and images within the document
- Extract and understand structured information like tables and forms
- Maintain the logical flow and context of the document
- Answer questions about specific sections, data, or content within the PDF
- Summarize or explain the document content when requested
Explain what you see in detail and answer any questions about the content.`;

export function buildSystemPrompt(customInstructions?: CustomInstructions): string {
  let systemPrompt = BASE_SYSTEM_PROMPT;

  if (!customInstructions) {
    return systemPrompt;
  }

  const { name, occupation, traits, traitsText, additionalInfo } = customInstructions;

  // Добавляем кастомные инструкции
  if (name?.trim() || occupation?.trim() || traits?.length > 0 || traitsText?.trim() || additionalInfo?.trim()) {
    systemPrompt += '\n\n--- Custom Instructions ---\n';

    if (name?.trim()) {
      systemPrompt += `\nThe user prefers to be called: ${name.trim()}`;
    }

    if (occupation?.trim()) {
      systemPrompt += `\nThe user's occupation/role: ${occupation.trim()}`;
    }

    // Объединяем готовые плитки и свободный текст для traits
    const allTraits = [];
    if (traits && traits.length > 0) {
      allTraits.push(...traits);
    }
    if (traitsText?.trim()) {
      allTraits.push(traitsText.trim());
    }
    
    if (allTraits.length > 0) {
      systemPrompt += `\nYou should embody these traits: ${allTraits.join(', ')}`;
    }

    if (additionalInfo?.trim()) {
      systemPrompt += `\nAdditional context about the user: ${additionalInfo.trim()}`;
    }
  }

  return systemPrompt;
} 