#!/usr/bin/env python3
"""
Split AMIS unified JSON Schema into individual component schemas.

This script reads the unified amis schema.json file and splits it into
separate JSON files for each component definition.
"""

import json
import os
import re
from pathlib import Path
from typing import Any, Dict, List, Set


def load_schema(schema_path: str) -> Dict[str, Any]:
    """Load the unified AMIS schema file."""
    with open(schema_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def resolve_ref(ref: Any, definitions: Dict[str, Any]) -> str:
    """Extract definition name from $ref string."""
    if isinstance(ref, str) and ref.startswith('#/definitions/'):
        return ref[len('#/definitions/'):]
    return str(ref) if ref else ''


def collect_dependencies(schema_part: Any, definitions: Dict[str, Any], 
                        visited: Set[str] = None) -> Set[str]:
    """Recursively collect all $ref dependencies in a schema part."""
    if visited is None:
        visited = set()
    
    deps = set()
    
    if isinstance(schema_part, dict):
        if '$ref' in schema_part:
            dep_name = resolve_ref(schema_part['$ref'], definitions)
            if dep_name not in visited:
                visited.add(dep_name)
                deps.add(dep_name)
                if dep_name in definitions:
                    deps.update(collect_dependencies(definitions[dep_name], definitions, visited))
        
        for key, value in schema_part.items():
            if key != '$ref':
                deps.update(collect_dependencies(value, definitions, visited))
    
    elif isinstance(schema_part, list):
        for item in schema_part:
            deps.update(collect_dependencies(item, definitions, visited))
    
    return deps


def build_component_schema(definition_name: str, 
                          definitions: Dict[str, Any]) -> Dict[str, Any]:
    """Build a complete schema for a single component including its dependencies."""
    if definition_name not in definitions:
        return None
    
    main_def = definitions[definition_name]
    
    # Collect all dependencies
    deps = collect_dependencies(main_def, definitions)
    deps.add(definition_name)  # Include the definition itself
    
    # Build the component schema
    component_schema = {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$ref": f"#/definitions/{definition_name}",
        "definitions": {}
    }
    
    # Add all dependent definitions
    for dep_name in sorted(deps):
        if dep_name in definitions:
            component_schema["definitions"][dep_name] = definitions[dep_name]
    
    return component_schema


def sanitize_filename(name: str) -> str:
    """Convert definition name to a valid filename."""
    # Convert CamelCase to kebab-case
    s1 = re.sub('(.)([A-Z][a-z]+)', r'\1-\2', name)
    s2 = re.sub('([a-z0-9])([A-Z])', r'\1-\2', s1)
    # Remove Schema suffix if present
    s2 = re.sub(r'-schema$', '', s2, flags=re.IGNORECASE)
    # Convert to lowercase
    return s2.lower()


def is_component_schema(name: str) -> bool:
    """Check if a definition represents a component schema."""
    # Filter out utility types and base schemas
    exclude_patterns = [
        'Base',
        'Schema',
        'ClassName',
        'Expression',
        'Tpl',
        'Type',
        'Listener',
        'Condition',
        'Expression',
        'Operator',
        'Api',
        'Action',
        'Function',
        'SchemaCollection',
        'SchemaDefaultData',
        'SchemaNode',
        'SchemaObject',
        'Definitions',
        'AMISDefinitions',
    ]
    
    # Must end with Schema or be a known component
    if name.endswith('Schema'):
        # Check if it's not a base/utility type
        for pattern in exclude_patterns:
            if name.startswith(pattern) or name == pattern:
                return False
        return True
    
    # Some components don't follow the Schema suffix convention
    component_names = [
        'PageSchema',
        'FormSchema',
        'CRUDSchema',
        'CRUD2Schema',
        'TableSchema',
        'DialogSchema',
        'DrawerSchema',
        'WizardSchema',
    ]
    
    return name in component_names


def extract_component_type(definition_name: str) -> str:
    """Extract the component type from definition name."""
    # Remove Schema suffix
    name = definition_name
    if name.endswith('Schema'):
        name = name[:-6]
    
    # Remove AMIS prefix
    if name.startswith('AMIS'):
        name = name[4:]
    
    # Convert to kebab-case
    s1 = re.sub('(.)([A-Z][a-z]+)', r'\1-\2', name)
    s2 = re.sub('([a-z0-9])([A-Z])', r'\1-\2', s1)
    
    return s2.lower()


def generate_index(components: List[Dict[str, str]], output_dir: Path):
    """Generate an index file listing all components."""
    index_path = output_dir / 'index.md'
    
    with open(index_path, 'w', encoding='utf-8') as f:
        f.write('# AMIS Component Schema Reference\n\n')
        f.write('This directory contains individual JSON Schema definitions for each AMIS component.\n\n')
        f.write('## Components\n\n')
        f.write('| Component | File | Type |\n')
        f.write('|-----------|------|------|\n')
        
        for comp in sorted(components, key=lambda x: x['name']):
            f.write(f"| {comp['name']} | [{comp['filename']}]({comp['filename']}) | `{comp['type']}` |\n")
        
        f.write(f"\n## Total Components: {len(components)}\n")


def main():
    # Paths
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    
    # Source schema path
    schema_path = Path(r"C:\can\nop\nop-chaos-next-wt-bak\nop-chaos-next-feat-amis-support\node_modules\.pnpm\amis@6.13.0_@types+react@19_ff8da07ecce9ffc30b6da26b2fbe98e5\node_modules\amis\schema.json")
    
    # Output directory
    output_dir = project_root / 'docs' / 'amis-ref'
    
    print(f"Loading schema from: {schema_path}")
    schema = load_schema(str(schema_path))
    
    definitions = schema.get('definitions', {})
    print(f"Found {len(definitions)} definitions")
    
    # Create output directory
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Process each definition
    components = []
    
    for def_name in definitions.keys():
        # Filter for component schemas
        if not is_component_schema(def_name):
            continue
        
        print(f"Processing: {def_name}")
        
        # Build component schema with dependencies
        component_schema = build_component_schema(def_name, definitions)
        
        if component_schema is None:
            continue
        
        # Generate filename
        filename = f"{sanitize_filename(def_name)}.json"
        filepath = output_dir / filename
        
        # Write component schema
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(component_schema, f, indent=2, ensure_ascii=False)
        
        # Track component for index
        components.append({
            'name': def_name,
            'filename': filename,
            'type': extract_component_type(def_name)
        })
    
    # Generate index
    generate_index(components, output_dir)
    
    print(f"\nGenerated {len(components)} component schemas in: {output_dir}")
    print(f"Index file: {output_dir / 'index.md'}")


if __name__ == '__main__':
    main()
