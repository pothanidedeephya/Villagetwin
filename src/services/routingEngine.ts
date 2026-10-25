import type { FeatureCollection, LineString } from 'geojson';
import type { RoadProperties } from '../types/village';
import { calculateHaversineKm } from './floodDataService';

export interface GraphNode {
  id: string;
  coordinates: [number, number]; // [lng, lat]
  elevation_m?: number;
  connectedEdges: string[];
}

export interface GraphEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  roadId: string;
  roadName: string;
  roadType: string;
  surface: string;
  length_m: number;
  elevation_m: number;
  floodDepth_m: number;
  isBlocked: boolean;
  weight: number;
  coordinates: [number, number][];
}

export interface RoutableRoadGraph {
  nodes: Map<string, GraphNode>;
  edges: Map<string, GraphEdge>;
  totalRoadCount: number;
  passableEdgeCount: number;
  blockedEdgeCount: number;
}

export interface RouteSearchResult {
  success: boolean;
  isPassable: boolean;
  clearanceStatus: 'Clear & Passable' | 'Conditional (Caution)' | 'Impassable (Blocked)';
  totalDistance_m: number;
  estimatedWalkingMinutes: number;
  maxFloodDepth_m: number;
  submergedDistance_m: number;
  orderedNodes: GraphNode[];
  orderedEdges: GraphEdge[];
  routeGeometry: FeatureCollection<LineString, any>;
  stepInstructions: string[];
  blockageReason?: string;
}

/**
 * Snap tolerance: 0.00015 degrees is ~16.5 meters at the equator.
 * Road junctions within this tolerance are merged into a single graph intersection vertex.
 */
const NODE_SNAP_TOLERANCE_DEG = 0.00015;

function findOrCreateNode(
  nodes: Map<string, GraphNode>,
  coords: [number, number],
  elevation_m: number = 25
): GraphNode {
  const [lng, lat] = coords;

  // Search existing nodes within snap tolerance
  for (const node of nodes.values()) {
    const dLng = Math.abs(node.coordinates[0] - lng);
    const dLat = Math.abs(node.coordinates[1] - lat);
    if (dLng <= NODE_SNAP_TOLERANCE_DEG && dLat <= NODE_SNAP_TOLERANCE_DEG) {
      return node;
    }
  }

  // Create new node
  const id = `node-${nodes.size + 1}-${lng.toFixed(5)}-${lat.toFixed(5)}`;
  const newNode: GraphNode = {
    id,
    coordinates: [Number(lng.toFixed(6)), Number(lat.toFixed(6))],
    elevation_m,
    connectedEdges: [],
  };
  nodes.set(id, newNode);
  return newNode;
}

/**
 * Build topological graph from GeoJSON road network with hydrodynamic flood impact weights.
 */
