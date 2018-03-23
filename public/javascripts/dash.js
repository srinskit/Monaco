let username, wsoc, opname, gid, myTurn, stateText, loginWrap, lobbyWrap, gameWrap, chatWrap;

const grid = new Array(5);
for (let i = 0; i < 5; i++)
    grid[i] = new Array(5);

$(document).ready(function () {
    stateText = $('#stateText');
    loginWrap = $('#loginWrap');
    lobbyWrap = $('#lobbyWrap');
    gameWrap = $('#gameWrap');
    chatWrap = $('#chat_window_1');
    chatWrap.hide();
    $('#btn-chat').click(function () {
        let msg = $('#btn-input').val();
        msg = msg.replace('>', '&gt;').replace('<', '&lt;');
        $('#btn-input').prop('value', '');
        if (opname === undefined) {
            // $.ajax({
            //     url: 'https://api.dialogflow.com/v1/query?v=20150910',
            //     method: "POST",
            //     dataType: "json",
            //     crossDomain: true,
            //     contentType: "application/json; charset=utf-8",
            //     data: JSON.stringify({
            //         "lang": "en",
            //         "query": `${msg}`,
            //         "sessionId": `${username}`
            //     }),
            //     cache: false,
            //     beforeSend: function (xhr) {
            //         xhr.setRequestHeader("Authorization", "Bearer 56140964bf0e4adb9b74dab4d07caf7b");
            //         xhr.setRequestHeader("Content-Type", "application/json");
            //     },
            //     success: function (data) {
            //         console.log('Sucksess');
            //     },
            //     error: function (jqXHR, textStatus, errorThrown) {
            //         console.log('Failure');
            //     }
            // });
        }
        $('.panel-body.msg_container_base').append(`<div class='row msg_container base_sent'><div class='col-xs-10 col-md-10'>
                <div class='messages msg_sent'><p>${msg}</p></div></div></div>`);
        directMessage(opname, msg);
    });
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
        if (wsoc)
            wsoc.close();
        loginWrap.show();
        lobbyWrap.hide();
        gameWrap.hide();
        chatWrap.hide();
    });
    if (username)
        startWS(username);
    else {
        loginWrap.show();
        lobbyWrap.hide();
        gameWrap.hide();
        chatWrap.hide();
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
            loginWrap.show();
            lobbyWrap.hide();
            gameWrap.hide();
            chatWrap.hide();
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
                username = undefined;
                loginWrap.show();
                lobbyWrap.hide();
                gameWrap.hide();
                chatWrap.hide();
                alert('Could not login in');
            }
            break;
        case 'dm':
            $('.panel-body.msg_container_base').append(`<div class='row msg_container base_receiver'><div class='col-xs-10 col-md-10'>
                <div class='messages msg_receive'><p>${msg.data.data}</p></div></div></div>`);
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
            $('#chat_username').prop('innerHTML', opname);
            loginWrap.hide();
            lobbyWrap.hide();
            gameWrap.show();
            chatWrap.show();
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
    chatWrap.show();
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

function directMessage(to, msg) {
    wsoc.send(makeMsg('directMsg', {to: to, msg: msg}));
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


$(document).on('click', '.panel-heading span.icon_minim', function (e) {
    const $this = $(this);
    if (!$this.hasClass('panel-collapsed')) {
        $this.parents('.panel').find('.panel-body').slideUp();
        $this.addClass('panel-collapsed');
        $this.removeClass('glyphicon-minus').addClass('glyphicon-plus');
    } else {
        $this.parents('.panel').find('.panel-body').slideDown();
        $this.removeClass('panel-collapsed');
        $this.removeClass('glyphicon-plus').addClass('glyphicon-minus');
    }
});
$(document).on('focus', '.panel-footer input.chat_input', function (e) {
    const $this = $(this);
    let obj = $('#minim_chat_window');
    if (obj.hasClass('panel-collapsed')) {
        $this.parents('.panel').find('.panel-body').slideDown();
        obj.removeClass('panel-collapsed');
        obj.removeClass('glyphicon-plus').addClass('glyphicon-minus');
    }
});
$(document).on('click', '#new_chat', function (e) {
    const size = $(".chat-window:last-child").css("margin-left");
    size_total = parseInt(size) + 400;
    alert(size_total);
    const clone = $("#chat_window_1").clone().appendTo(".container");
    clone.css("margin-left", size_total);
});
$(document).on('click', '.icon_close', function (e) {
    //$(this).parent().parent().parent().parent().remove();
    $("#chat_window_1").remove();
});


