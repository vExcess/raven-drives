const crypto = require("node:crypto");

const Crypto_AES = require("crypto-js/aes");
const Crypto_SHA256 = require("crypto-js/sha256");
const Crypto_Base64 = require("crypto-js/enc-base64");
const Crypto_Utf8 = require("crypto-js/enc-utf8");

function sha256(str) {
    return Crypto_Base64.stringify(Crypto_SHA256(str));
}

const digits = "0123456789";
const alphabetic = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

function randomBytes(length) {
    let randBytes = new Uint8Array(length);
    crypto.getRandomValues(randBytes);
    return randBytes;
}

function randomDigits(length) {
    let randBytes = randomBytes(length);
    
    let out = "";
    for (let i = 0; i < length; i++) {
        out += digits[randBytes[i] % digits.length];
    }
    return out;
}

// returns UUID as base64 string
function uuid() {
    let randBytes = randomBytes(128 / 8);
    return Buffer.from(randBytes).toString('base64');
}

// salt is 48 bits because that's the largest size that
// can fit in a JavaScript number that's a multiple of 8
function salt() {
    let randBytes = randomBytes(8);
    const u64 = new BigUint64Array(randBytes.buffer)[0];
    const mask48 = BigInt("0b" + "1".repeat(6*8));
    return Number(u64 & mask48);
}

// not exactly constant time
// but probably good enough to frustrate timing attacks
function constTimeEquals(a, b) {
    let equal = true;
    let minLen = Math.min(a.length, b.length);
    for (let i = 0; i < minLen; i++) {
        if (a[i] !== b[i]) {
            equal = false;
        }
    }
    return equal;
}

module.exports = {
    sha256,
    randomDigits,
    uuid,
    constTimeEquals,
    salt
};