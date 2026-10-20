#!/usr/bin/env node
// Génère les images du README de lokrafter dans la DA Forgenza.
//
//   node scripts/readme.mjs          données réelles (GITHUB_TOKEN ou PROFILE_TOKEN requis)
//   node scripts/readme.mjs --demo   calendrier d'exemple, sans réseau
//
// Produit assets/{affiche,partition}-{clair,sombre}.svg, assets/plaques/*.svg,
// assets/boutons/*.svg, puis réécrit les blocs PLAQUES et PARTITION du README.md.
// Aucune dépendance : Node 22 suffit.
//
// Fontes : scripts/fonts/*.woff2 sont des instances statiques, réduites au latin,
// de Bricolage Grotesque et Fraunces (SIL Open Font License 1.1, voir scripts/fonts/NOTICE.md).

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { FZ_PATH } from "./brand.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const LOGIN = process.env.PROFILE_LOGIN || "lokrafter";
const DEMO = process.argv.includes("--demo");

// ---------------------------------------------------------------- palette
const C = {
  bg: "#fdf6e6", paper: "#fffaee", surface2: "#f6ecd2", ink: "#0c0c0c", ink70: "#3a3a3a",
  ink45: "#6e6a63", hairline: "#e5dcc4", staff: "#d9cfb3", red: "#e63329", redStrong: "#c4291f", yellow: "#ffc933",
};
// ombre portée : rouge sur le GitHub sombre (sinon elle se perd dans le noir), encre sur le clair
const THEMES = { clair: C.ink, sombre: C.red };

// ---------------------------------------------------------------- typo
const METRICS = JSON.parse(readFileSync(join(ROOT, "scripts/fonts/metrics.json"), "utf8"));
// une instance statique par style (scripts/fonts/<style>.woff2) : chaque SVG n'embarque que celles qu'il utilise
const STYLE = {
  display: "bricolage", title: "bricolage", label: "bricolage", semi: "bricolage", body: "bricolage",
  serif: "fraunces", serifd: "fraunces",
};
const FONT_DATA = {};
const font64 = (k) => (FONT_DATA[k] ??= readFileSync(join(ROOT, `scripts/fonts/${k}.woff2`)).toString("base64"));

/** Largeur d'un texte en px (avances de glyphes, sans crénage). */
function measure(text, style, size, tracking = 0) {
  const m = METRICS[style];
  let w = 0;
  for (const ch of text) w += (m.adv[ch] ?? m.upm * 0.55);
  return (w / m.upm) * size + tracking * Math.max(0, [...text].length - 1);
}
/** Plus grande taille ≤ size pour que le texte tienne dans max px. */
const fit = (text, style, size, max, tracking = 0) => {
  const w = measure(text, style, size, tracking);
  return w <= max ? size : Math.floor((size * max) / w * 10) / 10;
};

function fontCss(body) {
  let css = "";
  for (const [k, fam] of Object.entries(STYLE)) {
    if (!body.includes(`class="${k}"`)) continue;
    const italic = fam === "fraunces";
    css += `@font-face{font-family:"fz-${k}";${italic ? "font-style:italic;" : ""}src:url(data:font/woff2;base64,${font64(k)}) format("woff2")}`;
    css += `.${k}{font-family:"fz-${k}",${italic ? "Georgia,serif;font-style:italic;font-weight:600" : '"Arial Black",Arial,sans-serif;font-weight:800'}}`;
  }
  return css;
}

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const fmt = (n) => n.toLocaleString("fr-FR").replace(/\s/g, " ");
const r1 = (n) => Math.round(n * 10) / 10;

