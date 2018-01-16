const WebSocketServer = require('ws').Server;
const Url = require('url');
const AUTH = 'auth';

class GameClient {
    constructor(wsClient, username) {
        this.wsClient = wsClient;
        this.username = username;
        this.wsClient.on('message', this.onMessage);
        this.wsClient.on('close', this.onClose);
        this.wsClient.on('error', this.onError);
    }

    onMessage(msg) {
        GameSocket.exec(JSON.parse(msg), this);
    }

    onClose() {

    }

    onError() {

    }

    send(msg, callback) {
        if (callback)
            this.wsClient.send(msg, callback);
        else
            this.wsClient.send(msg);
    }

    checkAlive(callback) {
        this.send(GameSocket.makeStringMsg('status'));
        callback();
    }
}

class Lobby {
    constructor(name, owner) {
        this.owner = owner;
        this.name = name;
        this.clients = [];
    }

    addGameClient(gameClient) {
    }
}

class GameSocket {

    constructor(httpServer, pathOfSocketServer) {
        this.wss = new WebSocketServer({
            server: httpServer,
            path: pathOfSocketServer
        });
        this.gUsers = {};
        this.wss.on('connection', (wsClient, req) => {
            this.onConnection(wsClient, req);
        });
    }

    onConnection(wsClient, req) {
        let cred = GameSocket.getCred(req);
        if (GameSocket.authCred(cred) === true) {
            let gameClient = new GameClient(wsClient, cred.username);
            this.gUsers[gameClient.username] = gameClient;
            GameSocket.onAuthPass(wsClient);
        }
        else {
            GameSocket.onAuthFail(wsClient);
        }
    }

    static getCred(req) {
        let data = new Url.parse(req.url, true).query;
        let moreData = (req.headers['x-forwarded-for'] || req.connection.remoteAddress).split(':');
        return {
            username: data.username,
            password: data.password,
            ip: moreData[moreData.length - 1]
        };
    }

    static authCred(cred) {
        return cred.username !== undefined && cred.password === 'password';

    }

    static onAuthPass(wsClient) {
        wsClient.send(GameSocket.makeStringMsg(AUTH, {result: 'pass'}));
    }

    static onAuthFail(wsClient) {
        wsClient.send(GameSocket.makeStringMsg(AUTH, {result: 'fail'}), () => wsClient.terminate());
    }


    static makeJsonMsg(type, data) {
        return {type: type, data: data};
    }

    static makeStringMsg(type, data) {
        return JSON.stringify({type: type, data: data});
    }

    static exec(command, gameClient) {
        switch (command.type) {
            case 'createLobby':
                break;
            case 'destroyLobby':
                break;
            case 'joinLobby':
                break;
            case 'leaveLobby':
                break;
            case 'broadcastMsg':
                break;
            case 'directMsg':
                break;
        }

    }

    createLobby() {

    }

    destroyLobby() {

    }

}

module.exports = GameSocket;