const nodeId = { type: 'string', pattern: '^[A-Za-z_][A-Za-z0-9_-]*$' }
const nodeIds = { type: 'array', minItems: 1, items: nodeId }

export const actionSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://beautiflow.cc/schemas/actions-v1.json',
  title: 'Beautiflow presentation actions',
  type: 'object',
  required: ['actions'],
  additionalProperties: false,
  properties: {
    actions: {
      type: 'array', minItems: 1,
      items: {
        oneOf: [
          { type: 'object', required: ['type', 'direction'], additionalProperties: false, properties: { type: { const: 'set-direction' }, direction: { enum: ['LR', 'TD'] } } },
          { type: 'object', required: ['type', 'nodes'], additionalProperties: false, properties: { type: { const: 'set-primary-flow' }, nodes: nodeIds } },
          { type: 'object', required: ['type', 'node', 'relativeTo', 'position'], additionalProperties: false, properties: { type: { const: 'place-relative' }, node: nodeId, relativeTo: nodeId, position: { enum: ['above', 'below', 'left', 'right'] }, gap: { type: 'number', minimum: 0 } } },
          { type: 'object', required: ['type', 'nodes', 'axis'], additionalProperties: false, properties: { type: { const: 'align' }, nodes: nodeIds, axis: { enum: ['left', 'center-x', 'center-y', 'top'] } } },
          { type: 'object', required: ['type', 'nodes', 'direction'], additionalProperties: false, properties: { type: { const: 'distribute' }, nodes: nodeIds, direction: { enum: ['horizontal', 'vertical'] } } },
          { type: 'object', required: ['type', 'nodes', 'role'], additionalProperties: false, properties: { type: { const: 'set-role' }, nodes: nodeIds, role: { enum: ['primary', 'secondary', 'exception'] } } },
          { type: 'object', required: ['type', 'nodes'], additionalProperties: false, properties: { type: { const: 'pin' }, nodes: nodeIds, pinned: { type: 'boolean' } } },
        ],
      },
    },
  },
} as const

const shape = { enum: ['rectangle', 'rounded', 'diamond', 'stadium', 'circle', 'subroutine', 'doublecircle', 'hexagon', 'cylinder', 'asymmetric', 'trapezoid', 'trapezoid-alt', 'state-start', 'state-end'] }
const edgeProperties = { type: { type: 'string' }, source: nodeId, target: nodeId, label: { type: 'string', minLength: 1 } }

export const transformationSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://beautiflow.cc/schemas/transformations-v1.json',
  title: 'Beautiflow graph transformations',
  type: 'object', required: ['actions'], additionalProperties: false,
  properties: {
    actions: {
      type: 'array', minItems: 1,
      items: {
        oneOf: [
          { type: 'object', required: ['type', 'id', 'label'], additionalProperties: false, properties: { type: { const: 'add-node' }, id: nodeId, label: { type: 'string', minLength: 1 }, shape } },
          { type: 'object', required: ['type', 'id'], additionalProperties: false, properties: { type: { const: 'remove-node' }, id: nodeId } },
          { type: 'object', required: ['type', 'id'], additionalProperties: false, properties: { type: { const: 'rename-node' }, id: nodeId, newId: nodeId, label: { type: 'string', minLength: 1 } }, anyOf: [{ required: ['newId'] }, { required: ['label'] }] },
          { type: 'object', required: ['type', 'id', 'shape'], additionalProperties: false, properties: { type: { const: 'set-node-shape' }, id: nodeId, shape } },
          { type: 'object', required: ['type', 'source', 'target'], additionalProperties: false, properties: { ...edgeProperties, type: { const: 'add-edge' }, style: { enum: ['solid', 'dotted', 'thick'] } } },
          { type: 'object', required: ['type', 'source', 'target'], additionalProperties: false, properties: { ...edgeProperties, type: { const: 'remove-edge' } } },
          { type: 'object', required: ['type', 'source', 'target'], additionalProperties: false, properties: { ...edgeProperties, type: { const: 'set-edge-label' } } },
          { type: 'object', required: ['type', 'source', 'target'], additionalProperties: false, properties: { ...edgeProperties, type: { const: 'reverse-edge' } } },
          { type: 'object', required: ['type', 'id', 'label', 'between'], additionalProperties: false, properties: { type: { const: 'insert-node' }, id: nodeId, label: { type: 'string', minLength: 1 }, shape, between: { type: 'object', required: ['source', 'target'], additionalProperties: false, properties: { source: nodeId, target: nodeId } } } },
          { type: 'object', required: ['type', 'id'], additionalProperties: false, properties: { type: { const: 'bypass-node' }, id: nodeId } },
          { type: 'object', required: ['type', 'id', 'label', 'nodes'], additionalProperties: false, properties: { type: { const: 'create-subgraph' }, id: nodeId, label: { type: 'string', minLength: 1 }, nodes: nodeIds } },
          { type: 'object', required: ['type', 'subgraph', 'nodes'], additionalProperties: false, properties: { type: { const: 'move-to-subgraph' }, subgraph: nodeId, nodes: nodeIds } },
        ],
      },
    },
  },
} as const

export const agentReceiptSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://beautiflow.cc/schemas/agent-receipt-v1.json',
  title: 'Beautiflow bounded agent receipt',
  type: 'object',
  required: ['receiptVersion', 'protocolVersion', 'state', 'source', 'initialOperation', 'pendingOperation', 'hashes', 'budget', 'snapshot'],
  properties: {
    receiptVersion: { const: 1 },
    protocolVersion: { const: '1.1' },
    state: { enum: ['validated', 'applied', 'verified', 'needs-correction', 'complete', 'stale', 'blocked', 'rolled-back'] },
    initialOperation: { enum: ['polish', 'apply', 'transform'] },
    pendingOperation: { enum: ['polish', 'apply', 'transform'] },
    source: { type: 'string' },
    actions: { type: ['string', 'null'] },
    expected: {
      type: 'object', required: ['score', 'metrics', 'semanticScore'],
      properties: {
        score: { type: 'number' },
        metrics: { type: 'object', additionalProperties: { type: 'number' } },
        semanticScore: { type: 'number' },
        baselineScore: { type: 'number' },
      },
    },
    budget: {
      type: 'object', required: ['initialOperations', 'targetedCorrections', 'visualInspections'],
      properties: { initialOperations: { const: 1 }, targetedCorrections: { enum: [0, 1] }, visualInspections: { enum: [0, 1] } },
    },
  },
} as const

export function schemaContract() {
  return {
    protocolVersion: '1.1',
    ok: true,
    operation: 'schema',
    changed: false,
    schemas: {
      actions: actionSchema,
      transformations: transformationSchema,
      agentReceipt: agentReceiptSchema,
    },
    nextAction: null,
  }
}
