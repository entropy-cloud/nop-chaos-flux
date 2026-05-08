# ppt-generator-skill

AI agent skill for generating polished HTML presentations using a multi-agent "5 variants + merge" workflow.

## What It Does

Given a **`.ppt.md` outline file** (Markdown with structured slide content), this skill:

1. **Phase 1** — Dispatches 5 parallel AI sub-agents, each producing a complete HTML presentation from the same outline but with a distinct visual approach
2. **Phase 2** — Dispatches 1 merge agent that compares all 5 versions slide-by-slide, selects the best page for each slide number, and assembles the final HTML

The result is a self-contained `.ppt.html` file with keyboard navigation, fullscreen, PDF export, print layout, responsive design, and touch swipe support.

## File Naming

| File              | Description                                          |
| ----------------- | ---------------------------------------------------- |
| `<name>.ppt.md`   | Outline input (Markdown with slide-by-slide content) |
| `<name>.ppt.html` | Generated output (self-contained HTML presentation)  |

Example: `ddd-next-theory.ppt.md` → `ddd-next-theory.ppt.html`

## Features

- **Self-contained HTML** — Single file, no build step, open in browser
- **Keyboard navigation** — Arrow keys, spacebar, Home/End, F for fullscreen
- **Touch support** — Swipe left/right on mobile
- **PDF export** — Built-in html2pdf.js integration
- **Print layout** — CSS `@media print` with page-break-per-slide
- **Animations** — Staggered entrance animations for cards, bullets, stats
- **Rich components** — Cards, timelines, flow diagrams, stat grids, comparison tables, SVG diagrams, golden quotes
- **Multi-agent quality** — 5 independent design attempts merged by a review agent

## Installation

### OpenCode

Copy this directory into your project's `.opencode/skills/`:

```bash
cp -r nop-ppt-generator/ your-project/.opencode/skills/
```

### Claude Code / Other Agents

Copy `SKILL.md` and `ppt-template.html` into your agent's skill directory. Adjust the skill loading mechanism per your agent's documentation.

## Asset Setup

The skill bundles all required runtime assets in its `assets/` directory. The generated HTML references them via relative paths (`assets/css/all.min.css`, etc.), so they must exist alongside the output file.

### Quick Setup

**Option A: Copy from skill directory (recommended)**

The skill already contains all assets. Copy them to your output directory:

```bash
# Unix
cp -rn nop-ppt-generator/assets/ your-output-dir/assets/

# Windows PowerShell (skip existing)
Copy-Item -Path "nop-ppt-generator\assets\*" -Destination "your-output-dir\assets\" -Recurse
```

If `assets/` already exists at the target, the copy is skipped — this allows sharing one `assets/` directory across multiple presentations in the same folder.

**Option B: Download from CDN (if not using the bundled assets)**

```bash
mkdir -p assets/css assets/webfonts assets/js
curl -L https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css -o assets/css/all.min.css
curl -L https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/webfonts/fa-solid-900.woff2 -o assets/webfonts/fa-solid-900.woff2
curl -L https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/webfonts/fa-solid-900.ttf -o assets/webfonts/fa-solid-900.ttf
curl -L https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/webfonts/fa-brands-400.woff2 -o assets/webfonts/fa-brands-400.woff2
curl -L https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/webfonts/fa-brands-400.ttf -o assets/webfonts/fa-brands-400.ttf
curl -L https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/webfonts/fa-regular-400.ttf -o assets/webfonts/fa-regular-400.ttf
curl -L https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.2/html2pdf.bundle.min.js -o assets/js/html2pdf.bundle.min.js
```

### Required file structure

```
your-output-dir/
  your-presentation.ppt.html
  assets/
    css/
      all.min.css
    webfonts/
      fa-solid-900.woff2
      fa-solid-900.ttf
      fa-brands-400.woff2
      fa-brands-400.ttf
      fa-regular-400.ttf
    js/
      html2pdf.bundle.min.js
      mermaid.min.js          (optional)
      lightbox.js              (optional)
```

## Usage

### Preparing an Outline

Create a `.ppt.md` file with your slide content. The outline is a Markdown file — each slide section starts with a `**Slide N:**` heading, followed by headings, lists, tables, and text. The skill's sub-agents will read this and transform it into a polished presentation.

Example outline (`my-talk.ppt.md`):

**Slide 1: Title**

- Title: Presentation Title
- Subtitle: Subtitle text
- Author: Author | Date

**Slide 2: Agenda**

1. First topic
2. Second topic
3. Third topic

**Slide 3: Data Slide**
| Metric | Value |
|--------|-------|
| Files | 1,207 |
| Lines | 176K |

### Running the Skill

In your AI agent session:

```
Generate a PPT from my-talk.ppt.md
```

The agent will:

1. Read the outline
2. Launch 5 parallel generation agents
3. Launch 1 merge agent
4. Write the final HTML alongside the outline file

### Template Placeholders

The template `ppt-template.html` contains these placeholders that get replaced:

| Placeholder        | Replaced With                            |
| ------------------ | ---------------------------------------- |
| `{{lang}}`         | HTML lang attribute (e.g. `zh-CN`, `en`) |
| `{{title}}`        | Page `<title>`                           |
| `{{pdf-filename}}` | PDF export filename                      |

## Available Slide Components

The template CSS provides these building blocks:

### Layout

- `.two-column` + `.column` / `.column-narrow` / `.column-wide`
- `.card-grid` + `.card-grid-2` / `.card-grid-3`
- `.flow-layout` + `.flow-step` + `.flow-arrow`
- `.stat-grid` + `.stat-card`

### Content Blocks

- `.icon-list` > `.icon-bullet` — Icon + text list items
- `.highlight-box` — Blue accent box
- `.golden-quote` — Gold centered quote
- `.key-quote` — Blue/green centered statement
- `.quote` — Yellow warning quote
- `.comparison-table` — Styled table
- `.timeline` + `.timeline-items` — Horizontal timeline
- `.cycle-diagram` — Cycle diagram

### Tags

- `.tag` / `.tag-warn` / `.tag-danger` / `.tag-success`

### Slide Types

- `.slide.title-slide` — Centered title/ending slide
- `.slide` — Standard content slide
- `.slide.slide-compact-print` — Dense content with print adjustments

## The 5 Variant Approaches

| Variant | Strategy                                                                |
| ------- | ----------------------------------------------------------------------- |
| V1      | **Conservative** — Faithful to outline structure, minimal embellishment |
| V2      | **Card-heavy** — Maximizes card grids and stat cards                    |
| V3      | **Icon-rich** — Font Awesome icons for most items, icon-bullet lists    |
| V4      | **Diagram-centric** — Inline SVG, flow layouts, timelines               |
| V5      | **Mixed-creative** — Best judgment, varied layouts per slide            |

The merge agent selects the best page from across all variants, enforcing visual diversity in the final deck.

## File Structure

```
nop-ppt-generator/
  README.md              ← This file
  SKILL.md               ← Agent skill definition
  ppt-template.html      ← CSS + JS template shell (no timer)
  assets/                ← Bundled runtime assets (copy to output dir)
    css/all.min.css
    js/html2pdf.bundle.min.js
    js/mermaid.min.js
    js/lightbox.js
    webfonts/...
  example/
    sample-outline.ppt.md  ← Example outline input
```

## Requirements

- AI agent with Task/sub-agent support (OpenCode, Claude Code, etc.)
- Font Awesome 6 assets in `assets/` directory
- html2pdf.js for PDF export feature
- Browser to view the generated HTML

## License

MIT
