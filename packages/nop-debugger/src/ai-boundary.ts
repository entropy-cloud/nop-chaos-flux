const AI_PACKAGE_MARKERS = ['@nop-chaos/flux-renderers-ai', '@nop-chaos/nop-debugger-ai'] as const;

interface AiBoundaryScanInput {
  /** Flattened dependency entries (dependencies + peerDependencies + devDependencies), name -> version. */
  dependencyEntries: Record<string, string>;
  /** Relative file path -> file content for the scanned source tree. */
  fileContents: Record<string, string>;
}

interface AiBoundaryViolation {
  location: string;
  marker: string;
}

export function findAiBoundaryViolations(input: AiBoundaryScanInput): AiBoundaryViolation[] {
  const violations: AiBoundaryViolation[] = [];

  for (const [name] of Object.entries(input.dependencyEntries)) {
    for (const marker of AI_PACKAGE_MARKERS) {
      if (name === marker) {
        violations.push({ location: 'package.json dependencies', marker });
      }
    }
  }

  for (const [file, content] of Object.entries(input.fileContents)) {
    for (const marker of AI_PACKAGE_MARKERS) {
      if (content.includes(marker)) {
        violations.push({ location: file, marker });
      }
    }
  }

  return violations;
}
