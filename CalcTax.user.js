// ==UserScript==
// @name         CalcTax
// @namespace    http://tampermonkey.net/
// @version      0.1.2
// @description  Calculate Tax Amount in UAH for past quarter
// @author       You
// @match        https://24.privatbank.ua/*
// @match        https://v24.privatbank.ua/*
// @grant        GM_xmlhttpRequest
// @connect      api.privatbank.ua
// ==/UserScript==

const SLOW = true;

const ACCTS = {};
ACCTS.USD = '800456';
ACCTS.EUR = '808417';
// ACCTS.CHF = '022605'; // TODO enable and handle empty table

const PARENT_ORIGIN = 'https://24.privatbank.ua';
const CHILD_ORIGIN = 'https://v24.privatbank.ua';

for (const f of ["info", "error", "warn", "log"]) {
    const cf = console[f];
    console[f] = function () {
        cf.call(this, 'CalcTax', ...arguments);
    }
}

const _includedJs = {};

async function includeJs(src) {
    if (_includedJs[src]) {
        return;
    }
    _includedJs[src] = 1;
    return new Promise(function (resolve, reject) {
        const script = document.createElement("script");
        script.onload = resolve;
        script.onerror = () => {
            reject("ERROR loading " + src);
        };
        script.setAttribute("type", "text/javascript");
        script.setAttribute("src", src);
        document.getElementsByTagName("head")[0].appendChild(script);
    });
}

(async function () {
    'use strict';
    console.info('PAGE:', location.href)

    if (!window.jQuery)
        await includeJs("https://cdnjs.cloudflare.com/ajax/libs/jquery/2.2.4/jquery.js");

    if (location.href.indexOf('//24.') > 0) {
        // console.info(2222,await GET('https://api.privatbank.ua/p24api/exchange_rates?json&date=01.12.2014'));
        setTimeout(() => {
            const btn = $('<button style="position: absolute; z-index: 1000">CalcTax</button>');
            btn.click(async () => {
                await waitClick('#mainLogo,a.logoImg');
                await waitClick('.company-view h3');
                await waitClick('a:contains("Рахунки та виписки")');

                await sleep(7000); // server should set up
                const client = postMessageClient(window, $('iframe')[0].contentWindow, CHILD_ORIGIN)
                unsafeWindow.ifr = client;
                unsafeWindow.xxx = function (s) {
                    client.invoke('eval', s);
                }
                // let res = await client.invoke('test', 2, 5);
                // console.info("RES", res)
                // res = await client.invoke('test', 3, 6);
                // console.info("RES", res)
                const assetToTxs = await client.invoke('startIframeLogic');

                await enhanceWithRates(assetToTxs);
                console.info("RES", assetToTxs);

                const uahAmount = calcTotalUah(assetToTxs);

                console.info("TOTAL UAH:", uahAmount);

                renderResult(uahAmount, assetToTxs);
            });
            $('body').prepend(btn)
        }, 1000);
    } else if (location.href.indexOf('//v24.') > 0) {
        console.info("Instantiating server...")
        const server = postMessageServer(window, PARENT_ORIGIN);
        // server.handle('test', async (a, b) => {
        //     console.info("Called test", a, b);
        //     return a + b;
        // })
        server.handle('eval', eval);
        server.handle('startIframeLogic', async () => {
            console.info('STARTING IFRAME LOGIC');
            const res = {};
            for (const [asset, bankAcct] of Object.entries(ACCTS)) {
                res[asset] = await parseIncomingTxs(bankAcct);
                await waitClick('.jur-button-back:contains("Назад")');
            }
            return res;
        })

        server.handle('xxx', function (s) {
            eval(s);
        })
    }
})();

