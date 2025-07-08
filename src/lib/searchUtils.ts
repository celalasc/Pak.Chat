/**
 * Универсальная утилита для поиска с поддержкой всех языков
 */

/**
 * Нормализует текст для поиска с поддержкой Unicode
 */
export function normalizeSearchText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD') // Разделяет символы с диакритическими знаками
    .replace(/[\u0300-\u036f]/g, '') // Удаляет диакритические знаки
    .trim();
}

/**
 * Проверяет содержит ли текст поисковый запрос
 */
export function containsSearchQuery(text: string, query: string): boolean {
  if (!query.trim()) return true;
  
  const normalizedText = normalizeSearchText(text);
  const normalizedQuery = normalizeSearchText(query);
  
  return normalizedText.includes(normalizedQuery);
}

/**
 * Фильтрует массив объектов по заголовку с поддержкой любых языков
 */
export function filterByTitle<T extends { title: string }>(
  items: T[], 
  searchQuery: string
): T[] {
  if (!searchQuery.trim()) return items;
  
  return items.filter(item => containsSearchQuery(item.title, searchQuery));
}

/**
 * Подсвечивает найденный текст в строке
 */
export function highlightSearchText(text: string, query: string): string {
  if (!query.trim()) return text;
  
  // Простая подсветка без учета регистра
  const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

/**
 * Экранирует специальные символы в regex
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
} 