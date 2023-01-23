const http = require("http");
const https = require("https");
const axios = require("axios");
const express = require("express");
const SHA1 = require("crypto-js/sha1");
const { response } = require("express");
const { on } = require("events");
const { NodeClient, WalletClient } = require("./node_modules/@oipwg/fclient");
const { RPCWallet } = require("js-oip/lib/modules/wallets");
const { Modules } = require("js-oip");
const oipProto = require("oip-protobufjs");
const buildOipDetails = oipProto.buildOipDetails;
const recordProtoBuilder = oipProto.recordProtoBuilder;
const app = express();
const pjson = require("./package.json");
const requireText = require("require-text");
const fs = require('fs');

// look up which package.json script is running
const loadedScript = process.env.npm_lifecycle_event;

// load environment variables from .env file
const env = require("dotenv");
const { parse } = require("path");
const e = require("express");
const { url } = require("inspector");

const useridProvided = (env.config().parsed.publishingWalletUserid === "" || env.config().parsed.publishingWalletUserid === undefined )?(null):(SHA1(env.config().parsed.publishingWalletUserid).toString())

const pubkeyProvided = (env.config().parsed.publisherPubKey === "" || env.config().parsed.publisherPubKey === undefined )?(null):(env.config().parsed.publisherPubKey)

const localnode = {
  apiPort: process.env.apiPort || 3000,
  apiKey: env.config().parsed.apiKey || "",
  publishingWalletUserid: env.config().parsed.publishingWalletUserid || "",
  publishingWalletID: useridProvided || env.config().parsed.publishingWalletId,
  publishingWalletPassphrase: env.config().parsed.publishingWalletPass || "",
  publisherPubKey: pubkeyProvided,
  // wallethost: env.config().parsed.wallethost || "",
  nodeClientPort: env.config().parsed.nodeClientPort || 7313,
  walletClientPort: env.config().parsed.walletClientPort || 7315,
};

const oipRecordsApiAddress =
  env.config().parsed.oipRecordsApiAddress || "https://api.oip.io/oip";
const publishingSponsorAddress =
  env.config().parsed.publishingSponsorAddress || "http://127.0.0.1:7500";

const oip_template_basic = env.config().parsed.basic || "tmpl_20AD45E7";
const oip_template_video = env.config().parsed.video || "tmpl_9705FC0B";
const oip_template_text = env.config().parsed.text || "tmpl_769D8FBC";
const oip_template_image = env.config().parsed.image || "tmpl_1AC73C98";
const oip_template_article = env.config().parsed.article || "tmpl_D019F2E1";
const oip_template_youtube = env.config().parsed.youtube || "tmpl_834772F4";
const oip_template_person = env.config().parsed.person || "tmpl_B6E9AF9B";
const oip_template_url = env.config().parsed.url || "tmpl_74C584FC";

app.use(express.json());

publisherNodeScript = pjson.scripts.publisherNode
liteNodeScript = pjson.scripts.liteNode;
fullNodeScript = pjson.scripts.fullNode;

const scriptFlags =
  loadedScript == "publisherNode" ? publisherNodeScript : ("liteNode" ? liteNodeScript : fullNodeScript);
const scriptFlagsArray = scriptFlags.split(" ");

function obfuscateSecureString(secureString) {
  if ((secureString.length = 0 || secureString == "")) {
    return null;
  } else {
    return (
      secureString.substring(
        0,
        Math.round(Math.pow(secureString.length, 1 / 3))
      ) +
      "****" +
      secureString.substring(
        secureString.length - Math.round(Math.pow(secureString.length, 1 / 3)),
        secureString.length
      )
    );
  }
}

const allowSponsoredPublishing = scriptFlagsArray.includes(
  "--allow-sponsored-publishing=true"
);

var time = new Date().toISOString();
console.log(time);
console.log("loadedScript:", loadedScript);
console.log("scriptFlags:", scriptFlagsArray);
console.log("allowSponsoredPublishing:", allowSponsoredPublishing);
console.log("loaded env data:", {
  apiPort: localnode.apiPort,
  apiKey: obfuscateSecureString(localnode.apiKey),
  publishingWalletUserid: localnode.publishingWalletUserid,
  publishingWalletID: localnode.publishingWalletID,
  publishingWalletPassphrase: obfuscateSecureString(
    localnode.publishingWalletPassphrase
  ),
  publisherPubKey: localnode.publisherPubKey,
  oipRecordsApiAddress: oipRecordsApiAddress,
  publishingSponsorAddress: publishingSponsorAddress,
});

var walletConfLocation = "";
var clientOptions = {};
var walletClientOptions = {};

if (loadedScript != "publisherNode") {

  walletConfLocation = (loadedScript == "publisherNode")?(null): (scriptFlags.split("prefix ")[1].split(" ")[0].toString())
  const walletConfFile = walletConfLocation + "/wallet.conf";
  
  const SAMPLE_WALLET_CONF_PATH = "./sample_wallet.conf"
  
  // Load the sample wallet.conf content from the sample_wallet.conf file
  const SAMPLE_WALLET_CONF = fs.readFileSync(SAMPLE_WALLET_CONF_PATH, 'utf8');
  
  async function checkWalletConf() {
    if (!fs.existsSync(walletConfFile)) {
      console.log(`Wallet.conf file not found at ${walletConfFile}. Creating one from sample...`);
      fs.writeFileSync(walletConfFile, SAMPLE_WALLET_CONF);
    }
  }
  
  checkWalletConf();
  
  const walletConfContents = requireText(walletConfFile, require);

  nodeClientPort = 
    parseInt(
    scriptFlags.split("http-port=")[1].split(" ")[0]
  )

  walletClientPort = 
    parseInt(
    walletConfContents.split("http-port: ")[1].split("\n")[0]
  )
  clientOptions = 
  {
    network: "mainnet",
    port: nodeClientPort,
    apiKey: localnode.apiKey,
  }
  walletClientOptions = 
  {
    network: "mainnet",
    port: walletClientPort,
    apiKey: localnode.apiKey,
  }
}
//publisherNode is not working yet
// else if(loadedScript == "publisherNode") {
//   const nodeClientPort = parseInt(localnode.nodeClientPort)

//   const walletClientPort = parseInt(localnode.walletClientPort)

//   const host = localnode.wallethost

//   clientOptions = 
//   {
//   network: "mainnet",
//   port: nodeClientPort,
//   host: host,
//   apiKey: localnode.apiKey,
//   }
//   walletClientOptions = 
//   {
//   network: "mainnet",
//   port: walletClientPort,
//   host: host,
//   apiKey: localnode.apiKey,
//   }
// }
const client = new NodeClient(clientOptions);
const walletClient = new WalletClient(walletClientOptions);
console.log((loadedScript == "publisherNode")?(`using node client at ${clientOptions.host}:${clientOptions.port}`):(`node client listening on port ${clientOptions.port}`));
console.log((loadedScript == "publisherNode")?(`using wallet client at ${walletClientOptions.host}:${walletClientOptions.port}`):(`wallet client listening on port ${walletClientOptions.port}`));

// listen on port defined in env file
app.listen(localnode.apiPort, () => {
  console.log(`Publisher Node API listening on port ${localnode.apiPort}`);
});

// might want to turn this off for production
// if (allowSponsoredPublishing == true && localnode.publishingWalletID != null) {
//   getWalletCredentials().then((walletCredentials) => {
//     walletClient
//       .execute("selectwallet", [localnode.publishingWalletID])
//       .then((result) => {
//         walletClient
//           .execute("listreceivedbyaddress", [1, false, false])
//           .then((receivedbyaddress) => {
//             getwalletinfo(localnode.publishingWalletID).then((result) => {
//               if (result.toString().startsWith("Error")) {
//                 console.log(
//                   `Wallet ${localnode.publishingWalletID} cannot be found`
//                 );
//               } else {
//                 walletinfo = [
//                   `Wallet ${localnode.publishingWalletID} has ${
//                     result.balance.confirmed / 100000000
//                   } tokens in ${receivedbyaddress.length} addresses}`,
//                 ];
//                 const promiseArray = [];
//                 for (let i = 0; i < receivedbyaddress.length; i++) {
//                   promiseArray.push(
//                     searchForPublisherRegistrationRecord(
//                       undefined,
//                       receivedbyaddress[i].address
//                     ).then((result) => {
//                       return walletClient
//                         .execute("listunspent", [
//                           1,
//                           9999999,
//                           [receivedbyaddress[i].address],
//                         ])
//                         .then((unspent) => {
//                           // console.log('unspent', unspent)
//                           address_info = `Publisher ${result.results[0].meta.publisher_name} with Public Key ${receivedbyaddress[i].address} has ${unspent[0].amount} tokens`;
//                           walletinfo.push(address_info);
//                         });
//                     })
//                   );
//                 }
//                 Promise.all(promiseArray).then(() => {
//                   console.log(walletinfo);
//                 });
//               }
//             });
//           });
//       });
//   });
// }

// --------------------------------------------------------------------------------
// Functions

// get blockchain info including sync status & wallet balance
async function getinfo() {
  try {
    const info = await client.getInfo();
    // const walletinfo = await walletClient.getInfo();
    // console.log("walletinfo", walletinfo);
    return {
      info,
      chainSync: `${Math.floor(info.chain.progress * 1e6) / 1e4}%`,
      chainIsSynced: info.chain.progress === 1,
    };
  } catch (error) {
    return { error: 'getinfo failed', error };
  }
}

// get info about connected peers
async function getPeerInfo() {
  try {
    const peerInfo = await client.execute("getpeerinfo");
    return {
      peerInfo,
      peerCount: peerInfo.length,
    };
  } catch (error) {
    return { error: 'getPeerInfo failed' };
  }
}

// create a wallet
async function createWallet(id, options) {
  try {
    const result = await walletClient.createWallet(id, options);
    return result ? result : 'Error, createWallet failed';
  } catch (err) {
    return err;
  }
}

// generate a receiving address
async function createAddress(id, account) {
  const result = await walletClient.createAddress(id, account);
  return result;
}

// unlock a wallet with passprhase
async function walletpassphrase(passphrase, timeout) {
  timeout = 300;
  try {
    const result = await walletClient.execute("walletpassphrase", [
      passphrase,
      timeout,
    ]);
    return result;
  } catch (err) {
    return err;
  }
}

// select a wallet to use
async function selectwallet(id) {
  const result = await walletClient.execute("selectwallet", [id]);
  return result;
}

// encrypt a wallet
async function encryptwallet(passphrase, id) {
  // const wallet = walletClient.wallet(id);
  const result = await walletClient.execute("encryptwallet", [passphrase]);
  return result;
}

// get master HD Key from wallet
async function getMasterHDKey(id) {
  const result = await wallet.getMaster();
  return result;
}

// get wallet account
async function getwalletaccount(id, account) {
  const wallet = walletClient.wallet(id);
  const result = await wallet.getAccount(account);
  const fpub = result.accountKey;
  return fpub;
}

// get fpub
function getFpub(id, account) {
  return new Promise(function (resolve, reject) {
    getwalletaccount(id, account).then((result) => {
      let fpub = result;
      resolve(fpub);
    });
  });
}

// get a wallets WIF (wallet import format - private key)
async function getwif(id, address, passphrase) {
  // console.log("id:", id, "address:", address, "passphrase:", passphrase)
  // console.log("getwif called");
  try {
    const wallet = walletClient.wallet(id);
    // console.log
    const result = await wallet.getWIF(address, passphrase);
    if (result) {
      const wif = result.privateKey;
      return wif;
    } else {
      return Error("getwif failed");
      // return { Error: "Error, getwif failed" };
    }
  } catch (err) {
    // console.log("getwif failed, err:", err);
    return Error("getwif failed", err);
    // return err;
  }
}

// get wallet info, including balance
async function getwalletinfo(id) {
  // console.log("getwalletinfo called");
  if (id === undefined) {
    return "Error: wallet not found";
  }
  const wallet = walletClient.wallet(id);
  try {
    const result = await wallet.getInfo();
    if (result) {
      return result;
    } else {
      return "Error, getwalletinfo failed";
    }
  } catch (err) {
    console.log("getwalletinfo failed");
    return err;
  }
}
// async function getwalletinfo(id) {
//   console.log("getwalletinfo called");
//   const wallet = walletClient.wallet(id);
//   try {
//     const result = await wallet.getInfo();
//     if (result) {
//       return result;
//     } else {
//       return "Error, getwalletinfo failed";
//     }
//   } catch (err) {
//     console.log("getwalletinfo failed");
//     return err;
//   }
// }

// get wallet account info
async function getAccountInfo(id, account) {
  // console.log("getAccountInfo called");
  const wallet = walletClient.wallet(id);
  // console.log("wallet:", wallet)
  try {
    const result = await wallet.getAccount(account);
    if (result) {
      return result;
    } else {
      // console.log("getAccountInfo failed");
      return "Error: getAccountInfo failed";
    }
  } catch (err) {
    // console.log("getAccountInfo failed");
    return err;
  }
}

// sign message with wallet private key
async function signMessage(wif, pubKey, message) {
  network = "mainnet";
  let walletRPC = new RPCWallet({
    publicAddress: pubKey,
    wif,
    network,
    rpc: {
      port: nodeClientPort,
      host: "127.0.0.1",
      username: "x",
      password: localnode.apiKey,
    },
  });
  const result = await walletRPC.signMessage(message);
  return result;
}

