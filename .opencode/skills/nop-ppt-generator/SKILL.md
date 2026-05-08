---
name: nop-ppt-generator
description: Use when generating HTML-based presentation slides from a .ppt.md outline file. Triggers on "generate ppt", "生成ppt", "make slides", "presentation from outline".
---

# PPT Generator

Generate a polished HTML presentation from a `.ppt.md` outline using a multi-agent "generate 5 variants, then merge best pages" workflow.

## File Naming Convention

- **Outline input**: `<name>.ppt.md` — Markdown file with slide-by-slide content
- **Generated output**: `<name>.ppt.html` — Self-contained HTML presentation

Example: `ddd-next-theory.ppt.md` → `ddd-next-theory.ppt.html`

## Overview

Given a `.ppt.md` outline file, this skill:

1. **Phase 1** - Dispatches 5 parallel sub-agents, each generating a complete `.ppt.html` using the same template but with different visual/style approaches
2. **Phase 2** - Dispatches 1 merge agent that reviews all 5 versions page-by-page, selects the best page for each slide number, and assembles the final HTML

## When to Use

- User asks to generate a PPT/presentation from a `.ppt.md` outline
- A `.ppt.md` file exists with structured slide content
- Keywords: "generate ppt", "生成ppt", "make presentation", "create slides"

## Resources

| File                | Purpose                                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------------------------- |
| `ppt-template.html` | Complete CSS + JS template (no timer). Insert slides between `<!-- ===== SLIDES START/END ===== -->` markers. |
| `assets/`           | Bundled runtime assets that must be copied to the output directory                                            |
| `example/`          | Example outline file and expected output structure                                                            |

## Asset Deployment

The skill bundles all required runtime assets in its `assets/` directory. Before the generated `.ppt.html` can be opened, these assets must exist in an `assets/` subdirectory **relative to the output HTML file**.

**Required structure alongside the output `.ppt.html`:**

```
output-dir/
  your-presentation.ppt.html
  assets/
    css/all.min.css              ← Font Awesome 6 Free
    webfonts/
      fa-solid-900.woff2
      fa-solid-900.ttf
      fa-brands-400.woff2
      fa-brands-400.ttf
      fa-regular-400.ttf
    js/
      html2pdf.bundle.min.js     ← PDF export
      mermaid.min.js              ← Mermaid diagrams (optional)
      lightbox.js                 ← Image zoom (optional)
```

**Copy rule:** After generating the final `.ppt.html`, copy the skill's `assets/` directory to the output location. **Skip any files that already exist** in the target — this allows sharing one `assets/` directory across multiple presentations in the same folder.

```bash
# Copy only if not already present (Unix)
cp -n -r [skill-dir]/assets/ [output-dir]/assets/

# Windows (PowerShell)
Copy-Item -Path "[skill-dir]\assets\*" -Destination "[output-dir]\assets\" -Recurse -Force:$false
```

If `assets/` already exists at the target, verify the required files are present and skip the copy.

## Available Slide Components

The template provides these CSS classes for building slides:

### Layout

- `.two-column` + `.column` / `.column-narrow` / `.column-wide` - Two-column layout
- `.card-grid` + `.card-grid-2` / `.card-grid-3` - Card grid layouts
- `.flow-layout` + `.flow-step` + `.flow-arrow` - Horizontal flow diagram
- `.stat-grid` + `.stat-card` + `.stat-number` + `.stat-label` - Statistics grid

### Content

- `.icon-list` > `.icon-bullet` - Icon-bullet list (use Font Awesome `<i>` tags)
- `.highlight-box` - Blue left-border highlight box
- `.golden-quote` - Gold gradient centered quote (key takeaways)
- `.key-quote` - Blue/green gradient centered key statement
- `.quote` - Yellow warning-style quote
- `.comparison-table` - Styled data table
- `.timeline` + `.timeline-items` > `.timeline-item` - Horizontal timeline
- `.cycle-diagram` + `.cycle-step` + `.cycle-arrow` - Cycle diagram
- `.tag` / `.tag-warn` / `.tag-danger` / `.tag-success` - Colored inline tags

### Typography

- `h2` - Slide title (auto-styled with blue bottom border)
- `h3` - Section heading (blue)
- `h4` - Card/item heading
- `code` - Inline code (gradient background)
- `.sub-items` > `.sub-item` - Bullet sub-items with green dots