function svg(w, h, label, body, extraCss = "") {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(label)}">
<title>${esc(label)}</title>
<defs><symbol id="fz" viewBox="0 0 600 600"><path fill-rule="evenodd" d="${FZ_PATH}"/></symbol></defs>
<style>${fontCss(body)}${extraCss}</style>
${body}
</svg>
`;
}
const fz = (x, y, size, color) => `<use href="#fz" x="${x}" y="${y}" width="${size}" height="${size}" fill="${color}"/>`;
const arrow = (x, y, s, color) => // flèche dessinée (absente des fontes)
  `<path d="M${x} ${y}h${s * 0.78}M${r1(x + s * 0.48)} ${r1(y - s * 0.32)}l${r1(s * 0.32)} ${r1(s * 0.32)}l${r1(-s * 0.32)} ${r1(s * 0.32)}" fill="none" stroke="${color}" stroke-width="${r1(s * 0.16)}" stroke-linecap="square"/>`;

// ---------------------------------------------------------------- affiche
function affiche(shadow) {
  const hiW = measure("tiennent", "display", 66, -2);
  const after = 40 + hiW + 22;
  const sticker = (cx, cy, rot, text, fill) => `<g transform="rotate(${rot} ${cx} ${cy})">
  <rect x="${cx - 105}" y="${cy - 21}" width="226" height="58" fill="${C.ink}"/>
  <rect x="${cx - 113}" y="${cy - 29}" width="226" height="58" fill="${fill}" stroke="${C.ink}" stroke-width="3"/>
  <text x="${cx}" y="${cy + 9}" class="title" font-size="24" text-anchor="middle" fill="${C.ink}">${esc(text)}</text></g>`;
  const body = `