// take formatted data that needs to be published,
// turn it into oipDetails and then turn it into
// serialized protobuf hex64 data for publishing
async function getSignedP64FloData(data, wif) {
  try {
    const details = buildOipDetails(data.details);
    const { signedMessage64 } = await recordProtoBuilder({
      details,
      wif,
      network: "mainnet",
    });
    return "p64:" + signedMessage64;
  } catch (err) {
    return "Failed at publishRecord: " + err;
  }
}

// prepare and format publisher registration data
async function prepRegistration(pubKey, publisherName, fpub, wif) {
  const publisher = {
    myMainAddress: wif,
    descriptor:
      "Ck4KB3AucHJvdG8SEm9pcFByb3RvLnRlbXBsYXRlcyInCgFQEgwKBG5hbWUYASABKAkSFAoMZmxvQmlwNDRYUHViGAIgASgJYgZwcm90bzM=",
    name: "tmpl_433C2783",
    payload: {
      name: publisherName,
      floBip44XPub: fpub,
    },
  };

  let registerPublisherData = [publisher];

  registerPublisherData.pubKey = pubKey;

  function createRegistration(registerPublisherData) {
    return {
      details: registerPublisherData,
      myMainAddress: "",
      pubKey,
    };
  }

  let data = createRegistration(registerPublisherData);
  return data;
}

// to do, make a template descriptor lookup function
async function lookupTemplateInfo(templateType) {
  switch (templateType) {
    case "basic":
      templateName = oip_template_basic;
      break;
    case "video":
      templateName = oip_template_video;
      break;
    case "text":
      templateName = oip_template_text;
      break;
    case "image":
      templateName = oip_template_image;
      break;
    case "article":
      templateName = oip_template_article;
      break;
    case "youtube":
      templateName = oip_template_youtube;
      break;
    case "person":
      templateName = oip_template_person;
      break;
    case "url":
      templateName = oip_template_url;
      break;
    default:
      break;
  }
  templateID = templateName.replace("tmpl_", "");
  let endpoint = `/o5/template/get/${templateID}`;
  let url = oipRecordsApiAddress + endpoint;
  templateData = await axios.get(url);
  let descriptor = templateData.data.results[0].template.file_descriptor_set;
  let templateInfo = {
    descriptor,
    name: templateName,
  };
  return templateInfo;
}

// will be deprecated soon, has been replaced with lookupTemplateInfo
// gets info about a specified template
async function getTemplateInfo(templateType) {
  switch (templateType) {
    case "basic":
      templateName = "tmpl_20AD45E7";
      descriptor =
        "CpwSCgdwLnByb3RvEhJvaXBQcm90by50ZW1wbGF0ZXMi9BEKAVASDAoEbmFtZRgBIAEoCRITCgtkZXNjcmlwdGlvbhgCIAEoCRIMCgRkYXRlGAMgASgEEhoKCGxhbmd1YWdlGAQgASgOMghMYW5ndWFnZRIUCgZhdmF0YXIYBSABKAsyBFR4aWQSDwoHdGFnTGlzdBgGIAMoCRIQCghub3RlTGlzdBgHIAMoCRIVCgd1cmxMaXN0GAggAygLMgRUeGlkGhMKBFR4aWQSCwoDcmF3GAEgASgMIrwQCghMYW5ndWFnZRIWChJMYW5ndWFnZV9VTkRFRklORUQQABIPCgtMYW5ndWFnZV9BRhABEg8KC0xhbmd1YWdlX0FNEAISDwoLTGFuZ3VhZ2VfQVIQAxIQCgxMYW5ndWFnZV9BUk4QBBIPCgtMYW5ndWFnZV9BUxAFEg8KC0xhbmd1YWdlX0FaEAYSDwoLTGFuZ3VhZ2VfQkEQBxIPCgtMYW5ndWFnZV9CRRAIEg8KC0xhbmd1YWdlX0JHEAkSDwoLTGFuZ3VhZ2VfQk4QChIPCgtMYW5ndWFnZV9CTxALEg8KC0xhbmd1YWdlX0JSEAwSDwoLTGFuZ3VhZ2VfQlMQDRIPCgtMYW5ndWFnZV9DQRAOEg8KC0xhbmd1YWdlX0NPEA8SDwoLTGFuZ3VhZ2VfQ1MQEBIPCgtMYW5ndWFnZV9DWRAREg8KC0xhbmd1YWdlX0RBEBISDwoLTGFuZ3VhZ2VfREUQExIQCgxMYW5ndWFnZV9EU0IQFBIPCgtMYW5ndWFnZV9EVhAVEg8KC0xhbmd1YWdlX0VMEBYSDwoLTGFuZ3VhZ2VfRU4QFxIPCgtMYW5ndWFnZV9FUxAYEg8KC0xhbmd1YWdlX0VUEBkSDwoLTGFuZ3VhZ2VfRVUQGhIPCgtMYW5ndWFnZV9GQRAbEg8KC0xhbmd1YWdlX0ZJEBwSEAoMTGFuZ3VhZ2VfRklMEB0SDwoLTGFuZ3VhZ2VfRk8QHhIPCgtMYW5ndWFnZV9GUhAfEg8KC0xhbmd1YWdlX0ZZECASDwoLTGFuZ3VhZ2VfR0EQIRIPCgtMYW5ndWFnZV9HRBAiEg8KC0xhbmd1YWdlX0dMECMSEAoMTGFuZ3VhZ2VfR1NXECQSDwoLTGFuZ3VhZ2VfR1UQJRIPCgtMYW5ndWFnZV9IQRAmEg8KC0xhbmd1YWdlX0hFECcSDwoLTGFuZ3VhZ2VfSEkQKBIPCgtMYW5ndWFnZV9IUhApEhAKDExhbmd1YWdlX0hTQhAqEg8KC0xhbmd1YWdlX0hVECsSDwoLTGFuZ3VhZ2VfSFkQLBIPCgtMYW5ndWFnZV9JRBAtEg8KC0xhbmd1YWdlX0lHEC4SDwoLTGFuZ3VhZ2VfSUkQLxIPCgtMYW5ndWFnZV9JUxAwEg8KC0xhbmd1YWdlX0lUEDESDwoLTGFuZ3VhZ2VfSVUQMhIPCgtMYW5ndWFnZV9KQRAzEg8KC0xhbmd1YWdlX0tBEDQSDwoLTGFuZ3VhZ2VfS0sQNRIPCgtMYW5ndWFnZV9LTBA2Eg8KC0xhbmd1YWdlX0tNEDcSDwoLTGFuZ3VhZ2VfS04QOBIQCgxMYW5ndWFnZV9LT0sQORIPCgtMYW5ndWFnZV9LTxA6Eg8KC0xhbmd1YWdlX0tZEDsSDwoLTGFuZ3VhZ2VfTEIQPBIPCgtMYW5ndWFnZV9MTxA9Eg8KC0xhbmd1YWdlX0xUED4SDwoLTGFuZ3VhZ2VfTFYQPxIPCgtMYW5ndWFnZV9NSRBAEg8KC0xhbmd1YWdlX01LEEESDwoLTGFuZ3VhZ2VfTUwQQhIPCgtMYW5ndWFnZV9NThBDEhAKDExhbmd1YWdlX01PSBBEEg8KC0xhbmd1YWdlX01SEEUSDwoLTGFuZ3VhZ2VfTVMQRhIPCgtMYW5ndWFnZV9NVBBHEg8KC0xhbmd1YWdlX05CEEgSDwoLTGFuZ3VhZ2VfTkUQSRIPCgtMYW5ndWFnZV9OTBBKEg8KC0xhbmd1YWdlX05OEEsSEAoMTGFuZ3VhZ2VfTlNPEEwSDwoLTGFuZ3VhZ2VfT0MQTRIPCgtMYW5ndWFnZV9PUhBOEg8KC0xhbmd1YWdlX1BBEE8SDwoLTGFuZ3VhZ2VfUEwQUBIQCgxMYW5ndWFnZV9QUlMQURIPCgtMYW5ndWFnZV9QVBBSEhAKDExhbmd1YWdlX1FVVBBTEhAKDExhbmd1YWdlX1FVWhBUEg8KC0xhbmd1YWdlX1JNEFUSDwoLTGFuZ3VhZ2VfUk8QVhIPCgtMYW5ndWFnZV9SVRBXEg8KC0xhbmd1YWdlX1JXEFgSEAoMTGFuZ3VhZ2VfU0FIEFkSDwoLTGFuZ3VhZ2VfU0EQWhIPCgtMYW5ndWFnZV9TRRBbEg8KC0xhbmd1YWdlX1NJEFwSDwoLTGFuZ3VhZ2VfU0sQXRIPCgtMYW5ndWFnZV9TTBBeEhAKDExhbmd1YWdlX1NNQRBfEhAKDExhbmd1YWdlX1NNShBgEhAKDExhbmd1YWdlX1NNThBhEg8KC0xhbmd1YWdlX1NREGISDwoLTGFuZ3VhZ2VfU1IQYxIPCgtMYW5ndWFnZV9TVhBkEg8KC0xhbmd1YWdlX1NXEGUSEAoMTGFuZ3VhZ2VfU1lSEGYSDwoLTGFuZ3VhZ2VfVEEQZxIPCgtMYW5ndWFnZV9URRBoEg8KC0xhbmd1YWdlX1RHEGkSDwoLTGFuZ3VhZ2VfVEgQahIPCgtMYW5ndWFnZV9USxBrEg8KC0xhbmd1YWdlX1ROEGwSDwoLTGFuZ3VhZ2VfVFIQbRIPCgtMYW5ndWFnZV9UVBBuEhAKDExhbmd1YWdlX1RaTRBvEg8KC0xhbmd1YWdlX1VHEHASDwoLTGFuZ3VhZ2VfVUsQcRIPCgtMYW5ndWFnZV9VUhByEg8KC0xhbmd1YWdlX1VaEHMSDwoLTGFuZ3VhZ2VfVkkQdBIPCgtMYW5ndWFnZV9XTxB1Eg8KC0xhbmd1YWdlX1hIEHYSDwoLTGFuZ3VhZ2VfWU8QdxIPCgtMYW5ndWFnZV9aSBB4Eg8KC0xhbmd1YWdlX1pVEHliBnByb3RvMw==";
      break;
    case "video":
      templateName = "tmpl_9705FC0B";
      descriptor =
        "CuABCgdwLnByb3RvEhJvaXBQcm90by50ZW1wbGF0ZXMiuAEKAVASEwoLcHVibGlzaERhdGUYASABKAQSGAoQYWRkcmVzc0RpcmVjdG9yeRgDIAEoCRIQCghmaWxlbmFtZRgEIAEoCRITCgtkaXNwbGF5TmFtZRgFIAEoCRIZChF0aHVtYm5haWxGaWxlbmFtZRgGIAEoCSJCCgdOZXR3b3JrEg0KCVVOREVGSU5FRBAAEhAKDE5ldHdvcmtfSVBGUxABEhYKEk5ldHdvcmtfQklUVE9SUkVOVBACYgZwcm90bzM=";
      break;
    case "text":
      templateName = "tmpl_769D8FBC";
      descriptor =
        "CoYDCgdwLnByb3RvEhJvaXBQcm90by50ZW1wbGF0ZXMi3gIKAVASGAoHbmV0d29yaxgBIAEoDjIHTmV0d29yaxITCgt0ZXh0QWRkcmVzcxgCIAEoCRIiCgx0ZXh0RmlsZXR5cGUYAyABKA4yDFRleHRGaWxldHlwZRIRCglpc1ByZXZpZXcYBCABKAgibgoHTmV0d29yaxIVChFOZXR3b3JrX1VOREVGSU5FRBAAEhAKDE5ldHdvcmtfSVBGUxABEhYKEk5ldHdvcmtfQklUVE9SUkVOVBACEg8KC05ldHdvcmtfU0lBEAMSEQoNTmV0d29ya19TVE9SShAEIoIBCgxUZXh0RmlsZXR5cGUSGgoWVGV4dEZpbGV0eXBlX1VOREVGSU5FRBAAEhMKD1RleHRGaWxldHlwZV9NRBABEhQKEFRleHRGaWxldHlwZV9SVEYQAhIUChBUZXh0RmlsZXR5cGVfVFhUEAMSFQoRVGV4dEZpbGV0eXBlX0hUTUwQBGIGcHJvdG8z";
      break;
    case "image":
      templateName = "tmpl_1AC73C98";
      descriptor =
        "CrwCCgdwLnByb3RvEhJvaXBQcm90by50ZW1wbGF0ZXMilAIKAVASGAoHbmV0d29yaxgBIAEoDjIHTmV0d29yaxIQCghmaWxlbmFtZRgCIAEoCRIUCgxpbWFnZUFkZHJlc3MYAyABKAkSGAoQdGh1bWJuYWlsQWRkcmVzcxgEIAEoCRIZCgt0YWtlbkJ5TGlzdBgFIAMoCzIEVHhpZBIbCg10YWtlbldpdGhMaXN0GAYgAygLMgRUeGlkEhoKDHByb3RvY29sTGlzdBgHIAMoCzIEVHhpZBoTCgRUeGlkEgsKA3JhdxgBIAEoDCJKCgdOZXR3b3JrEhUKEU5ldHdvcmtfVU5ERUZJTkVEEAASEAoMTmV0d29ya19JUEZTEAESFgoSTmV0d29ya19CSVRUT1JSRU5UEAJiBnByb3RvMw==";
      break;
    case "article":
      templateName = "tmpl_D019F2E1";
      descriptor =
        "CpgCCgdwLnByb3RvEhJvaXBQcm90by50ZW1wbGF0ZXMi8AEKAVASGgoMYnlsaW5lV3JpdGVyGAEgASgLMgRUeGlkEhoKEmJ5bGluZVdyaXRlcnNUaXRsZRgCIAEoCRIdChVieWxpbmVXcml0ZXJzTG9jYXRpb24YAyABKAkSGQoLYXJ0aWNsZVRleHQYBCABKAsyBFR4aWQSFwoJaW1hZ2VMaXN0GAUgAygLMgRUeGlkEhgKEGltYWdlQ2FwdGlvbkxpc3QYBiADKAkSFwoJdmlkZW9MaXN0GAcgAygLMgRUeGlkEhgKEHZpZGVvQ2FwdGlvbkxpc3QYCCADKAkaEwoEVHhpZBILCgNyYXcYASABKAxiBnByb3RvMw==";
      break;
    case "youtube":
      templateName = "tmpl_834772F4";
      descriptor =
        "CkoKB3AucHJvdG8SEm9pcFByb3RvLnRlbXBsYXRlcyIjCgFQEgsKA3VybBgBIAEoCRIRCgl5b3VUdWJlSWQYAiABKAliBnByb3RvMw==";
      break;
    case "person":
      templateName = "tmpl_B6E9AF9B";
      descriptor =
        "ClEKB3AucHJvdG8SEm9pcFByb3RvLnRlbXBsYXRlcyIqCgFQEg8KB3N1cm5hbWUYASABKAkSFAoMcGxhY2VPZkJpcnRoGAIgASgJYgZwcm90bzM=";
      break;
    case "url":
      templateName = "tmpl_74C584FC";
      descriptor =
        "CkUKB3AucHJvdG8SEm9pcFByb3RvLnRlbXBsYXRlcyIeCgFQEgwKBG5hbWUYASABKAkSCwoDdXJsGAIgASgJYgZwcm90bzM=";
      break;
    default:
      break;
  }
  const templateInfo = {
    descriptor,
    name: templateName,
  };
  return templateInfo;
}

