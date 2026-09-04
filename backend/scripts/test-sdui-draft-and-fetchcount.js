// ──────────────────────────────────────────────
//  Manual verification: SDUI draft state, publish-clears-draft,
//  fetch-count adoption signal, and publishedBy in history.
//
//  Run manually: node scripts/test-sdui-draft-and-fetchcount.js
//  Operates on the real 'home_config' UIConfig row (same one production
//  reads) — saves its original state and restores it in `finally`, so it
//  never leaves the live config altered. Never calls real GCS/push/etc.
// ──────────────────────────────────────────────

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const ctrl = require('../src/controllers/appConfig.controller');

const assert = (cond, msg) => {
    if (!cond) throw new Error(`ASSERTION FAILED: ${msg}`);
    console.log(`  ✅ ${msg}`);
};

// Postgres JSONB does not preserve key insertion order, so plain
// JSON.stringify equality is unreliable for round-tripped values.
const { isDeepStrictEqual } = require('util');

const fakeReqRes = (body = {}, params = {}, admin = { id: 'test-admin-id' }) => {
    const req = { body, params, admin, user: { id: admin.id, type: 'admin' } };
    let statusCode = 200;
    const res = {
        set() { return this; },
        status(code) { statusCode = code; return this; },
        json(payload) { res._payload = payload; res._statusCode = statusCode; },
    };
    return { req, res };
};

async function run() {
    const original = await prisma.uIConfig.findUnique({ where: { key: 'home_config' } });

    try {
        // ── 0. Baseline: read current live config via the real public endpoint ──
        console.log('0. Baseline public fetch (getHomeConfig):');
        const beforeFetchCount = original?.fetchCount ?? 0;
        {
            const { req, res } = fakeReqRes();
            await ctrl.getHomeConfig(req, res);
            assert(res._payload.success === true, 'public getHomeConfig responds successfully');
        }
        // fetchCount increment is fire-and-forget — give it a moment to land
        await new Promise(r => setTimeout(r, 300));
        const afterOneFetch = await prisma.uIConfig.findUnique({ where: { key: 'home_config' } });
        assert(afterOneFetch.fetchCount === beforeFetchCount + 1, `fetchCount incremented by 1 (was ${beforeFetchCount}, now ${afterOneFetch.fetchCount})`);

        // Fetch twice more to prove it keeps counting
        {
            const { req, res } = fakeReqRes();
            await ctrl.getHomeConfig(req, res);
        }
        {
            const { req, res } = fakeReqRes();
            await ctrl.getHomeConfig(req, res);
        }
        await new Promise(r => setTimeout(r, 300));
        const afterThreeFetches = await prisma.uIConfig.findUnique({ where: { key: 'home_config' } });
        assert(afterThreeFetches.fetchCount === beforeFetchCount + 3, `fetchCount is cumulative (now ${afterThreeFetches.fetchCount})`);

        // ── 1. Save a draft — must NOT touch the live configJson ──────────
        console.log('\n1. Save draft (must not affect live config):');
        const liveConfigBefore = JSON.stringify(original?.configJson);
        const draftPayload = { ...(original?.configJson || {}), sections: [{ id: 'test_draft_marker', type: 'quick_services', enabled: true, sort_order: 1, services: [] }] };
        {
            const { req, res } = fakeReqRes({ config: draftPayload });
            await ctrl.updateHomeConfigDraft(req, res, (e) => { throw e; });
            assert(res._payload.success === true, 'draft save succeeded');
        }
        const afterDraftSave = await prisma.uIConfig.findUnique({ where: { key: 'home_config' } });
        assert(JSON.stringify(afterDraftSave.configJson) === liveConfigBefore, 'live configJson is UNCHANGED after saving a draft');
        assert(isDeepStrictEqual(afterDraftSave.draftJson, draftPayload), 'draftJson holds the saved draft');
        assert(afterDraftSave.version === (original?.version ?? 1), 'version did NOT bump from a draft save');

        // ── 2. getHomeConfigDraft returns the draft, with metadata ─────────
        console.log('\n2. getHomeConfigDraft returns draft + live metadata:');
        {
            const { req, res } = fakeReqRes();
            await ctrl.getHomeConfigDraft(req, res, (e) => { throw e; });
            assert(res._payload.hasDraft === true, 'hasDraft:true reported');
            assert(isDeepStrictEqual(res._payload.data, draftPayload), 'returned data is the draft, not the live config');
            assert(res._payload.liveVersion === (original?.version ?? 1), 'liveVersion reflects the still-unpublished live version');
            assert(typeof res._payload.liveFetchCount === 'number', 'liveFetchCount is present');
        }

        // Public route must still serve the OLD live config, never the draft
        {
            const { req, res } = fakeReqRes();
            await ctrl.getHomeConfig(req, res);
            assert(JSON.stringify(res._payload.data) === liveConfigBefore, 'public getHomeConfig still serves the live config, NOT the draft');
        }

        // ── 3. Publish clears the draft and resets fetchCount ──────────────
        console.log('\n3. Publish clears draft + resets fetchCount + bumps version:');
        const publishPayload = { ...(original?.configJson || {}) }; // republish the original content
        {
            const { req, res } = fakeReqRes({ config: publishPayload });
            await ctrl.updateHomeConfig(req, res, (e) => { throw e; });
            assert(res._payload.success === true, 'publish succeeded');
        }
        const afterPublish = await prisma.uIConfig.findUnique({ where: { key: 'home_config' } });
        assert(afterPublish.draftJson === null, 'draftJson cleared after publish');
        assert(afterPublish.fetchCount === 0, 'fetchCount reset to 0 after publish');
        assert(afterPublish.version === (original?.version ?? 1) + 1, `version bumped (now ${afterPublish.version})`);

        // ── 4. History includes publishedBy ────────────────────────────────
        console.log('\n4. getConfigHistory includes publishedBy:');
        {
            const { req, res } = fakeReqRes({}, { configKey: 'home_config' });
            await ctrl.getConfigHistory(req, res, (e) => { throw e; });
            assert(res._payload.success === true, 'history fetch succeeded');
            assert(res._payload.data.length > 0, 'at least one history row exists (the pre-test snapshot)');
            const mostRecent = res._payload.data[0];
            assert('publishedBy' in mostRecent, 'publishedBy field is present in the history row shape');
        }

        console.log('\n✅ ALL CHECKS PASSED — draft/publish separation, fetch counter, and history publishedBy all work correctly.\n');
    } finally {
        // Restore the exact original row so this test never leaves the
        // live SDUI config altered.
        if (original) {
            await prisma.uIConfig.update({
                where: { key: 'home_config' },
                data: {
                    configJson: original.configJson,
                    draftJson: original.draftJson,
                    fetchCount: original.fetchCount,
                    version: original.version,
                    publishedAt: original.publishedAt,
                },
            }).catch(err => console.warn('Restore failed:', err.message));
            console.log('Original home_config row restored.');
        }
        await prisma.$disconnect();
    }
}

if (require.main === module) {
    run().catch(err => {
        console.error('\n❌', err.message);
        process.exitCode = 1;
    });
}
