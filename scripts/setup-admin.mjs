import { randomBytes, scryptSync } from "node:crypto";
import { writeFile, readFile } from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);
const value = (flag, fallback) =>
  args.includes(flag) ? args[args.indexOf(flag) + 1] : fallback;
const username = value("--username", "admin");
const output = path.resolve(value("--output", ".env.local"));
if (!/^[a-zA-Z0-9._-]{3,64}$/.test(username || ""))
  throw new Error(
    "Choose a username of 3–64 letters, numbers, dots, hyphens, or underscores.",
  );
try {
  await readFile(output);
  throw new Error(
    `Refusing to overwrite ${output}. Use --output with a new filename.`,
  );
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

const password = randomBytes(18).toString("base64url");
const salt = randomBytes(16).toString("hex");
const hash = `scrypt$${salt}$${scryptSync(password, salt, 64).toString("hex")}`;
// Next.js expands dollar signs in .env files, so the hash separators need escaping.
const environment = `ADMIN_USERNAME=${username}\nADMIN_PASSWORD_HASH=${hash.replaceAll("$", "\\$")}\nSESSION_SECRET=${randomBytes(32).toString("hex")}\n`;
await writeFile(output, environment, { mode: 0o600, flag: "wx" });
console.log(
  `Saved server configuration to ${output}\nUsername: ${username}\nPassword: ${password}\n\nStore the password securely. It is shown only now and is not saved in the environment file.\nFor Vercel, copy these three environment values and connect a private Blob store, then redeploy.`,
);