async function parseIncomingTxs(bankAcct) {
    await waitClick(`.tab-accounts-body td:visible:contains("${bankAcct}")`);
    await waitClick('span.dropdown-toggle:visible:contains("Квартал")');
    await waitClick('li:visible:contains("Поточний") ~ li');
    // await waitClick('li:visible:contains("Поточний")');

    let tdDetails = await waitSelector('td.details');
    tdDetails = tdDetails.filter((i, e) => {
        const text = $(e).text();
        return text.indexOf("From ") === 0 || text.toUpperCase().indexOf("UPWORK") > -1 || text.indexOf('CML TEAM') > -1;
    });
    console.info(333333, tdDetails)

    const trs = tdDetails.parent();
    console.info(444444, trs)

    const txs = trs.map((i, tr) => {
        tr = $(tr);
        return {
            date: tr.find('td:nth-of-type(4)').text().substr(0, 10),
            amount: tr.find('td:nth-of-type(5)').text().replace(/\s/g, ''),
            asset: tr.find('td:nth-of-type(6)').text().replace(/\s/g, ''),
            info: tr.find('td:nth-of-type(7)').text()
        };
    }).toArray();
    // console.info(55555, (txs[0] || {}).asset, txs)
    return txs;
}

function GET(url) {
    return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
            method: "GET",
            url: url,
            onload: (xhr) => resolve(JSON.parse(xhr.responseText)),
            onerror: (err) => reject(err)
        });
    });
}

function renderResult(uahAmount, assetToTxs) {
    const w = window.open("", "popup", "width=1000,height=600,scrollbars=1,resizable=1");

    const h = $('<div/>');
    const tbl = $('<table border="1"/>');
    tbl.append($('<tr><th>Asset</th><th>Amount</th><th>Date</th><th>Rate</th><th>UAH</th><th>Info</th></tr>'));
    for (const [asset, txs] of Object.entries(assetToTxs)) {
        for (const tx of txs) {
            const tr = $('<tr/>');
            tr.append($('<td/>').text(asset));
            tr.append($('<td/>').text(tx.amount));
            tr.append($('<td/>').text(tx.date));
            tr.append($('<td/>').text(tx.rate));
            tr.append($('<td/>').text(Number(tx.amount) * tx.rate));
            tr.append($('<td/>').text(tx.info));
            tbl.append(tr);
        }
    }
    tbl.append($(`<tr><td></td><td></td><td></td><td>Total:</td><td><b>${uahAmount}</b></td><td></td></tr>`));
    tbl.append($(`<tr><td></td><td></td><td></td><td>Tax:</td><td><b>${uahAmount * 0.05}</b></td><td></td></tr>`));
    h.append($(tbl));

    const html = h.html();

    w.document.open();
    w.document.write(html);
    w.document.close();
}

/**
 * assetToTxs: [{ ASSET -> TXS }, ...]
 */
async function enhanceWithRates(assetToTxs) {
    // const promises = [];
    for (const [asset, txs] of Object.entries(assetToTxs)) {
        for (const tx of txs) {
            // promises.push((async () => {
            console.info("Date: ", tx.date, tx)
            const ratesData = await GET(`https://api.privatbank.ua/p24api/exchange_rates?json&date=${tx.date}`);
            const rate = ratesData.exchangeRate.filter(e => e.currency === asset)[0].purchaseRateNB;
            console.info('RATE', asset, tx.date, rate);
            tx.rate = rate;
            // tx.rate = 25;
            // })());
        }
    }
    // await Promise.all(promises)
}

/**
 * assetToTxs: [{ ASSET -> TXS }, ...]
 */
function calcTotalUah(assetToTxs) {
    let res = 0;
    for (const [asset, txs] of Object.entries(assetToTxs)) {
        for (const tx of txs) {
            res += tx.amount * tx.rate;
        }
    }
    return res;
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
    if (SLOW) await sleep(2000);
    console.info('WAIT CLICK', selector);
    (await waitSelector(selector))[0].click();
}

function postMessageServer(myWindow, allowedClientOrigin) {
    const handlers = {};
    myWindow.addEventListener('message', async (event) => {
        // console.info('server.message');
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
            // console.info('server.handle', name);
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
        // console.info('client.message');
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
            // console.info('client.invoke', handlerName);
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