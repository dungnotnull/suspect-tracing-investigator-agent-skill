#!/usr/bin/env node
/**
 * Export OpenAPI 3.0 + per-tool JSON-Schema artifacts.
 *
 * Generates:
 *   assets/schemas/openapi.json              — OpenAPI 3.0.1 document
 *   assets/schemas/config.schema.json        — copy of config/schema.json
 *   assets/schemas/case-bundle.schema.json   — JSON schema for case bundles
 *   assets/schemas/tools/<name>.input.json   — tool input JSON schema
 *   assets/schemas/tools/<name>.output.json  — tool output JSON schema
 *
 * Usage: ts-node scripts/export-schemas.ts [--out assets/schemas]
 */

import { writeFileSync, mkdirSync, existsSync, copyFileSync } from 'fs';
import { resolve } from 'path';
import { ToolRegistry, ToolDefinition } from '../config/tools';
import { registerInvestigationTools } from '../config/tools';
import { bootstrapSkillRegistry } from '../config/agents';

function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function toolComponentSchema(tool: ToolDefinition, kind: 'input' | 'output'): object {
  if (kind === 'input') {
    return { ...tool.inputSchema, title: `${tool.name} input`, description: tool.description };
  }
  return { type: 'object', title: `${tool.name} output`, description: tool.outputSchema.description };
}

function buildOpenApi(tools: ToolDefinition[]): object {
  const paths: Record<string, any> = {};
  const components: Record<string, Record<string, object>> = { schemas: {} };
  for (const t of tools) {
    const opId = t.name;
    components.schemas[`${t.name}_input`] = toolComponentSchema(t, 'input');
    components.schemas[`${t.name}_output`] = toolComponentSchema(t, 'output');
    paths[`/tools/${t.name}`] = {
      post: {
        operationId: opId,
        summary: t.description,
        tags: [t.category],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: `#/components/schemas/${t.name}_input` } } }
        },
        responses: {
          '200': {
            description: 'Tool result envelope',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: `#/components/schemas/${t.name}_output` },
                    errors: { type: 'array', items: { type: 'string' } },
                    metadata: {
                      type: 'object',
                      properties: {
                        executionTimeMs: { type: 'number' },
                        timestamp: { type: 'string' },
                        version: { type: 'string' }
                      }
                    }
                  },
                  required: ['success', 'data']
                }
              }
            }
          }
        }
      }
    };
  }
  return {
    openapi: '3.0.1',
    info: {
      title: 'Suspect Tracing & Fugitive Investigation Support — Tool API',
      version: '1.0.0',
      description:
        'OpenAPI description of every tool exposed by the suspect-tracing-investigator skill. Each tool has a JSON-Schema-validated input and a typed output. See SKILL_REGISTRY.md for the agent-orchestration contract.',
      license: { name: 'MIT' }
    },
    paths,
    components
  };
}

function caseBundleSchema(): object {
  return {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'Case Bundle',
    type: 'object',
    properties: {
      caseId: { type: 'string' },
      caseType: { type: 'string' },
      dateOpened: { type: 'string' },
      status: { type: 'string' },
      summary: { type: 'string' },
      lawfulUseAttestation: { type: 'boolean' },
      leads: { type: 'array', items: { $ref: '#/definitions/LeadInput' } },
      sites: { type: 'array', items: { $ref: '#/definitions/OffenseSiteInput' } },
      associates: { type: 'array', items: { $ref: '#/definitions/AssociateInput' } },
      routine: { type: 'object' },
      interview_context: { type: 'object' },
      legal_request: { type: 'object' },
      custody_items: { type: 'array', items: { $ref: '#/definitions/CustodyItem' } }
    },
    required: ['caseId'],
    definitions: {
      LeadInput: {
        type: 'object',
        required: ['id', 'description', 'source', 'source_reliability', 'proximity', 'temporal_recency', 'corroborating_items', 'actionability'],
        properties: {
          id: { type: 'string' }, description: { type: 'string' }, source: { type: 'string' },
          source_reliability: { type: 'string', enum: ['High', 'Medium', 'Low'] },
          proximity: { type: 'number', minimum: 0, maximum: 1 },
          temporal_recency: { type: 'number', minimum: 0, maximum: 1 },
          corroborating_items: { type: 'number', minimum: 0 },
          actionability: { type: 'number', minimum: 0, maximum: 1 },
          captured_at: { type: 'string' }
        }
      },
      OffenseSiteInput: {
        type: 'object', required: ['id', 'lat', 'lon'],
        properties: {
          id: { type: 'string' }, label: { type: 'string' },
          lat: { type: 'number', minimum: -90, maximum: 90 },
          lon: { type: 'number', minimum: -180, maximum: 180 },
          timestamp: { type: 'string' }, weight: { type: 'number' }
        }
      },
      AssociateInput: {
        type: 'object', required: ['id', 'links'],
        properties: {
          id: { type: 'string' }, name: { type: 'string' },
          links: { type: 'array', items: { type: 'string' } },
          strength: { type: 'number', minimum: 0, maximum: 1 },
          role: { type: 'string' }
        }
      },
      CustodyItem: {
        type: 'object', required: ['id', 'collector', 'acquired_at', 'chain'],
        properties: {
          id: { type: 'string' }, description: { type: 'string' },
          collector: { type: 'string' }, acquired_at: { type: 'string' },
          storage_location: { type: 'string' },
          chain: { type: 'array', items: {
            type: 'object', required: ['from', 'to', 'timestamp'],
            properties: { from: { type: 'string' }, to: { type: 'string' }, timestamp: { type: 'string' }, note: { type: 'string' } }
          } }
        }
      }
    }
  };
}

function main(): void {
  bootstrapSkillRegistry();
  const registry = ToolRegistry.getInstance();
  registerInvestigationTools();
  const tools = registry.getAllTools();
  const outRoot = resolve(process.argv[2] ?? 'assets/schemas');
  const toolsDir = resolve(outRoot, 'tools');
  ensureDir(outRoot); ensureDir(toolsDir);

  // Per-tool JSON schemas
  for (const t of tools) {
    writeFileSync(resolve(toolsDir, `${t.name}.input.json`), JSON.stringify(toolComponentSchema(t, 'input'), null, 2));
    writeFileSync(resolve(toolsDir, `${t.name}.output.json`), JSON.stringify(toolComponentSchema(t, 'output'), null, 2));
  }

  // OpenAPI document
  writeFileSync(resolve(outRoot, 'openapi.json'), JSON.stringify(buildOpenApi(tools), null, 2));

  // Config schema copy
  copyFileSync(resolve(__dirname, '../config/schema.json'), resolve(outRoot, 'config.schema.json'));

  // Case-bundle schema
  writeFileSync(resolve(outRoot, 'case-bundle.schema.json'), JSON.stringify(caseBundleSchema(), null, 2));

  console.log(`Exported ${tools.length} tools -> ${outRoot}`);
  console.log('  - openapi.json');
  console.log('  - config.schema.json');
  console.log('  - case-bundle.schema.json');
  for (const t of tools) console.log(`  - tools/${t.name}.{input,output}.json`);
}

if (require.main === module) main();

export { buildOpenApi, caseBundleSchema };