// format record data for publishing
async function formatRecord(recordData, recordType) {
  const record = recordData;
  var articleRecord = {};
  var bylineWriterRecord = {};
  var videoRecord = [];
  var imageRecord = [];
  var textRecord = {};
  var response = {};
  var imageQty = (record.imageRecord) ? (record.imageRecord.length) : 1;
  var videoQty = (record.videoRecord) ? (record.videoRecord.length) : 1;
  var imageCaptions = [];
  var videoCaptions = [];

if (recordType === "text" || recordType === "article") {
  textRecord = {
    basic: {
      name: "",
      language: "",
      date: "",
    },
    text: {
      textAddress: "",
      isPreview: "",
      textFiletype: "",
      network: "",
    },
    url: {
      name: "",
      url: "",
    },
  };
  const textData = textRecord;
  textData.text.textAddress = record.textRecord.textAddress;
  textData.text.isPreview = record.textRecord.isPreview || "false";
  textData.text.textFiletype = record.textRecord.textFiletype === "TextFiletype_MD" ? 1 : null;
  textData.text.network = record.textRecord.network === "Network_IPFS" ? 1 : null;
  textData.basic.name = record.textRecord.name || "";
  textData.basic.language = record.textRecord.language === "Language_EN" ? 23 : null;
  textData.basic.date = record.textRecord.date || "";
  textData.url.name = record.textRecord.name || "";
  textData.url.url = record.textRecord.textURL || "";
}
if (recordType === "bylineWriter" || recordType === "article") {
  bylineWriterRecord = {
    basic: {
      name: "",
      description: "",
      language: "",
      date: "",
      avatar: "",
      tagList: "",
    },
    person: {
      surname: "",
      placeOfBirth: "",
    },
  };
  const bylineWriterData = bylineWriterRecord;
  if (record.bylineWriter) {
    bylineWriterData.basic.name = record.bylineWriter.name;
    bylineWriterData.person.surname = record.bylineWriter.surname;
    bylineWriterData.basic.language =
      record.bylineWriter.language === "Language_EN" ? 23 : null;
  }
}
if (recordType === "image" || recordType === "article") {
  // const imageRecord = [];
  // const embeddedImageAddresses = [];
  // const embeddedImageCaptions = [];
  // const embeddedImageQty = Array.isArray(record.embeddedImages)
  //   ? record.embeddedImages.length
  //   : 0;
  // for (let i = 0; i < embeddedImageQty; i++) {
  //   image = {
  //     basic: {
  //       name: "",
  //       description: "",
  //       language: "",
  //       date: "",
  //       avatar: "",
  //       tagList: "",
  //     },
  //     image: {
  //       filename: "",
  //       imageAddress: "",
  //       thumbnailAddress: "",
  //       network: "",
  //     },
  //     url: {
  //       url: "",
  //     },
  //   };

  //   image.basic.name = record.embeddedImages[i].name || "";
  //   image.basic.description = record.embeddedImages[i].description || "";
  //   image.basic.language = record.embeddedImages[i].language === "Language_EN" ? 23 : null;
  //   image.basic.avatar = record.embeddedImages[i].avatar || null;
  //   image.basic.tagList = record.embeddedImages[i].tagList || "";
  //   image.image.filename = record.embeddedImages[i].filename || "";
  //   image.image.imageAddress = record.embeddedImages[i].imageAddress || "";
  //   image.image.thumbnailAddress =
  //     record.embeddedImages[i].thumbnailAddress || "";
  //   image.image.network =
  //     record.embeddedImages[i].network === "Network_IPFS" ? 1 : null;
  //   image.url.url = record.embeddedImages[i].url || "";

  //   embeddedImages.push(image);
  //   embeddedImageAddresses.push(record.embeddedImages[i].imageAddress);
  //   embeddedImageCaptions.push(record.embeddedImages[i].caption);
  // }
  // const imageRecord = [];
  const imageAddresses = [];
  // const imageCaptions = [];

// console.log("imageQty", imageQty);

  // const imageQty = Array.isArray(record.imageRecord)
  //   ? record.imageRecord.length
  //   : 0;
  for (let i = 0; i < imageQty; i++) {
    image = {
      basic: {
        name: "",
        description: "",
        language: "",
        date: "",
        avatar: "",
        tagList: "",
      },
      image: {
        filename: "",
        imageAddress: "",
        thumbnailAddress: "",
        network: "",
      },
      url: {
        url: "",
      },
    };

    image.basic.name = record.imageRecord[i].name || "";
    image.basic.description = record.imageRecord[i].description || "";
    image.basic.language = record.imageRecord[i].language === "Language_EN" ? 23 : null;
    image.basic.avatar = record.imageRecord[i].avatar || null;
    image.basic.tagList = record.imageRecord[i].tagList || "";
    image.image.filename = record.imageRecord[i].filename || "";
    image.image.imageAddress = record.imageRecord[i].imageAddress || "";
    image.image.thumbnailAddress =record.imageRecord[i].thumbnailAddress || "";
    image.image.network = record.imageRecord[i].network === "Network_IPFS" ? 1 : null;
    image.url.url = record.imageRecord[i].url || "";

    imageRecord.push(image);
    imageAddresses.push(record.imageRecord[i].imageAddress);
    imageCaptions.push(record.imageRecord[i].caption);
  }
  // console.log("imageRecord end, imageCaptions", imageCaptions);
}
if (recordType === "video" || recordType === "article") {
  for (let i = 0; i < videoQty; i++) {
    video = {
      basic: {
        name: "",
        description: "",
        language: "",
        date: "",
        avatar: "",
        tagList: "",
      },
      video: {
        filename: "",
        // 'p2PNetwork': '',
        addressDirectory: "",
        thumbnailFilename: "",
        displayName: "",
        publishDate: "",
      },
      youtube: {
        url: "",
        youTubeId: "",
      },
    };
    video.basic.name = record.videoRecord[i].name || "";
    video.basic.description = record.videoRecord[i].description || "";
    video.basic.language = record.videoRecord[i].language === "Language_EN" ? 23 : null;
    video.basic.date = record.videoRecord[i].date || "";
    video.basic.avatar = record.videoRecord[i].avatar || null;
    video.basic.tagList = record.videoRecord[i].tagList || "";
    video.video.filename = record.videoRecord[i].filename || "";
    video.video.addressDirectory = record.videoRecord[i].addressDirectory || "";
    video.video.thumbnailFilename = record.videoRecord[i].thumbnailFilename || "";
    video.video.displayName = record.videoRecord[i].displayName || "";
    video.video.publishDate = record.videoRecord[i].publishDate || "";
    video.youtube.url = record.videoRecord[i].youTubeURL || "";
    video.youtube.youTubeId = video.youtube.url.startsWith(
      "https://www.youtube.com"
    )
      ? video.youtube.url.split("?v=").pop()
      : video.youtube.url.split("https://youtu.be/").pop() || "";
    videoRecord.push(video);
    videoCaptions.push(record.videoRecord[i].caption);
  }
}
if (recordType === "article") {
  const imageAddresses = [];
  const videoAddresses = [];
  const articleRecord = {
    basic: {
      name: "",
      description: "",
      language: "",
      date: "",
      avatar: "",
      tagList: "",
    },
    article: {
      bylineWriter: "",
      bylineWritersTitle: "",
      bylineWritersLocation: "",
      articleText: "",
      imageList: "",
      imageCaptionList: "",
      videoList: "",
      videoCaptionList: "",
    },
    url: {
      name: "",
      url: "",
    },
  };
  const articleData = articleRecord;
  articleData.basic.name = record.name || "";
  articleData.basic.description = record.description || "";
  articleData.basic.language = record.language === "Language_EN" ? 23 : null;
  articleData.basic.date = record.date || "";
  articleData.basic.avatar = record.avatar || null;
  articleData.basic.tagList = record.tagList || "";
  articleData.url.url = record.articleURL || "";
  articleData.url.name = record.name || "";
  articleData.article.bylineWriter = record.bylineWriter || "";
  articleData.article.bylineWritersTitle = record.bylineWritersTitle || "";
  articleData.article.bylineWritersLocation = record.bylineWritersLocation || "";
  articleData.article.imageList = record.imageRecord || "";
  articleData.article.videoList = record.videoRecord || "";
  articleData.article.imageCaptionList = imageCaptions || "";
  articleData.article.videoCaptionList = videoCaptions || "";
  response = {
    articleData,
    bylineWriterRecord,
    textRecord,
    imageRecord,
    videoRecord
  };
}
if (recordType === "bylineWriter"){
  response = {
    bylineWriterRecord
  };
}
if (recordType === "image"){
  response = {
    imageRecord
  }
}
if (recordType === "video"){
  response = {
    videoRecord
}
}
if (recordType === "text"){
  response = {
    textRecord
  }
}
  return response;
}

// the next six functions search for various types of records by their specific content
async function searchForPublisherRegistrationRecord(recordData, pubKey) {
  let publisherName = (recordData != undefined) ? (recordData.name) : (undefined);
  let publisherAddress = pubKey;
  let addressOnlyOrBoth = publisherAddress && publisherName ? "both" : "addressOnly";
  let record;

  try {
    switch (addressOnlyOrBoth) {
      case "both":
        record = await axios.get(
          `${oipRecordsApiAddress}/o5/record/search?q=record.details.tmpl_433C2783.name:"${publisherName}"%20AND%20meta.signed_by:"${publisherAddress}"`
        );
        // console.log("record", record.data)
        break;
      case "addressOnly":
        record = await axios.get(
          `${oipRecordsApiAddress}/o5/record/search?q=_exists_:record.details.tmpl_433C2783%20AND%20meta.signed_by:"${publisherAddress}"`

          // `${oipRecordsApiAddress}/o5/record/search?q=record.details.tmpl_20AD45E7.name:${BylineWriterName}%20AND%20record.details.tmpl_B6E9AF9B.surname:${BylineWriterSurname}`
        );
        break;
      default:
    }
    if (record === undefined || record.data.total === 0) {
      return record.data;
    } else {
      return record.data;
    }
    
  } catch (error) {
    console.log("error", error);
  }
}

async function searchForBylineWriter(formattedBylineWriter) {
  let BylineWriterName = formattedBylineWriter.basic.name;
  let BylineWriterSurname = formattedBylineWriter.person.surname;
  let FirstOnlyOrBoth = BylineWriterName && BylineWriterSurname ? "both" : "first";
  let record;

  try {
    switch (FirstOnlyOrBoth) {
      case "first":
        record = await axios.get(
          `${oipRecordsApiAddress}/o5/record/search?q=_exists_:record.details.tmpl_B6E9AF9B%20AND%20record.details.tmpl_20AD45E7.name:${BylineWriterName}`
        );
        break;
      case "both":
        record = await axios.get(
          `${oipRecordsApiAddress}/o5/record/search?q=record.details.tmpl_20AD45E7.name:${BylineWriterName}%20AND%20record.details.tmpl_B6E9AF9B.surname:${BylineWriterSurname}`
        );
        break;
      default:
    }
    if (record === undefined || record.data.total === 0) {
      return record.data;
    } else {
      return record.data;
    }
  } catch (error) {
    console.log("error", error);
  }
}

