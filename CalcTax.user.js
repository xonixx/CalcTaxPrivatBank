// ==UserScript==
// @name         CalcTax
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Calculate Tax Amount in UAH for past quarter
// @author       You
// @match        https://24.privatbank.ua/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';
    setTimeout(() => {
        const btn = $('<button>CalcTax</button>');
        btn.click(() => {
            alert(123)
        })
        $('body').prepend(btn)
    }, 2000)
    // Your code here...
})();