// ==UserScript==
// @name         CalcTax
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Calculate Tax Amount in UAH for past quarter
// @author       You
// @match        https://24.privatbank.ua/*
// @match        https://v24.privatbank.ua/*
// @grant        GM_xmlhttpRequest
// @connect      aaa.bbb.cc
// ==/UserScript==

const ACCT_USD = '26001056223037';
const ACCT_EUR = '26005056221110';
// const ACCT_UAH = '26009056221923';

const PARENT_ORIGIN = 'https://24.privatbank.ua';
const CHILD_ORIGIN = 'https://v24.privatbank.ua';

(async function () {
    'use strict';
    console.info('PAGE:', location.href)
    setTimeout(() => {
        if (location.href.indexOf('//24.') > 0) {
            const btn = $('<button style="position: absolute; z-index: 1000">CalcTax</button>');
            btn.click(async () => {
                await waitClick('#mainLogo,a.logoImg');
                // await sleep(300);
                await waitClick('.companyView h3');
                // await sleep(300);
                await waitClick('a.icon-statement.new_fiz_statements');
                await sleep(500); // server should set up
                const client = postMessageClient(window, $('iframe')[0].contentWindow, CHILD_ORIGIN)
                const res = await client.invoke('test', 2, 5);
                console.info("RES", res)
            });
            $('body').prepend(btn)
        }
    }, 2000);

    if (location.href.indexOf('//v24.') > 0) {
        // console.info('inside iframe');
        // await waitClick(`td.accounts-table-acc:contains("${ACCT_USD}")`);
        // await waitClick('span:contains("поточний день")');
        // await waitClick('li:contains("Попередній квартал")');
        const server = postMessageServer(window, PARENT_ORIGIN);
        server.handle('test', async (a, b) => {
            console.info("Called test", a, b);
            return a + b;
        })
    }
    // Your code here...
})();

async function navigate(url) {
    console.info('NAVIGATE ', url);
    location.href = url;
    await sleep(300)
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function waitClick(selector) {
    console.info('WAIT CLICK', selector);

    function attempt() {
        const elts = $(selector);
        console.info('WAIT CLICK ATTEMPT', selector, elts.length);
        if (elts.length) {
            elts[0].click();
            return true;
        }
        return false;
    }

    return new Promise((resolve, reject) => {
        let i = 0;

        const int = setInterval(() => {
            if (attempt()) {
                clearInterval(int);
                resolve();
            }
            if (++i > 50) { // 5 sec
                clearInterval(int);
                alert(`Can't find "${selector}" to click!`);
                reject();
            }
        }, 100)
    });
}

function postMessageServer(myWindow, allowedClientOrigin) {
    const handlers = {};
    myWindow.addEventListener('message', async (event) => {
        const {data, origin, source} = event;
        if (origin !== allowedClientOrigin) {
            console.warn(`Not my origin: ${origin}, my is ${allowedClientOrigin}`);
            return;
        }
        const {id, name, args} = data;
        if (!name || !handlers[name]) {
            console.warn(`Not my message received (server)? : ${JSON.stringify(data)}`);
            return;
        }
        try {
            const result = await handlers[name](...args);
            source.postMessage({id, isSuccess: true, result}, allowedClientOrigin)
        } catch (e) {
            source.postMessage({id, isSuccess: false, error: e}, allowedClientOrigin)
        }
    });
    return {
        handle: (name, handler) => {
            handlers[name] = handler;
            return () => {
                delete handlers[name];
            }
        }
    }
}

function postMessageClient(myWindow, targetWindow, allowedServerOrigin) {
    let id = 1;
    const results = {};
    myWindow.addEventListener('message', (event) => {
        const {data, origin, source} = event;
        if (origin !== allowedServerOrigin) {
            console.warn(`Not my origin: ${origin}, my is ${allowedServerOrigin}`);
            return;
        }
        const {id, isSuccess, result, error} = data;
        if (!id || !results[id]) {
            console.warn(`Not my message received (client)? : ${JSON.stringify(data)}`);
            return;
        }
        results[id](isSuccess, result, error);
    });
    return {
        invoke: function (handlerName, ...args) {
            return new Promise((resolve, reject) => {
                results[id] = (isSuccess, result, error) => {
                    delete results[id];
                    if (isSuccess) {
                        resolve(result);
                    } else {
                        reject(error);
                    }
                };
                targetWindow.postMessage({
                    id,
                    name: handlerName,
                    args
                }, allowedServerOrigin);
                id++;
            });
        }
    }
}