async function searchForVideoRecords(formattedVideos, i) {
  let name = encodeURIComponent(formattedVideos[i].basic.name) || "*";
  let description = encodeURIComponent(formattedVideos[i].basic.description) || "*";
  let language = formattedVideos[i].basic.language === "Language_EN" ? 23 : "*";
  let addressDirectory = formattedVideos[i].video.addressDirectory || "*";
  let filename = formattedVideos[i].video.filename || "*";
  let thumbnailFilename = formattedVideos[i].video.thumbnailFilename || "*";
  let displayName = formattedVideos[i].video.displayName || "*";
  let publishDate = formattedVideos[i].video.publishDate || "*";
  let youTubeId = formattedVideos[i].youtube.youTubeId || "*";

  let record;
  let endpoint = "/o5/record/search?q=";
  let parameterString = oipRecordsApiAddress + endpoint;
  if (name !== "*") {
    parameterString += `record.details.tmpl_20AD45E7.name:"${name}"%20AND%20`;
  }
  if (description !== "*") {
    parameterString += `record.details.tmpl_20AD45E7.description:"${description}"%20AND%20`;
  }
  if (language !== "*") {
    parameterString += `record.details.tmpl_20AD45E7.language:"${language}"%20AND%20`;
  }
  if (addressDirectory !== "*") {
    parameterString += `record.details.tmpl_9705FC0B.addressDirectory:"${addressDirectory}"%20AND%20`;
  }
  if (filename !== "*") {
    parameterString += `record.details.tmpl_9705FC0B.filename:"${filename}"%20AND%20`;
  }
  if (thumbnailFilename !== "*") {
    parameterString += `record.details.tmpl_9705FC0B.thumbnailFilename:"${thumbnailFilename}"%20AND%20`;
  }
  if (displayName !== "*") {
    parameterString += `record.details.tmpl_9705FC0B.displayName:"${displayName}"%20AND%20`;
  }
  if (publishDate !== "*") {
    parameterString += `record.details.tmpl_9705FC0B.publishDate:"${publishDate}"%20AND%20`;
  }
  if (youTubeId !== "*") {
    parameterString += `record.details.tmpl_834772F4.youTubeId:"${youTubeId}"%20AND%20`;
  }
  parameterString = parameterString.slice(0, -9);
  try {
    record = await axios.get(parameterString);
    if (record.data.count === 0 || record === undefined) {
      return record.data;
    } else {
      return record.data;
    }
  } catch (error) {
    console.log("error", error);
  }
}

async function searchForImageRecords(formattedImages, i) {
  let name = encodeURIComponent(formattedImages[i].basic.name) || "*";
  let description = encodeURIComponent(formattedImages[i].basic.description) || "*";
  let filename = formattedImages[i].image.filename || "*";
  let thumbnailAddress = formattedImages[i].image.thumbnailAddress || "*";
  let imageAddress = formattedImages[i].image.imageAddress || "*";
  let network = formattedImages[i].image.network === "Network_IPFS" ? 1 : "*";
  let url = encodeURIComponent(formattedImages[i].url.url) || "*";
  let record;

  let parameterString = "https://api.oip.io/oip/o5/record/search?q=";
  if (name !== "*") {
    parameterString += `record.details.tmpl_20AD45E7.name:"${name}"%20AND%20`;
  }
  if (description !== "*") {
    parameterString += `record.details.tmpl_20AD45E7.description:"${description}"%20AND%20`;
  }
  if (filename !== "*") {
    parameterString += `record.details.tmpl_1AC73C98.filename:"${filename}"%20AND%20`;
  }
  if (thumbnailAddress !== "*") {
    parameterString += `record.details.tmpl_1AC73C98.thumbnailAddress:"${thumbnailAddress}"%20AND%20`;
  }
  if (imageAddress !== "*") {
    parameterString += `record.details.tmpl_1AC73C98.imageAddress:"${imageAddress}"%20AND%20`;
  }
  if (network !== "*") {
    parameterString += `record.details.tmpl_1AC73C98.network:"${network}"%20AND%20`;
  }
  if (url !== "*") {
    parameterString += `record.details.tmpl_74C584FC.url:"${url}"%20AND%20`;
  }
  parameterString = parameterString.slice(0, -9);
  try {
    record = await axios.get(parameterString);
    if (record.data.results === 0) {
      return record.data;
    } else {
      return record.data;
    }
  } catch (error) {
    console.log("error", error);
  }
}

async function searchForTextRecord(formattedTextData) {
  let name = encodeURIComponent(formattedTextData.basic.name) || "*";
  let date = formattedTextData.basic.date || "*";
  let language =
    formattedTextData.basic.language === "Language_EN" ? 23 : "*";
  let textAddress = formattedTextData.text.textAddress || "*";
  let textFiletype =
    formattedTextData.text.textFiletype === "TextFiletype_MD" ? 1 : "*";
  let network = formattedTextData.text.network === "Network_IPFS" ? 1 : "*";
  let url = encodeURIComponent(formattedTextData.url.url) || "*";

  let record;
  let endpoint = "/o5/record/search?q=";
  let parameterString = oipRecordsApiAddress + endpoint;
  if (name !== "*") {
    parameterString += `record.details.tmpl_20AD45E7.name:"${name}"%20AND%20`;
  }
  if (date !== "*") {
    parameterString += `record.details.tmpl_20AD45E7.date:"${date}"%20AND%20`;
  }
  if (language !== "*") {
    parameterString += `record.details.tmpl_20AD45E7.language:"${language}"%20AND%20`;
  }
  if (textAddress !== "*") {
    parameterString += `record.details.tmpl_769D8FBC.textAddress:"${textAddress}"%20AND%20`;
  }
  if (textFiletype !== "*") {
    parameterString += `record.details.tmpl_769D8FBC.textFiletype:"${textFiletype}"%20AND%20`;
  }
  if (network !== "*") {
    parameterString += `record.details.tmpl_769D8FBC.network:"${network}"%20AND%20`;
  }
  if (url !== "*") {
    parameterString += `record.details.tmpl_74C584FC.url:"${url}"%20AND%20`;
  }
  parameterString = parameterString.slice(0, -9);
  try {
    record = await axios.get(parameterString);
    if (record.data.results === 0) {
      return record.data;
    } else {
      return record.data;
    }
  } catch (error) {
    console.log("error", error);
  }
}

async function searchForArticleRecord(formattedArticleData, oipRefs) {
  let name = encodeURIComponent(formattedArticleData.basic.name) || "*";
  let description = encodeURIComponent(formattedArticleData.basic.description) || "*";
  let bylineWritersTitle = encodeURIComponent(formattedArticleData.article.bylineWritersTitle) || "*";
  let bylineWritersLocation = encodeURIComponent(formattedArticleData.article.bylineWritersLocation) || "*";
  let url = encodeURIComponent(formattedArticleData.url.url) || "*";
  let language = formattedArticleData.basic.language === "Language_EN" ? 23 : "*";
  let date = formattedArticleData.basic.date || "*";
  let bylineWriter = oipRefs.bylineWriter_txid.toString();
  let tagList = formattedArticleData.basic.tagList || "*";
  let imageList = oipRefs.embeddedImage_txids || "*";
  let videoList = oipRefs.embeddedVideo_txids || "*";
  let imageCaptionList = formattedArticleData.article.imageCaptionList || "*";
  let videoCaptionList = formattedArticleData.article.videoCaptionList || "*";
  let tagListParameterString = "";
  for (let i = 0; i < formattedArticleData.basic.tagList.length; i++) {
    let tag = encodeURIComponent(formattedArticleData.basic.tagList[i]) || "*";
    tagListParameterString += `record.details.tmpl_20AD45E7.tagList:"${tag}"%20AND%20`;
  }

  let imageCaptionListParameterString = "";
  for (
    let i = 0;
    i < formattedArticleData.article.imageCaptionList.length;
    i++
  ) {
    let imageCaption =
      encodeURIComponent(formattedArticleData.article.imageCaptionList[i]) ||
      "*";
    imageCaptionListParameterString += `record.details.tmpl_D019F2E1.imageCaptionList:"${imageCaption}"%20AND%20`;
  }

  let videoCaptionListParameterString = "";
  for (
    let i = 0;
    i < formattedArticleData.article.videoCaptionList.length;
    i++
  ) {
    let videoCaption =
      encodeURIComponent(formattedArticleData.article.videoCaptionList[i]) ||
      "*";
    videoCaptionListParameterString += `record.details.tmpl_D019F2E1.videoCaptionList:"${videoCaption}"%20AND%20`;
  }

  let imageListParameterString = "";
  for (let i = 0; i < formattedArticleData.article.imageList.length; i++) {
    let image = encodeURIComponent(oipRefs.embeddedImage_txids[i]) || "*";
    imageListParameterString += `record.details.tmpl_D019F2E1.imageList:"${image}"%20AND%20`;
  }

  let videoListParameterString = "";
  for (let i = 0; i < formattedArticleData.article.videoList.length; i++) {
    let video = encodeURIComponent(oipRefs.embeddedVideo_txids[i]) || "*";
    videoListParameterString += `record.details.tmpl_D019F2E1.videoList:"${video}"%20AND%20`;
  }
  let record;
  let endpoint = "/o5/record/search?q=";
  let parameterString = oipRecordsApiAddress + endpoint;
  if (name !== "*") {
    parameterString += `record.details.tmpl_20AD45E7.name:"${name}"%20AND%20`;
  }
  if (description !== "*") {
    parameterString += `record.details.tmpl_20AD45E7.description:"${description}"%20AND%20`;
  }
  if (date !== "*") {
    parameterString += `record.details.tmpl_20AD45E7.date:"${date}"%20AND%20`;
  }
  if (tagList !== "*") {
    parameterString += tagListParameterString;
  }
  if (language !== "*") {
    parameterString += `record.details.tmpl_20AD45E7.language:"${language}"%20AND%20`;
  }
  if (bylineWriter !== "*") {
    parameterString += `record.details.tmpl_D019F2E1.bylineWriter:"${bylineWriter}"%20AND%20`;
  }
  if (bylineWritersTitle !== "*") {
    parameterString += `record.details.tmpl_D019F2E1.bylineWritersTitle:"${bylineWritersTitle}"%20AND%20`;
  }
  if (bylineWritersLocation !== "*") {
    parameterString += `record.details.tmpl_D019F2E1.bylineWritersLocation:"${bylineWritersLocation}"%20AND%20`;
  }
  if (imageList !== "*") {
    parameterString += imageListParameterString;
  }
  if (imageCaptionList !== "*") {
    parameterString += imageCaptionListParameterString;
  }
  if (videoList !== "*") {
    parameterString += videoListParameterString;
  }
  if (videoCaptionList !== "*") {
    parameterString += videoCaptionListParameterString;
  }
  if (url !== "*") {
    parameterString += `record.details.tmpl_74C584FC.url:"${url}"%20AND%20`;
  }

  parameterString = parameterString.slice(0, -9);
  try {
    record = await axios.get(parameterString);
    if (record.data.results === 0) {
      return record.data;
    } else {
      return record.data;
    }
  } catch (error) {
    console.log("parameterString", parameterString, "error", error);
  }
}

// get a record from the blockchain
async function getRecord(recordID) {
  let endpoint = `/o5/record/get/${recordID}`;
  let url = oipRecordsApiAddress + endpoint;
  let record;

  const timeout = 5 * 1000;

  const timeoutPromise = new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(new Error("Timeout"));
    }, timeout);
  });

  const getPromise = axios.get(url);

  try {
    record = await Promise.race([timeoutPromise, getPromise]);
  } catch (e) {
    console.log("error", e.response.statusText);
  }

  if (record.count === 0) {
    return null;
  } else {
    return record.data;
  }
}

// send signed p64floData to publishing sponsor to publish the tx
async function sendTxToPublishingSponsor(
  signedP64floData,
  prev_txo,
  mpRef_txid
) {
  const endpoint = "/api/v1/sendTxToPublishingSponsor";
  const url = publishingSponsorAddress + endpoint;
  const data = [
    {
      prev_txo: prev_txo,
      mpRef_txid: mpRef_txid,
    },
    {
      signedP64floData: signedP64floData,
    },
  ];
  const options = {
    method: "POST",
    url: url,
    body: data,
    json: true,
  };

  result = await axios({
    method: "POST",
    url: url,
    data: data,
  }).catch((err) => {
    console.log("error");
  });
  return result.data.txo;
}

// format data into an OIP record
function makeRecord(data) {
  return {
    details: data,
    myMainAddress: wif,
    pubKey: localnode.publisherPubKey,
  };
}

// turn formatted data into floDataJSON
async function makeFloDataJSON(payload, templates) {
  let data = [];
  for (let i = 0; i < templates.length; i++) {
    let templateType = templates[i];
    let lookedupTemplateInfo = await lookupTemplateInfo(templateType);

    let templateDescriptor = lookedupTemplateInfo.descriptor;
    let templateName = lookedupTemplateInfo.name;
    let templatePayload = payload[i];
    let template = {
      descriptor: templateDescriptor,
      name: templateName,
      payload: templatePayload,
    };
    data.push(template);
  }
  floDataJSON = makeRecord(data);
  return floDataJSON;
}

