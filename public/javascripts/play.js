$(document).ready(function () {
    startWS();

});
let wsoc;
const grid = new Array(5);
for (let i = 0; i < 5; i++)
    grid[i] = new Array(5);

function startWS() {
    let loc = window.location,
        new_uri,
        username = readCookie('username');
    if (loc.protocol === 'https:')
        new_uri = 'wss:';
    else
        new_uri = 'ws:';
    new_uri += '//' + loc.host + '/';
    new_uri += '?username=' + username + '&password=' + 'password';
    wsoc = new WebSocket(new_uri);
    wsoc.onopen = function (event) {
        wsoc.onmessage = function (event) {
            process(JSON.parse(event.data));
        };
        wsoc.onerror = function (event) {
            console.log(event.data);
            alert('Error connecting to Websocket');
        }
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
            else
                alert('Sock auth error!');
            break;
    }
}

function afterAuth() {
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

}

function shuffle(array) {
    let currentIndex = array.length, temporaryValue, randomIndex;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {

        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        // And swap it with the current element.
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }

    return array;
}

//from : https://www.quirksmode.org/js/cookies.html
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
    return null;
}

function eraseCookie(name) {
    createCookie(name, "", -1);
}
