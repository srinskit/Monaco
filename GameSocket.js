const WebSocketServer = require('ws').Server;
const Url = require('url');
const AUTH = 'auth';

class Game {
    constructor(gClient0, gClient1) {
        this.gClients = [gClient0, gClient1];
        this.grids = [undefined, undefined];
        this.reverseMap = [undefined, undefined];
        this.points = [0, 0];
        this.gameReady = false;
        this.whoseTurn = Math.round(Math.random());
        this.notifyAll(GameSocket.makeJsonMsg('notify', {
            msg: 'gameConstructed',
            turn: this.gClients[this.whoseTurn].username
        }));
    }

    static validateGrid(grid) {
        return true;
    }

    static generateReverseMap(grid) {
        let map = new Array(26);
        for (let i = 1; i <= 5; ++i)
            for (let j = 0; j <= 5; ++j)
                map[grid[i][j]] = [i, j];
        // Return let obj problem much?
        return map;
    }

    initGrid(gClient, grid) {
        if (!Game.validateGrid(grid))
            return;
        let id = this.gClients.indexOf(gClient);
        if (id === -1 || this.grids[id] !== undefined)
            return;
        this.grids[id] = grid;
        this.reverseMap[id] = Game.generateReverseMap(grid);
        if (this.grids[0] !== undefined && this.grids[1] !== undefined) {
            this.notifyAll(GameSocket.makeJsonMsg('notify', {msg: 'gameReady'}));
            this.gameReady = true;
        }
    }

    makeMove(gClient, num) {
        num = Math.round(num);
        if (!(1 <= num <= 25) || this.gameReady !== true) return;
        if (this.gClients[this.whoseTurn].username !== gClient.username) return;
        let coordinates = this.reverseMap[this.whoseTurn][num];
        let i = coordinates[0], j = coordinates[1], id = this.whoseTurn;
        if (this.grids[id][i][j] === 0) return;
        this.grids[id][i][j] = 0;
        let k;
        if (i === j) {
            for (k = 0; k < 5; ++k)
                if (this.grids[id][k][k] !== 0)
                    break;
            if (k === 5) this.points[id]++;
        }
        if (i === 5 - 1 - j) {
            for (k = 0; k < 5; ++k)
                if (this.grids[id][k][5 - 1 - k] !== 0)
                    break;
            if (k === 5) this.points[id]++;
        }
        for (k = 0; k < 5; ++k)
            if (this.grids[id][i][k] !== 0)
                break;
        if (k === 5) this.points[id]++;
        for (k = 0; k < 5; ++k)
            if (this.grids[id][k][j] !== 0)
                break;
        if (k === 5) this.points[id]++;
        let winningMove = undefined;
        if (this.points[id] >= 5) {
            winningMove = true;
            this.endGame();
        }
        this.notifyAll(GameSocket.makeJsonMsg('notify', {
            msg: 'gameMove',
            num: num,
            winningMove: winningMove
        }));
        this.whoseTurn = (this.whoseTurn + 1) % 2;
    }


    endGame() {
        this.notifyAll(GameSocket.makeJsonMsg('notify', 'gameEnd'));
    }

    notifyAll(notification) {
        this.gClients[0].send(notification);
        this.gClients[1].send(notification);
    }
}

class GameClient {

    constructor(wsClient, username) {
        this.wsClient = wsClient;
        wsClient.gClient = this;
        this.username = username;
        GameClient.users[username] = this;
        wsClient.on('message', GameClient.onMessage);
        wsClient.on('close', GameClient.onClose);
        wsClient.on('error', GameClient.onError);
    }

    static onMessage(msg) {
        let gameClient = this.gClient;
        GameSocket.exec(JSON.parse(msg), gameClient);
    }

    static onClose() {
        let gameClient = this.gClient;
        GameClient.users[gameClient.username] = undefined;
    }

    static onError() {
        let gameClient = this.gClient;
        GameClient.users[gameClient.username] = undefined;
    }

    send(jsonMsg, callback) {
        if (callback)
            this.wsClient.send(JSON.stringify(jsonMsg), callback);
        else
            this.wsClient.send(JSON.stringify(jsonMsg));
    }
}


class Lobby {

    constructor(name, owner) {
        this.owner = owner;
        this.name = name;
        this.members = {};
        this.members[owner.username] = owner;
    }

    notifyAll(jsonMsg, callback) {
        for (let username in this.members)
            this.members[username].send(jsonMsg, callback);
    }

    addUser(gameClient, requestBy) {
        if (this.members[requestBy.username] !== undefined) {
            this.members[gameClient.username] = gameClient;
            this.notifyAll(GameSocket.makeJsonMsg('lobbyNotify', {msg: 'userAdd', username: gameClient.username}));
        }
        else {

        }
    }


