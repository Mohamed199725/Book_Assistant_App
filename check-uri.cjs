const fs = require("fs");

const env = fs.readFileSync(".env.local", "utf8");
const line = env.split(/\r?\n/).find((l) => l.startsWith("MONGODB_URI"));
if (!line) {
  console.log("MONGODB_URI not found");
  process.exit(0);
}

const raw = line
  .slice("MONGODB_URI=".length)
  .trim()
  .replace(/^["']|["']$/g, "");
const m = raw.match(/^mongodb(\+srv)?:\/\/([^:]+):(.*)@(.+)$/);

if (!m) {
  console.log("URI did not match expected pattern");
  console.log("starts with: " + raw.slice(0, 24));
  process.exit(0);
}

const [, srv, user, pw, hostPart] = m;
console.log("scheme   : mongodb" + (srv || ""));
console.log("user     : " + user);
console.log("pw length: " + pw.length);
console.log("host     : " + hostPart.split("/")[0]);
console.log("db part  : " + (hostPart.split("/")[1] || "(none)"));

const specials = pw.match(/[^A-Za-z0-9\-._~]/g);
if (specials) {
  console.log("RAW SPECIAL CHARS: " + [...new Set(specials)].join(" "));
  console.log("needs encoding  : " + (encodeURIComponent(pw) !== pw));
} else {
  console.log("password is alphanumeric-safe (no encoding needed)");
}

// Sanity: does the password look like a placeholder?
if (/^(password|pass|changeme|your|xxx|<|\$\{)/i.test(pw) || pw.includes("<")) {
  console.log("WARNING: password looks like a placeholder");
}
