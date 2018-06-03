const { Server } = require('uws');

const config = require('./config');
const { info } = require('./logger');
const back = require('./back');
const front = require('./front');

const port = config.get('PORT');

function start() {
    back.init();

    const wss = new Server({ port }, () => {
        info('[lens]', 'Server is ready on', port);

        wss.on('connection', front.handleConnection);
    });
}

start();