    removeUser(gameClient, requestBy) {
        if ((requestBy.username === this.owner.username || requestBy.username === gameClient.username)
            && this.members[gameClient.username] !== undefined) {
            this.members[gameClient.username] = undefined;
            this.notifyAll(GameSocket.makeJsonMsg('lobbyNotify', {msg: 'userRemove', username: gameClient.username}));
        }
        else {

        }
    }

    joinUser(gameClient) {
        this.members[gameClient.username] = gameClient;
        this.notifyAll(GameSocket.makeJsonMsg('lobbyNotify', {msg: 'userJoin', username: gameClient.username}));
    }

    leaveUser(gameClient) {
        this.members[gameClient.username] = undefined;
        this.notifyAll(GameSocket.makeJsonMsg('lobbyNotify', {msg: 'userLeave', username: gameClient.username}));
    }

    transferOwnership(gameClient, requestBy) {
        if (requestBy.username === this.owner.username) {
            this.owner = gameClient;
        }
        else {

        }
    }

    destroy(requestBy) {
        if (requestBy.username === this.owner.username) {

        }
        else {

        }
    }

    broadcast(data, requestBy) {
        if (this.members[requestBy.username] !== undefined) {
            const msg = GameSocket.makeStringMsg('broadcast', data);
            for (let member in this.members)
                if (member.username !== requestBy.username)
                    member.send(msg);
        }
        else {

        }
    }

    static createLobby(lobbyName, requestBy) {
        if (Lobby.lobbies[lobbyName] !== undefined) {
            requestBy.send({type: 'err', data: {msg: 'Choose different lobby name'}});
        }
        else {
            Lobby.lobbies[lobbyName] = new Lobby(lobbyName, requestBy);
            requestBy.send({type: 'notify', data: {msg: 'Created lobby!'}});
        }
    }

    static destroyLobby(lobbyName, requestBy) {
        let lobby = Lobby.lobbies[lobbyName];
        if (lobby !== undefined) {
            lobby.destroy(requestBy);
        }
        else {

        }
    }

    static addUserToLobby(lobbyName, gameClient, requestBy) {
        let lobby = Lobby.lobbies[lobbyName];
        if (lobby !== undefined) {
            lobby.addUser(gameClient, requestBy);
        }
        else {

        }
    }

    static broadcastToLobby(lobbyName, data, requestBy) {
        let lobby = Lobby.lobbies[lobbyName];
        if (lobby !== undefined) {
            lobby.broadcast(JSON.parse(data), requestBy);
        }
        else {

        }
    }

    static joinLobby(lobbyName, requestBy) {
        let lobby = Lobby.lobbies[lobbyName];
        if (lobby !== undefined) {
            lobby.userJoin(requestBy);
        }
        else {

        }
    }
}


class GameSocket {

    constructor(httpServer, pathOfSocketServer) {
        this.wss = new WebSocketServer({
            server: httpServer,
            path: pathOfSocketServer
        });
        this.wss.on('connection', GameSocket.onConnection);
        GameClient.users = {};
        Lobby.lobbies = {};
        console.log('Started Server!')
    }

    static onConnection(wsClient, req) {
        let cred = GameSocket.getCred(req);
        if (GameSocket.authCred(cred) === true) {
            let gameClient = new GameClient(wsClient, cred.username);
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

    static directMessage(data, toUsername, requestBy) {
        let toClient = GameClient.users[toUsername];
        if (toClient !== undefined) {
            toClient.send(this.makeStringMsg('dm', {
                from: requestBy.username,
                data: data
            }));
        }
        else {
            requestBy.send(this.makeStringMsg('notify', {msg: 'dm failed'}));
        }
    }


    static exec(command, gameClient) {
        if (command.data === undefined || command.type === undefined)
            return;
        switch (command.type) {
            case 'lobbyCreate':
                Lobby.createLobby(command.data.lobbyName, gameClient);
                break;
            case 'lobbyDestroy':
                Lobby.destroyLobby(command.data.lobbyName, gameClient);
                break;
            case 'lobbyAddUser':
                Lobby.addUserToLobby(command.data.lobbyName, GameClient.users[command.data.username], gameClient);
                break;
            case 'lobbyRemoveUser':
                Lobby.addUserToLobby(command.data.lobbyName, GameClient.users[command.data.username], gameClient);
                break;
            case 'lobbyJoin':
                Lobby.addUserToLobby(command.data.lobbyName, GameClient.users[command.data.username], gameClient);
                break;
            case 'lobbyLeave':
                Lobby.addUserToLobby(command.data.lobbyName, GameClient.users[command.data.username], gameClient);
                break;
            case 'lobbyBroadcastMsg':
                Lobby.broadcastToLobby(command.data.lobbyName, command.data, gameClient);
                break;
            case 'directMsg':
                this.directMessage(command.data.to, command.data.data, gameClient);
                break;
        }

    }


}

module.exports = GameSocket;