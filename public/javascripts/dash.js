let username, wsoc, opname, gid, myTurn, stateText, loginWrap, lobbyWrap, gameWrap;

const grid = new Array(5);
for (let i = 0; i < 5; i++)
    grid[i] = new Array(5);

$(document).ready(function () {
    // username = readCookie('username');
    stateText = $('#stateText');
    loginWrap = $('#loginWrap');
    lobbyWrap = $('#lobbyWrap');
    gameWrap = $('#gameWrap');
    $('#invite').click(function () {
        let opname = $('#opponentName').val();
        if (opname === undefined || opname.length === 0 || username === opname) return;
        let inviteButton = $('#invite');
        inviteButton.prop('value', 'Waiting...');
        inviteButton.prop('disabled', true);
        wsoc.send(makeMsg('gameInvite', {to: opname}));
    });
    $('#loginButton').click(function () {
        username = $('#usernameField').val();
        startWS(username);
    });
    $('#logoutButton').click(function () {
        // eraseCookie('username');
        if (wsoc)
            wsoc.close();
        loginWrap.show();
        lobbyWrap.hide();
        gameWrap.hide();
    });
    // username = readCookie('username');
    if (username)
        startWS(username);
    else {
        loginWrap.show();
        lobbyWrap.hide();
        gameWrap.hide();
    }

});
$(window).on('beforeunload', function () {
    if (wsoc)
        wsoc.close();
});

function startWS(username) {
    let loc = window.location,
        new_uri;
    if (loc.protocol === 'https:')
        new_uri = 'wss:';
    else
        new_uri = 'ws:';
    new_uri += '//' + loc.host + '/';
    new_uri += '?username=' + username + '&password=' + 'password';
    window.username = username;
    wsoc = new WebSocket(new_uri);
    wsoc.onopen = function (event) {
        wsoc.onmessage = function (event) {
            process(JSON.parse(event.data));
        };
        wsoc.onerror = wsoc.onclose = function (event) {
            // eraseCookie('username');
            loginWrap.show();
            lobbyWrap.hide();
            gameWrap.hide();
        };
    };

}

function makeMsg(type, data) {
    return JSON.stringify({
        type: type,
        data: data
    });
}

function process(msg) {
    console.log(msg);
    switch (msg.type) {
        case 'auth':
            if (msg.data.result === "pass")
                afterAuth();
            else {
                // eraseCookie('username');
                username = undefined;
                loginWrap.show();
                lobbyWrap.hide();
                gameWrap.hide();
                alert('Could not login in');
            }
            break;
        case 'gameInvite':
            if (confirm(msg.data.from + ' has challenged you!'))
                wsoc.send(makeMsg('gameAccept', {to: msg.data.from}));
            else
                wsoc.send(makeMsg('gameReject', {to: msg.data.from}));
            break;
        case 'gameReject':
            alert(msg.data.msg === undefined ? msg.data.to + ' rejected your challenge!\n' : msg.data.msg);
            let inviteButton = $('#invite');
            inviteButton.prop('value', 'Invite');
            inviteButton.prop('disabled', false);
            break;
        case 'gameConstructed':
            gid = msg.data.gid;
            opname = msg.data.p1 === username ? msg.data.p2 : msg.data.p1;
            loginWrap.hide();
            lobbyWrap.hide();
            gameWrap.show();
            initGame();
            break;
        case 'gameReady':
            myTurn = msg.data.turn === username;
            stateText.prop('innerHTML', myTurn ? 'Your turn' : `${opname} turn`);
            break;
        case 'gameMove':
            myTurn = !myTurn;
            stateText.prop('innerHTML', myTurn ? 'Your turn' : `${opname} turn`);
            let button = $(`button[value='${msg.data.num}']`);
            button.prop('disabled', true);
            button.prop('innerHTML', '');
            if (msg.data.draw === true) {
                stateText.prop('innerHTML', 'DRAW!');
                $('.buttonGrid').prop('disabled', true);
            }
            else if (msg.data.winner !== undefined) {
                msg.data.winner = msg.data.winner === username ? 'You' : msg.data.winner;
                stateText.prop('innerHTML', `${msg.data.winner} won!`);
                $('.buttonGrid').prop('disabled', true);
            }
            break;
        case 'gameEnd':

            break;
        case 'error':
            alert(msg.data.msg);
            break;
    }
}

function afterAuth() {
    loginWrap.hide();
    lobbyWrap.show();
    gameWrap.hide();
}

function initGame() {
    let arr = new Array(25);
    for (let i = 0; i < 25; ++i)
        arr[i] = i + 1;
    arr = shuffle(arr);
    for (let i = 0; i < 5; ++i)
        for (let j = 0; j < 5; ++j) {
            let val = arr.pop();
            $(`#${i}x${j}`).prop('innerHTML', val).prop('value', val);
            grid[i][j] = val;
        }
    wsoc.send(makeMsg('gameGrid', {grid: grid, gid: gid}));
    $('.buttonGrid').click(function () {
        if (!myTurn) return;
        let num = Number($(`#${this.id}`).val());
        wsoc.send(makeMsg('gameMove', {num: num, gid: gid}));
    });
}

function shuffle(array) {
    let currentIndex = array.length, temporaryValue, randomIndex;
    while (0 !== currentIndex) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }
    return array;
}


function createCookie(name, value, days) {
    let expires;
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toGMTString();
    } else {
        expires = "";
    }
    document.cookie = name + "=" + value + expires + "; path=/";
}

function readCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return undefined;
}

function eraseCookie(name) {
    createCookie(name, "", -1);
}
