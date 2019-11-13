// ==UserScript==
// @name         CalcTax
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Calculate Tax Amount in UAH for past quarter
// @author       You
// @match        https://24.privatbank.ua/*
// @grant        GM_xmlhttpRequest
// @connect      aaa.bbb.cc
// ==/UserScript==

(function () {
    'use strict';
    setTimeout(() => {
        const btn = $('<button>CalcTax</button>');
        btn.click(async () => {
            await navigate('#main');
            $('.companyView h3').click();
            await sleep(300);
            await navigate($('a.icon-statement.new_fiz_statements').attr('href'));
        });
        $('body').prepend(btn)
    }, 2000)
    // Your code here...
})();

async function navigate(url) {
    console.info('--> navigate ', url)
    location.href = url;
    await sleep(300)
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}