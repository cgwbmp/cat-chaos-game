// Asset service: loads rooms (code-built or .glb with Meshopt and KTX2) and shared models,
// caches models by URL and disposes a room's assets when it is unloaded.
import type { AssetContainer } from '@babylonjs/core/assetContainer';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { Scene } from '@babylonjs/core/scene';
import { readExtras } from '../core/extras';
import type { AssetService, ServiceFactory } from '../core/services';
import type { ObjectDef, RoomMarker } from '../core/types';
import { validateObjectDefs } from '../core/validate';

async function loadObjectDefs(url: string): Promise<ObjectDef[]> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load ${url}: HTTP ${response.status}`);
  const result = validateObjectDefs(await response.json());
  if (!result.ok) throw new Error(`Invalid objects.json (${url}):\n${result.errors.join('\n')}`);
  return result.objects;
}

let loaderReady: Promise<typeof import('@babylonjs/core/Loading/sceneLoader')> | undefined;

/** The glTF loader is only fetched when the first .glb is requested. */
function getLoader(): Promise<typeof import('@babylonjs/core/Loading/sceneLoader')> {
  loaderReady ??= (async () => {
    const [sceneLoader, { MeshoptCompression }, { MeshoptDecoder }] = await Promise.all([
      import('@babylonjs/core/Loading/sceneLoader'),
      import('@babylonjs/core/Meshes/Compression/meshoptCompression'),
      import('meshoptimizer/decoder'),
      import('@babylonjs/loaders/glTF/2.0'),
    ]);
    // Babylon fetches the Meshopt decoder from its CDN as a global script. Provide the bundled
    // decoder as that global instead, and point the script URL at an empty script.
    Object.assign(globalThis, { MeshoptDecoder });
    MeshoptCompression.Configuration.decoder.url = 'data:text/javascript,';
    return sceneLoader;
  })();
  return loaderReady;
}

async function loadContainer(
  url: string,
  scene: Scene,
  onProgress?: (fraction: number) => void,
): Promise<AssetContainer> {
  const { LoadAssetContainerAsync } = await getLoader();
  return LoadAssetContainerAsync(url, scene, {
    pluginExtension: '.glb',
    onProgress: (event) => {
      if (event.lengthComputable && event.total > 0) onProgress?.(event.loaded / event.total);
    },
  });
}

export const createAssetService: ServiceFactory<AssetService> = (services) => {
  const rooms = new Map<string, { root: TransformNode; container?: AssetContainer }>();
  const models = new Map<string, Promise<AssetContainer>>();

  return {
    async loadRoom(def, onProgress) {
      const { scene } = services.scene;
      const objectsLoading = loadObjectDefs(def.objectsJson);

      let root: TransformNode;
      let container: AssetContainer | undefined;
      if (def.builder) {
        root = (await def.builder())(scene);
      } else {
        container = await loadContainer(def.glb, scene, onProgress);
        container.addAllToScene();
        // The loader puts everything under one root node (it converts the handedness).
        root = container.createRootMesh();
        root.name = def.id;
      }
      rooms.set(def.id, { root, container });

      const markers: RoomMarker[] = [];
      for (const node of root.getChildTransformNodes(false)) {
        const { marker } = readExtras(node);
        if (marker) {
          node.setEnabled(false);
          markers.push({ marker, node });
        }
      }
      const markerNodes = new Set<TransformNode>(markers.map(({ node }) => node));
      const meshes = root
        .getChildMeshes(false)
        .filter((mesh) => !markerNodes.has(mesh) && mesh.getTotalVertices() > 0);

      const objects = await objectsLoading;
      onProgress?.(1);
      return { def, root, meshes, objects, markers };
    },

    unloadRoom(roomId) {
      const room = rooms.get(roomId);
      if (!room) return;
      room.root.dispose(false, true);
      room.container?.dispose();
      rooms.delete(roomId);
    },

    async loadModel(url) {
      const { scene } = services.scene;
      let loading = models.get(url);
      if (!loading) {
        loading = loadContainer(url, scene);
        models.set(url, loading);
      }
      const container = await loading;
      const root = new TransformNode(url, scene);
      // Instances keep the source names, so callers can find bones and clips by name.
      const instance = container.instantiateModelsToScene((name) => name);
      for (const node of instance.rootNodes) node.parent = root;
      return root;
    },
  };
};
