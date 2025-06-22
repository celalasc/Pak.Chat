#!/usr/bin/env python3
"""
Скрипт для сбора файлов проекта в один текстовый файл.
Исключает секретные данные, генерированные файлы и мусор.
Включает только исходный код проекта.
"""

import os
import sys
from pathlib import Path
from typing import Set, List

# Папки, которые нужно полностью игнорировать
IGNORE_DIRS = {
    # Зависимости и пакеты
    'node_modules', 'bower_components', 'jspm_packages',
    'venv', 'env', '.env', 'site-packages', '__pycache__',
    '.gradle', '.mvn', 'target', 'vendor', 'packages',
    
    # Билды и кеши
    '.next', 'dist', 'build', 'out', '.output', '.nuxt',
    '.cache', '.parcel-cache', '.sass-cache', '.webpack',
    '.turbo', '.swc', 'coverage', '.nyc_output',
    
    # IDE и системные
    '.git', '.vscode', '.idea', '.DS_Store', 'Thumbs.db',
    
    # Временные и логи
    'logs', 'tmp', 'temp', '.tmp', '.temp',
    
    # Деплой и серверы
    '.serverless', '.vercel', '.netlify',
    
    # Генерированные
    '_generated', 'generated', '__generated__',
    'typings', '.docusaurus', 'storybook-static',
}

# Файлы, которые нужно обязательно исключить (секретные данные)
FORCE_EXCLUDE_FILES = {
    '.env', '.env.local', '.env.development', '.env.production',
    '.env.staging', '.env.test', '.env.example',
    'pnpm-lock.yaml', 'package-lock.json', 'yarn.lock',
    '.DS_Store', 'Thumbs.db',
}

# Расширения файлов, которые точно не нужны
IGNORE_EXTENSIONS = {
    # Логи и временные
    '.log', '.tmp', '.temp', '.cache', '.lock', '.lockb',
    
    # Карты и минифицированные
    '.map', '.min.js', '.min.css', '.bundle.js', '.bundle.css',
    '.chunk.js', '.chunk.css', '.d.ts.map', '.js.map', '.css.map',
    
    # Медиа файлы
    '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp', '.avif',
    '.bmp', '.tiff', '.mp4', '.webm', '.mov', '.avi', '.mkv',
    '.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a',
    
    # Документы и архивы
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.zip', '.tar', '.gz', '.rar', '.7z', '.bz2', '.xz',
    
    # Шрифты
    '.woff', '.woff2', '.ttf', '.eot', '.otf',
    
    # Бинарные и исполняемые
    '.exe', '.dll', '.so', '.dylib', '.class', '.jar', '.war',
    '.pyc', '.pyo', '.pyd', '.deb', '.rpm', '.dmg', '.msi', '.app',
    
    # Базы данных
    '.db', '.sqlite', '.sqlite3', '.dump',
    
    # Резервные копии
    '.backup', '.bak', '.swp', '.swo', '.old',
}

# Файлы, которые нужно включить (конфигурация проекта)
FORCE_INCLUDE_FILES = {
    'readme.md', 'license', 'changelog.md', 'contributing.md',
    '.gitignore', '.gitattributes', 'dockerfile', 'makefile',
    'docker-compose.yml', 'docker-compose.yaml',
}

# Расширения кода, которые точно нужны
CODE_EXTENSIONS = {
    # Веб-разработка
    '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
    '.html', '.htm', '.css', '.scss', '.sass', '.less',
    
    # Конфигурация
    '.json', '.jsonc', '.json5', '.yaml', '.yml', '.toml',
    '.ini', '.cfg', '.conf', '.config',
    
    # Разметка и документация
    '.md', '.mdx', '.txt', '.rst',
    
    # Скрипты
    '.sh', '.bash', '.zsh', '.fish', '.ps1', '.bat', '.cmd',
    
    # Серверные языки
    '.py', '.pyw', '.rb', '.php', '.go', '.rs', '.java', '.kt',
    '.c', '.cpp', '.h', '.hpp', '.cs', '.swift', '.dart',
    
    # Специализированные
    '.sql', '.graphql', '.gql', '.prisma', '.proto',
    '.dockerfile', '.Dockerfile', '.tf', '.tfvars',
}

