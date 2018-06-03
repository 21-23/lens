exports.role = {
    PLAYER: 'player',
    GAME_MASTER: 'game-master',
};
exports.DEFAULT_PROFILE = {
    displayName: 'Unknown',
};

exports.rejectConnection = function (ws, reason) {
    // prevent client phoenix from reconnect
    // assume that ws has appropriate 'close' handler
    ws && ws.close(4500, reason || '');
};

exports.clearConnection = function (ws) {
    // TODO: clear onerror?
    ws.removeAllListeners();
};
