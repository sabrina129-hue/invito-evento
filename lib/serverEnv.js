import fs from "node:fs";
import path from "node:path";

let localEnv;

const loadLocalEnv = () => {
  if (localEnv) return localEnv;

  localEnv = {};

  if (process.env.NODE_ENV === "production") {
    return localEnv;
  }

  const envPath = path.join(process.cwd(), ".env.local");

  if (!fs.existsSync(envPath)) {
    return localEnv;
  }

  const content = fs.readFileSync(envPath, "utf8");

  content.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      return;
    }

    const [name, ...valueParts] = trimmed.split("=");
    const value = valueParts.join("=").trim().replace(/^"(.*)"$/, "$1");

    localEnv[name.trim()] = value;
  });

  return localEnv;
};

export const getServerEnv = name => loadLocalEnv()[name] || process.env[name];
