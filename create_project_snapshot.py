import os

def create_project_snapshot(output_filename="project_snapshot.txt", prd_content=""):
    exclude_dirs = [".git", ".next", "node_modules", ".cursor", "public", "dist", "build"]
    exclude_files = [
        ".gitignore", "package-lock.json", "yarn.lock", "pnpm-lock.yaml",
        "components.json", "eslint.config.mjs", "next.config.ts",
        "open-next.config.ts", "postcss.config.mjs", "tsconfig.json", "wrangler.jsonc",
        "LICENSE", "next-env.d.ts"
    ]
    exclude_extensions = [".ico", ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".svg", ".webp", ".pdf", ".zip", ".tar", ".gz", ".mp3", ".mp4", ".avi", ".mov", ".woff", ".woff2", ".ttf", ".otf", ".avif"]

    with open(output_filename, "w", encoding="utf-8") as outfile:
        if prd_content:
            outfile.write("--- PROJECT REQUIREMENTS DOCUMENT ---\n")
            outfile.write(prd_content)
            outfile.write("\n--- END PROJECT REQUIREMENTS DOCUMENT ---\n\n")

        for root, dirs, files in os.walk("."):
            dirs[:] = [d for d in dirs if d not in exclude_dirs and not d.startswith('.')]
            for file in files:
                if file not in exclude_files and not file.startswith('.') and not any(file.endswith(ext) for ext in exclude_extensions):
                    filepath = os.path.join(root, file)
                    try:
                        with open(filepath, "r", encoding="utf-8") as infile:
                            outfile.write(f"--- FILE: {filepath} ---\n")
                            outfile.write(infile.read())
                            outfile.write("\n\n")
                    except Exception as e:
                        print(f"Could not read {filepath}: {e}")

if __name__ == "__main__":
    prd_text = """
## PRD: Pak.Chat — High-Performance LLM Application

## Project Goal

To create a high-performance application for working with LLMs, with the ability to log in via a Google account.

## Main Components

### Input Field

*   Send button — sends the message
*   Stop button — stops response generation
*   Model selection button — opens a modal window with LLM model options
*   Adaptive positioning:
    *   If there are no messages, the input field is centered on the screen
    *   In the centered state, the model selection modal window opens from the bottom (not the top)
*   Quoting:
    *   When quoting AI text, the input field expands
    *   The quoted text is displayed with a special background.
    *   A cross icon in the top right corner to cancel quoting. Below the cross, a tooltip "Press Esc"
    *   Quotes longer than 2 lines become scrollable
*   When the user scrolls up, an arrow should appear to the right above the input field. Clicking it scrolls down.
*   Before the button that opens the model selection window, there should be a "+" icon. Clicking it should open a small window containing buttons: [File icon] Add file, [Arrow icon] Recent, [Brush icon] Draw.

### Chat Navigation

Left navigation menu in the form of bars:

*   Each bar represents a user message
*   The length of the bar corresponds to the length of the message
*   On hover, the bar is replaced by a tile containing a short part of the user message.
*   Clicking the tile scrolls to the corresponding message in the chat.

### Chat History / New Chat

Chat history modal window (button in the top right corner):

*   Chat search field
*   Implement search by chat title and content.
*   Chat tiles with titles
*   Interactive elements:
    *   On hover: delete and pin buttons appear.
    *   Double-click on the title: rename chat
    *   On hovering over a chat, a preview appears on the right.
*   New chat button next to the history button
*   The new chat creation button comes first, followed by the button to open chat history.

### Settings

Settings modal window with tabs:

"Settings" Tab:

*   General font selection: "Proxima Vara" or "System font"
*   Code font selection: "Berkeley Mono (default)" or "System monospace font"
*   Theme selection: light or dark

"Profile" Tab:

*   User avatar, name, and email address
*   Option to blur/hide all user data, applied automatically, can be disabled.
*   Logout button.

"API Keys" Tab:

*   Input fields for provider API keys:
    *   Google API Key
    *   OpenRouter
    *   OpenAI
    *   Groq
*   Quick links for creating API keys with the respective providers
*   List of supported models for each provider
*   In the mobile version, when scrolling down, this button should smoothly "slide" to the right.

### Messages and Interaction

User Messages (on hover):

*   Copy button — copies the message text
*   Edit button — allows editing with rollback after saving
*   Regeneration system: shows the number of regenerations below the message with navigation "← 1/2 →"

AI Messages (on hover):

*   "Start New Branch" button — creates a copy of the chat starting from the message where the button was clicked, including all previous messages. In the chat history window, the icon next to such a "clone" should be the same as on the button.
*   Regenerate button — rolls back to the selected point and regenerates
*   Quoting: when text is selected, a quoting button with quotation marks appears.
    """
    create_project_snapshot(prd_content=prd_text) 