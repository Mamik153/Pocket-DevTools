export type ScaffoldNodeType = "string" | "number" | "boolean" | "null" | "object" | "array";

export interface ScaffoldNode {
  id: string;
  type: ScaffoldNodeType;
  key?: string;
  children: ScaffoldNode[];
}

let nodeCounter = 0;

const CONTAINER_TYPES: ReadonlySet<ScaffoldNodeType> = new Set(["object", "array"]);

const DEFAULT_VALUE_BY_TYPE: Record<Exclude<ScaffoldNodeType, "object" | "array">, unknown> = {
  string: "example",
  number: 123,
  boolean: true,
  null: null,
};

function createNodeId() {
  nodeCounter += 1;
  return `scaffold_${nodeCounter}`;
}

export function isContainerType(type: ScaffoldNodeType): boolean {
  return CONTAINER_TYPES.has(type);
}

export function createScaffoldNode(type: ScaffoldNodeType, key?: string): ScaffoldNode {
  return {
    id: createNodeId(),
    type,
    key,
    children: [],
  };
}

export function createInitialScaffold(): ScaffoldNode {
  const root = createScaffoldNode("object");
  root.children = [
    createScaffoldNode("string", "name"),
    createScaffoldNode("number", "version"),
    createScaffoldNode("boolean", "active"),
  ];
  return root;
}

function withUpdatedNode(
  node: ScaffoldNode,
  targetId: string,
  update: (node: ScaffoldNode) => ScaffoldNode,
): ScaffoldNode {
  if (node.id === targetId) {
    return update(node);
  }

  if (!node.children.length) {
    return node;
  }

  let changed = false;
  const children = node.children.map((child) => {
    const updated = withUpdatedNode(child, targetId, update);
    if (updated !== child) {
      changed = true;
    }
    return updated;
  });

  return changed ? { ...node, children } : node;
}

export function updateScaffoldNodeType(tree: ScaffoldNode, targetId: string, nextType: ScaffoldNodeType): ScaffoldNode {
  return withUpdatedNode(tree, targetId, (node) => {
    const nextChildren = isContainerType(nextType)
      ? node.type === nextType
        ? node.children
        : []
      : [];

    return {
      ...node,
      type: nextType,
      children: nextChildren,
    };
  });
}

export function updateScaffoldNodeKey(tree: ScaffoldNode, targetId: string, key: string): ScaffoldNode {
  return withUpdatedNode(tree, targetId, (node) => ({ ...node, key }));
}

export function addScaffoldChild(tree: ScaffoldNode, parentId: string): ScaffoldNode {
  return withUpdatedNode(tree, parentId, (node) => {
    if (!isContainerType(node.type)) {
      return node;
    }

    const childIndex = node.children.length + 1;
    const child =
      node.type === "object"
        ? createScaffoldNode("string", `field_${childIndex}`)
        : createScaffoldNode("string");

    return {
      ...node,
      children: [...node.children, child],
    };
  });
}

function removeNodeById(node: ScaffoldNode, targetId: string): ScaffoldNode {
  if (!node.children.length) {
    return node;
  }

  let changed = false;
  const children: ScaffoldNode[] = [];

  for (const child of node.children) {
    if (child.id === targetId) {
      changed = true;
      continue;
    }

    const updatedChild = removeNodeById(child, targetId);
    if (updatedChild !== child) {
      changed = true;
    }
    children.push(updatedChild);
  }

  return changed ? { ...node, children } : node;
}

export function removeScaffoldNode(tree: ScaffoldNode, targetId: string): ScaffoldNode {
  if (tree.id === targetId) {
    return tree;
  }

  return removeNodeById(tree, targetId);
}

export function scaffoldNodeToJsonValue(node: ScaffoldNode): unknown {
  switch (node.type) {
    case "object": {
      const objectValue: Record<string, unknown> = {};
      node.children.forEach((child, index) => {
        const key = child.key?.trim() || `field_${index + 1}`;
        objectValue[key] = scaffoldNodeToJsonValue(child);
      });
      return objectValue;
    }
    case "array":
      return node.children.map((child) => scaffoldNodeToJsonValue(child));
    default:
      return DEFAULT_VALUE_BY_TYPE[node.type];
  }
}

export function scaffoldToPrettyJson(node: ScaffoldNode): string {
  return JSON.stringify(scaffoldNodeToJsonValue(node), null, 2);
}
