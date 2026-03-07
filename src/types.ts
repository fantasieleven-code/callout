export interface PackageJson {
  name?: string;
  version?: string;
  description?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
  [key: string]: unknown;
}

export interface ProjectContext {
  /** Project root directory */
  cwd: string;
  /** Project name from package.json */
  name: string;
  /** File tree (top-level structure) */
  fileTree: string;
  /** package.json contents (if exists) */
  packageJson: PackageJson | null;
  /** README.md contents (if exists) */
  readme: string | null;
  /** CLAUDE.md contents (if exists) */
  claudeMd: string | null;
  /** Detected tech stack */
  techStack: string[];
  /** Stats */
  stats: {
    totalFiles: number;
    testFiles: number;
    codeLines: number;
  };
}

export type Perspective = 'cto' | 'security' | 'product' | 'devops' | 'customer';

export const ALL_PERSPECTIVES: Perspective[] = ['cto', 'security', 'product', 'devops', 'customer'];