### Slide Types

- `.slide.title-slide` - Centered title/ending slide
- `.slide` - Standard content slide
- `.slide.slide-compact-print` - Compact slide for dense content (adds print/pdf size adjustments)

## Workflow

### Phase 1: Generate 5 Variants (Parallel Sub-Agents)

Dispatch 5 sub-agents simultaneously. Each agent:

1. Reads the outline file (provided as argument)
2. Reads `ppt-template.html` (in the same skill directory) for the CSS/JS shell
3. Generates a **complete** HTML file with ALL slides filled in
4. Each variant must use a **distinct visual approach**:

| Variant | Visual Approach                                                                                  |
| ------- | ------------------------------------------------------------------------------------------------ |
| V1      | **Conservative** - Close to outline structure, minimal embellishment, standard layouts           |
| V2      | **Card-heavy** - Maximizes use of `.card-grid`, `.stat-card`, organized visual blocks            |
| V3      | **Icon-rich** - Uses `.icon-list` with Font Awesome icons for most bullet points, flow diagrams  |
| V4      | **Diagram-centric** - Prefers inline SVG diagrams, `.flow-layout`, `.timeline`, `.cycle-diagram` |
| V5      | **Mixed-creative** - Best judgment combining all components, varied layouts per slide            |

**Agent prompt template:**

```
You are generating variant [N] of an HTML presentation.

VISUAL APPROACH: [approach description from table above]

INSTRUCTIONS:
1. Read the outline file at [outline-path] to extract all slide content
1. Read the template at [skill-dir]/ppt-template.html
3. Generate a COMPLETE HTML file by inserting slides into the template
4. Write the output to [output-path]

RULES:
- Preserve ALL text content from the outline exactly
- Use only the CSS classes documented in the template
- Use Font Awesome icons (fa-solid) for all icon references
- For inline SVG diagrams: ALWAYS include explicit numeric width and height attributes (e.g. width="800" height="300"). Use style="width:100%;height:auto" for responsive display. NEVER use width="100%" or omit width/height entirely — these produce blank SVGs in PDF export because html2canvas reads baseVal.value which is 0 for percentages and missing attributes.
- For Mermaid diagrams: wrap in `<div class="mermaid-container"><div class="mermaid">...</div></div>`
- For images: use relative paths from docs/ppts/ (e.g., "assets/image.png")
- First slide MUST have classes "slide active title-slide"
- Each subsequent slide has class "slide"
- Replace {{title}}, {{lang}}, {{pdf-filename}} in template
- All slide content goes between the SLIDES START/END comment markers
- DO NOT modify the template's CSS or JavaScript

OUTPUT: Write the complete HTML file to [output-path]
```

Output paths: `[work-dir]/.gen-variants/[basename]-v[N].html`

### Phase 2: Merge Best Pages (Single Agent)

After all 5 variants complete, dispatch 1 merge agent:

```
You are merging 5 HTML presentation variants into one final version.

VARIANT FILES:
- V1: [path-v1]
- V2: [path-v2]
- V3: [path-v3]
- V4: [path-v4]
- V5: [path-v5]

INSTRUCTIONS:
1. Read ALL 5 variant HTML files
2. For each slide number (1 through N), compare the same slide across all 5 versions
3. Select the BEST version of each slide based on:
   - Visual clarity and information hierarchy
   - Effective use of layout components
   - Content completeness (no missing text)
   - Readability (not too dense, not too sparse)
   - Visual variety across the final deck (avoid monotony)
4. Assemble the selected slides into a single HTML file
5. The first slide must have class "slide active title-slide"
6. All subsequent slides have class "slide"
7. Use the CSS/JS from the template (do not mix stylesheets)
8. Ensure the slide-counter shows correct total

RULES:
- You MUST preserve all original text content from the outline
- Do NOT modify CSS or JavaScript from the template
- Aim for visual variety: don't pick all slides from the same variant
- If two slides are equally good, prefer the one from a different variant than recent picks
- The final deck should feel cohesive despite using slides from different variants

OUTPUT: Write the merged HTML to [final-output-path]
```

Final output path: `[work-dir]/[basename].ppt.html` (replace `.ppt.md` with `.ppt.html`)

