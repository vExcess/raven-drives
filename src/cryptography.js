const crypto = require("node:crypto");
const Crypto_AES = require("crypto-js/aes");
const Crypto_SHA256 = require("crypto-js/sha256");
const Crypto_Base64 = require("crypto-js/enc-base64");
const Crypto_Utf8 = require("crypto-js/enc-utf8");

function SHA256(str) {
    return Crypto_Base64.stringify(Crypto_SHA256(str));
}

function randomDigits(length) {
    const digits = "0123456789";
    const randVals = new Uint8Array(length);
    crypto.getRandomValues(randVals);
    
    let out = "";
    for (let i = 0; i < length; i++) {
        out += digits[randVals[i] % digits.length];
    }
    return out;
}