<rect x="12" y="12" width="988" height="440" fill="${shadow}"/>
<rect x="2" y="2" width="986" height="438" fill="${C.bg}" stroke="${C.ink}" stroke-width="4"/>
${fz(40, 30, 38, C.ink)}
<text x="90" y="58" class="semi" font-size="21" fill="${C.ink}">${LOGIN}</text>
<text x="946" y="58" class="serif" font-size="19" fill="${C.redStrong}" text-anchor="end">Forgenza · Lyon</text>
<line x1="40" y1="86" x2="946" y2="86" stroke="${C.hairline}" stroke-width="1.5"/>
<text x="40" y="168" class="display" font-size="66" letter-spacing="-2" fill="${C.ink}">Je bâtis des</text>
<text x="40" y="244" class="serifd" font-size="66" fill="${C.red}">logiciels qui</text>
<rect x="30" y="272" width="${r1(hiW + 20)}" height="58" rx="6" fill="${C.yellow}" transform="rotate(-1.2 ${r1(40 + hiW / 2)} 301)"/>
<text x="40" y="320" class="display" font-size="66" letter-spacing="-2" fill="${C.ink}">tiennent</text>
<text x="${r1(after)}" y="320" class="display" font-size="66" letter-spacing="-2" fill="${C.ink}">debout.</text>
<text x="40" y="394" class="body" font-size="20" fill="${C.ink70}">Loris, architecte logiciel &amp; développeur full-stack, fondateur de Forgenza</text>
${sticker(821, 155, -4, "C# · .NET", C.paper)}
${sticker(831, 233, 3, "Symfony · PHP", C.red)}
${sticker(817, 311, -2, "Angular · Vue 3", C.paper)}`;
  return svg(1000, 452, "Loris. Je bâtis des logiciels qui tiennent debout. Architecte logiciel et développeur full-stack, fondateur de Forgenza.", body);
}

// ---------------------------------------------------------------- contributions
const DAY = 864e5;
const iso = (t) => new Date(t).toISOString().slice(0, 10);
const utc = (s) => Date.parse(s + "T00:00:00Z");
const LEVEL = { NONE: 0, FIRST_QUARTILE: 1, SECOND_QUARTILE: 2, THIRD_QUARTILE: 3, FOURTH_QUARTILE: 4 };

async function fetchDays() {
  const token = process.env.PROFILE_TOKEN || process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN ou PROFILE_TOKEN manquant (ou lance avec --demo).");
  const gql = async (query) => {
    const res = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: { Authorization: `bearer ${token}`, "Content-Type": "application/json", "User-Agent": "lokrafter-readme" },
      body: JSON.stringify({ query }),
    });
    const json = await res.json();
    if (!res.ok || json.errors) throw new Error("GraphQL : " + JSON.stringify(json.errors || json));
    return json.data;
  };
  const { user } = await gql(`{ user(login:"${LOGIN}") { createdAt } }`);
  const now = Date.now();
  const days = new Map();
  for (let y = new Date(user.createdAt).getUTCFullYear(); y <= new Date(now).getUTCFullYear(); y++) {
    const from = new Date(Date.UTC(y, 0, 1)).toISOString();
    const to = y === new Date(now).getUTCFullYear() ? new Date(now).toISOString() : new Date(Date.UTC(y, 11, 31, 23, 59, 59)).toISOString();
    const d = await gql(`{ user(login:"${LOGIN}") { contributionsCollection(from:"${from}", to:"${to}") {
      contributionCalendar { weeks { contributionDays { date contributionCount contributionLevel } } } } } }`);
    for (const w of d.user.contributionsCollection.contributionCalendar.weeks)
      for (const c of w.contributionDays) days.set(c.date, { n: c.contributionCount, lvl: LEVEL[c.contributionLevel] ?? 0 });
  }
  return days;
}

function demoDays() {
  // calendrier d'exemple déterministe, pour prévisualiser sans réseau
  let seed = 7228;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const today = Date.UTC(2026, 9, 19), days = new Map();
  for (let t = Date.UTC(2024, 2, 18); t <= today; t += DAY) {
    const age = (today - t) / DAY, we = [0, 6].includes(new Date(t).getUTCDay());
    let n = 0;
    if (age < 28) n = 5 + Math.floor(rnd() * 24);
    else if (t >= Date.UTC(2025, 2, 2) && t <= Date.UTC(2025, 7, 29)) n = 1 + Math.floor(rnd() * 14);
    else if (age > 28 && rnd() < (we ? 0.3 : 0.62)) n = 1 + Math.floor(rnd() * 9);
    days.set(iso(t), { n });
  }
  return days;
}

function stats(days) {
  const dates = [...days.keys()].sort();
  const today = dates.at(-1);
  // niveaux absents (mode démo) : quartiles maison
  for (const v of days.values()) if (v.lvl === undefined) v.lvl = v.n === 0 ? 0 : v.n < 4 ? 1 : v.n < 9 ? 2 : v.n < 16 ? 3 : 4;
  const first = dates.find((d) => days.get(d).n > 0) ?? today;
  let total = 0;
  for (const d of dates) if (d >= first) total += days.get(d).n;
  // série en cours : une journée vide aujourd'hui ne la casse pas encore
  let t = utc(today);
  if (!(days.get(today)?.n > 0)) t -= DAY;
  let cur = 0, curEnd = iso(t);
  while (days.get(iso(t))?.n > 0) { cur++; t -= DAY; }
  const curStart = iso(t + DAY);
  // plus longue série
  let best = { len: 0 }, run = 0, start = null, prev = null;
  for (const d of dates) {
    if (days.get(d).n > 0) {
      run = prev && utc(d) - utc(prev) === DAY && run > 0 ? run + 1 : 1;
      if (run === 1) start = d;
      if (run > best.len) best = { len: run, start, end: d };
    } else run = 0;
    prev = d;
  }
  const yearAgo = iso(utc(today) - 365 * DAY);
  let year = 0;
  for (const d of dates) if (d > yearAgo) year += days.get(d).n;
  return { today, first, total, cur, curStart, curEnd, best, year };
}

const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const MOIS_LONG = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const moisAn = (d) => `${MOIS_LONG[+d.slice(5, 7) - 1]} ${d.slice(0, 4)}`;
function periode(a, b) {
  if (!a) return "";
  const [ya, yb] = [a.slice(0, 4), b.slice(0, 4)];
  const ma = MOIS[+a.slice(5, 7) - 1], mb = MOIS[+b.slice(5, 7) - 1];
  if (ya === yb) return ma === mb ? `${ma} ${yb}` : `${ma} – ${mb} ${yb}`;
  return `${ma} ${ya} – ${mb} ${yb}`;
}
const jours = (n) => (n > 1 ? "jours" : "jour");

// ---------------------------------------------------------------- partition
function partition(days, s, shadow) {
  const D = 11, RUN = 0.85; // durée du cycle (s), part du cycle où la baguette avance
  const x0 = 96, x1 = 946, W = 53, ww = (x1 - x0) / W, y0 = 250, dy = 20;
  const todayT = utc(s.today);
  const dow = (new Date(todayT).getUTCDay() + 6) % 7; // 0 = lundi
  const start = todayT - dow * DAY - (W - 1) * 7 * DAY; // lundi de la première colonne
  const COL = ["", C.ink45, C.ink, C.red, C.yellow], WID = [0, 5, 8, 11, 13];
  let notes = "", bars = "", months = "", prevM = -1;
  for (let w = 0; w < W; w++) {
    const wt = start + w * 7 * DAY, d0 = new Date(wt), m = d0.getUTCMonth();
    if (m !== prevM) {
      const x = x0 + w * ww;
      if (w > 0) bars += `<line x1="${r1(x)}" y1="240" x2="${r1(x)}" y2="378"/>`;
      if (w < W - 2 && !(w === 0 && d0.getUTCDate() > 14)) months += `<text x="${r1(x + 3)}" y="228">${MOIS[m]}</text>`;
      prevM = m;
    }
    for (let d = 0; d < 7; d++) {
      const t = wt + d * DAY;
      if (t > todayT) continue;
      const L = days.get(iso(t))?.lvl ?? 0;
      if (!L) continue;
      const cx = x0 + (w + 0.5) * ww, cy = y0 + d * dy;
      const delay = (((cx - x0) / (x1 - x0)) * RUN * D - D).toFixed(2);
      const stroke = L === 4 ? ` stroke="${C.ink}" stroke-width="1.5"` : "";
      notes += `<rect class="pn" style="animation-delay:${delay}s" x="${r1(cx - WID[L] / 2)}" y="${cy - 3.5}" width="${WID[L]}" height="7" fill="${COL[L]}"${stroke}/>`;
    }
  }
  const staves = [...Array(7)].map((_, i) => `<line x1="${x0}" y1="${y0 + i * dy}" x2="${x1}" y2="${y0 + i * dy}"/>`).join("");
  const jrs = ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"].map((j, i) => `<text x="44" y="${y0 + i * dy + 4}">${j}</text>`).join("");
  const legend = [1, 2, 3, 4].map((L, i) => `<rect x="${92 + i * 20}" y="414" width="${WID[L]}" height="7" fill="${COL[L]}"${L === 4 ? ` stroke="${C.ink}" stroke-width="1.5"` : ""}/>`).join("");

  // accolade sous la série en cours
  let bracket = "";
  if (s.cur > 0) {
    const col = (d) => Math.floor((utc(d) - start) / DAY / 7); // colonne (semaine) d'une date
    const bs = Math.max(x0, x0 + col(s.curStart) * ww + 2), be = Math.min(x1, x0 + (col(s.curEnd) + 1) * ww - 2);
    const lab = `série en cours · ${s.cur} j`;
    const labW = measure(lab, "serif", 13.5);
    const text = bs - 8 - labW > 120
      ? `<text x="${r1(bs - 8)}" y="393" class="serif" font-size="13.5" fill="${C.redStrong}" text-anchor="end">${lab}</text>`
      : `<rect x="${r1((bs + be) / 2 - labW / 2 - 6)}" y="380" width="${r1(labW + 12)}" height="17" fill="${C.bg}"/><text x="${r1((bs + be) / 2)}" y="393" class="serif" font-size="13.5" fill="${C.redStrong}" text-anchor="middle">${lab}</text>`;
    bracket = `<g stroke="${C.redStrong}" stroke-width="2"><line x1="${r1(bs)}" y1="388" x2="${r1(be)}" y2="388"/><line x1="${r1(bs)}" y1="382" x2="${r1(bs)}" y2="394"/><line x1="${r1(be)}" y1="382" x2="${r1(be)}" y2="394"/></g>${text}`;
  }

  const curTxt = String(s.cur), curW = measure(curTxt, "display", 54, -1.5);
  const bestLab = `${jours(s.best.len)}, plus longue série · ${periode(s.best.start, s.best.end)}`;
  const firstLab = `contributions depuis ${moisAn(s.first)}`;
  const css = `.pn{animation:pop ${D}s linear infinite}@keyframes pop{0%{transform:translateY(0)}1.2%{transform:translateY(-7px)}6%,100%{transform:translateY(0)}}