// make a raw TX and send it to the blockchain
async function makeAndSendRawTransaction(
  signedP64floData,
  wif,
  selfPublish,
  prev_txo,
  mpRef_txid,
  walletCredentials
  ) {
  if ((selfPublish = true)) {
    network = "mainnet";
    let walletRPC = new RPCWallet({
      publicAddress: walletCredentials.pubKey,
      wif,
      network,
      rpc: {
        port: walletClientPort,
        host: "127.0.0.1",
        username: "x",
        password: localnode.apiKey,
      },
    });
    const result = await walletRPC.prepSignedTXforChain(
      signedP64floData,
      prev_txo
    );
    txid = await client.execute("sendrawtransaction", [result.signedTxHex]);

    let txo = {
      txid: txid,
      amount: result.txo.amount,
      address: result.txo.address,
      vout: 0,
      mpRef_txid: mpRef_txid,
    };
    return txo;
  } else {
    const result = await sendTxToPublishingSponsor(
      signedP64floData,
      prev_txo,
      mpRef_txid
    );

    let txo = {
      txid: result.txid,
      amount: result.amount,
      address: result.address,
      vout: 0,
      mpRef_txid: mpRef_txid,
    };

    return txo;
  }
}

// publish signed P64floData to the blockchain, possibly as multipart
async function publishSignedOIPRecord(
  signedP64floData,
  wif,
  selfPublish,
  prev_txo,
  walletCredentials
) 
{
  // console.log('executing publishSignedOIPRecord:', walletCredentials)
  if (signedP64floData.length > 1040) {
    // mpx
    // console.log('signedP64floData is too long, sending as a multipart message');

    let mpx = new Modules.MultipartX(signedP64floData).multiparts;
    if (!Array.isArray(mpx)) {
      return console.log("uh oh", mpx);
    }
    // console.log('selfpublish', selfPublish, 'walletCredentials:', walletCredentials)
    mpx[0].setAddress(walletCredentials.pubKey);
    let signatureData = mpx[0].getSignatureData();
    mp1_sig = await signMessage(wif, walletCredentials.pubKey, signatureData);

    mpx[0].setSignature(mp1_sig);
    const signedp64_mp1_forPublishing = `${mpx[0].prefix}(${mpx[0].part},${mpx[0].max},${mpx[0].address},,${mpx[0].signature}):${mpx[0].data}`;
    let mpRef_txid = undefined;
    firstTX = await makeAndSendRawTransaction(
      signedp64_mp1_forPublishing,
      wif,
      selfPublish,
      prev_txo,
      mpRef_txid,
      walletCredentials
    );
    let mpTxIDArray = [];
    let mpTxOArray = [];
    mpTxIDArray.push(firstTX.txid);
    mpTxOArray.push(firstTX);
    mpRef_txid = firstTX.txid;
    // if first transaction has successfully been sent, start the loop
    if (firstTX) {
      const delay = (ms) => new Promise((res) => setTimeout(res, ms));
      await delay(2000);
      for (let i = 1; i < mpx.length; i++) {
        mpx[i].setReference(firstTX.txid);
        mpx[i].setAddress(walletCredentials.pubKey);
        let sig = await signMessage(
          wif,
          walletCredentials.pubKey,
          mpx[i].getSignatureData()
        );
        mpx[i].setSignature(sig);
        let result = await makeAndSendRawTransaction(
          `${mpx[i].prefix}(${mpx[i].part},${mpx[i].max},${mpx[i].address},${mpx[i].reference},${mpx[i].signature}):${mpx[i].data}`,
          wif,
          selfPublish,
          mpTxOArray[i - 1],
          mpRef_txid,
          walletCredentials
        );
        txo = result;
        mpTxIDArray.push(txo.txid);
        mpTxOArray.push(txo);
        const recordTxidArray = await Promise.all([sig, txo]).then((values) => {
          return mpTxIDArray, mpTxOArray, txo;
        });
      }
    }
    return txo;
  } else {
    // single
    // console.log('signedP64floData is short enough to send as a single message, walletCredentials:', walletCredentials)
    let txo = await makeAndSendRawTransaction(
      signedP64floData,
      wif,
      selfPublish,
      prev_txo,
      undefined,
      walletCredentials
    );
    return txo;
  }
}

// search for a previously published OIP record and return its txid if found, otherwise publish a new OIP record and return its txid
// async function findOrPublishRecord(
//   recordType,
//   formattedRecordData,
//   selfPublish,
//   wif,
//   record_txo,
//   i,
//   oipRefs,
//   referencedRecords
// ) {
async function findOrPublishRecord(
  data, i, referencedRecords
) {
  recordType = data.recordType
  formattedRecordData = data.formattedRecordData
  walletCredentials = data.walletCredentials
  account = data.account
  wif = data.wif
  selfPublish = data.selfPublish
  record_txo = data.record_txo || []
  oipRefs = data.oipRefs || []
  referencedRecords = referencedRecords || []
  // recordStatus = data.recordStatus || []

  switch (recordType) {
    case "bylineWriter":
      // console.log("XYZ bylineWriter", formattedRecordData);
      bylineWriterInIndex = await searchForBylineWriter(
        formattedRecordData.bylineWriterRecord
      );
      let bylineWriter_txid = [];
      bylineWriterReference =
        bylineWriterInIndex == null ||
        bylineWriterInIndex == undefined ||
        bylineWriterInIndex.total == 0
          ? false
          : bylineWriterInIndex;
      if (bylineWriterReference == false) {
        const basic = formattedRecordData.bylineWriterRecord.basic;
        const person = formattedRecordData.bylineWriterRecord.person;
        const payload = [basic, person];
        let templates = ["basic", "person"];
        let prev_txo =
          record_txo.length > 0 ? record_txo[record_txo.length - 1] : undefined;
        const floDataJSON = await makeFloDataJSON(payload, templates);
        const signedP64floData = await getSignedP64FloData(floDataJSON, wif);
        const txo = await publishSignedOIPRecord(
          signedP64floData,
          wif,
          selfPublish,
          prev_txo,
          walletCredentials
        );
        record_txo.push(txo);
        bylineWriter_txid.push(
          txo.mpRef_txid !== undefined ? txo.mpRef_txid : txo.txid
        );
        let referenceRecordStatus = `bylineAuthor not found in index, published a new record for: ${formattedRecordData.bylineWriterRecord.basic.name} ${formattedRecordData.bylineWriterRecord.person.surname} with OIPRef:${bylineWriter_txid}`;
        referencedRecords.push(referenceRecordStatus);
        return bylineWriter_txid;
      } else {
        let referenceRecordStatus = `OIPRef:${bylineWriterInIndex.results[0].meta.txid} already exists for bylineWriter: ${formattedRecordData.bylineWriterRecord.basic.name} ${formattedRecordData.bylineWriterRecord.person.surname}`;
        referencedRecords.push(referenceRecordStatus);
        bylineWriter_txid.push(bylineWriterInIndex.results[0].meta.txid);
        return bylineWriter_txid;
      }
      break;
    case "video":
      // console.log('5 - findOrPublishRecord formattedRecordData:', formattedRecordData)
        let videoRecordInIndex = await searchForVideoRecords(
          formattedRecordData.videoRecord,
          i
        );
        let videoRecord_txid = "";
        videoReference =
          videoRecordInIndex == null ||
          videoRecordInIndex == undefined ||
          videoRecordInIndex.total == 0
            ? false
            : videoRecordInIndex;
        if (videoReference == false) {
          const basic = formattedRecordData.videoRecord[i].basic;
          const video = formattedRecordData.videoRecord[i].video;
          const youtube = formattedRecordData.videoRecord[i].youtube;
          // const basic = formattedRecordData.embeddedVideos[i].basic;
          // const video = formattedRecordData.embeddedVideos[i].video;
          // const youtube = formattedRecordData.embeddedVideos[i].youtube;
          const payload = [basic, video, youtube];
          const templates = ["basic", "video", "youtube"];
          let prev_txo = undefined
            // record_txo.length > 0 ? record_txo[record_txo.length - 1] : undefined;
          const floDataJSON = await makeFloDataJSON(payload, templates);
          const signedP64floData = await getSignedP64FloData(floDataJSON, wif);
          console.log('stuff to publish:', signedP64floData, wif, selfPublish, prev_txo)
          const txo = await publishSignedOIPRecord(
            signedP64floData,
            wif,
            selfPublish,
            prev_txo,
            walletCredentials
          );
          record_txo.push(txo);
          videoRecord_txid =
            txo.mpRef_txid !== undefined ? txo.mpRef_txid : txo.txid;
          let referenceRecordStatus = `video not found in index, published a new record for: ${formattedRecordData.videoRecord[i].basic.name} with OIPRef:${videoRecord_txid}`;
          referencedRecords.push(referenceRecordStatus);
          return videoRecord_txid;
        } else {
          let referenceRecordStatus = `OIPRef:${videoRecordInIndex.results[0].meta.txid} already exists for video: ${formattedRecordData.videoRecord[i].basic.name}`;
          referencedRecords.push(referenceRecordStatus);
          videoRecord_txid = videoRecordInIndex.results[0].meta.txid;
          return videoRecord_txid;
        }
        break;
    case "image":
      let imageRecordInIndex = await searchForImageRecords(
        formattedRecordData.imageRecord,
        i
      );
      let imageRecord_txid = "";
      imageReference =
        imageRecordInIndex == null ||
        imageRecordInIndex == undefined ||
        imageRecordInIndex.total == 0
          ? false
          : imageRecordInIndex;
      if (imageReference == false) {
        const basic = formattedRecordData.imageRecord[i].basic;
        const image = formattedRecordData.imageRecord[i].image;
        const url = formattedRecordData.imageRecord[i].url;
        const payload = [basic, image, url];
        const templates = ["basic", "image", "url"];
        let prev_txo = undefined;
          // record_txo.length > 0 ? record_txo[record_txo.length - 1] : undefined;
        const floDataJSON = await makeFloDataJSON(payload, templates);
        const signedP64floData = await getSignedP64FloData(floDataJSON, wif);
        const txo = await publishSignedOIPRecord(
          signedP64floData,
          wif,
          selfPublish,
          prev_txo,
          walletCredentials
        );
        record_txo.push(txo);
        imageRecord_txid =
          txo.mpRef_txid !== undefined ? txo.mpRef_txid : txo.txid;
        let referenceRecordStatus = `image not found in index, published a new record for: ${formattedRecordData.imageRecord[i].image.filename} with OIPRef:${imageRecord_txid}`;
        referencedRecords.push(referenceRecordStatus);
        return imageRecord_txid;
      } else {
        let referenceRecordStatus = `OIPRef:${imageRecordInIndex.results[0].meta.txid} already exists for image: ${formattedRecordData.imageRecord[i].image.filename}`;
        referencedRecords.push(referenceRecordStatus);
        // console.log('referenceRecordStatus:', referenceRecordStatus)
        imageRecord_txid = imageRecordInIndex.results[0].meta.txid;
        return imageRecord_txid;
      }
      break;
    case "text":
      // console.log('8 - findOrPublishRecord formattedRecordData:', formattedRecordData)
      let textRecordInIndex = await searchForTextRecord(
        formattedRecordData.textRecord,
        i
      );
      let textRecord_txid = [];
      textReference =
        textRecordInIndex == null ||
        textRecordInIndex == undefined ||
        textRecordInIndex.total == 0
          ? false
          : textRecordInIndex;
      if (textReference == false) {
        const basic = formattedRecordData.textRecord.basic;
        const text = formattedRecordData.textRecord.text;
        const url = formattedRecordData.textRecord.url;
        const payload = [basic, text, url];
        const templates = ["basic", "text", "url"];
        let prev_txo = undefined;
          // record_txo.length > 0 ? record_txo[record_txo.length - 1] : undefined;
        const floDataJSON = await makeFloDataJSON(payload, templates);
        const signedP64floData = await getSignedP64FloData(floDataJSON, wif);
        const txo = await publishSignedOIPRecord(
          signedP64floData,
          wif,
          selfPublish,
          prev_txo,
          walletCredentials
        );
        record_txo.push(txo);
        // bylineWriter_txid.push(
        //   txo.mpRef_txid !== undefined ? txo.mpRef_txid : txo.txid
        // );
        textRecord_txid.push(
          txo.mpRef_txid !== undefined ? txo.mpRef_txid : txo.txid
        );
        let referenceRecordStatus = `text not found in index, published a new record for: ${formattedRecordData.textRecord.basic.name} with OIPRef:${textRecord_txid}`;
        referencedRecords.push(referenceRecordStatus);
        return textRecord_txid;
      } else {
        let referenceRecordStatus = `OIPRef:${textRecordInIndex.results[0].meta.txid} already exists for text: ${formattedRecordData.textRecord.basic.name}`;
        referencedRecords.push(referenceRecordStatus);
        textRecord_txid.push(textRecordInIndex.results[0].meta.txid);
        // bylineWriter_txid.push(bylineWriterInIndex.results[0].meta.txid);

        return textRecord_txid;
      }
      break;
    case "embeddedVideo":
      embeddedVideoInIndex = await searchForVideoRecords(
        formattedRecordData.embeddedVideos,
        i
      );
      let embeddedVideo_txid = "";
      embeddedVideoReference =
        embeddedVideoInIndex == null ||
        embeddedVideoInIndex == undefined ||
        embeddedVideoInIndex.total == 0
          ? false
          : embeddedVideoInIndex;
      if (embeddedVideoReference == false) {
        const basic = formattedRecordData.embeddedVideos[i].basic;
        const video = formattedRecordData.embeddedVideos[i].video;
        const youtube = formattedRecordData.embeddedVideos[i].youtube;
        const payload = [basic, video, youtube];
        const templates = ["basic", "video", "youtube"];
        let prev_txo =
          record_txo.length > 0 ? record_txo[record_txo.length - 1] : undefined;
        const floDataJSON = await makeFloDataJSON(payload, templates);
        const signedP64floData = await getSignedP64FloData(floDataJSON, wif);
        const txo = await publishSignedOIPRecord(
          signedP64floData,
          wif,
          selfPublish,
          prev_txo
        );
        record_txo.push(txo);
        embeddedVideo_txid =
          txo.mpRef_txid !== undefined ? txo.mpRef_txid : txo.txid;
        let referenceRecordStatus = `embeddedVideo not found in index, published a new record for: ${formattedRecordData.embeddedVideos[i].basic.name} with OIPRef:${embeddedVideo_txid}`;
        referencedRecords.push(referenceRecordStatus);
        return embeddedVideo_txid;
      } else {
        let referenceRecordStatus = `OIPRef:${embeddedVideoInIndex.results[0].meta.txid} already exists for embeddedVideo: ${formattedRecordData.embeddedVideos[i].basic.name}`;
        referencedRecords.push(referenceRecordStatus);
        embeddedVideo_txid = embeddedVideoInIndex.results[0].meta.txid;
        return embeddedVideo_txid;
      }
      break;
    case "embeddedImage":
      embeddedImageInIndex = await searchForImageRecords(
        formattedRecordData.embeddedImages,
        i
      );
      let embeddedImage_txid = "";
      embeddedImageReference =
        embeddedImageInIndex == null ||
        embeddedImageInIndex == undefined ||
        embeddedImageInIndex.total == 0
          ? false
          : embeddedImageInIndex;
      if (embeddedImageReference == false) {
        const basic = formattedRecordData.embeddedImages[i].basic;
        const image = formattedRecordData.embeddedImages[i].image;
        const url = formattedRecordData.embeddedImages[i].url;
        const payload = [basic, image, url];
        const templates = ["basic", "image", "url"];
        let prev_txo =
          record_txo.length > 0 ? record_txo[record_txo.length - 1] : undefined;
        const floDataJSON = await makeFloDataJSON(payload, templates);
        const signedP64floData = await getSignedP64FloData(floDataJSON, wif);
        const txo = await publishSignedOIPRecord(
          signedP64floData,
          wif,
          selfPublish,
          prev_txo
        );
        record_txo.push(txo);
        embeddedImage_txid =
          txo.mpRef_txid !== undefined ? txo.mpRef_txid : txo.txid;
        let referenceRecordStatus = `embeddedImage not found in index, published a new record for: ${formattedRecordData.articleData[0].article.imageCaptionList[i]} with OIPRef:${embeddedImage_txid}`;
        referencedRecords.push(referenceRecordStatus);
        return embeddedImage_txid;
      } else {
        let referenceRecordStatus = `OIPRef:${embeddedImageInIndex.results[0].meta.txid} already exists for embeddedImage: ${formattedRecordData.articleData[0].article.imageCaptionList[i]}`;
        referencedRecords.push(referenceRecordStatus);
        embeddedImage_txid = embeddedImageInIndex.results[0].meta.txid;
        return embeddedImage_txid;
      }
      break;
    case "embeddedText":
      embeddedTextInIndex = await searchForTextRecord(
        formattedRecordData.textData
      );
      let embeddedText_txid = [];
      embeddedTextReference =
        embeddedTextInIndex == null ||
        embeddedTextInIndex == undefined ||
        embeddedTextInIndex.total == 0
          ? false
          : embeddedTextInIndex;
      if (embeddedTextReference == false) {
        const basic = formattedRecordData.textData[0].basic;
        const text = formattedRecordData.textData[0].text;
        const url = formattedRecordData.textData[0].url;
        const payload = [basic, text, url];
        const templates = ["basic", "text", "url"];
        let prev_txo =
          record_txo.length > 0 ? record_txo[record_txo.length - 1] : undefined;
        const floDataJSON = await makeFloDataJSON(payload, templates);
        const signedP64floData = await getSignedP64FloData(floDataJSON, wif);
        const txo = await publishSignedOIPRecord(
          signedP64floData,
          wif,
          selfPublish,
          prev_txo
        );
        record_txo.push(txo);
        embeddedText_txid.push(
          txo.mpRef_txid !== undefined ? txo.mpRef_txid : txo.txid
        );
        let referenceRecordStatus = `embeddedText not found in index, published a new record for: ${formattedRecordData.textData[0].basic.name} with OIPRef:${embeddedText_txid}`;
        referencedRecords.push(referenceRecordStatus);
        return embeddedText_txid;
      } else {
        let referenceRecordStatus = `OIPRef:${embeddedTextInIndex.results[0].meta.txid} already exists for embeddedText: ${formattedRecordData.textData[0].basic.name}`;
        referencedRecords.push(referenceRecordStatus);
        embeddedText_txid.push(embeddedTextInIndex.results[0].meta.txid);
        return embeddedText_txid;
      }
      break;
    case "article":
      articleInIndex = await searchForArticleRecord(
        formattedRecordData.articleData,
        oipRefs
      );
      let article_txid = [];
      articleReference =
        articleInIndex == null ||
        articleInIndex == undefined ||
        articleInIndex.total == 0
          ? false
          : articleInIndex;
      if (articleReference == false) {
        const basic = formattedRecordData.articleData.basic;
        const article = formattedRecordData.articleData.article;
        const url = formattedRecordData.articleData.url;
        const payload = [basic, article, url];
        const templates = ["basic", "article", "url"];
        let prev_txo =
          record_txo.length > 0 ? record_txo[record_txo.length - 1] : undefined;
        const floDataJSON = await makeFloDataJSON(payload, templates);
        const signedP64floData = await getSignedP64FloData(floDataJSON, wif);
        const txo = await publishSignedOIPRecord(
          signedP64floData,
          wif,
          selfPublish,
          prev_txo,
          walletCredentials
        );
        record_txo.push(txo);
        article_txid.push(
          txo.mpRef_txid !== undefined ? txo.mpRef_txid : txo.txid
        );
        let referenceRecordStatus = `article not found in index, published a new record for: ${formattedRecordData.articleData.basic.name} with OIPRef:${article_txid}`;
        referencedRecords.push(referenceRecordStatus);
        return article_txid;
      } else {
        let referenceRecordStatus = `OIPRef:${articleInIndex.results[0].meta.txid} already exists for article: ${formattedRecordData.articleData.basic.name}, not publishing anything...`;
        referencedRecords.push(referenceRecordStatus);
        article_txid.push(articleInIndex.results[0].meta.txid);
        return article_txid;
      }
      break;
    case "publisher-registration":

      var walletID = walletCredentials.walletID;
      var pubKey = walletCredentials.pubKey;
      publisher_registration_in_index = await searchForPublisherRegistrationRecord(
        formattedRecordData,
        pubKey
      );
 
      publisher_registration_reference = 
        publisher_registration_in_index == null ||
        publisher_registration_in_index == undefined ||
        publisher_registration_in_index.total == 0
          ? false
          : publisher_registration_in_index;
      if (publisher_registration_reference == false) {
        const fpub = await getFpub(walletID, account);
      
        // Prepare the registration data
        const data = await prepRegistration(pubKey, formattedRecordData.name, fpub, wif);
        const signedP64floData = await getSignedP64FloData(data, wif);
        const txo = await publishSignedOIPRecord(signedP64floData, wif, selfPublish, undefined, walletCredentials);
        const txid = txo.txid;
        return ({txid,data});
      } else {
        const txid = publisher_registration_reference.results[0].meta.txid;
        const data = undefined
        return ({txid,data});
      }
      break;
  }
}