export function buildRoadNetworkGraph(
  roads: FeatureCollection<LineString, RoadProperties>,
  affectedRoads: Array<{ id: string; depth_m: number; impassable: boolean }> = [],
  closureThreshold_m: number = 0.25
): RoutableRoadGraph {
  const nodes = new Map<string, GraphNode>();
  const edges = new Map<string, GraphEdge>();

  const depthMap = new Map<string, { depth: number; impassable: boolean }>();
  affectedRoads.forEach((ar) => {
    depthMap.set(ar.id, { depth: ar.depth_m, impassable: ar.impassable });
  });

  let passableEdgeCount = 0;
  let blockedEdgeCount = 0;

  roads.features.forEach((road, roadIdx) => {
    const coords = road.geometry?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) return;

    const roadProp = road.properties || ({} as any);
    const roadId = roadProp.id || `rd-${roadIdx + 1}`;
    const roadName = roadProp.name || `Road Corridor #${roadIdx + 1}`;
    const roadType = roadProp.roadType || 'Panchayat Arterial';
    const surface = roadProp.surface || 'Bitumen/Asphalt';
    const elev = typeof roadProp.elevation_m === 'number' ? roadProp.elevation_m : 25;

    const floodInfo = depthMap.get(roadId);
    const floodDepth = floodInfo ? floodInfo.depth : 0;
    const isBlocked = floodInfo?.impassable || floodDepth > closureThreshold_m;

    // Connect successive coordinate vertices as individual topological segments
    for (let i = 0; i < coords.length - 1; i++) {
      const p1 = coords[i] as [number, number];
      const p2 = coords[i + 1] as [number, number];

      const node1 = findOrCreateNode(nodes, p1, elev);
      const node2 = findOrCreateNode(nodes, p2, elev);

      if (node1.id === node2.id) continue; // Skip degenerate zero-distance segments

      if (isBlocked) {
        blockedEdgeCount++;
      } else {
        passableEdgeCount++;
      }

      const segDistMeters = Math.max(
        10,
        Math.round(calculateHaversineKm(p1, p2) * 1000)
      );

      // Weight calculation:
      // If blocked by flood: Infinity
      // Else: physical distance with impedance penalties for standing water and unpaved surface
      let weight = segDistMeters;
      if (isBlocked) {
        weight = Infinity;
      } else {
        if (floodDepth > 0.05) {
          // Standing water slows evacuation speed and increases hazard risk
          weight *= 1 + floodDepth * 3.5;
        }
        if (surface.toLowerCase().includes('gravel') || surface.toLowerCase().includes('track') || surface.toLowerCase().includes('earthen')) {
          weight *= 1.35; // Unpaved surface penalty
        }
      }

      const edgeId = `edge-${roadId}-seg-${i + 1}`;
      const edge: GraphEdge = {
        id: edgeId,
        sourceNodeId: node1.id,
        targetNodeId: node2.id,
        roadId,
        roadName,
        roadType,
        surface,
        length_m: segDistMeters,
        elevation_m: elev,
        floodDepth_m: floodDepth,
        isBlocked,
        weight,
        coordinates: [p1, p2],
      };

      edges.set(edgeId, edge);
      node1.connectedEdges.push(edgeId);
      node2.connectedEdges.push(edgeId);
    }
  });

  return {
    nodes,
    edges,
    totalRoadCount: roads.features.length,
    passableEdgeCount,
    blockedEdgeCount,
  };
}

/**
 * Find nearest node in the road graph to a given coordinate.
 */
export function findNearestGraphNode(
  graph: RoutableRoadGraph,
  targetCoords: [number, number]
): GraphNode | null {
  const [targetLng, targetLat] = targetCoords;
  let bestNode: GraphNode | null = null;
  let minDistanceKm = Infinity;

  for (const node of graph.nodes.values()) {
    const dist = calculateHaversineKm(targetCoords, node.coordinates);
    if (dist < minDistanceKm) {
      minDistanceKm = dist;
      bestNode = node;
    }
  }

  return bestNode;
}

/**
 * Dijkstra's shortest and safest path algorithm on the routable road graph.
 * If allowBlockedFallback is true and all paths are blocked, returns the best physical path with explicit blocked warnings.
 */