.baton{animation:baton ${D}s linear infinite}@keyframes baton{0%{transform:translateX(0)}${RUN * 100}%,100%{transform:translateX(${x1 - x0}px)}}
@media (prefers-reduced-motion:reduce){.pn{animation:none}.baton{animation:none;transform:translateX(${x1 - x0}px)}}`;
  const body = `
<rect x="12" y="12" width="988" height="440" fill="${shadow}"/>
<rect x="2" y="2" width="986" height="438" fill="${C.bg}" stroke="${C.ink}" stroke-width="4"/>
<text x="44" y="52" class="serif" font-size="19" fill="${C.redStrong}">Partition des 12 derniers mois</text>
<text x="946" y="52" class="body" font-size="14" fill="${C.ink45}" text-anchor="end">${DEMO ? "données d'exemple" : `${LOGIN} · redessinée chaque nuit`}</text>
<line x1="44" y1="72" x2="946" y2="72" stroke="${C.hairline}" stroke-width="1.5"/>
<g stroke="${C.hairline}" stroke-width="1.5"><line x1="336" y1="96" x2="336" y2="172"/><line x1="652" y1="96" x2="652" y2="172"/></g>
<text x="44" y="140" class="display" font-size="54" letter-spacing="-1.5" fill="${C.ink}">${fmt(s.total)}</text>
<text x="44" y="166" class="serif" font-size="${fit(firstLab, "serif", 15, 280)}" fill="${C.redStrong}">${firstLab}</text>
<rect x="360" y="96" width="${r1(curW + 20)}" height="50" rx="6" fill="${C.yellow}" transform="rotate(-1.2 ${r1(370 + curW / 2)} 121)"/>
<text x="370" y="140" class="display" font-size="54" letter-spacing="-1.5" fill="${C.ink}">${curTxt}</text>
<text x="362" y="166" class="serif" font-size="15" fill="${C.redStrong}">${jours(s.cur)} de série en cours</text>
<text x="676" y="140" class="display" font-size="54" letter-spacing="-1.5" fill="${C.ink}">${s.best.len}</text>
<text x="676" y="166" class="serif" font-size="${fit(bestLab, "serif", 15, 270)}" fill="${C.redStrong}">${bestLab}</text>
<line x1="44" y1="196" x2="946" y2="196" stroke="${C.hairline}" stroke-width="1.5"/>
<g class="serif" font-size="13" fill="${C.redStrong}">${months}</g>
<g class="serif" font-size="12.5" fill="${C.ink45}">${jrs}</g>
<g stroke="${C.hairline}" stroke-width="1.2">${bars}</g>
<g stroke="${C.staff}" stroke-width="1.2">${staves}</g>
<g>${notes}</g>
${bracket}
<text x="44" y="421" class="serif" font-size="12.5" fill="${C.ink45}">moins</text>${legend}<text x="176" y="421" class="serif" font-size="12.5" fill="${C.ink45}">plus</text>
<text x="946" y="422" class="semi" font-size="15" fill="${C.ink}" text-anchor="end">${fmt(s.year)} contributions sur 12 mois</text>
<g class="baton"><path d="M${x0 - 6} 236 L${x0 + 6} 236 L${x0} 244 Z" fill="${C.red}"/><line x1="${x0}" y1="240" x2="${x0}" y2="378" stroke="${C.red}" stroke-width="3"/></g>`;
  return svg(1000, 452, partitionAlt(s), body, css);
}
const partitionAlt = (s) =>
  `Partition des contributions de ${LOGIN} sur 12 mois. ${fmt(s.total)} contributions depuis ${moisAn(s.first)}, série en cours de ${s.cur} ${jours(s.cur)}, plus longue série de ${s.best.len} ${jours(s.best.len)}.`;

// ---------------------------------------------------------------- plaques
function parsePlaques(text) {
  const out = [];
  let cur = null;
  for (const raw of text.split("\n")) {
    const line = raw.replace(/\s+#.*$/, "");
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const m = line.match(/^\s*(-\s+)?([a-z]+):\s*(.*)$/);
    if (!m) continue;
    if (m[1]) out.push((cur = {}));
    let v = m[3].trim();
    if (/^(".*"|'.*')$/.test(v)) v = v.slice(1, -1);
    if (v === "~") v = "";
    if (cur) cur[m[2]] = v;
  }
  return out;
}

const BADGE = { "en-ligne": "EN LIGNE", beta: "BÊTA", bientot: "BIENTÔT" };
function plaque(p, shadow) {
  const off = p.statut === "bientot";
  const ink = off ? C.ink45 : C.ink;
  const tile = p.statut === "en-ligne" ? C.red : p.statut === "beta" ? C.yellow : C.surface2;
  const label = BADGE[p.statut] ?? "";
  const bw = r1(measure(label, "label", 11, 1.2) + 20);
  const badgeFill = p.statut === "en-ligne" ? C.yellow : p.statut === "beta" ? C.paper : C.surface2;
  const badgeStroke = p.statut === "beta" ? C.red : ink;
  let icon;
  if (p.icone === "de") icon = [[42, 42], [90, 42], [66, 68], [42, 94], [90, 94]].map(([x, y]) => `<circle cx="${x - 2}" cy="${y}" r="7" fill="${ink}"/>`).join("");
  else if (p.icone === "fz") icon = fz(36, 40, 56, ink);
  else if (p.icone === "datapi") icon = `<rect x="36" y="74" width="14" height="22" fill="${ink}"/><rect x="57" y="58" width="14" height="38" fill="${ink}"/><rect x="78" y="40" width="14" height="56" fill="${ink}"/><rect x="36.5" y="55.5" width="14" height="14" fill="${ink}"/><rect x="33.5" y="52.5" width="14" height="14" fill="${off ? C.surface2 : C.paper}" stroke="${ink}" stroke-width="2.4"/><rect x="32" y="96" width="64" height="3" fill="${ink}"/>`;
  else icon = `<text x="64" y="85" class="title" font-size="46" text-anchor="middle" fill="${ink}">${esc((p.icone || "?").slice(0, 2))}</text>`;
  let cta = "";
  if (!off && p.cta) {
    const tw = measure(p.cta, "label", 14.5);
    const cw = r1(tw + 46);
    cta = `<rect x="${r1(412 - cw)}" y="102" width="${cw}" height="30" fill="${C.ink}"/>