// load the currently chosen wallet credentials either from the env or from the request headers
async function getWalletCredentials(req) {
  // console.log("getWalletCredentials", req.headers)
  const userID =
    req != undefined
      ? req.headers["userid"] != undefined
        ? req.headers["userid"]
        : localnode.publishingWalletUserid
      : localnode.publishingWalletUserid != undefined
      ? localnode.publishingWalletUserid
      : undefined;
  const passphrase =
    req != undefined
      ? req.headers["passphrase"] != undefined
        ? req.headers["passphrase"]
        : localnode.publishingWalletPassphrase
      : localnode.publishingWalletPassphrase;
  const walletID =
    userID != undefined && userID != ""
      ? SHA1(userID).toString()
      : localnode.publishingWalletID != undefined
      ? localnode.publishingWalletID
      : req.headers.walletid != undefined
      ? req.headers.walletid
      : undefined;
  const pubkey = localnode.publisherPubKey != undefined ? localnode.publisherPubKey : req != undefined ? req.headers.pubkey : undefined;
  
      
    // console.log("userid", userID, "walletID", walletID, "passphrase", passphrase)
  if (userID == undefined && walletID == undefined || userID == "" && walletID == undefined) {
    return Error("no userID set by env or header");
  // } else if (passphrase == undefined || passphrase == "") {
  //   return Error("no passphrase set by env or header");
  
  } else {
    const walletClient = new WalletClient(walletClientOptions);
    let receivedbyaddress = await walletClient.execute(
      "listreceivedbyaddress",
      [1, false, false]
    );
    if (receivedbyaddress.length > 0) {
      if ( pubkey == undefined
        // env.config().parsed.publisherPubKey == undefined &&
        // req.headers["pubkey"] == undefined
      ) {
        console.log(
          "no pub key set by env or header, setting to first address in wallet"
        );
        for (let i = 0; i < receivedbyaddress.length; i++) {
          if (receivedbyaddress[i].address == localnode.publisherPubKey) {
            let pubKey = receivedbyaddress[i].address;
            return { userID, walletID, pubKey, passphrase };
          }
        }
        let pubKey = receivedbyaddress[0].address;
        return { userID, walletID, pubKey, passphrase };
      } else {
        if (req != undefined && req.headers["pubkey"] != undefined) {
          for (let i = 0; i < receivedbyaddress.length; i++) {
            if (receivedbyaddress[i].address == req.headers["pubkey"]) {
              let pubKey = receivedbyaddress[i].address;
              return { userID, walletID, pubKey, passphrase };
            }
          }
        } else if (env.config().parsed.publisherPubKey != undefined) {
          for (let i = 0; i < receivedbyaddress.length; i++) {
            if (
              receivedbyaddress[i].address ==
              env.config().parsed.publisherPubKey
            ) {
              let pubKey = receivedbyaddress[i].address;
              return { userID, walletID, pubKey, passphrase };
            }
          }
        }
      }
    }
    let lookupPubKey = await getAccountInfo(walletID, "default");
    let pubKey =
      lookupPubKey.receiveAddress != undefined
        ? lookupPubKey.receiveAddress
        : localnode.publisherPubKey;
    return { userID, walletID, pubKey, passphrase };
  }
}

// --------------------------------------------------------------------------------
// endpoints

// use this endpoint to check the chain sync status and other info
app.get("/api/v1/getInfo", async (req, res) => {
  console.log("handling RPC call: getInfo, loadedScript: ", loadedScript);

  try {
    const credentials = await getWalletCredentials(req);
    // console.log("credentials", credentials)
    unspent = (credentials.pubKey != null)?(await walletClient.execute("listunspent", [1,9999999,[credentials.pubKey],])) : undefined;
    // console.log("unspent:", unspent)
    balance = (unspent != undefined && unspent.length != [])?(unspent[0].amount) : 0;
    // console.log("balance", balance)
    // 
    // 
    // const wallet = walletClient.wallet(credentials.walletID);
    // const walletInfo = await wallet.getInfo();
    // console.log("walletInfo", walletInfo);
    publisherRegistration = (credentials.pubKey != null) ? (await searchForPublisherRegistrationRecord(undefined,credentials.pubKey)) : undefined;
    // console.log("publisherRegistration", publisherRegistration)
    publisherName = (publisherRegistration != undefined && publisherRegistration.total > 0)?(publisherRegistration.results[0].record.details.tmpl_433C2783.name) : undefined;
    // console.log("publisherName", publisherName)
    const result = await getinfo();
    // console.log("result", result)
    const response = [{
      currentTime: new Date().toISOString(),
      api:{
        mode: loadedScript,
        allowSponsoredPublishing: allowSponsoredPublishing,
        publishingSponsorAddress: publishingSponsorAddress
      },
      blockchain:{
        synced: result.chainIsSynced,
        progress: result.chainSync
      },
      publisher: {
        userid: credentials.userID,
        walletid: credentials.walletID,
        pubkey: credentials.pubKey,
        name: publisherName,
        balance
      },
      walletclient: result.info,
      error: result.error,
    }];
    res.send(response);
  } catch (err) {
    res.status(500).send({ error: 'getinfo failed', err });
  }
});

// use this endpoint to get info about connected blockchain peers
app.get("/api/v1/getPeerInfo", async (req, res) => {
  // console.log("handling RPC call: getPeerInfo");
  try {
    const result = await getPeerInfo();
    const response = [{
      currentTime: new Date().toISOString(),
      peers: result.peerCount,
      peerInfo: result.peerInfo,
      error: result.error,
    }];
    res.send(response);
  } catch (err) {
    console.error("error running RPC call: getPeerInfo,", err);
    res.status(500).send({ error: 'getPeerInfo failed' });
  }
});

