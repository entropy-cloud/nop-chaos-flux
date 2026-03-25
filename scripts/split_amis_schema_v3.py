#!/usr/bin/env python3
"""
Split AMIS unified JSON Schema into individual component schemas with grouped definitions.

Structure:
- base.json: Core types (Schema*, Base*, ClassName, Value, PlainObject)
- actions.json: Action-related definitions
- expressions.json: Expression definitions
- events.json: Event and condition definitions
- api.json: API definitions
- form-base.json: Form base definitions
- table-base.json: Table base definitions  
- cards-base.json: Cards/List base definitions
- crud-base.json: CRUD base definitions
- dialog-base.json: Dialog/Drawer base definitions
- grid-layout.json: Grid/HBox layout definitions
- component-*.json: Individual component schemas (thin, reference above)
"""

import json
import re
from pathlib import Path
from typing import Any, Dict, Set


def load_schema(path: str) -> Dict:
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)


def extract_direct_refs(schema_part: Any) -> Set[str]:
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
    s1 = re.sub('(.)([A-Z][a-z]+)', r'\1-\2', name)
    s2 = re.sub('([a-z0-9])([A-Z])', r'\1-\2', s1)
    s2 = re.sub(r'-schema$', '', s2, flags=re.IGNORECASE)
    return s2.lower()


def get_definition_groups() -> Dict[str, Set[str]]:
    """Define which definitions go into which grouped files."""
    return {
        'base': {
            'BaseSchema', 'BaseSchemaWithoutType', 'SchemaType', 'SchemaName',
            'SchemaClassName', 'SchemaCollection', 'SchemaDefaultData',
            'SchemaObject', 'SchemaObjectLoose', 'SchemaIcon',
            'SchemaTpl', 'SchemaTokenizeableString', 'TplSchema',
            'PlainObject', 'ClassName', 'Value', 'SchemaExpression',
            'TestIdBuilder', 'debounceConfig',
        },
        'schema-features': {
            'SchemaRemark', 'BaseRemarkSchema', 'SchemaCopyable',
            'SchemaCopyableObject', 'SchemaPopOver', 'SchemaPopOverObject',
            'SchemaQuickEdit', 'SchemaQuickEditObject', 'SchemaTooltip',
            'SchemaReload', 'SchemaMessage',
        },
        'api': {
            'SchemaApi', 'SchemaApiObject', 'BaseApi', 'BaseApiObject',
            'SchemaUrlPath', 'SchemaFunction',
        },
        'actions': {
            'ActionSchema', 'ActionSchemaLoose', 'AjaxActionSchema',
            'ButtonSchema', 'UrlActionSchema', 'LinkActionSchema',
            'DialogActionSchema', 'DrawerActionSchema', 'ToastActionSchema',
            'CopyActionSchema', 'ReloadActionSchema', 'EmailActionSchema',
            'OtherActionSchema', 'VanillaAction', 'DropdownButton',
            'ImageToolbarAction',
        },
        'expressions': {
            'ExpressionComplex', 'ExpressionValue', 'ExpressionSimple',
            'ExpressionFunc', 'ExpressionField', 'ExpressionFormula',
        },
        'events': {
            'ListenerAction', 'ConditionGroupValue', 'ConditionRule',
            'OperatorType', 'LogicType', 'VariableItem',
            'ConditionBuilderConfig', 'ConditionBuilderControlSchema',
            'ConditionBuilderField', 'ConditionBuilderFields',
            'ConditionBuilderFuncArg', 'ConditionBuilderFuncs',
            'ConditionBuilderType', 'ConditionFieldFunc',
        },
        'form-base': {
            'FormSchemaBase', 'FormBaseControl', 'FormBaseControlWithoutSize',
            'FormHorizontal', 'FormOptionsControlSelf', 'FieldGroup',
            'FieldSimple', 'FieldTypes', 'LabelAlign',
            'BaseComboControlSchema', 'ComboCondition', 'ComboSubControl',
            'BaseDateRangeControlSchema', 'BaseInputFormulaControlSchema',
            'BaseTransferControlSchema', 'GroupSubControl',
            'InputTextAddOn', 'InputTextAddOnObject',
            'FormulaPickerInputSettingType', 'FormulaPickerInputSettings',
            'CustomField', 'ShortCutDate', 'ShortCutDateRange', 'ShortCuts',
        },
        'options': {
            'Option', 'Options', 'MultipleValue',
            'DataProvider', 'DataProviderCollection', 'ComposedDataProvider',
        },
        'table-base': {
            'BaseTableSchema', 'BaseTableSchema2', 'TableSchema2',
            'TableColumn', 'TableColumnObject', 'TableColumnWithType',
        },
        'cards-base': {
            'BaseCardsSchema', 'BaseListSchema', 'CardBodyField',
            'CardSchemaWithoutType', 'ListBodyField', 'ListBodyFieldObject',
        },
        'crud-base': {
            'CRUDBultinToolbarType', 'CRUDCommonSchemaWithoutType',
            'CRUDToolbarObject', 'AutoGenerateFilterObject',
        },
        'dialog-base': {
            'DialogSchemaBase', 'DrawerSchemaBase', 'FeedbackDialog',
        },
        'grid-layout': {
            'Grid', 'GridColumn', 'GridColumnObject', 'GridObject',
            'HBoxColumn', 'HBoxColumnObject', 'HboxRow',
            'ContainerDraggableConfig',
        },
        'collapse-base': {
            'BaseCollapseSchema', 'TabsMode',
        },
        'misc': {
            'AutoFillHeightObject', 'BadgeObject', 'ColorMapType',
            'MODE_TYPE', 'NavOverflow', 'PresetColor', 'QRCodeImageSettings',
            'SpinnerExtraProps', 'StatusSource', 'StepStatus',
            'TooltipPosType', 'Trigger', 'textPositionType', 'trackConfig',
            'FuncGroup', 'FuncItem', 'SchemaEditorItemPlaceholder',
        },
    }