<text x="${r1(412 - cw + 14)}" y="122" class="label" font-size="14.5" fill="${C.bg}">${esc(p.cta)}</text>${arrow(r1(412 - cw + 20 + tw), 117, 14, C.bg)}`;
  }
  const nameSize = fit(p.nom, "title", 28, 280, -0.6);
  const accSize = fit(p.accroche, "body", 15, 280);
  const body = `
${off ? "" : `<rect x="10" y="10" width="430" height="138" fill="${shadow}"/>`}
<rect x="2" y="2" width="428" height="136" fill="${off ? C.bg : C.paper}" stroke="${ink}" stroke-width="3"${off ? ' stroke-dasharray="8 6"' : ""}/>
<rect x="22" y="26" width="84" height="84" fill="${tile}" stroke="${ink}" stroke-width="3"/>
${icon}
<text x="130" y="42" class="serif" font-size="14" fill="${off ? C.ink45 : C.redStrong}">Propulsé par Forgenza</text>
<rect x="${r1(412 - bw)}" y="18" width="${bw}" height="22" fill="${badgeFill}" stroke="${badgeStroke}" stroke-width="2"/>
<text x="${r1(412 - bw / 2)}" y="33.5" class="label" font-size="11" letter-spacing="1.2" text-anchor="middle" fill="${ink}">${label}</text>
<text x="130" y="74" class="title" font-size="${nameSize}" letter-spacing="-0.6" fill="${ink}">${esc(p.nom)}</text>
<text x="130" y="97" class="body" font-size="${accSize}" fill="${off ? C.ink45 : C.ink70}">${esc(p.accroche)}</text>
${cta}`;
  return svg(440, 148, `${p.nom} : ${p.accroche}`, body);
}

// ---------------------------------------------------------------- boutons
const BOUTONS = [
  { id: "forgenza", label: "forgenza.com", red: true, arrow: true },
  { id: "linkedin", label: "LinkedIn" },
  { id: "youtube", label: "YouTube" },
];
function bouton(b, shadow) {
  const tw = measure(b.label, "label", 16);
  const w = Math.round(tw + 40 + (b.arrow ? 24 : 0));
  const body = `
