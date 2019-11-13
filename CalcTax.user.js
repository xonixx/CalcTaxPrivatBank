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

(function () {
    'use strict';
    console.info(333,location.href)
    setTimeout(() => {
        if (location.href.indexOf('//24.') > 0) {
            const btn = $('<button>CalcTax</button>');
            btn.click(async () => {
                await navigate('#main');
                waitClick('.companyView h3');
                await sleep(300);
                await navigate($('a.icon-statement.new_fiz_statements').attr('href'));
                // waitClick(`td.accounts-table-acc:contains("${ACCT_USD}")`)
            });
            $('body').prepend(btn)
        }
    }, 2000)

    if (location.href.indexOf('//v24.') > 0) {
        console.info(4444444)
        waitClick(`td.accounts-table-acc:contains("${ACCT_USD}")`)
    }
    // Your code here...
})();

async function navigate(url) {
    console.info('--> navigate ', url);
    location.href = url;
    await sleep(300)
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function waitClick(selector) {
    function attempt() {
        const elts = $(selector);
        console.info('=>',selector,elts.length)
        if (elts.length) {
            elts[0].click();
            return true;
        }
        return false;
    }

    let i = 0;

    const int = setInterval(() => {
        if (attempt()) {
            clearInterval(int);
        }
        if (++i > 50) { // 5 sec
            clearInterval(int);
            alert(`Can't find "${selector}" to click!`)
        }
    }, 100)
}