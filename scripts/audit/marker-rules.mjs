import { createResult, getLineNumber, isTestFile } from './shared.mjs';

// A marker is a `nop-*` literal that is not part of an import path (`@nop-chaos/...`),
// a package stem (`nop-chaos`), or a data attribute (`data-nop-x`). The old
// `content.includes('nop-')` test was satisfied by every `@nop-chaos/*` import,
// which exempted whole files (arm2 P2-MA1.5-002, plan 755).
const MARKER_LITERAL_PATTERN = /(?<![@\w/.-])nop-(?=[a-z0-9]|\$\{)/;

// Markers live on the DOM root a renderer owns; files that only compose other
// components or return null have no element to carry one.
const HOST_ELEMENT_TAGS = [
  'div', 'span', 'section', 'article', 'p', 'a', 'ul', 'ol', 'li',
  'table', 'thead', 'tbody', 'tr', 'td', 'th',
  'form', 'button', 'input', 'textarea', 'select', 'label',
  'img', 'iframe', 'canvas', 'svg', 'pre', 'code',
  'nav', 'header', 'footer', 'main', 'aside',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
];
const HOST_ELEMENT_PATTERN = new RegExp(`<(?:${HOST_ELEMENT_TAGS.join('|')})\\b`);

function scanMissingRendererMarkers({ rule, relativePath, content }) {
  if (!content.includes('RendererComponentProps')) {
    return [];
  }

  if (MARKER_LITERAL_PATTERN.test(content)) {
    return [];
  }

  if (!HOST_ELEMENT_PATTERN.test(content)) {
    return [];
  }

  const anchorIndex =
    content.indexOf('export function ') >= 0
      ? content.indexOf('export function ')
      : content.indexOf('return (') >= 0
        ? content.indexOf('return (')
        : 0;

  return [
    createResult(
      rule,
      relativePath,
      getLineNumber(content, anchorIndex),
      'No nop-* marker found in renderer component file',
      'missing nop-* marker',
    ),
  ];
}


export const rendererMarkerRules = [
  {
    id: 'missing-renderer-marker',
    severity: 'medium',
    description: 'Renderer component file appears to have no nop-* marker class',
    include: (filePath) => {
      return (
        /^packages\/flux-renderers-[^/]+\/src\/.*\.tsx$/.test(filePath) &&
        !isTestFile(filePath) &&
        !filePath.includes('/test-support')
      );
    },
    scanWithContent: scanMissingRendererMarkers,
  },
];

