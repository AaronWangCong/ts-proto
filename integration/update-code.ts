import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { collectFiles, resolveIntegrationTargets, runCommand } from "./script-helpers";

const integrationDir = path.dirname(fileURLToPath(import.meta.url));
const repoDir = path.resolve(integrationDir, "..");
const pluginPath = path.resolve(repoDir, process.platform === "win32" ? "protoc-gen-ts_proto.bat" : "protoc-gen-ts_proto");

main();

function main() {
  const targets = resolveIntegrationTargets(process.argv.slice(2), integrationDir, repoDir);

  for (const target of targets) {
    const testName = path.relative(integrationDir, target).replace(/\\/g, "/");
    console.log(`Test ${testName}`);

    const parametersPath = path.join(target, "parameters.txt");
    const parameters = fs.existsSync(parametersPath) ? fs.readFileSync(parametersPath, "utf8").trim() : "";
    const protoFiles = collectFiles(target, (filePath) => filePath.endsWith(".proto")).map((filePath) =>
      path.relative(target, filePath).replace(/\\/g, "/"),
    );

    if (protoFiles.length === 0) {
      console.log(`Skipping ${testName}: no proto files found`);
      console.log("");
      console.log("");
      continue;
    }

    const nodeOptions = process.env.NODE_OPTIONS?.includes("--import tsx")
      ? process.env.NODE_OPTIONS
      : [process.env.NODE_OPTIONS, "--import tsx"].filter(Boolean).join(" ");

    const tsProtoOpt = ["annotateFilesWithVersion=false","forceLong=string", parameters].filter(Boolean).join(",");

    runCommand(
      "protoc",
      [
        "--experimental_allow_proto3_optional",
        `--plugin=${pluginPath}`,
        `--ts_proto_opt=${tsProtoOpt}`,
        "--ts_proto_out=./",
        ...protoFiles,
      ],
      {
        cwd: target,
        env: {
          ...process.env,
          NODE_OPTIONS: nodeOptions,
        },
      },
    );

    console.log("");
    console.log("");
  }
}
