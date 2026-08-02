const sessionService = require('../services/session.service');

/**
 * GET /api/sessions/active  (SUPER_ADMIN only)
 * Real-time monitoring of all active user & admin sessions across India
 */
const getActiveSessions = async (req, res, next) => {
    try {
        const { type, state } = req.query;
        const result = await sessionService.getActiveSessions({ type, state });
        res.json({
            success: true,
            data: result,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * DELETE /api/sessions/:id  (SUPER_ADMIN only)
 * Force disconnect/terminate an active device session
 */
const terminateSession = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { type } = req.body; // 'ADMIN' or 'USER'
        await sessionService.terminateSession(id, type);
        res.json({
            success: true,
            message: 'Session terminated successfully',
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getActiveSessions,
    terminateSession,
};