// use this endpoint to create a new wallet
app.post("/api/v1/createWallet", async (req, res) => {
  // console.log("handling RPC call: createWallet");

  try {
    const walletCredentials = await getWalletCredentials(req);
    const userID = walletCredentials.userID;
    const mnemonic = req.headers["mnemonic"] || null;
    const passphrase = walletCredentials.passphrase;
    const options = { mnemonic, passphrase };
    const account = "default";
    const id = walletCredentials.walletID;
    // console.log("creating wallet with this data", userID, id, account, options);
    if (id == undefined) {
      const message = "no walletID. check if userID has been set by env or header";
      // wallet.toString().includes("Could not find word") ?
        // "Invalid mnemonic" :
        // wallet.toString();
      const response = [{
        currentTime: new Date().toString(),
        message,
      }];
      res.send(response);
      return;
    }
    const wallet = await createWallet(id, options);
    if (wallet.toString().startsWith("Error")) {
      const message = wallet.toString().includes("Could not find word") ?
        "Invalid mnemonic" :
        wallet.toString();
      const response = [{
        currentTime: new Date().toString(),
        message,
      }];
      res.send(response);
      return;
    }

    const accountInfo = await getAccountInfo(id, account);
    if (accountInfo.toString().startsWith("Error")) {
      const response = [{
        currentTime: new Date().toISOString(),
        message: accountInfo.toString(),
      }];
      res.send(response);
      return;
    }

    const wif = await getwif(id, accountInfo.receiveAddress, passphrase);
    if (wif.toString().startsWith("Error")) {
      const response = [{
        currentTime: new Date().toISOString(),
        message: wif.toString(),
      }];
      res.send(response);
      return;
    }

    const walletinfo = await getwalletinfo(id);
    if (walletinfo.toString().startsWith("Error")) {
      const response = [{
        currentTime: new Date().toISOString(),
        message: walletinfo.toString(),
      }];
      res.send(response);
      return;
    }

    const response = [{
      currentTime: new Date().toISOString(),
      result: "Wallet Created Successfully",
      userID,
      walletID: id,
      pubKey: accountInfo.receiveAddress,
      privKey: wif,
      encrypted: walletinfo.master.encrypted,
      mnemonic,
      walletinfo,
    }];
    res.send(response);
  } catch (err) {
    console.error("error running RPC call: createWallet,", err);
    res.status(500).send({ error: 'createWallet failed' });
  }
});

// use this endpoint to get wallet info including balance
app.get("/api/v1/getWalletInfo", async (req, res) => {
  // console.log("handling RPC call: getWalletInfo");
  try {
    const walletCredentials = await getWalletCredentials(req);
    // console.log("walletCredentials", walletCredentials)
    if (walletCredentials.toString().startsWith("Error") && !walletCredentials.toString().includes("no passphrase")) {
        const response = [{
          currentTime: new Date().toISOString(),
          message: walletCredentials.toString(),
        }];
        res.send(response);
        return;
      }
    const wallet = walletClient.wallet(walletCredentials.walletID);
    const result = await wallet.getInfo(walletCredentials.walletID);
    if (result === null) {
      const response = [{
        currentTime: new Date().toISOString(),
        message: "Wallet not found",
      }];
      res.send(response);
      return;
    } else
    if (result.toString().startsWith("Error")) {
      const response = [{
        currentTime: new Date().toISOString(),
        message: result.toString(),
      }];
      res.send(response);
      return;
    }
    // const balance = await getwalletinfo(walletCredentials.walletID);
    
    const unspent = await walletClient.execute("listunspent", [
      1,
      9999999,
      [walletCredentials.pubKey],
    ])
    const response = [{
      currentTime: new Date().toISOString(),
      "walletID": walletCredentials.walletID,
      "pubKey": walletCredentials.pubKey,
      "balance": unspent[0].amount,
      // "balance": parseFloat((result.balance.confirmed / 100000000).toFixed(8)),
      encrypted: result.master.encrypted,
      info: result,
    }];
    res.send(response);
  } catch (err) {
    console.error("error running RPC call: getWalletInfo,", err);
    res.status(500).send({ error: 'getWalletInfo failed' });
  }
});