<rect x="6" y="6" width="${w}" height="40" fill="${shadow}"/>
<rect x="1.5" y="1.5" width="${w - 1}" height="37" fill="${b.red ? C.red : C.paper}" stroke="${C.ink}" stroke-width="3"/>
<text x="20" y="25.5" class="label" font-size="16" fill="${C.ink}">${esc(b.label)}</text>
${b.arrow ? arrow(r1(20 + tw + 9), 20, 15, C.ink) : ""}`;
  return svg(w + 6, 46, b.label, body);
}

// ---------------------------------------------------------------- README
const picture = (base, alt, attrs) =>
  `<picture><source media="(prefers-color-scheme: dark)" srcset="${base}-sombre.svg"><img src="${base}-clair.svg" ${attrs} alt="${esc(alt)}"></picture>`;

function replaceBlock(md, name, content) {
  const re = new RegExp(`(<!-- ${name}:DEBUT[^>]*-->)[\\s\\S]*?(<!-- ${name}:FIN -->)`);
  if (!re.test(md)) throw new Error(`Bloc ${name} introuvable dans README.md`);
  return md.replace(re, `$1\n${content}\n$2`);
}

function plaquesBlock(list) {
  const rows = [];
  for (let i = 0; i < list.length; i += 2) {
    const cells = list.slice(i, i + 2).map((p) => {
      const alt = `${p.nom} : ${p.accroche}.${p.statut !== "bientot" && p.cta ? ` ${p.cta}.` : ""}`;
      const pic = picture(`assets/plaques/${p.id}`, alt, 'width="49%"');
      return p.url && p.statut !== "bientot" ? `  <a href="${esc(p.url)}">${pic}</a>` : `  ${pic}`;
    });
    rows.push(`<p>\n${cells.join("\n")}\n</p>`);
  }
  return rows.join("\n");
}

// ---------------------------------------------------------------- main
const write = (rel, content) => {
  const p = join(ROOT, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, content);
};

const days = DEMO ? demoDays() : await fetchDays();
const s = stats(days);
const list = parsePlaques(readFileSync(join(ROOT, "plaques.yml"), "utf8"));
for (const p of list) if (!/^[a-z0-9-]+$/.test(p.id || "")) throw new Error(`id de plaque invalide : « ${p.id} »`);

if (existsSync(join(ROOT, "assets/plaques"))) rmSync(join(ROOT, "assets/plaques"), { recursive: true });
for (const [theme, shadow] of Object.entries(THEMES)) {
  write(`assets/affiche-${theme}.svg`, affiche(shadow));
  write(`assets/partition-${theme}.svg`, partition(days, s, shadow));
  for (const p of list) write(`assets/plaques/${p.id}-${theme}.svg`, plaque(p, shadow));
  for (const b of BOUTONS) write(`assets/boutons/${b.id}-${theme}.svg`, bouton(b, shadow));
}

let md = readFileSync(join(ROOT, "README.md"), "utf8");
md = replaceBlock(md, "PLAQUES", plaquesBlock(list));
md = replaceBlock(md, "PARTITION", picture("assets/partition", partitionAlt(s), 'width="100%"'));
writeFileSync(join(ROOT, "README.md"), md);

console.log(`OK · ${fmt(s.total)} contributions, série ${s.cur} j, record ${s.best.len} j, ${fmt(s.year)} sur 12 mois · ${list.length} plaque(s)${DEMO ? " · DÉMO" : ""}`);
