const nconf = require('nconf');

const config = nconf.argv().env({ separator: '_' });

config.defaults({
    PORT: 3001,
    ARNAUX: {
        URL: 'ws://localhost:8888/',
    },
    AUTHREMOTE: {
        URL: 'http://localhost:3000/',
    },
    GUNSLINGERS: true,
    LOG: {
        // none, error, warn, info, verbose, debug, silly
        CONSOLE: 'verbose',
        FILE: 'warn',
        DB: 'none',
        DBURI: '',
    },
});

module.exports = config;
