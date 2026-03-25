#!/usr/bin/env python3
"""
Split AMIS unified JSON Schema into individual component schemas with external $ref.

This script reads the unified amis schema.json file and splits it into:
1. A common definitions file (common-definitions.json)
2. Individual component files that $ref to the common definitions
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


def extract_direct_refs(schema_part: Any) -> Set[str]:
    """Extract only direct $ref references (not recursive)."""
    refs = set()
    
    if isinstance(schema_part, dict):
        if '$ref' in schema_part:
            ref = schema_part['$ref']
            if isinstance(ref, str) and ref.startswith('#/definitions/'):
                refs.add(ref[len('#/definitions/'):])
        
        for key, value in schema_part.items():
            if key != '$ref':
                refs.update(extract_direct_refs(value))
    
    elif isinstance(schema_part, list):
        for item in schema_part:
            refs.update(extract_direct_refs(item))
    
    return refs


def sanitize_filename(name: str) -> str:
    """Convert definition name to a valid filename."""
    s1 = re.sub('(.)([A-Z][a-z]+)', r'\1-\2', name)
    s2 = re.sub('([a-z0-9])([A-Z])', r'\1-\2', s1)
    s2 = re.sub(r'-schema$', '', s2, flags=re.IGNORECASE)
    return s2.lower()


def is_component_schema(name: str) -> bool:
    """Check if a definition represents a component schema."""
    # Explicitly include button-related schemas as components
    button_schemas = {'ButtonSchema', 'ButtonGroupSchema', 'ButtonToolbarSchema'}
    if name in button_schemas:
        return True
    
    exclude_patterns = [
        'Base', 'ClassName', 'Expression', 'Tpl', 'Type',
        'Listener', 'Condition', 'Operator', 'Api', 'Function',
        'SchemaCollection', 'SchemaDefaultData', 'SchemaNode', 'SchemaObject',
        'Definitions', 'AMISDefinitions', 'Action', 'Vanilla',
    ]
    
    if name.endswith('Schema'):
        for pattern in exclude_patterns:
            if name.startswith(pattern) or name == pattern:
                return False
        return True
    
    component_names = [
        'PageSchema', 'FormSchema', 'CRUDSchema', 'CRUD2Schema',
        'TableSchema', 'DialogSchema', 'DrawerSchema', 'WizardSchema',
    ]
    
    return name in component_names


def extract_component_type(definition_name: str) -> str:
    """Extract the component type from definition name."""
    name = definition_name
    if name.endswith('Schema'):
        name = name[:-6]
    if name.startswith('AMIS'):
        name = name[4:]
    
    s1 = re.sub('(.)([A-Z][a-z]+)', r'\1-\2', name)
    s2 = re.sub('([a-z0-9])([A-Z])', r'\1-\2', s1)
    
    return s2.lower()


def get_action_definitions() -> Set[str]:
    """Get all action-related definitions that should be grouped together."""
    return {
        'ActionSchema', 'AjaxActionSchema', 'ButtonSchema', 'UrlActionSchema',
        'LinkActionSchema', 'DialogActionSchema', 'DrawerActionSchema',
        'ToastActionSchema', 'CopyActionSchema', 'ReloadActionSchema',
        'EmailActionSchema', 'OtherActionSchema', 'VanillaAction',
    }


def get_base_definitions() -> Set[str]:
    """Get base/utility definitions."""
    return {
        'SchemaRemark', 'BaseRemarkSchema', 'SchemaIcon', 'SchemaClassName',
        'SchemaExpression', 'SchemaTpl', 'BaseSchema', 'SchemaType',
        'BaseSchemaWithoutType', 'SchemaCollection', 'SchemaDefaultData',
        'SchemaNode', 'SchemaObject', 'SchemaApi', 'SchemaTokenizeable',
        'ExpressionComplex', 'ExpressionValue', 'ExpressionSimple',
        'ExpressionFunc', 'ExpressionField', 'ExpressionFormula',
        'ConditionGroupValue', 'ConditionRule', 'ListenerAction',
        'OperatorType', 'LogicType', 'VariableTypes',
    }


def main():
    # Paths
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    
    schema_path = Path(r"C:\can\nop\nop-chaos-next-wt-bak\nop-chaos-next-feat-amis-support\node_modules\.pnpm\amis@6.13.0_@types+react@19_ff8da07ecce9ffc30b6da26b2fbe98e5\node_modules\amis\schema.json")
    
    output_dir = project_root / 'docs' / 'amis-ref-v2'
    
    print(f"Loading schema from: {schema_path}")
    schema = load_schema(str(schema_path))
    
    all_definitions = schema.get('definitions', {})
    print(f"Found {len(all_definitions)} definitions")
    
    # Create output directory
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Categorize definitions
    action_defs = get_action_definitions()
    base_defs = get_base_definitions()
    
    # Separate definitions into groups
    common_definitions = {}
    component_definitions = {}
    
    for def_name, def_content in all_definitions.items():
        if def_name in base_defs or def_name in action_defs:
            common_definitions[def_name] = def_content
        elif is_component_schema(def_name):
            component_definitions[def_name] = def_content
        else:
            # Other utility definitions go to common
            common_definitions[def_name] = def_content
    
    # Write common definitions
    common_path = output_dir / 'common-definitions.json'
    common_schema = {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "definitions": common_definitions
    }
    with open(common_path, 'w', encoding='utf-8') as f:
        json.dump(common_schema, f, indent=2, ensure_ascii=False)
    print(f"Written common definitions: {len(common_definitions)} definitions")
    
    # Process each component
    components = []
    
    for def_name, def_content in component_definitions.items():
        print(f"Processing: {def_name}")
        
        # Get direct references
        direct_refs = extract_direct_refs(def_content)
        
        # Build component schema with external references
        component_schema = {
            "$schema": "http://json-schema.org/draft-07/schema#",
            "$ref": f"#/definitions/{def_name}",
            "definitions": {
                def_name: def_content
            }
        }
        
        # Add local $defs for references that point to other components
        local_refs = {}
        for ref in direct_refs:
            if ref in component_definitions and ref != def_name:
                # This is a reference to another component - keep as-is
                pass
            elif ref in common_definitions:
                # This is a reference to common definitions - use external ref
                pass
        
        # Write component file
        filename = f"{sanitize_filename(def_name)}.json"
        filepath = output_dir / filename
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(component_schema, f, indent=2, ensure_ascii=False)
        
        components.append({
            'name': def_name,
            'filename': filename,
            'type': extract_component_type(def_name),
            'refs': list(direct_refs)
        })
    
    # Generate index
    index_path = output_dir / 'index.md'
    with open(index_path, 'w', encoding='utf-8') as f:
        f.write('# AMIS Component Schema Reference (v2)\n\n')
        f.write('Individual component schemas with external references to common definitions.\n\n')
        f.write('## Files\n\n')
        f.write('- `common-definitions.json` - Shared definitions (base types, actions, utilities)\n')
        f.write('- `*.json` - Individual component schemas\n\n')
        f.write('## Usage\n\n')
        f.write('To validate a component, combine the component schema with common definitions:\n\n')
        f.write('```python\n')
        f.write('import json\n\n')
        f.write('# Load common definitions\n')
        f.write('with open("common-definitions.json") as f:\n')
        f.write('    common = json.load(f)\n\n')
        f.write('# Load component schema\n')
        f.write('with open("button.json") as f:\n')
        f.write('    component = json.load(f)\n\n')
        f.write('# Merge definitions for validation\n')
        f.write('full_schema = {\n')
        f.write('    "$schema": "http://json-schema.org/draft-07/schema#",\n')
        f.write('    "$ref": component["$ref"],\n')
        f.write('    "definitions": {**common["definitions"], **component["definitions"]}\n')
        f.write('}\n')
        f.write('```\n\n')
        f.write('## Components\n\n')
        f.write('| Component | File | Type |\n')
        f.write('|-----------|------|------|\n')
        
        for comp in sorted(components, key=lambda x: x['name']):
            f.write(f"| {comp['name']} | [{comp['filename']}]({comp['filename']}) | `{comp['type']}` |\n")
        
        f.write(f"\n## Total Components: {len(components)}\n")
        f.write(f"## Common Definitions: {len(common_definitions)}\n")
    
    print(f"\nGenerated {len(components)} component schemas in: {output_dir}")
    print(f"Common definitions: {len(common_definitions)}")
    print(f"Index file: {index_path}")


if __name__ == '__main__':
    main()