## Step-by-Step Execution

When user requests PPT generation:

1. **Identify outline file** - User provides path or find `*.ppt.md` in working directory
2. **Create output directory** - `mkdir -p [work-dir]/.gen-variants`
3. **Dispatch 5 generation agents** in parallel using Task tool
4. **Wait for all 5 to complete**
5. **Dispatch 1 merge agent** with paths to all 5 variants
6. **Write final file** to `[work-dir]/[basename].ppt.html`
7. **Report** the output path to user

### Asset Deployment

After the final `.ppt.html` is written, copy the skill's bundled `assets/` directory to the same folder as the output file. Skip files that already exist (allows sharing assets across multiple presentations).

```bash
# If assets/ doesn't exist at target, copy from skill:
cp -r [skill-dir]/assets/ [output-dir]/assets/
```

## Quality Checklist

After generation, verify:

- [ ] All slides from outline are present (count matches)
- [ ] No text content is missing or altered
- [ ] First slide has `class="slide active title-slide"`
- [ ] Navigation works (keyboard, buttons, touch)
- [ ] No broken CSS classes (all used classes exist in template)
- [ ] **All inline SVGs have numeric `width`/`height` attributes** — grep for `width="100%"` or missing width/height, must be zero matches
- [ ] Print/PDF export styles are intact
- [ ] Total slide count in counter is correct

## Mermaid & SVG PDF Export Guide

html2pdf.js uses html2canvas to render HTML → canvas → PDF. **SVG elements are the #1 source of PDF export failures.** Understanding why is critical to avoiding broken diagrams in exported PDFs.

### Root Cause: html2canvas SVG Serialization

html2canvas (bundled inside `html2pdf.bundle.min.js`) renders SVGs through this pipeline:

1. **Serialize**: `new XMLSerializer().serializeToString(svgElement)` → data URI
2. **Read dimensions**: `svgElement.width.baseVal.value` and `svgElement.height.baseVal.value`
3. **Load as Image**: `new Image()` with `src="data:image/svg+xml;charset=utf-8,..."`
4. **Draw to canvas**: `ctx.drawImage(img, 0, 0, intrinsicWidth, intrinsicHeight, ...)`

**The critical check** is in `renderReplacedElement`:

```javascript
// From html2canvas source (SVGContainer class)
renderReplacedElement(element, container, image) {
  if (image && element.intrinsicWidth > 0 && element.intrinsicHeight > 0) {
    // ... drawImage — ONLY renders if both dimensions > 0
  }
}
```

If `intrinsicWidth` or `intrinsicHeight` is `0`, the SVG is **silently skipped** — no error, no fallback, just empty space in the PDF.

### What Breaks and Why

| SVG Pattern                                                                           | `baseVal.value` | PDF Result        | Why                                             |
| ------------------------------------------------------------------------------------- | --------------- | ----------------- | ----------------------------------------------- |
| `<svg width="800" height="300">`                                                      | 800, 300        | **Works**         | Explicit numeric attributes                     |
| `<svg width="800" height="300" viewBox="0 0 800 300" style="width:100%;height:auto">` | 800, 300        | **Works**         | baseVal reads from the attribute, not the style |
| `<svg viewBox="0 0 800 300" style="width:100%;height:auto">`                          | **0, 0**        | **BROKEN**        | No width/height attribute → baseVal is 0        |
| `<svg width="100%" height="100%" viewBox="0 0 800 300">`                              | **0, 0**        | **BROKEN**        | Percentage values: baseVal.unitType=2, value=0  |
| Mermaid-rendered SVG                                                                  | varies          | **Usually works** | Mermaid sets explicit pixel width/height        |
| Mermaid-rendered SVG (if container constrains)                                        | may be 0        | **May break**     | Depends on container and CSS                    |

### Rules for Generating Agents

**When writing inline SVGs, ALWAYS include explicit numeric `width` and `height` attributes:**

