import { IConcept, IKnowledgeMap, ILearningPath, IMapEdge, IMapLayout, IPositionedConcept } from './knowledge-map.interfaces';
import { MasteryByConceptKey, MasteryLevel } from './knowledge-map.types';

export class GraphHelper {
  private static readonly _nodeWidth: number = 168;
  private static readonly _nodeHeight: number = 56;
  private static readonly _horizontalGap: number = 24;
  private static readonly _verticalGap: number = 64;
  private static readonly _padding: number = 24;
  private static readonly _maxLineLength: number = 20;

  public static conceptKey(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  public static masteryOf(concept: IConcept, mastery: MasteryByConceptKey): MasteryLevel {
    return mastery[GraphHelper.conceptKey(concept.title)] ?? 'new';
  }

  public static prerequisitesOf(map: IKnowledgeMap, conceptId: string): IConcept[] {
    const concept: IConcept | undefined = map.concepts.find((candidate: IConcept) => candidate.id === conceptId);
    if (!concept) {
      return [];
    }

    const prerequisites: IConcept[] = [];
    for (const prerequisiteId of concept.prerequisiteIds) {
      const prerequisite: IConcept | undefined = map.concepts.find((candidate: IConcept) => candidate.id === prerequisiteId);
      if (prerequisite && !prerequisites.includes(prerequisite)) {
        prerequisites.push(prerequisite);
      }
    }

    return prerequisites;
  }

  public static allPrerequisitesOf(map: IKnowledgeMap, conceptId: string): IConcept[] {
    const ordered: IConcept[] = [];
    const visited: Set<string> = new Set<string>([conceptId]);
    GraphHelper._collectPrerequisites(map, conceptId, visited, ordered);

    return ordered;
  }

  public static missingPrerequisitesOf(
    map: IKnowledgeMap,
    conceptId: string,
    mastery: MasteryByConceptKey,
  ): IConcept[] {
    return GraphHelper.allPrerequisitesOf(map, conceptId).filter(
      (concept: IConcept) => GraphHelper.masteryOf(concept, mastery) !== 'known',
    );
  }

  public static learningPath(
    map: IKnowledgeMap,
    goalConceptId: string,
    mastery: MasteryByConceptKey,
  ): ILearningPath {
    const goal: IConcept = map.concepts.find((concept: IConcept) => concept.id === goalConceptId) ?? map.concepts[map.concepts.length - 1];
    const depths: Map<string, number> = GraphHelper._depths(map);
    const candidates: IConcept[] = [...GraphHelper.allPrerequisitesOf(map, goal.id), goal];
    const known: IConcept[] = [];
    const unknown: IConcept[] = [];
    for (const concept of candidates) {
      if (GraphHelper.masteryOf(concept, mastery) === 'known' && concept.id !== goal.id) {
        known.push(concept);
      } else {
        unknown.push(concept);
      }
    }

    const position = (concept: IConcept): number => map.concepts.indexOf(concept);
    const steps: IConcept[] = unknown.sort(
      (first: IConcept, second: IConcept) =>
        (depths.get(first.id) ?? 0) - (depths.get(second.id) ?? 0) || position(first) - position(second),
    );
    const skipped: IConcept[] = known.sort((first: IConcept, second: IConcept) => position(first) - position(second));
    const nextStep: IConcept | null =
      steps.find((step: IConcept) =>
        GraphHelper.prerequisitesOf(map, step.id).every(
          (prerequisite: IConcept) => GraphHelper.masteryOf(prerequisite, mastery) === 'known',
        ),
      ) ?? null;

    return { goal, steps, skipped, nextStep };
  }

  public static layout(map: IKnowledgeMap): IMapLayout {
    const nodeWidth: number = GraphHelper._nodeWidth;
    const nodeHeight: number = GraphHelper._nodeHeight;
    const depths: Map<string, number> = GraphHelper._depths(map);
    const maxDepth: number = Math.max(0, ...Array.from(depths.values()));
    const rows: IConcept[][] = [];
    for (let depth = 0; depth <= maxDepth; depth++) {
      rows.push(map.concepts.filter((concept: IConcept) => depths.get(concept.id) === depth));
    }

    const maxRowSize: number = Math.max(1, ...rows.map((row: IConcept[]) => row.length));
    const contentWidth: number = maxRowSize * nodeWidth + (maxRowSize - 1) * GraphHelper._horizontalGap;
    const width: number = contentWidth + GraphHelper._padding * 2;
    const height: number =
      rows.length * nodeHeight + (rows.length - 1) * GraphHelper._verticalGap + GraphHelper._padding * 2;
    const nodesById: Map<string, IPositionedConcept> = new Map<string, IPositionedConcept>();
    const nodes: IPositionedConcept[] = [];

    rows.forEach((row: IConcept[], depth: number) => {
      const barycenters: Map<string, number> = new Map<string, number>();
      for (const concept of row) {
        const placed: IPositionedConcept[] = GraphHelper.prerequisitesOf(map, concept.id)
          .map((prerequisite: IConcept) => nodesById.get(prerequisite.id))
          .filter((node: IPositionedConcept | undefined): node is IPositionedConcept => !!node);
        const average: number = placed.length
          ? placed.reduce((sum: number, node: IPositionedConcept) => sum + node.x + nodeWidth / 2, 0) / placed.length
          : width / 2;
        barycenters.set(concept.id, average);
      }

      const sortedRow: IConcept[] = [...row].sort(
        (first: IConcept, second: IConcept) =>
          (barycenters.get(first.id) ?? 0) - (barycenters.get(second.id) ?? 0) ||
          map.concepts.indexOf(first) - map.concepts.indexOf(second),
      );
      const rowWidth: number = sortedRow.length * nodeWidth + (sortedRow.length - 1) * GraphHelper._horizontalGap;
      const startX: number = GraphHelper._padding + (contentWidth - rowWidth) / 2;
      const y: number = GraphHelper._padding + depth * (nodeHeight + GraphHelper._verticalGap);

      sortedRow.forEach((concept: IConcept, index: number) => {
        const node: IPositionedConcept = {
          concept,
          x: startX + index * (nodeWidth + GraphHelper._horizontalGap),
          y,
          depth,
          titleLines: GraphHelper._wrapTitle(concept.title),
        };
        nodesById.set(concept.id, node);
        nodes.push(node);
      });
    });

    const edges: IMapEdge[] = [];
    for (const node of nodes) {
      for (const prerequisite of GraphHelper.prerequisitesOf(map, node.concept.id)) {
        const from: IPositionedConcept | undefined = nodesById.get(prerequisite.id);
        if (!from) {
          continue;
        }

        const startX: number = from.x + nodeWidth / 2;
        const startY: number = from.y + nodeHeight;
        const endX: number = node.x + nodeWidth / 2;
        const endY: number = node.y;
        const midY: number = (startY + endY) / 2;
        edges.push({
          fromConceptId: prerequisite.id,
          toConceptId: node.concept.id,
          svgPath: `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`,
        });
      }
    }

    return { width, height, nodeWidth, nodeHeight, nodes, edges };
  }

  private static _collectPrerequisites(
    map: IKnowledgeMap,
    conceptId: string,
    visited: Set<string>,
    ordered: IConcept[],
  ): void {
    for (const prerequisite of GraphHelper.prerequisitesOf(map, conceptId)) {
      if (visited.has(prerequisite.id)) {
        continue;
      }

      visited.add(prerequisite.id);
      GraphHelper._collectPrerequisites(map, prerequisite.id, visited, ordered);
      ordered.push(prerequisite);
    }
  }

  private static _depths(map: IKnowledgeMap): Map<string, number> {
    const depths: Map<string, number> = new Map<string, number>();
    for (const concept of map.concepts) {
      GraphHelper._depthOf(map, concept.id, depths, new Set<string>());
    }

    return depths;
  }

  private static _depthOf(
    map: IKnowledgeMap,
    conceptId: string,
    depths: Map<string, number>,
    path: Set<string>,
  ): number {
    const cached: number | undefined = depths.get(conceptId);
    if (cached !== undefined) {
      return cached;
    }

    if (path.has(conceptId)) {
      return 0;
    }

    path.add(conceptId);
    let depth = 0;
    for (const prerequisite of GraphHelper.prerequisitesOf(map, conceptId)) {
      depth = Math.max(depth, GraphHelper._depthOf(map, prerequisite.id, depths, path) + 1);
    }

    path.delete(conceptId);
    depths.set(conceptId, depth);

    return depth;
  }

  private static _wrapTitle(title: string): string[] {
    const words: string[] = title.split(/\s+/).filter((word: string) => word.length > 0);
    let firstLine = '';
    let index = 0;
    while (index < words.length) {
      const candidate: string = firstLine ? `${firstLine} ${words[index]}` : words[index];
      if (firstLine && candidate.length > GraphHelper._maxLineLength) {
        break;
      }

      firstLine = candidate;
      index++;
    }

    if (index >= words.length) {
      return [firstLine];
    }

    let secondLine: string = words.slice(index).join(' ');
    if (secondLine.length > GraphHelper._maxLineLength) {
      secondLine = `${secondLine.slice(0, GraphHelper._maxLineLength - 1)}…`;
    }

    return [firstLine, secondLine];
  }
}
