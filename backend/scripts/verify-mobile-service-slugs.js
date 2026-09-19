// Scans mobile/app for every hardcoded service slug reference
// (useServiceInitialization('slug', [fallbacks]) and
// HomeEssentialsBookingScreen slug="...") and checks each against the live
// Service table. Catches the exact bug class found repeatedly this
// session — a screen's hardcoded slug drifting from the real DB slug after
// a rename, leaving getServiceBySlug()/useServiceInitialization() unable to
// resolve the service and every booking failing with "Service
// initialization incomplete."
//
// Not wired into CI — run manually after any service slug/route change:
//   node scripts/verify-mobile-service-slugs.js
//
// Exits non-zero if any hardcoded slug (primary or fallback) has no match
// in the DB, so it can be added to a pre-merge check later if desired.
const fs = require('fs');
const path = require('path');
const prisma = require('../src/config/database');

const MOBILE_APP_DIR = path.join(__dirname, '../../mobile/app');

function walk(dir, files = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full, files);
        else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) files.push(full);
    }
    return files;
}

// Matches: useServiceInitialization('slug') or useServiceInitialization('slug', ['a', 'b'])
const INIT_CALL_RE = /useServiceInitialization\(\s*['"]([^'"]+)['"]\s*(?:,\s*\[([^\]]*)\])?\s*\)/g;
// Matches: HomeEssentialsBookingScreen slug="slug" (skips the dynamic [slug] route, which reads slug from params)
const HEBS_CALL_RE = /HomeEssentialsBookingScreen\s+slug=\{?['"]([a-z0-9-]+)['"]\}?/g;

function extractSlugs(content) {
    // primary: the slug useServiceInitialization/HomeEssentialsBookingScreen
    // resolves against FIRST — if this one is missing and no fallback saves
    // it, the screen is genuinely broken. fallback: extra slugs tried only
    // if the primary doesn't resolve (deliberately kept around for services
    // that were renamed, e.g. useServiceInitialization('physio-diag',
    // ['physio', 'physio-fitness'])) — fine for these to not exist in the DB.
    const primary = [];
    const fallback = [];
    let m;
    while ((m = INIT_CALL_RE.exec(content))) {
        primary.push(m[1]);
        if (m[2]) {
            m[2].split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean).forEach(s => fallback.push(s));
        }
    }
    while ((m = HEBS_CALL_RE.exec(content))) {
        primary.push(m[1]);
    }
    return { primary, fallback };
}

async function main() {
    const files = walk(MOBILE_APP_DIR);
    // screen file -> { primary: Set, fallback: Set } — checked per-screen so
    // a primary miss saved by a resolving fallback isn't flagged as broken.
    const perScreen = new Map();

    for (const file of files) {
        const content = fs.readFileSync(file, 'utf8');
        const { primary, fallback } = extractSlugs(content);
        if (primary.length === 0) continue;
        const rel = path.relative(path.join(__dirname, '../..'), file);
        perScreen.set(rel, { primary: new Set(primary), fallback: new Set(fallback) });
    }

    const services = await prisma.service.findMany({ select: { slug: true } });
    const dbSlugs = new Set(services.map(s => s.slug));

    let brokenCount = 0;
    console.log(`Checked ${perScreen.size} mobile screens across ${files.length} files.\n`);
    for (const [file, { primary, fallback }] of [...perScreen.entries()].sort()) {
        const allSlugs = [...primary, ...fallback];
        const resolves = allSlugs.some(s => dbSlugs.has(s));
        const primaryOk = [...primary].some(s => dbSlugs.has(s));
        if (!resolves) {
            brokenCount++;
            console.log(`BROKEN   ${file}  — none of [${allSlugs.join(', ')}] match a Service row`);
        } else if (!primaryOk) {
            console.log(`FALLBACK ${file}  — primary slug [${[...primary].join(', ')}] missing, but a fallback resolves (rename the primary to match the real slug when convenient)`);
        } else {
            console.log(`OK       ${file}`);
        }
    }

    if (brokenCount > 0) {
        console.log(`\n${brokenCount} screen(s) have NO resolvable slug at all — every booking attempt on them will show "Service initialization incomplete."`);
        process.exitCode = 1;
    } else {
        console.log('\nEvery screen resolves to a real Service row (some via fallback — see FALLBACK lines above).');
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