// use this endpoint to get wallet's WIF (private key)
app.post("/api/v1/getWIF", async (req, res) => {
  try {
    const walletCredentials = await getWalletCredentials(req);
    const { passphrase, walletID, pubKey } = walletCredentials;
    // console.log("walletCredentials", walletCredentials
    if (!passphrase || passphrase.length === 0) {
      return res.send({
        currentTime: new Date().toISOString(),
        message:
          "Error: please provide a passphrase, either in the header or in the .env file",
      });
    }
    if (!req.headers["userid"] && !localnode.publishingWalletUserid && !req.headers["walletid"]) {
      return res.send({
        currentTime: new Date().toISOString(),
        message:
          "Error: please provide a userID, either in the header or in the .env file",
      });
    }
    const wallet = walletClient.wallet(walletCredentials.walletID);
    const walletinfo = await wallet.getInfo(walletCredentials.walletID);
    if (walletinfo == null) {
      return res.send({
        currentTime: new Date().toISOString(),
        message:
          "Error: wallet not found, check credentials",
      });
    }
    
    const result = await getwif(walletID, pubKey, passphrase);
    if (result.toString().startsWith("Error")) {
      return res.send({
        currentTime: new Date().toISOString(),
        message: result.toString(),
      });
    }
    return res.send({
      currentTime: new Date().toISOString(),
      walletID,
      pubKey,
      wif: result,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).send({ error: "getWIF failed" });
  }
});

// use this endpoint to send a transaction to a publishing sponsor
app.post("/api/v1/sendTxToPublishingSponsor", async (req, res) => {
  if (allowSponsoredPublishing) {
    const selfPublish = true;
    // console.log("handling RPC call: sendTxToPublishingSponsor");
    const publisherData = req.body[1];
    const prev_txo = req.body[0].prev_txo;
    const mpRef_txid = req.body[0].mpRef_txid;
    const account = "default";
    let signedP64floData = publisherData.signedP64floData;
    try {
      const wif =
        myPrivKey ||
        (await getwif(
          publishing_wallet_id,
          myPubKey,
          publishing_wallet_passphrase
        ));
      selectwallet(publishing_wallet_id, myPubKey, wif).then((wallet) => {
        walletpassphrase(publishing_wallet_passphrase).then((resX) => {
          getwalletinfo().then((walletinfo) => {
            makeAndSendRawTransaction(
              signedP64floData,
              wif,
              selfPublish,
              prev_txo,
              mpRef_txid
            ).then((txo) => {
              res.send({
                currentTime: new Date().toISOString(),
                message: "Record Sent Successfully",
                txid: txo.txid,
                txo: txo,
              });
            });
          });
        });
      });
    } catch (e) {
      console.log(e);
      res.send({
        currentTime: new Date().toISOString(),
        message: "Publisher Registration Failed",
        cause: "Incorrect Passphrase",
      });
    }
  } else {
    res.send({
      currentTime: new Date().toISOString(),
      message: "Sponsored Publishing is not allowed by this node",
    });
  }
});

// use this endpoint to publish a record (including publisher registration)
app.post("/api/v1/publishOIPRecord", async (req, res, next) => {
  try {
    const account = "default";
    const recordData = req.body;
    const selfPublish = req.headers["selfpublish"];
    console.log("selfPublish", selfPublish);
    const recordType = req.headers["recordtype"];
    if (selfPublish == true || selfPublish == undefined) {
      console.log("publishing record using this node's own wallet");
    } else {
      console.log("using publishing sponsor address:", publishingSponsorAddress);
    }
    try {
      walletCredentials = await getWalletCredentials(req);
      if (walletCredentials.toString().includes("error")) {
        throw new Error(walletCredentials);
      } else {
        pubKey = walletCredentials.pubKey;
        walletInfo = await getwalletinfo(walletCredentials.walletID);
        walletBalance = walletInfo.balance.confirmed;
        if (walletBalance === 0) {
          throw new Error(
            `Error: wallet is empty, please send tokens to ${pubKey}`
          );
        } else if (walletCredentials.pubKey === undefined) {
          throw new Error("Error: wallet doesn't exist");
        }
        wif = await getwif(
          walletCredentials.walletID,
          walletCredentials.pubKey,
          walletCredentials.passphrase
        );
      }
    } catch (error) {
      res.status(500).send({
        currentTime: new Date().toISOString(),
        message: "Publish Record Failed",
        cause: error.message,
      });
      return;
    }

    fpub = await getFpub(walletCredentials.walletID, account);
    wallet = await selectwallet(walletCredentials.walletID, walletCredentials.pubKey, wif);
    unlock = await walletpassphrase(walletCredentials.passphrase);
    walletinfo = await getwalletinfo();
    var referencedRecords = [];
    if (recordType == "publisher-registration") {
      try {
        var publisher_registration_data = {
          recordType: recordType,
          formattedRecordData: recordData,
          walletCredentials: walletCredentials,
          account: account,
          selfPublish: selfPublish,
          wif: wif,        
        }
        var publisher_registration = await findOrPublishRecord(
          publisher_registration_data);
        if (publisher_registration.data === undefined) {
          res.send({
            currentTime: new Date().toISOString(),
            message: "Publisher Registration Already Exists in Index",
            RegistrationTxID: publisher_registration.txid,
            PublisherAddress: walletCredentials.pubKey,
            PublisherName: recordData.name,
          });
        } else {
        res.send({
          currentTime: new Date().toISOString(),
          message: "Publisher Registration Sent Successfully",
          RegistrationTxID: publisher_registration.txid,
          PublisherAddress: publisher_registration.data.pubKey,
          PublisherName: publisher_registration.data.details[0].payload.name,
        });
      }
      } catch (e) {
        console.log(e);
        res.send({
          currentTime: new Date().toISOString(),
          message: "Publisher Registration Failed",
          cause: e,
        });
      }
    }else if (recordType == "video") {
      var videoRecord = [
        {name: recordData.name,
        description: recordData.description,
        language: recordData.language,
        addressDirectory: recordData.addressDirectory,
        filename: recordData.filename,
        thumbnailFilename: recordData.thumbnailFilename,
        displayName: recordData.displayName,
        publishDate: recordData.publishDate,
        youTubeURL: recordData.youTubeURL,
        network: recordData.network},
      ]
      var unformattedRecordData = {
        videoRecord
      };
      formattedRecordData = await formatRecord(unformattedRecordData, recordType);
      var video_record_data = {
        recordType: recordType,
        formattedRecordData: formattedRecordData,
        walletCredentials: walletCredentials,
        account: account,
        selfPublish: selfPublish,
        wif: wif,        
      }
      let i = 0;
      let video_txid = await findOrPublishRecord(
        video_record_data,
        i,
        referencedRecords
      );
      res.send({
        "current time": new Date().toISOString(),
        message: referencedRecords,
        "videoTxID": video_txid,
      });
    }else if (recordType == "image") {
      var imageRecord = [
        {
        name: recordData.name || recordData.filename,
        description: recordData.description || recordData.caption,
        language: recordData.language,
        filename: recordData.filename,
        imageAddress: recordData.imageAddress,
        thumbnailAddress: recordData.thumbnailAddress,
        url: recordData.url,
        }
      ]
      var unformattedRecordData = {
        imageRecord
      };
      formattedRecordData = await formatRecord(unformattedRecordData, recordType);
      var image_record_data = {
        recordType: recordType,
        formattedRecordData: formattedRecordData,
        walletCredentials: walletCredentials,
        account: account,
        selfPublish: selfPublish,
        wif: wif,
      }
      let i = 0;
      let image_txid = await findOrPublishRecord(
        image_record_data,
        i,
        referencedRecords
      );
      res.send({
        "current time": new Date().toISOString(),
        message: referencedRecords,
        "imageTxID": image_txid,
      });
    }else if (recordType == "bylineWriter") {
      const bylineWriterArray = recordData.bylineWriter.split(" ");
      var bylineWriter = 
        {
        name: bylineWriterArray[0],
        surname: bylineWriterArray[1],
        language: recordData.language,
        }
      
      var unformattedRecordData = {
        bylineWriter
      };
      formattedRecordData = await formatRecord(unformattedRecordData, recordType);
      var bylineWriter_record_data = {
        recordType: recordType,
        formattedRecordData: formattedRecordData,
        walletCredentials: walletCredentials,
        account: account,
        selfPublish: selfPublish,
        wif: wif,
      }
      let i = 0;
      let bylineWriter_txid = await findOrPublishRecord(
        bylineWriter_record_data,
        i,
        referencedRecords
      );
      res.send({
        "current time": new Date().toISOString(),
        message: referencedRecords,
        "bylineWriterTxID": bylineWriter_txid,
      });
    }else if (recordType == "text") {
      var textRecord = 
        {
        name: recordData.title,
        language: recordData.language,
        date: recordData.date,
        network: recordData.network,
        textAddress: recordData.textAddress,
        textFiletype: recordData.textFiletype,
        isPreview: recordData.isPreview || false,
        textURL: recordData.textURL
        }
      
      var unformattedRecordData = {
        textRecord
      };
      formattedRecordData = await formatRecord(unformattedRecordData, recordType);
      var text_record_data = {
        recordType: recordType,
        formattedRecordData: formattedRecordData,
        walletCredentials: walletCredentials,
        account: account,
        selfPublish: selfPublish,
        wif: wif,
      }
      let i = 0;
      let text_txid = await findOrPublishRecord(
        text_record_data,
        i,
        referencedRecords
      );
      res.send({
        "current time": new Date().toISOString(),
        // message: "Published Successfully",
        message: referencedRecords,
        "textTxID": text_txid,
      });
    }else if (recordType == "article") {
      var bylineWriterArray = recordData.bylineWriter.split(" ");
      var bylineWriter = {
        name: bylineWriterArray[0],
        surname: bylineWriterArray[1],
        language: recordData.language,
      } 
      var textRecord = {
        name: recordData.title,
        language: recordData.language,
        date: recordData.date,
        network: recordData.network,
        textAddress: recordData.textAddress,
        textFiletype: recordData.textFiletype,
        isPreview: recordData.isPreview,
        textURL: recordData.textURL
      }
      var imageRecord = recordData.embeddedImages
      var videoRecord = recordData.embeddedVideos
      var articleRecord = 
        {
          name: recordData.title,
          description: recordData.description,
          language: recordData.language,
          date: recordData.date,
          avatar: recordData.avatar,
          tagList: recordData.tagList,
          imageRecord,
          videoRecord,
          articleURL: recordData.articleURL,
          bylineWriter,
          bylineWritersTitle: recordData.bylineWritersTitle,
          bylineWritersLocation: recordData.bylineWritersLocation,
          textRecord
        }
      formattedRecordData = await formatRecord(articleRecord, recordType);
      let include_references = [];
      include_references.include_bylineWriter = formattedRecordData.bylineWriterRecord !== undefined ? true : false;
      include_references.include_video = formattedRecordData.articleData.article.videoList !== undefined ? true : false;
      include_references.include_image = formattedRecordData.articleData.article.imageList !== undefined ? true : false;
      include_references.include_text = formattedRecordData.textRecord !== undefined ? true : false;
      formattedBylineWriterData = formattedRecordData.bylineWriterRecord;
      formattedVideos = formattedRecordData.articleData.article.videoList || [];
      embeddedVideoQty = formattedRecordData.articleData.article.videoList.length || 0;
      formattedImages = formattedRecordData.articleData.article.imageList || [];
      embeddedImageQty = formattedRecordData.articleData.article.imageList.length || 0;
      formattedTextData = formattedRecordData.articleData.textRecord;
      formattedArticleData = formattedRecordData.articleData;
      let referencedRecords = [];
      let record_txo = [];
      let bylineWriter_txid = "";
      let embeddedVideo_txids = [];
      let embeddedImage_txids = [];
      let embeddedText_txid = "";
      let article_txid = "";

      if (include_references.include_bylineWriter == true) {
        var bylineWriter_record_data = {
          recordType: "bylineWriter",
          formattedRecordData,
          walletCredentials,
          account,
          selfPublish,
          wif,
        }
        let i = 0;
        bylineWriter_txid = await findOrPublishRecord(
          bylineWriter_record_data,
          i,
          referencedRecords
        );
      }
      if (include_references.include_video == true) {
        for (let i = 0; i < embeddedVideoQty; i++) {
          var video_record_data = {
            recordType: "video",
            formattedRecordData,
            walletCredentials,
            account,
            selfPublish,
            wif,
          }
          let embeddedVideo_txid = await findOrPublishRecord(
            video_record_data,
            i,
            referencedRecords
          );
          embeddedVideo_txids.push(embeddedVideo_txid);
        }
      }
      if (include_references.include_image == true) {
        if (embeddedImageQty > 0) {
          for (let i = 0; i < embeddedImageQty; i++) {
            var image_record_data = {
              recordType: "image",
              formattedRecordData,
              walletCredentials,
              account,
              selfPublish,
              wif,
            }
            let embeddedImage_txid = await findOrPublishRecord(
              image_record_data,
              i,
              referencedRecords

            );
            embeddedImage_txids.push(embeddedImage_txid);
          }
        }
      }
      if (include_references.include_text == true) {
        var text_record_data = {
          recordType: "text",
          formattedRecordData,
          walletCredentials,
          account,
          selfPublish,
          wif,
        }
        let i = 0;
        embeddedText_txid = await findOrPublishRecord(
          text_record_data,
          i,
          referencedRecords
        );
      }

      const oipRefs = {
        bylineWriter_txid: bylineWriter_txid,
        embeddedVideo_txids: embeddedVideo_txids,
        embeddedImage_txids: embeddedImage_txids,
        embeddedText_txid: embeddedText_txid,
      };
      formattedRecordData.articleData.article = {
        bylineWriter: bylineWriter_txid[0],
        bylineWritersTitle: formattedRecordData.articleData.article.bylineWritersTitle,
        bylineWritersLocation: formattedRecordData.articleData.article.bylineWritersLocation,
        videoList: embeddedVideo_txids,
        videoCaptionList: formattedRecordData.articleData.article.videoCaptionList,
        imageList: embeddedImage_txids,
        imageCaptionList: formattedRecordData.articleData.article.imageCaptionList,
        articleText: embeddedText_txid[0],
      };
      var article_record_data = {
        recordType: "article",
        formattedRecordData,
        walletCredentials,
        account,
        selfPublish,
        wif,
        oipRefs
      }
      let i = 0;
      article_txid = await findOrPublishRecord(article_record_data, i, referencedRecords);
      console.log(referencedRecords)
      res.send({
        "current time": new Date().toISOString(),
        message: referencedRecords,
        "article TxID": article_txid,
      });
    } else {
      res.send({
        "current time": new Date().toISOString(),
        message: "record type not supported currently",
        recordType: recordType,
      });
    }
  } catch (err) {
    console.log("error running RPC call: getinfo,", err);
    next(err);
  }
});

// use this endpoint to get a record
app.get("/api/v1/getRecord/:recordID", async (req, res) => {
  const recordID = req.params.recordID;
  if (recordID.length != 64) {
    console.log("Invalid TXID provided: " + recordID);
    res.send({
      currentTime: new Date().toISOString(),
      message: "Invalid TXID provided",
      txid: recordID,
    });
  } else {
    try {
      const record = await getRecord(recordID);
      res.send({
        currentTime: new Date().toISOString(),
        message: "Record Found",
        recordID: recordID,
        record: record.results,
      });
    } catch (e) {
      console.log("error running RPC call: getRecord,", e);
      if (e) {
        try {
          const url = `https://floexplorer.net/api/v1/tx/${recordID}`;
          const explorer_response = await axios.get(url);
          const blockheight = explorer_response.data.blockheight;
          const confirmations = explorer_response.data.confirmations;
          const time = explorer_response.data.time;
          res.send({
            currentTime: new Date().toISOString(),
            message:
              "Record Not Found, but TXID is in the explorer, may not be an OIP record",
            txid: recordID,
            blockheight:
              explorer_response.data.blockheight == -1
                ? "in mempool"
                : explorer_response.data.blockheight,
            confirmations: confirmations,
            time: time,
          });
        } catch (e) {
          res.send({
            currentTime: new Date().toISOString(),
            message: "Record Not Found, and TXID is not in the explorer",
            recordID: recordID,
          });
        }
      }
    }
  }
});

// use this endpoint to get a record and expand all OIPRefs in it to their full records
app.get("/api/v1/getExpandedRecord/:recordID", async (req, res) => {
  // console.log("handling API call: getExpandedRecord");
  const recordID = req.params.recordID;
  if (recordID.length != 64) {
    console.log("Invalid TXID provided: " + recordID);
    res.send({
      currentTime: new Date().toISOString(),
      message: "Invalid TXID provided",
      txid: recordID,
    });
  } else {
    try {
      const mainRecord = await getRecord(recordID);
      const bylineWriter =
        mainRecord.results[0].record.details.tmpl_D019F2E1.bylineWriter;
      const embeddedImages =
        mainRecord.results[0].record.details.tmpl_D019F2E1.imageList;
      const embeddedVideos =
        mainRecord.results[0].record.details.tmpl_D019F2E1.videoList;
      const articleText =
        mainRecord.results[0].record.details.tmpl_D019F2E1.articleText;
      bylineWriterIsRef =
        Buffer.from(bylineWriter).length === 64 ? true : false;
      articleTextIsRef = Buffer.from(articleText).length === 64 ? true : false;
      embeddedImagesIsRef = Array.isArray(embeddedImages)
        ? Buffer.from(embeddedImages[0]).length === 64
        : false;
      embeddedVideosIsRef = Array.isArray(embeddedVideos)
        ? Buffer.from(embeddedVideos[0]).length === 64
        : false;
      const txids = {
        bylineWriter: bylineWriterIsRef ? bylineWriter : "",
        articleText: articleTextIsRef ? articleText : "",
        embeddedImages: embeddedImagesIsRef ? embeddedImages : [],
        embeddedVideos: embeddedVideosIsRef ? embeddedVideos : [],
      };
      const bylineWriterRecord = await getRecord(txids.bylineWriter);
      const bylineWriterResults = bylineWriterRecord.results;
      const articleTextRecord = await getRecord(txids.articleText);
      const articleTextResults = articleTextRecord.results;
      let videoRecords = [];
      for (let i = 0; i < txids.embeddedVideos.length; i++) {
        const video = txids.embeddedVideos[i];
        const videoRecord = await getRecord(video);
        const videoRecordResults = videoRecord.results;
        videoRecords.push(videoRecordResults);
      }
      let imageRecords = [];
      for (let i = 0; i < txids.embeddedImages.length; i++) {
        const image = txids.embeddedImages[i];
        const imageRecord = await getRecord(image);
        const imageRecordResults = imageRecord.results;
        imageRecords.push(imageRecordResults);
      }
      Object.defineProperties(
        mainRecord.results[0].record.details.tmpl_D019F2E1,
        {
          bylineWriter: {
            value: bylineWriterResults,
          },
          videoList: {
            value: videoRecords,
          },
          imageList: {
            value: imageRecords,
          },
          articleText: {
            value: articleTextResults,
          },
        }
      );
      res.send({
        currentTime: new Date().toISOString(),
        message: "Record Found",
        recordID: recordID,
        record: mainRecord.results,
      });
    } catch (e) {
      if (e) {
        try {
          const url = `https://floexplorer.net/api/v1/tx/${recordID}`;
          const explorer_response = await axios.get(url);
          const blockheight =
            explorer_response.data.blockheight == -1
              ? "in mempool"
              : explorer_response.data.blockheight;
          const confirmations = explorer_response.data.confirmations;
          const time = explorer_response.data.time;
          res.send({
            currentTime: new Date().toISOString(),
            message:
              "Record Not Found, but TXID is in the explorer, may not be an OIP record",
            txid: recordID,
            blockheight:
              explorer_response.data.blockheight == -1
                ? "in mempool"
                : explorer_response.data.blockheight,
            confirmations: confirmations,
            time: time,
          });
        } catch (e) {
          res.send({
            currentTime: new Date().toISOString(),
            message: "Record Not Found, and TXID is not in the explorer",
            recordID: recordID,
          });
        }
      }
    }
  }
});

// ------ DEPRECATING

// // use this endpoint to get account info
// app.post('/api/v1/getAccountInfo', (req, res) => {
//   const emailaddress = req.headers['emailaddress'] || '';
//   const id = SHA1(emailaddress).toString();
//   const account = 'default';
//   if (!emailaddress || emailaddress.length === 0) {
//     console.log("Error: emailaddress is required")
//     res.send({
//       currentTime: new Date().toISOString(),
//       message: "Error: emailaddress is required",
//     });
//   }
//   else{
//     getAccountInfo(id, account).then(result => { //console.log("getAccountInfo", result)
//     res.send({
//       "currentTime": new Date().toISOString(),
//       "message": "Account Info Found",
//       "accountInfo": result,
//       "walletID": id,
//     })
//   })
//   }
// });

// // use this endpoint to get wallet balance
// app.get('/api/v1/getWalletBalance', (req, res) => {
//   const emailaddress = req.body.emailaddress || '';
//   const id = req.body.id || SHA1(emailaddress).toString();
//   const wallet = walletClient.wallet(id);
//   wallet.getInfo(id).then(result => {
//     getAccountInfo(id, 'default').then(accountresponse => {
//       res.send({
//         "currentTime": new Date().toISOString(),
//         "wallet id": id,
//         "public address": accountresponse.receiveAddress,
//         "wallet balance": (result.balance.confirmed/100000000).toFixed(8)
//       });
//     });
//   });
//   console.log("handling RPC call: getWalletInfo");
// });

// // use this endpoint to get wallets history
// app.get('/api/v1/getWalletTxHistory', (req, res) => {
//   const id = req.body.id;
//   console.log("id:",id);
//   const wallet = walletClient.wallet(id);
//   wallet.getAccounts(id).then(result => {
//     console.log(result)
//     wallet.getHistory(result).then(result => {
//       res.send({
//         "currentTime": new Date().toISOString(),
//         "message": "All Systems Operational",
//         "info": result
//       });
//     });
//   })
//   console.log("handling RPC call: getWalletInfo");
// });


// async function listreceivedbyaddress(minconf,includeEmpty,watchOnly) {
//   // minconf=1
//   // includeEmpty=false
//   // watchOnly=false
//   const walletClient = new WalletClient(walletClientOptions);
//   let result = await walletClient.execute('listreceivedbyaddress', [minconf, includeEmpty, watchOnly]);
  
//   // console.log("listreceivedbyaddress", result)
//   console.log("listunspent", unspent)
//   return result;
// }