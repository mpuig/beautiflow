import type { ArchitectureModel } from 'pele'
export const boundaryKinds = ['account','region','vpc','az','subnet','logical'] as const
export const relationshipKinds = ['request','identity','event','replication','control','recovery'] as const
export type BoundaryKind = typeof boundaryKinds[number]
export type RelationshipKind = typeof relationshipKinds[number]
export interface Relationship { source: string; target: string; kind: RelationshipKind; meaning: string }
/** Gallery-only authored Mermaid comments. Not an AWS configuration validator or CLI feature. */
export function architectureAnnotations(source: string, model: ArchitectureModel) {
  const boundaries = new Map<string, BoundaryKind>(), relationships = new Map<string, Relationship>()
  for(const line of source.split('\n')) {
    if(!/^\s*%%\s*@/.test(line))continue
    let match=line.match(/^%% @boundary (\w+) (\w+)$/)
    if(match) {
      const [,id,kind]=match
      if(!model.groups.has(id!) || boundaries.has(id!) || !boundaryKinds.includes(kind as BoundaryKind))throw new Error(`Invalid boundary annotation: ${line}`)
      boundaries.set(id!,kind as BoundaryKind);continue
    }
    match=line.match(/^%% @edge (\w+) (\w+) (\w+) \| (.+)$/)
    if(match) {
      const [,from,to,kind,meaning]=match,key=`${from}-${to}`
      if(!relationshipKinds.includes(kind as RelationshipKind) || relationships.has(key) || !model.edges.some(e=>e.lhsId===from&&e.rhsId===to))throw new Error(`Invalid relationship annotation: ${line}`)
      relationships.set(key,{source:from!,target:to!,kind:kind as RelationshipKind,meaning:meaning!});continue
    }
    throw new Error(`Unknown gallery annotation: ${line}`)
  }
  if(boundaries.size!==model.groups.size || relationships.size!==model.edges.length)throw new Error('Every boundary and relationship requires exactly one gallery annotation')
  const expectedParents: Partial<Record<BoundaryKind,BoundaryKind>>={region:'account',vpc:'region',az:'vpc',subnet:'az'}
  for(const [id,kind] of boundaries) {
    const parent=model.groups.get(id)!.in
    if(kind==='account'&&parent)throw new Error('Account boundaries cannot be nested')
    if(expectedParents[kind]&&(!parent||boundaries.get(parent)!==expectedParents[kind]))throw new Error(`Invalid ${kind} parent: ${id}`)
  }
  for(const node of model.nodes.values()) {
    let parent=node.in
    while(parent) {
      if(boundaries.get(parent)==='az'&&node.type==='service'&&!['aws:fargate','aws:ec2','aws:aurora','aws:rds'].includes(node.icon??''))throw new Error(`Regional/global service cannot be drawn as a zonal instance: ${node.id}`)
      if(boundaries.get(parent)==='vpc'&&node.type==='service'&&['aws:sqs','aws:dynamodb','aws:cognito','aws:eventbridge','aws:api-gateway','aws:s3','aws:kinesis','aws:cloudwatch','aws:sns'].includes(node.icon??''))throw new Error(`Regional service should be outside the VPC boundary: ${node.id}`)
      parent=model.groups.get(parent)?.in
    }
  }
  return {boundaries,relationships,coverage:'authored-annotations-and-containment-only' as const}
}
