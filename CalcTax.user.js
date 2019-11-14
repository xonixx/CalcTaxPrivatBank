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

(async function () {
    'use strict';
    console.info('PAGE:', location.href)
    setTimeout(() => {
        if (location.href.indexOf('//24.') > 0) {
            const btn = $('<button>CalcTax</button>');
            btn.click(async () => {
                await waitClick('#mainLogo,a.logoImg');
                // await sleep(300);
                await waitClick('.companyView h3');
                // await sleep(300);
                await waitClick('a.icon-statement.new_fiz_statements');
            });
            $('body').prepend(btn)
        }
    }, 2000);

    if (location.href.indexOf('//v24.') > 0) {
        console.info('inside iframe');
        await waitClick(`td.accounts-table-acc:contains("${ACCT_USD}")`);
        await waitClick('span:contains("поточний день")');
        await waitClick('li:contains("Попередній квартал")');
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