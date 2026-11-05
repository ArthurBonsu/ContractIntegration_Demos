// Reads the original project's environment file and hands the NEXT_PUBLIC_
// settings to Next.js. It understands ".env.local" and "env.local" (the license
// app's file has no leading dot), looks in this demo folder and in the pack's root
// folder (the demo folder wins), and never exposes anything that is not NEXT_PUBLIC_.
const fs = require("fs");
const path = require("path");

function parse(text) {
  const out = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

module.exports = function loadEnv(appDir) {
  const names = [".env", "env", ".env.local", "env.local"];
  const dirs = [appDir];
  const result = {};
  for (const dir of dirs) {
    for (const name of names) {
      const file = path.join(dir, name);
      if (!fs.existsSync(file) || !fs.statSync(file).isFile()) continue;
      const values = parse(fs.readFileSync(file, "utf8"));
      for (const [k, v] of Object.entries(values)) if (k.startsWith("NEXT_PUBLIC_")) result[k] = v;
    }
  }
  return result;
};