```html
<!-- CORRECT: numeric width/height + viewBox -->
<svg
  width="800"
  height="300"
  viewBox="0 0 800 300"
  xmlns="http://www.w3.org/2000/svg"
  style="width:100%;height:auto"
>
  ...
</svg>

<!-- CORRECT: smaller display size via viewBox scaling -->
<svg width="700" height="400" viewBox="0 0 1000 600" xmlns="http://www.w3.org/2000/svg">...</svg>

<!-- WRONG: no width/height attribute — baseVal = 0 -->
<svg viewBox="0 0 800 300" style="width:100%;height:auto">...</svg>

<!-- WRONG: percentage width/height — baseVal = 0 -->
<svg width="100%" height="100%" viewBox="0 0 800 300">...</svg>
```

**When using Mermaid diagrams, always use the container wrapper:**

```html
<div class="mermaid-container">
  <div class="mermaid">flowchart LR A[Start] --> B[Process] B --> C[End]</div>
</div>
```

### nop-entropy Reference Pattern

All working PPTs in `nop-entropy/docs/ppt/` follow this exact pattern for inline SVGs:

```html
<svg
  width="1000"
  height="680"
  viewBox="0 0 1000 680"
  xmlns="http://www.w3.org/2000/svg"
  style="width:100%;height:auto"
></svg>
```

The key: **numeric pixel attributes** give `baseVal.value` for html2canvas; **style overrides** control responsive browser display. Both coexist without conflict.

### Template Safeguards (Already in ppt-template.html)

1. **`svg * { animation-play-state: paused !important }`** in `@media print` — Freezes SVG animations during print/PDF to prevent rendering artifacts.

2. **`backgroundColor: '#ffffff'`** in html2canvas options — Ensures white PDF background (prevents transparent holes behind SVGs).

3. **`.pdf-slide, .pdf-slide * { animation: none !important; opacity: 1 !important }`** — Disables all CSS animations in PDF clones so staggered entry animations don't freeze mid-way.

4. **`mermaid.initialize({ startOnLoad: true, ... })`** — Runs before DOMContentLoaded, ensuring all `<div class="mermaid">` are rendered into SVGs before the user can click "Export PDF". The mermaid script tag and init script are placed BEFORE the main `<script>` tag.

5. **`hasExternalImages()` + `showLocalFileWarning()`** — Only warns about `file://` protocol when the deck actually contains external `<img>` elements. Pure SVG/mermaid decks export without warning.

### Mermaid Configuration Explained

```javascript
mermaid.initialize({
  startOnLoad: true, // Auto-render on page load (before PDF export)
  theme: 'default', // Standard light theme (matches slide background)
  securityLevel: 'loose', // Required: allows HTML in node labels (<br>, <b>)
  fontFamily: 'var(--font-main)', // Inherit slide typography
  flowchart: {
    useMaxWidth: false, // Don't let mermaid set max-width (CSS handles sizing)
    htmlLabels: true, // Enable rich HTML content in nodes
    curve: 'basis', // Smooth curved edges
  },
});
```

### Required CSS for Mermaid

The template provides `.mermaid-container` and `.mermaid` classes. These are NOT optional:

```css
.mermaid-container {
  background-color: var(--color-code-bg); /* Light gray background card */
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  margin: 1.5rem 0;
  overflow: auto; /* Horizontal scroll for wide diagrams */
}

.mermaid {
  display: flex;
  justify-content: center; /* Horizontally center the rendered SVG */
  width: 100%;
}
```

## Common Mistakes

| Mistake                                       | Fix                                                                                 |
| --------------------------------------------- | ----------------------------------------------------------------------------------- |
| Modifying template CSS/JS                     | Only insert `<section>` slides between the markers                                  |
| Missing `active` class on first slide         | First slide must be `class="slide active title-slide"`                              |
| Using classes not in template                 | Stick to documented component classes                                               |
| Forgetting Font Awesome icons                 | Use `fa-solid fa-*` classes, not emoji                                              |
| Not updating `{{title}}` / `{{pdf-filename}}` | Replace all template placeholders                                                   |
| All slides from same variant                  | Merge agent must enforce visual variety                                             |
| SVG without width/height attributes           | Always add explicit numeric `width`/`height` (see Mermaid & SVG PDF Export Guide)   |
| SVG with `width="100%"`                       | Use numeric pixels instead, add `style="width:100%;height:auto"` for responsiveness |
| Mermaid outside `.mermaid-container`          | Always wrap in `.mermaid-container` > `.mermaid`                                    |
| Missing mermaid.initialize()                  | Must run before DOMContentLoaded (see Template Safeguards)                          |