def should_ignore_dir(dir_name: str) -> bool:
    """Проверяет, нужно ли игнорировать директорию."""
    # Скрытые папки (кроме .github)
    if dir_name.startswith('.') and dir_name != '.github':
        return True
    
    # Из черного списка
    if dir_name.lower() in IGNORE_DIRS:
        return True
    
    # Паттерны в названии
    ignore_patterns = ['cache', 'temp', 'tmp', 'build', 'dist', 'generated', 'node_modules']
    if any(pattern in dir_name.lower() for pattern in ignore_patterns):
        return True
    
    return False

def should_ignore_file(file_path: Path) -> bool:
    """Проверяет, нужно ли игнорировать файл."""
    file_name = file_path.name
    file_name_lower = file_name.lower()
    file_extension = file_path.suffix.lower()
    
    # Принудительно исключаем секретные файлы
    if file_name in FORCE_EXCLUDE_FILES or file_name_lower in FORCE_EXCLUDE_FILES:
        return True
    
    # Принудительно включаем важные файлы
    if file_name_lower in FORCE_INCLUDE_FILES:
        return False
    
    # Исключаем по расширению
    if file_extension in IGNORE_EXTENSIONS:
        return True
    
    # Большие файлы (больше 500KB для кода)
    try:
        if file_path.stat().st_size > 512 * 1024:
            return True
    except:
        pass
    
    # Временные и служебные файлы
    if any(pattern in file_name_lower for pattern in ['.tmp', '.temp', '.cache', '.lock', '~', '.bak', '.old', 'generated']):
        return True
    
    # Файлы без расширения (кроме важных)
    if not file_extension:
        important_names = {'makefile', 'dockerfile', 'license', 'readme', 'changelog'}
        if file_name_lower not in important_names:
            # Проверяем на shebang
            try:
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    first_line = f.readline().strip()
                    if not first_line.startswith('#!'):
                        return True
            except:
                return True
    
    return False

def read_file_safely(file_path: Path) -> str:
    """Читает файл с обработкой различных кодировок."""
    encodings = ['utf-8', 'utf-8-sig', 'cp1251', 'latin1']
    
    for encoding in encodings:
        try:
            with open(file_path, 'r', encoding=encoding, errors='ignore') as f:
                content = f.read()
                # Ограничиваем очень длинные файлы
                if len(content) > 100000:  # 100KB текста
                    content = content[:100000] + "\n\n... (файл обрезан, слишком длинный)"
                return content
        except:
            continue
    
    return "// Не удалось прочитать файл"

