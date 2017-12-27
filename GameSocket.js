const WebSocketServer = require('ws').Server;
const Url = require('url');
const AUTH = 'auth';

class User {
    constructor(wsClient, username) {
        this.wsClient = wsClient;
        this.username = username;
    }
}

class GameSocket {

    constructor(httpServer, pathOfSocketServer) {
        this.wss = new WebSocketServer({
            server: httpServer,
            path: pathOfSocketServer
        });
        this.users = {};
        this.wss.on('connection', this.onConnection);
    }

    onConnection(wsClient, req) {
        let cred = GameSocket.getCred(req);
        if (GameSocket.authCred(cred) === true) {
            let user = User(wsClient, cred.username);
            this.users[user.username] = wsClient;
            GameSocket.onAuthPass(wsClient);
            wsClient.on('message', this.onMessage);
            wsClient.on('close', this.)
        }
        else {
            GameSocket.onAuthFail(wsClient);
            wsClient.close();
        }
    }

    static getCred(req) {
        let data = Url.parse(req.url, true).query;
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
        wsClient.send(GameSocket.makeStringMsg(AUTH, {result: 'fail'}));
    }
    

    static makeJsonMsg(type, data) {
        return {type: type, data: data};
    }

    static makeStringMsg(type, data) {
        return JSON.stringify({type: type, data: data});
    }

}

module.exports = GameSocket;