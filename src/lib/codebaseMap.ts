/**
 * Codebase Map - Static analysis using Vite's import.meta.glob
 * Generates a complete map of pages, edge functions, hooks, and components
 */

// Import all page modules (build-time discovery)
const pageModules = import.meta.glob('/src/pages/**/*.tsx', { eager: false });
const hookModules = import.meta.glob('/src/hooks/**/*.tsx', { eager: false });
const componentModules = import.meta.glob('/src/components/**/*.tsx', { eager: false });
const edgeFunctionModules = import.meta.glob('/supabase/functions/**/index.ts', { eager: false });
const libModules = import.meta.glob('/src/lib/**/*.ts', { eager: false });

export type ModuleType = 'page' | 'hook' | 'component' | 'edge-function' | 'lib';

export interface CodeModule {
  type: ModuleType;
  file: string;
  route?: string;
  area: string;
}

export interface CodebaseDupe {
  type: ModuleType;
  route: string;
  files: string[];
}

export interface CodebaseMap {
  pages: CodeModule[];
  hooks: CodeModule[];
  components: CodeModule[];
  edgeFunctions: CodeModule[];
  libs: CodeModule[];
  dupes: CodebaseDupe[];
  counts: {
    pages: number;
    hooks: number;
    components: number;
    edgeFunctions: number;
    libs: number;
    dupes: number;
    total: number;
  };
}

// Map of route prefixes to areas
const AREA_PREFIXES: Record<string, string> = {
  '/admin': 'admin',
  '/coordenador': 'coord',
  '/voluntario': 'voluntario',
  '/fabrica': 'fabrica',
  '/formacao': 'formacao',
  '/debates': 'debates',
  '/materiais': 'materiais',
  '/auth': 'auth',
  '/s/': 'share',
  '/r/': 'redirect',
  '/aceitar': 'convites',
};

function getArea(route: string): string {
  for (const [prefix, area] of Object.entries(AREA_PREFIXES)) {
    if (route.startsWith(prefix)) return area;
  }
  return 'publico';
}

function fileToRoute(file: string): string {
  // /src/pages/AdminOps.tsx -> /admin/ops
  let route = file
    .replace(/^\/src\/pages\//, '/')
    .replace(/\.tsx$/, '')
    .replace(/\.ts$/, '');
  
  // Convert PascalCase to kebab-case
  route = route.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  
  // Remove 'index' from end
  route = route.replace(/\/index$/, '');
  
  // Ensure starts with /
  if (!route.startsWith('/')) route = '/' + route;
  
  return route;
}

function edgeFunctionToRoute(file: string): string {
  // /supabase/functions/my-function/index.ts -> /functions/my-function
  const match = file.match(/\/supabase\/functions\/([^/]+)/);
  return match ? `/functions/${match[1]}` : file;
}

function extractModules(
  modules: Record<string, () => Promise<unknown>>,
  type: ModuleType,
  routeExtractor: (file: string) => string
): CodeModule[] {
  return Object.keys(modules).map(file => {
    const route = routeExtractor(file);
    return {
      type,
      file,
      route,
      area: getArea(route),
    };
  });
}

function findDuplicates(modules: CodeModule[]): CodebaseDupe[] {
  const routeMap = new Map<string, string[]>();
  
  for (const mod of modules) {
    if (!mod.route) continue;
    const key = `${mod.type}:${mod.route}`;
    const files = routeMap.get(key) || [];
    files.push(mod.file);
    routeMap.set(key, files);
  }
  
  const dupes: CodebaseDupe[] = [];
  for (const [key, files] of routeMap) {
    if (files.length > 1) {
      const [type, route] = key.split(':');
      dupes.push({
        type: type as ModuleType,
        route,
        files,
      });
    }
  }
  
  return dupes;
}

export function generateCodebaseMap(): CodebaseMap {
  const pages = extractModules(pageModules, 'page', fileToRoute);
  const hooks = extractModules(hookModules, 'hook', f => f.replace('/src/hooks/', '').replace('.tsx', ''));
  const components = extractModules(componentModules, 'component', f => f.replace('/src/components/', '').replace('.tsx', ''));
  const edgeFunctions = extractModules(edgeFunctionModules, 'edge-function', edgeFunctionToRoute);
  const libs = extractModules(libModules, 'lib', f => f.replace('/src/lib/', '').replace('.ts', ''));
  
  // Find duplicates across all types
  const allModules = [...pages, ...edgeFunctions];
  const dupes = findDuplicates(allModules);
  
  return {
    pages: pages.sort((a, b) => (a.route || '').localeCompare(b.route || '')),
    hooks: hooks.sort((a, b) => a.file.localeCompare(b.file)),
    components: components.sort((a, b) => a.file.localeCompare(b.file)),
    edgeFunctions: edgeFunctions.sort((a, b) => (a.route || '').localeCompare(b.route || '')),
    libs: libs.sort((a, b) => a.file.localeCompare(b.file)),
    dupes,
    counts: {
      pages: pages.length,
      hooks: hooks.length,
      components: components.length,
      edgeFunctions: edgeFunctions.length,
      libs: libs.length,
      dupes: dupes.length,
      total: pages.length + hooks.length + components.length + edgeFunctions.length + libs.length,
    },
  };
}

// Export CSV helper
export function mapToCSV(map: CodebaseMap): string {
  const rows: string[] = ['type,route,file,area'];
  
  const addRows = (modules: CodeModule[]) => {
    for (const m of modules) {
      rows.push(`${m.type},"${m.route || ''}","${m.file}",${m.area}`);
    }
  };
  
  addRows(map.pages);
  addRows(map.hooks);
  addRows(map.components);
  addRows(map.edgeFunctions);
  addRows(map.libs);
  
  return rows.join('\n');
}
