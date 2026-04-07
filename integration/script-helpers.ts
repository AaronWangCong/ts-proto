import fs from "fs";
import path from "path";
import { spawnSync, SpawnSyncOptions } from "child_process";

export function listImmediateDirectories(dir: string): string[] {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(dir, entry.name))
    .sort((a, b) => a.localeCompare(b));
}

export function collectFiles(dir: string, predicate: (filePath: string) => boolean): string[] {
  const files: string[] = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectFiles(fullPath, predicate));
    } else if (predicate(fullPath)) {
      files.push(fullPath);
    }
  }

  return files.sort((a, b) => a.localeCompare(b));
}

export function resolveInputPath(input: string, integrationDir: string, repoDir: string): string {
  const candidates = path.isAbsolute(input)
    ? [input]
    : [
        path.resolve(integrationDir, input),
        path.resolve(repoDir, input),
        path.resolve(repoDir, "integration", input),
        path.resolve(process.cwd(), input),
      ];

  for (const candidate of [...new Set(candidates)]) {
    if (fs.existsSync(candidate)) {
      return fs.realpathSync(candidate);
    }
  }

  throw new Error(`Unable to resolve input path: ${input}`);
}

export function resolveIntegrationTargets(inputs: string[], integrationDir: string, repoDir: string): string[] {
  if (inputs.length === 0) {
    return listImmediateDirectories(integrationDir);
  }

  const dirs = new Set<string>();

  for (const input of inputs) {
    const resolved = resolveInputPath(input, integrationDir, repoDir);
    const stat = fs.statSync(resolved);

    if (stat.isDirectory()) {
      dirs.add(resolved);
      continue;
    }

    if (stat.isFile() && resolved.endsWith(".proto")) {
      dirs.add(path.dirname(resolved));
      continue;
    }

    throw new Error(`Unsupported input: ${input}`);
  }

  return [...dirs].sort((a, b) => a.localeCompare(b));
}

export function isWithinDir(targetPath: string, parentDir: string): boolean {
  const relative = path.relative(parentDir, targetPath);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

export function runCommand(command: string, args: string[], options: SpawnSyncOptions = {}): void {
  const stdio = options.stdio ?? "inherit";
  const env = options.env ?? process.env;

  const result =
    process.platform === "win32" && needsCmdWrapper(command)
      ? spawnSync("cmd.exe", ["/d", "/c", command, ...args], {
          ...options,
          env,
          stdio,
          windowsHide: true,
        })
      : spawnSync(command, args, { ...options, env, stdio });

  if (result.error) {
    if ((result.error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(`Command not found: ${command}`);
    }
    throw result.error;
  }

  if ((result.status ?? 0) !== 0) {
    process.exit(result.status ?? 1);
  }
}

export function runYarn(args: string[], options: SpawnSyncOptions = {}): void {
  const yarn = process.platform === "win32" ? "yarn.cmd" : "yarn";
  runCommand(yarn, args, options);
}

function needsCmdWrapper(command: string): boolean {
  const normalized = command.toLowerCase();
  return normalized === "yarn" || normalized === "yarn.cmd" || normalized.endsWith(".cmd") || normalized.endsWith(".bat");
}
