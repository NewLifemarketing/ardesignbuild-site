#!/usr/bin/env node
"use strict";

// validate-blog-pr.js — companion to auto-publish.yml. INSTALL in the SITE repo at
// .github/scripts/validate-blog-pr.js. Validates an A&R pipeline blog PR against the
// hard limits before auto-merge. Exits 0 (pass) or 1 (fail); prints a report.
//   node .github/scripts/validate-blog-pr.js <baseSha> <headSha>

const { execFileSync } = require("child_process");
const fs = require("fs");

const [, , baseSha, headSha] = process.argv;
if (!baseSha || !headSha) { console.error("Usage: validate-blog-pr.js <baseSha> <headSha>"); process.exit(1); }

const git = (args) => execFileSync("git", args, { encoding: "utf8" }).trim();
const problems = [];
const notes = [];

const changes = git(["diff", "--name-status", baseSha, headSha])
  .split("\n").filter(Boolean)
  .map((line) => { const [status, ...rest] = line.split(/\t/); return { status: status[0], path: rest.join("\t") }; });

const newPostRe = /^blog\/[a-z0-9-]+\/index\.html$/;
const allowedModify = new Set(["blog/index.html", "sitemap.xml"]);
const allowedAddOrModify = new Set(["assets/css/blog-post.css"]);

const newPosts = [];
const navEdits = []; // existing blog posts modified ONLY to wire prev/next nav-next
for (const c of changes) {
  if (newPostRe.test(c.path)) {
    if (c.status === "A") newPosts.push(c.path);
    else if (c.status === "M") navEdits.push(c.path);
    else problems.push(`Blog post ${c.path} has disallowed status ${c.status}.`);
  } else if (allowedModify.has(c.path)) {
    if (c.status !== "M" && c.status !== "A") problems.push(`${c.path} changed with disallowed status ${c.status}.`);
  } else if (allowedAddOrModify.has(c.path)) {
    if (c.status !== "A" && c.status !== "M") problems.push(`${c.path} has disallowed status ${c.status}.`);
  } else {
    problems.push(`Disallowed file changed: ${c.path} (${c.status}). A blog PR may only add /blog/{slug}/index.html + assets/css/blog-post.css, edit blog/index.html + sitemap.xml, and wire ONE previous post's nav.`);
  }
}

if (newPosts.length === 0) problems.push("No new /blog/{slug}/index.html was added.");
else if (newPosts.length > 1) problems.push(`More than one new post in one PR (${newPosts.join(", ")}).`);
if (navEdits.length > 1) problems.push(`More than one existing post modified (${navEdits.join(", ")}); only the immediately-previous post's nav may be wired.`);

// A modified existing post may ONLY have changed its prev/next nav — nothing else.
for (const p of navEdits) {
  const diff = git(["diff", baseSha, headSha, "--", p]);
  const changedLines = diff.split("\n").filter((l) => /^[+-]/.test(l) && !/^(\+\+\+|---)/.test(l));
  const offending = changedLines.filter((l) => !/nav-next|nav-prev|post-nav|Newest post/.test(l));
  if (offending.length) problems.push(`${p}: a previous post may only change its prev/next nav, but other lines changed:\n    ${offending.slice(0, 4).join("\n    ")}`);
}

for (const postPath of newPosts) {
  let html = "";
  try { html = fs.readFileSync(postPath, "utf8"); } catch (e) { problems.push(`Could not read ${postPath}: ${e.message}`); continue; }
  const h1 = (html.match(/<h1[\s>]/gi) || []).length;
  if (h1 !== 1) problems.push(`${postPath}: expected exactly one <h1>, found ${h1}.`);
  if (!/<title>[^<]+<\/title>/i.test(html)) problems.push(`${postPath}: missing <title>.`);
  if (!/<meta\s+name="description"\s+content="[^"]+"/i.test(html)) problems.push(`${postPath}: missing meta description.`);
  if (!/<link\s+rel="canonical"/i.test(html)) problems.push(`${postPath}: missing canonical link.`);
  if (!/application\/ld\+json/i.test(html)) problems.push(`${postPath}: missing JSON-LD structured data.`);
  if (/\[NEEDS SOURCE/i.test(html)) problems.push(`${postPath}: still contains a [NEEDS SOURCE] marker.`);
  if (/href="\.\.\//.test(html) || /src="\.\.\//.test(html)) notes.push(`${postPath}: contains a relative "../" path — confirm assets are root-relative.`);
}

console.log(`Changed files (${changes.length}):`);
for (const c of changes) console.log(`  ${c.status}  ${c.path}`);
console.log("");
if (notes.length) { console.log("Notes:"); notes.forEach((n) => console.log(`  • ${n}`)); console.log(""); }
if (problems.length) {
  console.log(`VALIDATION FAILED — ${problems.length} problem(s):`);
  problems.forEach((p) => console.log(`  ✗ ${p}`));
  process.exit(1);
}
console.log("VALIDATION PASSED — post is within the hard limits and has required SEO elements.");
process.exit(0);