def is_component_schema(name: str, grouped_defs: Set[str]) -> bool:
    """Check if a definition is a component schema (not in any grouped file)."""
    if name in grouped_defs:
        return False
    
    # Exclude obvious base/utility patterns
    exclude_prefixes = ('Base', 'Schema')
    exclude_exact = {'ClassName', 'PlainObject', 'Value', 'TplSchema'}
    
    if name in exclude_exact:
        return False
    for prefix in exclude_prefixes:
        if name.startswith(prefix) and name != 'ButtonSchema':
            return False
    
    return name.endswith('Schema')


def extract_component_type(def_name: str) -> str:
    name = def_name
    if name.endswith('Schema'):
        name = name[:-6]
    if name.startswith('AMIS'):
        name = name[4:]
    s1 = re.sub('(.)([A-Z][a-z]+)', r'\1-\2', name)
    return re.sub('([a-z0-9])([A-Z])', r'\1-\2', s1).lower()


def main():
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    
    schema_path = Path(r"C:\can\nop\nop-chaos-next-wt-bak\nop-chaos-next-feat-amis-support\node_modules\.pnpm\amis@6.13.0_@types+react@19_ff8da07ecce9ffc30b6da26b2fbe98e5\node_modules\amis\schema.json")
    output_dir = project_root / 'docs' / 'amis-ref'
    
    print(f"Loading schema from: {schema_path}")
    schema = load_schema(str(schema_path))
    all_definitions = schema.get('definitions', {})
    print(f"Found {len(all_definitions)} total definitions")
    
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Get definition groups
    groups = get_definition_groups()
    grouped_defs = set()
    for defs in groups.values():
        grouped_defs.update(defs)
    
    # Write grouped definition files
    group_files = {}
    for group_name, def_names in groups.items():
        group_defs = {}
        for d in def_names:
            if d in all_definitions:
                group_defs[d] = all_definitions[d]
        
        if group_defs:
            filename = f'{group_name}.json'
            filepath = output_dir / filename
            group_schema = {
                "$schema": "http://json-schema.org/draft-07/schema#",
                "definitions": group_defs
            }
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(group_schema, f, indent=2, ensure_ascii=False)
            group_files[group_name] = {'file': filename, 'count': len(group_defs)}
            print(f"  {filename}: {len(group_defs)} definitions")
    
    # Process component schemas
    components = []
    for def_name, def_content in all_definitions.items():
        if not is_component_schema(def_name, grouped_defs):
            continue
        
        # Component file: only contains the definition itself
        component_schema = {
            "$schema": "http://json-schema.org/draft-07/schema#",
            "$ref": f"#/definitions/{def_name}",
            "definitions": {
                def_name: def_content
            }
        }
        
        filename = f"{sanitize_filename(def_name)}.json"
        filepath = output_dir / filename
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(component_schema, f, indent=2, ensure_ascii=False)
        
        direct_refs = extract_direct_refs(def_content)
        components.append({
            'name': def_name,
            'filename': filename,
            'type': extract_component_type(def_name),
            'refs': sorted(direct_refs)
        })
    
    print(f"\nGenerated {len(components)} component schemas")
    
    # Generate index.md
    generate_index(output_dir, group_files, components)
    print(f"Generated index.md")