export function findSafestEvacuationPath(
  graph: RoutableRoadGraph,
  originCoords: [number, number],
  destinationCoords: [number, number],
  allowBlockedFallback: boolean = true
): RouteSearchResult {
  const startNode = findNearestGraphNode(graph, originCoords);
  const endNode = findNearestGraphNode(graph, destinationCoords);

  if (!startNode || !endNode || graph.nodes.size === 0) {
    return {
      success: false,
      isPassable: false,
      clearanceStatus: 'Impassable (Blocked)',
      totalDistance_m: 0,
      estimatedWalkingMinutes: 0,
      maxFloodDepth_m: 0,
      submergedDistance_m: 0,
      orderedNodes: [],
      orderedEdges: [],
      routeGeometry: { type: 'FeatureCollection', features: [] },
      stepInstructions: ['No road graph nodes found within village bounding box.'],
      blockageReason: 'Road network unavailable or disconnected from selected coordinates.',
    };
  }

  // Helper: Dijkstra search with specific edge weighting
  const runDijkstra = (ignoreBlockage: boolean) => {
    const distances = new Map<string, number>();
    const previous = new Map<string, { nodeId: string; edgeId: string }>();
    const unvisited = new Set<string>();

    for (const nodeId of graph.nodes.keys()) {
      distances.set(nodeId, Infinity);
      unvisited.add(nodeId);
    }
    distances.set(startNode.id, 0);

    while (unvisited.size > 0) {
      // Find unvisited node with smallest distance
      let currentId: string | null = null;
      let minVal = Infinity;
      for (const nodeId of unvisited) {
        const d = distances.get(nodeId)!;
        if (d < minVal) {
          minVal = d;
          currentId = nodeId;
        }
      }

      if (!currentId || minVal === Infinity) break;
      if (currentId === endNode.id) break;

      unvisited.delete(currentId);
      const currentNode = graph.nodes.get(currentId)!;

      for (const edgeId of currentNode.connectedEdges) {
        const edge = graph.edges.get(edgeId)!;
        if (!ignoreBlockage && edge.isBlocked) continue;

        const neighborId =
          edge.sourceNodeId === currentId ? edge.targetNodeId : edge.sourceNodeId;

        if (!unvisited.has(neighborId)) continue;

        const edgeWeight = ignoreBlockage ? edge.length_m : edge.weight;
        const alt = distances.get(currentId)! + edgeWeight;

        if (alt < distances.get(neighborId)!) {
          distances.set(neighborId, alt);
          previous.set(neighborId, { nodeId: currentId, edgeId });
        }
      }
    }

    return { distances, previous };
  };

  // 1. First attempt: strict safe routing avoiding any flooded/blocked roads
  let result = runDijkstra(false);
  let isPathBlocked = false;

  // 2. If no passable path exists, check if a physically connected road path exists but is severed by flood
  if (!result.previous.has(endNode.id) && startNode.id !== endNode.id) {
    if (allowBlockedFallback) {
      result = runDijkstra(true);
      isPathBlocked = true;
    }
  }

  if (!result.previous.has(endNode.id) && startNode.id !== endNode.id) {
    return {
      success: false,
      isPassable: false,
      clearanceStatus: 'Impassable (Blocked)',
      totalDistance_m: 0,
      estimatedWalkingMinutes: 0,
      maxFloodDepth_m: 0,
      submergedDistance_m: 0,
      orderedNodes: [startNode],
      orderedEdges: [],
      routeGeometry: { type: 'FeatureCollection', features: [] },
      stepInstructions: [
        'Safe evacuation route could not be established.',
        'All connecting road corridors are completely cut off by simulated floodwater.',
        'Shelter-in-place on highest domestic plinth until emergency rescue boat deployment.',
      ],
      blockageReason: 'All connecting road corridors severed by water depth exceeding safety threshold.',
    };
  }

  // Reconstruct path from endNode backwards to startNode
  const pathNodes: GraphNode[] = [];
  const pathEdges: GraphEdge[] = [];
  let currId = endNode.id;

  while (currId !== startNode.id) {
    const prevEntry = result.previous.get(currId);
    if (!prevEntry) break;
    const node = graph.nodes.get(currId);
    if (node) pathNodes.unshift(node);
    const edge = graph.edges.get(prevEntry.edgeId);
    if (edge) pathEdges.unshift(edge);
    currId = prevEntry.nodeId;
  }
  pathNodes.unshift(startNode);

  // Compute physical metrics from the ordered path
  const totalDistance_m = pathEdges.reduce((sum, e) => sum + e.length_m, 0);
  const maxFloodDepth_m = Math.max(0, ...pathEdges.map((e) => e.floodDepth_m));
  const submergedDistance_m = pathEdges
    .filter((e) => e.floodDepth_m > 0)
    .reduce((sum, e) => sum + e.length_m, 0);

  const hasSeveredEdge = isPathBlocked || pathEdges.some((e) => e.isBlocked);
  const isPassable = !hasSeveredEdge;

  const clearanceStatus: RouteSearchResult['clearanceStatus'] = hasSeveredEdge
    ? 'Impassable (Blocked)'
    : maxFloodDepth_m > 0.1
    ? 'Conditional (Caution)'
    : 'Clear & Passable';

  // Walking speed: 75 m/min dry, 50 m/min in 10-15cm water, 30 m/min if deeper
  const walkingSpeed = maxFloodDepth_m > 0.15 ? 40 : maxFloodDepth_m > 0.05 ? 55 : 75;
  const estimatedWalkingMinutes = Math.max(4, Math.round(totalDistance_m / walkingSpeed));

  // Construct continuous GeoJSON LineString geometry
  const routeLineCoordinates: [number, number][] = [];
  pathEdges.forEach((edge, idx) => {
    if (idx === 0) {
      routeLineCoordinates.push(edge.coordinates[0]);
      routeLineCoordinates.push(edge.coordinates[1]);
    } else {
      routeLineCoordinates.push(edge.coordinates[1]);
    }
  });

  const routeGeometry: FeatureCollection<LineString, any> = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          name: 'Evacuation Route',
          distance_m: totalDistance_m,
          maxDepth_m: maxFloodDepth_m,
          clearanceStatus,
        },
        geometry: {
          type: 'LineString',
          coordinates: routeLineCoordinates.length > 0 ? routeLineCoordinates : [startNode.coordinates, endNode.coordinates],
        },
      },
    ],
  };

  // Generate step-by-step navigation instructions by grouping contiguous segments of the same road
  const stepInstructions: string[] = [];
  if (hasSeveredEdge) {
    stepInstructions.push(
      `⚠️ WARNING: This corridor is SEVERED by flood depth up to ${maxFloodDepth_m.toFixed(2)}m. Road passage by pedestrians or light vehicles is extremely hazardous.`
    );
  } else if (maxFloodDepth_m > 0) {
    stepInstructions.push(
      `Notice: Road corridor has standing water up to ${maxFloodDepth_m.toFixed(2)}m on lower dips. Wading required; maintain rope contact.`
    );
  } else {
    stepInstructions.push(
      `All road segments along this evacuation corridor are currently verified free from standing floodwater.`
    );
  }

  // Group contiguous segments by road name
  let currentRoadName = '';
  let currentRoadDist = 0;
  let currentRoadDepth = 0;

  pathEdges.forEach((edge) => {
    if (edge.roadName === currentRoadName) {
      currentRoadDist += edge.length_m;
      currentRoadDepth = Math.max(currentRoadDepth, edge.floodDepth_m);
    } else {
      if (currentRoadName) {
        stepInstructions.push(
          `Proceed ${currentRoadDist}m along ${currentRoadName}${
            currentRoadDepth > 0 ? ` (standing water: ${currentRoadDepth.toFixed(2)}m)` : ' (dry pavement)'
          }.`
        );
      }
      currentRoadName = edge.roadName;
      currentRoadDist = edge.length_m;
      currentRoadDepth = edge.floodDepth_m;
    }
  });

  if (currentRoadName) {
    stepInstructions.push(
      `Continue ${currentRoadDist}m along ${currentRoadName} to arrive at safe refuge destination.`
    );
  }

  stepInstructions.push(
    `Arrive at elevated destination (${pathNodes[pathNodes.length - 1]?.elevation_m || 25}m AMSL) and register with Gram Panchayat relief desk.`
  );

  return {
    success: true,
    isPassable,
    clearanceStatus,
    totalDistance_m,
    estimatedWalkingMinutes,
    maxFloodDepth_m,
    submergedDistance_m,
    orderedNodes: pathNodes,
    orderedEdges: pathEdges,
    routeGeometry,
    stepInstructions,
    blockageReason: hasSeveredEdge
      ? `Water depth (${maxFloodDepth_m.toFixed(2)}m) exceeds safe wading closure threshold.`
      : undefined,
  };
}
