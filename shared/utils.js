const ethers = require("ethers");
const Web3 = require('web3');
const constVal = require('./const');
const fs = require("fs");
const readline = require("readline");
const stream = require("stream");
const util = require("util");
const rename = util.promisify(fs.rename);
const unlink = util.promisify(fs.unlink);
const telegramUtils = require('./TelegramUtils');



let web3 = new Web3(constVal.fantomRpcUrl);

const timeLeft = (timestamp) => {
    let rightNow = Date.now()/1000
    let timeleft = timestamp - rightNow
    if (timeleft < 0) {
        return [-1,0]
    } else {
        let [hrs, mins] = secsToText(timeleft)
        return [hrs, mins, timeleft]
    }
}

const secsToText = (secs) => {
    let hrs = Math.floor(secs / 60 / 60)
    let mins = Math.floor((secs / 60 - hrs * 60))
    return [hrs, mins]
}

const calculateGasPrice = async () => {
    let spotPx = await web3.eth.getGasPrice();
    let spotPxBN = ethers.BigNumber.from(spotPx.toString())
    if (spotPxBN.gte(constVal.maxGasPrice)) {
        return -(Math.floor(spotPx/(10**9)))
    } else {
        return spotPxBN
    }
}

const nonceVal = async () => {
    return await constVal.jsonRpcProvider.getTransactionCount(constVal.walletAddress, "pending")
}

const getNonce = async (nonce) => {
    if (typeof nonce === 'undefined'){
        nonce = await nonceVal();
    }
    return nonce;
}

const delay = ms => new Promise(res => setTimeout(res, ms));

let telegramChatIdLineReplaced;
const saveTelegramChatId = async () => {
    const telegramChatIdLine = `TELEGRAM_CHAT_ID = '${constVal.chatId}'`;
    const file = constVal.envFile;
    const readStream = fs.createReadStream(file)
    const tempFile = `${file}.tmp`
    const writeStream = fs.createWriteStream(tempFile)
    const rl = readline.createInterface(readStream, stream)
    telegramChatIdLineReplaced = false;
    await rl.on('line', (originalLine) => {
        // Replace.
        if ((/^TELEGRAM_CHAT_ID/.exec(originalLine)) !== null) {
            telegramChatIdLineReplaced = true;
            return writeStream.write(`${telegramChatIdLine}\n`)
        }
        // Save original line.
        writeStream.write(`${originalLine}\n`)
    });

    await rl.on('close', () => {
        // Finish writing to temp file and replace files.
        // Replace original file with fixed file (the temp file).
        if (!telegramChatIdLineReplaced){
            let res = writeStream.write( `${telegramChatIdLine}\n`);
        }
        writeStream.end(async () => {
            try {
                await unlink(file) // Delete original file.

                await rename(tempFile, file) // Rename temp file with original file name.
                log(`telegramChatId has been saved to [${file}]`);
            } catch (e) {
                log(`error while saving telegramChatId to [${file}]`);
                if (constVal.debug){
                    log(e);
                }
            }
        });
    });
}

const log = (message, toTelegram = false) => {
    console.log(message);
    if (constVal.enableTelegramBot && toTelegram){
        telegramUtils.sendMessage(message);
    }
}

const getFTMBalance = async () => {
    return await constVal.account.getBalance();
}

module.exports = {
    secsToText,
    timeLeft,
    calculateGasPrice,
    nonceVal,
    getNonce,
    delay,
    saveTelegramChatId,
    log,
    getFTMBalance,
    web3
}