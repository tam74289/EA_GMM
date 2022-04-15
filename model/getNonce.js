const { TextDecoder, TextEncoder } = require("text-encoding/index.js");
const crypto = require("crypto-browserify/index.js");
const { Serialize } = require("eosjs");
// const { exec } = require("child_process");
const fromHexString = (hexString) =>
  new Uint8Array(hexString.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)));

const nameToArray = (name) => {
  const sb = new Serialize.SerialBuffer({
    textEncoder: new TextEncoder(),
    textDecoder: new TextDecoder(),
  });
  sb.pushName(name);
  return sb.array;
};

const getRand = () => {
  const arr = new Uint8Array(8);
  for (let i = 0; i < 8; i++) {
    const rand = Math.floor(Math.random() * 255);
    arr[i] = rand;
  }
  return arr;
};

const toHex = (buffer) => {
  return [...new Uint8Array(buffer)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

let countNonce = 0;

const GetNonceAW = (req, res, next) => {
  countNonce++

  // if(countNonce > 100){
  //   exec("busybox reboot", (error, stdout, stderr) => {
  //   if (error) {
  //     console.log(`error: ${error.message}`);
  //     return;
  //   }
  //   if (stderr) {
  //     console.log(`stderr: ${stderr}`);
  //     return;
  //   }
  //   console.log(`stdout: ${stdout}`);
  // });
  // }

  let { account, account_str, difficulty, last_mine_tx, last_mine_arr } = req.body;

  if (!(account && last_mine_tx && difficulty)) {
    return res.status(403).send("All input is required");
  }

  try {
    last_mine_tx = last_mine_tx.substr(0, 16); // only first 8 bytes of txid

    account_str = account;

    last_mine_arr = fromHexString(last_mine_tx);

    account = nameToArray(account);

    account = account.slice(0, 8);

    let good = false, itr = 0, hash, hex_digest, rand_arr, last, end;

    const start = new Date().getTime();
    console.log(`[${countNonce}][${req.body.account}] : Performing work with difficulty ${difficulty}, last tx is ${last_mine_tx}...`);
    while (!good) {
      rand_arr = getRand();
      const combined = new Uint8Array(account.length + last_mine_arr.length + rand_arr.length);
      combined.set(account);
      combined.set(last_mine_arr, account.length);
      combined.set(rand_arr, account.length + last_mine_arr.length);
      hash = crypto.createHash("sha256");
      hash.update(combined.slice(0, 24));
      hex_digest = hash.digest("hex");
      good = hex_digest.substr(0, 4) === '0000';

      if (good) {
        last = parseInt(hex_digest.substr(4, 1), 16);
        good &= (last <= difficulty);
      }

      itr++;

      end = new Date().getTime();

      if (itr % 100000 === 0) {
        console.log(`[${req.body.account}] : Still mining - tried ${itr} iterations taking ${(end - start) / 1000}s`);
      }

      if (itr >= 100000 * 15 || (end - start) / 1000 >= 45 ) {
        throw new Error("nonce over time ro itr");
      }

      if (!good) {
        hash = null;
      }
    }

    const rand_str = toHex(rand_arr);
    console.log(`[${req.body.account}] : Found hash in ${itr} iterations with ${req.body.account} ${rand_str}, last = ${last}, hex_digest ${hex_digest} taking ${(end - start) / 1000}s`)
    req.nonce = {
      status: true,
      account: account_str,
      nonce: rand_str,
      answer: hex_digest,
    };

  } catch (error) {
    return res.status(400).send({
      status: false,
      account: req.body.account,
      nonce: "nonce over time or itr",
      answer: "",
    });
  }
  return next();
};

module.exports = GetNonceAW;
