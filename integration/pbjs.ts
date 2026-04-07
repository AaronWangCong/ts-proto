import path from "path";
import { fileURLToPath } from "url";
import { isWithinDir, resolveIntegrationTargets, runYarn } from "./script-helpers";

type PbjsTask = {
  name: string;
  pbjs: string[];
  pbts: string[];
};

const integrationDir = path.dirname(fileURLToPath(import.meta.url));
const repoDir = path.resolve(integrationDir, "..");

const tasks: PbjsTask[] = [
  task("simple", "integration/simple/simple.proto", "--force-number"),
  task("simple-long", "integration/simple-long/simple.proto", "--force-long"),
  task("simple-long-string", "integration/simple-long-string/simple.proto", "--force-long"),
  task("simple-long-bigint", "integration/simple-long-bigint/simple.proto", "--force-long"),
  task("simple-long-bigint-noliteral", "integration/simple-long-bigint-noliteral/simple.proto", "--force-long"),
  task("vector-tile", "integration/vector-tile/vector_tile.proto", "--force-number"),
  task("nestjs-metadata", "integration/nestjs-metadata/hero.proto", "--force-number"),
  task("nestjs-metadata-observables", "integration/nestjs-metadata-observables/hero.proto", "--force-number"),
  task("nestjs-metadata-restparameters", "integration/nestjs-metadata-restparameters/hero.proto", "--force-number"),
  task("nestjs-simple", "integration/nestjs-simple/hero.proto", "--force-number"),
  task("nestjs-simple-observables", "integration/nestjs-simple-observables/hero.proto", "--force-number"),
  task("nestjs-simple-restparameters", "integration/nestjs-simple-restparameters/hero.proto", "--force-number"),
  task("nestjs-simple-usedate", "integration/nestjs-simple-usedate/hero.proto", "--force-number"),
  task("oneof-properties", "integration/oneof-properties/oneof.proto", "--force-number"),
  task("oneof-unions", "integration/oneof-unions/oneof.proto", "--force-number"),
  task("oneof-unions-value", "integration/oneof-unions-value/oneof.proto", "--force-number"),
  task("struct", "integration/struct/struct.proto", "--force-number"),
  task("value", "integration/value/value.proto", "--force-number"),
  task("use-map-type", "integration/use-map-type/use-map-type.proto", "--force-number"),
];

main();

function main() {
  const targets = resolveIntegrationTargets(process.argv.slice(2), integrationDir, repoDir);

  for (const currentTask of tasks) {
    const taskDir = path.resolve(integrationDir, currentTask.name);
    if (!shouldRunTask(taskDir, targets)) {
      continue;
    }

    runYarn(currentTask.pbjs, { cwd: repoDir });
    runYarn(currentTask.pbts, { cwd: repoDir });
  }
}

function shouldRunTask(taskDir: string, targets: string[]): boolean {
  if (targets.length === 0) {
    return true;
  }

  return targets.some((target) => isWithinDir(target, taskDir));
}

function task(name: string, protoFile: string, forceArg: "--force-number" | "--force-long"): PbjsTask {
  const pbjsJs = `integration/${name}/pbjs.js`;
  const pbjsDts = `integration/${name}/pbjs.d.ts`;

  return {
    name,
    pbjs: ["run", "pbjs", "--force-message", forceArg, "-t", "static-module", "-o", pbjsJs, protoFile],
    pbts: ["run", "pbts", "--no-comments", "-o", pbjsDts, pbjsJs],
  };
}
