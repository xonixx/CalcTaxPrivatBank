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
                // let res = await client.invoke('test', 2, 5);
                // console.info("RES", res)
                // res = await client.invoke('test', 3, 6);
                // console.info("RES", res)
                await client.invoke('startIframeLogic')
            });
            $('body').prepend(btn)
        }
    }, 1000);

    if (location.href.indexOf('//v24.') > 0) {
        const server = postMessageServer(window, PARENT_ORIGIN);
        // server.handle('test', async (a, b) => {
        //     console.info("Called test", a, b);
        //     return a + b;
        // })
        server.handle('startIframeLogic', async () => {
            console.info('STARTING IFRAME LOGIC');
            let txs = await parseIncomingTxs(ACCT_USD);
            await waitClick('td.menu-back');
            txs = await parseIncomingTxs(ACCT_EUR);
        })
    }
    // Your code here...
})();

async function parseIncomingTxs(bancAcct) {
    await waitClick(`td.accounts-table-acc:visible:contains("${bancAcct}")`);
    await waitClick('span:visible:contains("поточний день")');
    await waitClick('li:visible:contains("Попередній квартал")');

    let divs = await waitSelector('div.wrap-box');
    divs = divs.filter((i, e) => $(e).text().indexOf("From") === 0);
    // console.info(333333, divs)

    const trs = divs.parent().parent();
    // console.info(444444, trs)

    const txs = trs.map((i, tr) => {
        tr = $(tr);
        return {
            date: tr.find('td:nth-of-type(3)').text().substr(0, 10),
            amount: tr.find('td:nth-of-type(4)').text().replace(/\s/g, ''),
            asset: tr.find('td:nth-of-type(5)').text().replace(/\s/g, ''),
            info: tr.find('td:nth-of-type(6)').text()
        };
    });
    console.info(55555, (txs[0] || {}).asset, txs)
    return txs;
}

async function navigate(url) {
    console.info('NAVIGATE ', url);
    location.href = url;
    await sleep(300)
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function waitSelector(selector) {
    console.info('WAIT SELECTOR', selector);

    function attempt() {
        const elts = $(selector);
        console.info('WAIT SELECTOR ATTEMPT', selector, elts.length);
        if (elts.length) {
            return elts;
        }
        return null;
    }

    return new Promise((resolve, reject) => {
        let i = 0;

        const int = setInterval(() => {
            const elts = attempt();
            if (elts) {
                clearInterval(int);
                resolve(elts);
            }
            if (++i > 50) { // 5 sec
                clearInterval(int);
                alert(`Can't find "${selector}"!`);
                reject();
            }
        }, 100)
    });
}

async function waitClick(selector) {
    console.info('WAIT CLICK', selector);
    (await waitSelector(selector))[0].click();
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
            // console.warn(`Not my message received (server)? : ${JSON.stringify(data)}`);
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
            // console.warn(`Not my message received (client)? : ${JSON.stringify(data)}`);
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