def generate_index(output_dir: Path, group_files: Dict, components: list):
    index_path = output_dir / 'index.md'
    
    with open(index_path, 'w', encoding='utf-8') as f:
        f.write('# AMIS Component JSON Schema Reference\n\n')
        f.write('Split from unified `amis@6.13.0` schema (301 definitions).\n\n')
        
        f.write('## File Structure\n\n')
        f.write('```\n')
        f.write('amis-ref/\n')
        f.write('├── index.md              # This file\n')
        f.write('├── base.json             # Core types: BaseSchema, SchemaClassName, SchemaCollection...\n')
        f.write('├── schema-features.json  # Schema features: remark, copyable, popover, quickEdit...\n')
        f.write('├── api.json              # API definitions: SchemaApi, BaseApi...\n')
        f.write('├── actions.json          # Action types: AjaxAction, DialogAction, Button...\n')
        f.write('├── expressions.json      # Expression types: ExpressionSimple, ExpressionFormula...\n')
        f.write('├── events.json           # Event/condition: ListenerAction, ConditionBuilder...\n')
        f.write('├── form-base.json        # Form base: FormSchemaBase, FormBaseControl...\n')
        f.write('├── options.json          # Options: Option, DataProvider...\n')
        f.write('├── table-base.json       # Table base: BaseTableSchema, TableColumn...\n')
        f.write('├── cards-base.json       # Cards/List base: BaseCardsSchema, ListBodyField...\n')
        f.write('├── crud-base.json        # CRUD base: CRUDToolbarObject...\n')
        f.write('├── dialog-base.json      # Dialog/Drawer base\n')
        f.write('├── grid-layout.json      # Grid/HBox layout definitions\n')
        f.write('├── collapse-base.json    # Collapse/Tabs base\n')
        f.write('├── misc.json             # Other definitions\n')
        f.write('└── *.json                # 152 individual component schemas\n')
        f.write('```\n\n')
        
        f.write('## Definition Groups\n\n')
        f.write('| File | Definitions | Purpose |\n')
        f.write('|------|-------------|----------|\n')
        
        total_grouped = 0
        for group_name, info in sorted(group_files.items()):
            total_grouped += info['count']
            purpose = {
                'base': 'Core types, SchemaClassName, SchemaCollection, PlainObject',
                'schema-features': 'remark, copyable, popover, quickEdit, tooltip',
                'api': 'SchemaApi, BaseApi, URL paths',
                'actions': 'All action types, ButtonSchema',
                'expressions': 'ExpressionSimple, ExpressionFormula, etc.',
                'events': 'ListenerAction, ConditionBuilder',
                'form-base': 'FormSchemaBase, FormBaseControl, field types',
                'options': 'Option, DataProvider',
                'table-base': 'TableSchema2, TableColumn',
                'cards-base': 'BaseCardsSchema, ListBodyField',
                'crud-base': 'CRUDToolbarObject, AutoGenerateFilter',
                'dialog-base': 'DialogSchemaBase, DrawerSchemaBase',
                'grid-layout': 'Grid, HBox layout',
                'collapse-base': 'BaseCollapseSchema, TabsMode',
                'misc': 'Badge, Color, Spinner extra props',
            }.get(group_name, '')
            f.write(f"| [{group_name}.json]({group_name}.json) | {info['count']} | {purpose} |\n")
        
        f.write(f"| **Total grouped** | **{total_grouped}** | |\n")
        f.write(f"| **Component files** | **{len(components)}** | Individual component schemas |\n\n")
        
        f.write('## How References Work\n\n')
        f.write('Each component file (e.g., `form.json`) contains only its own definition.\n')
        f.write('It references shared definitions via `$ref` pointing to grouped files.\n\n')
        f.write('**Example: `form.json` references:**\n')
        f.write('- `#/definitions/FormSchemaBase` → defined in `form-base.json`\n')
        f.write('- `#/definitions/ActionSchema` → defined in `actions.json`\n')
        f.write('- `#/definitions/SchemaCollection` → defined in `base.json`\n\n')
        f.write('**To validate, merge definitions:**\n')
        f.write('```python\n')
        f.write('import json\n\n')
        f.write('def load_with_refs(component_file):\n')
        f.write('    # Load all grouped definitions\n')
        f.write('    all_defs = {}\n')
        f.write('    for group in ["base", "schema-features", "api", "actions", \n')
        f.write('                  "expressions", "events", "form-base", "options",\n')
        f.write('                  "table-base", "cards-base", "crud-base",\n')
        f.write('                  "dialog-base", "grid-layout", "collapse-base", "misc"]:\n')
        f.write('        with open(f"{group}.json") as f:\n')
        f.write('            all_defs.update(json.load(f)["definitions"])\n')
        f.write('    \n')
        f.write('    # Load component\n')
        f.write('    with open(component_file) as f:\n')
        f.write('        comp = json.load(f)\n')
        f.write('    all_defs.update(comp["definitions"])\n')
        f.write('    \n')
        f.write('    return {"$schema": comp["$schema"], "$ref": comp["$ref"], "definitions": all_defs}\n')
        f.write('```\n\n')
        
        f.write('## Components\n\n')
        f.write('| Component | File | Type |\n')
        f.write('|-----------|------|------|\n')
        
        for comp in sorted(components, key=lambda x: x['name']):
            f.write(f"| {comp['name']} | [{comp['filename']}]({comp['filename']}) | `{comp['type']}` |\n")
        
        f.write(f"\n---\n")
        f.write(f"*Generated from amis@6.13.0 • {len(components)} components • {total_grouped} grouped definitions*\n")


if __name__ == '__main__':
    main()