def collect_project_files(root_dir: str = None, output_file: str = "project_code.txt") -> None:
    """Собирает файлы проекта в один текстовый файл."""
    if root_dir is None:
        root_dir = os.getcwd()
    
    root_path = Path(root_dir)
    
    if not root_path.exists():
        print(f"❌ Ошибка: Директория {root_dir} не существует")
        return
    
    collected_files = []
    total_files = 0
    skipped_files = 0
    
    print(f"🔍 Сканирование проекта: {root_path}")
    print(f"📄 Результат будет сохранен в: {output_file}")
    print("=" * 60)
    
    # Сканируем файлы
    for item in root_path.rglob('*'):
        if item.is_file():
            total_files += 1
            relative_path = item.relative_to(root_path)
            
            # Проверяем директории в пути
            should_skip = False
            for parent in relative_path.parents:
                if should_ignore_dir(parent.name):
                    should_skip = True
                    break
            
            if should_skip:
                skipped_files += 1
                continue
            
            # Проверяем сам файл
            if should_ignore_file(item):
                skipped_files += 1
                continue
            
            # Читаем файл
            try:
                content = read_file_safely(item)
                collected_files.append({
                    'path': str(relative_path),
                    'content': content,
                    'size': len(content),
                    'extension': item.suffix.lower()
                })
                print(f"✅ {relative_path}")
            except Exception as e:
                print(f"❌ Ошибка при чтении {relative_path}: {e}")
                skipped_files += 1
    
    # Сортируем файлы: сначала конфиги, потом код по типам
    def get_sort_priority(file_info):
        path = file_info['path'].lower()
        ext = file_info['extension']
        
        # Конфигурационные файлы первыми
        if any(name in path for name in ['package.json', 'tsconfig', 'next.config', 'tailwind.config']):
            return (0, path)
        # README и документация
        if 'readme' in path or ext == '.md':
            return (1, path)
        # Исходный код по типам
        if ext in ['.ts', '.tsx']:
            return (2, path)
        if ext in ['.js', '.jsx']:
            return (3, path)
        if ext in ['.css', '.scss']:
            return (4, path)
        # Остальное
        return (5, path)
    
    collected_files.sort(key=get_sort_priority)
    
    # Записываем результат
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            # Заголовок
            f.write("=" * 80 + "\n")
            f.write("📁 ИСХОДНЫЙ КОД ПРОЕКТА\n")
            f.write("=" * 80 + "\n")
            f.write(f"📂 Проект: {root_path.name}\n")
            f.write(f"📍 Путь: {root_path}\n")
            f.write(f"✅ Включено файлов: {len(collected_files)}\n")
            f.write(f"⏭️  Пропущено файлов: {skipped_files}\n")
            f.write(f"📊 Всего файлов: {total_files}\n")
            f.write("=" * 80 + "\n\n")
            
            # Статистика по типам файлов
            extensions_count = {}
            for file_info in collected_files:
                ext = file_info['extension'] or 'без расширения'
                extensions_count[ext] = extensions_count.get(ext, 0) + 1
            
            f.write("📈 СТАТИСТИКА ПО ТИПАМ ФАЙЛОВ:\n")
            f.write("-" * 40 + "\n")
            for ext, count in sorted(extensions_count.items(), key=lambda x: x[1], reverse=True):
                f.write(f"{ext:20} {count:3} файл(ов)\n")
            f.write("\n" + "=" * 80 + "\n\n")
            
            # Содержимое файлов
            for i, file_info in enumerate(collected_files, 1):
                f.write(f"\n{'='*80}\n")
                f.write(f"📄 ФАЙЛ {i}/{len(collected_files)}: {file_info['path']}\n")
                f.write(f"📏 Размер: {file_info['size']:,} символов\n")
                f.write(f"🏷️  Тип: {file_info['extension'] or 'без расширения'}\n")
                f.write("=" * 80 + "\n")
                f.write(file_info['content'])
                f.write("\n\n")
        
        # Итоговая статистика
        output_size = Path(output_file).stat().st_size
        print("=" * 60)
        print(f"🎉 Готово! Файлы собраны в: {output_file}")
        print(f"✅ Включено файлов: {len(collected_files)}")
        print(f"⏭️  Пропущено файлов: {skipped_files}")
        print(f"📊 Всего файлов: {total_files}")
        
        if output_size > 1024 * 1024:
            print(f"📏 Размер файла: {output_size / (1024 * 1024):.1f} MB")
        else:
            print(f"📏 Размер файла: {output_size / 1024:.1f} KB")
            
        # Топ-5 типов файлов
        extensions_count = {}
        for file_info in collected_files:
            ext = file_info['extension'] or 'без расширения'
            extensions_count[ext] = extensions_count.get(ext, 0) + 1
        
        print("\n📈 Включенные типы файлов:")
        for ext, count in sorted(extensions_count.items(), key=lambda x: x[1], reverse=True)[:5]:
            print(f"   {ext}: {count} файл(ов)")
            
    except Exception as e:
        print(f"❌ Ошибка при записи файла: {e}")

def main():
    """Главная функция с аргументами командной строки."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="🚀 Собирает исходный код проекта в один файл",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
📚 Примеры использования:
  python collect_project_files.py                       # текущая папка
  python collect_project_files.py -d /path/to/project   # указанная папка  
  python collect_project_files.py -o my_code.txt        # свое имя файла
  python collect_project_files.py -d ~/myproject -o code.txt

🔒 Безопасность:
  - Исключает .env файлы и секретные данные
  - Пропускает node_modules и другие зависимости
  - Игнорирует медиа файлы и бинарники
  - Включает только исходный код проекта
        """
    )
    
    parser.add_argument(
        '-d', '--directory',
        type=str,
        default=None,
        help='📂 Путь к проекту (по умолчанию: текущая папка)'
    )
    
    parser.add_argument(
        '-o', '--output',
        type=str,
        default='project_code.txt',
        help='📄 Имя выходного файла (по умолчанию: project_code.txt)'
    )
    
    args = parser.parse_args()
    
    collect_project_files(args.directory, args.output)

if __name__ == "__main__":
    main() 