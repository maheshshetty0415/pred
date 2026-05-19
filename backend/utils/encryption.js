const CryptoJS = require('crypto-js');

const encryptData = (text) => {
    if (!text) return text;
    return CryptoJS.AES.encrypt(text, process.env.AES_SECRET).toString();
};

const decryptData = (ciphertext) => {
    if (!ciphertext) return ciphertext;
    try {
        const bytes = CryptoJS.AES.decrypt(ciphertext, process.env.AES_SECRET);
        return bytes.toString(CryptoJS.enc.Utf8);
    } catch (err) {
        return null;
    }
};

module.exports = { encryptData, decryptData };
