const http = require('http');
const https = require('https');
const axios = require('axios');
// const req = require('express/lib/request');
const express = require('express');
const SHA1 = require('crypto-js/sha1');
const { response } = require('express');
const { on } = require('events');
const {NodeClient, WalletClient} = require('./node_modules/@oipwg/fclient');
const {RPCWallet} = require('js-oip/lib/modules/wallets');
const { Modules } = require('js-oip');
// const { compressTypes } = require('bcrypto/lib/pgp');
const oipProto = require('oip-protobufjs');
const buildOipDetails = oipProto.buildOipDetails;
const recordProtoBuilder = oipProto.recordProtoBuilder;
const app = express();
const pjson = require('./package.json');
const requireText = require('require-text');

// look up which package.json script is running
const loadedScript = process.env.npm_lifecycle_event;

// load environment variables from .env file
const env = require('dotenv')

const liteNodeApiPort = process.env.liteNodeAPIPort || 3000;
const liteNodeApiKey = env.config().parsed.liteNodeApiKey || '';
const liteNodePublishingWalletEmail = env.config().parsed.liteNodePublishingWalletEmail || "";
const liteNodePublishingWalletId = env.config().parsed.liteNodePublishingWalletId || SHA1(liteNodePublishingWalletEmail).toString();
const liteNodePublishingWalletPassphrase = env.config().parsed.liteNodePublishingWalletPass || "";
const liteNodePubKey = env.config().parsed.liteNodePubkey.toString() || "";
const liteNodePrivkey = env.config().parsed.liteNodePrivkey || "";

const fullNodeAPIPort = process.env.fullNodeAPIPort || 7500;
const fullNodeApiKey = env.config().parsed.fullNodeApiKey || "";
const fullNodePublishingWalletEmail = env.config().parsed.fullNodePublishingWalletEmail || "";
const fullNodePublishingWalletId = env.config().parsed.fullNodePublishingWalletId || SHA1(fullNodePublishingWalletEmail).toString();
const fullNodePublishingWalletPassphrase = env.config().parsed.fullNodePublishingWalletPass || "";
const fullNodePubkey = env.config().parsed.fullNodePubkey.toString() || "";
const fullNodePrivkey = env.config().parsed.fullNodePrivkey || "";

const apiPort = (loadedScript == 'liteNode') ? liteNodeApiPort : fullNodeAPIPort;
const apiKey = (loadedScript == 'liteNode') ? liteNodeApiKey : fullNodeApiKey;
const publishing_wallet_email = (loadedScript == 'liteNode') ? liteNodePublishingWalletEmail : fullNodePublishingWalletEmail;
const publishing_wallet_id = (loadedScript == 'liteNode') ? liteNodePublishingWalletId : fullNodePublishingWalletId;
const publishing_wallet_passphrase = (loadedScript == 'liteNode') ? liteNodePublishingWalletPassphrase : fullNodePublishingWalletPassphrase;
const myPubKey = (loadedScript == 'liteNode') ? liteNodePubKey : fullNodePubkey;
const myPrivKey = (loadedScript == 'liteNode') ? liteNodePrivkey : fullNodePrivkey;

const oipRecordsApiAddress = env.config().parsed.oipRecordsApiAddress || "https://api.oip.io/oip";
const publishingSponsorAddress = env.config().parsed.publishingSponsorAddress || "";

app.use(express.json());

liteNodeScript = pjson.scripts.liteNode;
fullNodeScript = pjson.scripts.fullNode;
const scriptFlags = (loadedScript == 'liteNode') ? liteNodeScript : fullNodeScript;
const scriptFlagsArray = scriptFlags.split(' ');

function obfuscateSecureString(secureString) {
  return secureString.substring(0, Math.round(Math.pow(secureString.length, 1/3))) + '****' + secureString.substring(secureString.length - (Math.round(Math.pow(secureString.length, 1/3))), secureString.length)
}
const allowSponsoredPublishing = scriptFlagsArray.includes('--allow-sponsored-publishing=true');

console.log('loadedScript:', loadedScript);
console.log('scriptFlags:', scriptFlagsArray);
console.log('allowSponsoredPublishing:', allowSponsoredPublishing);
console.log("loaded env data:", {apiPort, apiKey:obfuscateSecureString(apiKey), publishing_wallet_email, publishing_wallet_id, publishing_wallet_passphrase:obfuscateSecureString(publishing_wallet_passphrase), myPubKey, myPrivKey:obfuscateSecureString(myPrivKey), oipRecordsApiAddress, publishingSponsorAddress });


const nodeClientPort = parseInt(scriptFlags.split('http-port=')[1].split(' ')[0]);
const walletConfLocation = scriptFlags.split('prefix ')[1].split(' ')[0].toString();
const walletConfFile = walletConfLocation + '/wallet.conf';
const walletConfContents = requireText(walletConfFile, require)
const walletClientPort = parseInt(walletConfContents.split('http-port: ')[1].split('\n')[0]);

// listen on port defined in env file
app.listen(apiPort, () => {
  console.log(`OIP API listening on port ${apiPort}`);
});

const clientOptions = {
  network: 'mainnet',
  port: nodeClientPort,
  apiKey: apiKey
}

const walletClientOptions = {
  network: 'mainnet',
  port: walletClientPort,
  apiKey: apiKey
}

console.log(`node client listening on port ${clientOptions.port}`);
console.log(`wallet client listening on port ${walletClientOptions.port}`);
const client = new NodeClient(clientOptions);
const walletClient = new WalletClient(walletClientOptions);

// --------------------------------------------------------------------------------
// Functions

// get blockchain info including sync status
async function getinfo() {
  const result = await client.getInfo();
  // console.log('result of getinfo:', result);
  return result
}

// get info about connected peers
async function getPeerInfo() {
  const result = await client.execute('getpeerinfo');
  return result
}

// create a wallet
async function createWallet(id, options) {
  try{
    const result = await walletClient.createWallet(id, options);
    return result
  } catch (err) {
    console.log('error in createWallet:', err);
    return err
  }
}

// generate a receiving address
async function createAddress(id, account){
  const result = await walletClient.createAddress(id, account);
  // console.log(result);
  return result
}

// unlock a wallet with passprhase
async function walletpassphrase(passphrase, timeout) {
  timeout = 300;
  try{
    // const result = await walletClient.walletpassphrase(passphrase, timeout);
    const result = await walletClient.execute('walletpassphrase', [passphrase, timeout]);
    return result
  } catch (err) {
    return err
  }
}

// select a wallet to use
async function selectwallet(id){
  const result = await walletClient.execute('selectwallet', [id]);
  return result
}

// encrypt a wallet
async function encryptwallet(passphrase, id) {
  const wallet = walletClient.wallet(id);
  const result = await walletClient.execute('encryptwallet', [passphrase]);
  // console.log('result of encryptwallet', result);
  return result
}

// get master HD Key from wallet
async function getMasterHDKey(id) {
  const wallet = walletClient.wallet(id);
  const result = await wallet.getMaster();
  return result
}

// get wallet account
async function getwalletaccount(id, account) {
  const wallet = walletClient.wallet(id);
  const result = await wallet.getAccount(account);
  const fpub = result.accountKey
  return fpub
}

// get fpub
function getFpub(id, account) {
  return new Promise(function(resolve, reject) {
    getwalletaccount(id, account).then(result => {
      let fpub = result;
      resolve(fpub);
    })
  })
}

// get a wallets WIF (wallet import format - private key)
async function getwif(id, address, passphrase) {
  const wallet = walletClient.wallet(id);
  const result = await wallet.getWIF(address, passphrase);
  const wif = result.privateKey;
  return wif
}

// get wallet info, including balance
async function getwalletinfo(id) {
  const wallet = walletClient.wallet(id);
  const result = await wallet.getInfo();
  return result
}

// get wallet account info
async function getAccountInfo(id, account) {
  const wallet = walletClient.wallet(id); 
  const result = await wallet.getAccount(account);
  // console.log('result of getAccountInfo:', result);
  return result
}

// sign message with wallet private key
async function signMessage(wif, pubKey, message) {
  network = 'mainnet';
  let walletRPC = new RPCWallet({
    publicAddress: pubKey,
    wif,
    network,
    rpc: {
      port: nodeClientPort,
      host: '127.0.0.1',
      username: 'x',
      password: apiKey   
    }
  })
  const result = await walletRPC.signMessage(message)
  return result
}

// take formatted data that needs to be published, 
// turn it into oipDetails and then turn it into 
// serialized protobuf hex64 data for publishing
async function getSignedP64FloData(data, wif){
  try {
    const details = buildOipDetails(data.details)
    const { signedMessage64 } = await recordProtoBuilder({
      details,
      wif,
      network: 'mainnet'
    });
    return 'p64:' + signedMessage64;
  } catch (err) {
    return 'Failed at publishRecord: ' + err;
  }
}

// prepare and format publisher registration data
async function prepRegistration(pubKey, publisherName, fpub, wif) {
  const publisher = {
    myMainAddress: wif,
    descriptor:
      'Ck4KB3AucHJvdG8SEm9pcFByb3RvLnRlbXBsYXRlcyInCgFQEgwKBG5hbWUYASABKAkSFAoMZmxvQmlwNDRYUHViGAIgASgJYgZwcm90bzM=',
    name: 'tmpl_433C2783',
    payload: {
      name: publisherName,
      floBip44XPub: fpub
    }
  }
  
  let registerPublisherData = [publisher]

  registerPublisherData.pubKey = pubKey;
  
  function createRegistration(registerPublisherData) {
    return {
      details: registerPublisherData,
      myMainAddress: '',
      pubKey
    }
  }

  let data = createRegistration(registerPublisherData)
  return data;
}

// to do, make a template descriptor lookup function

// gets info about a specified template
async function getTemplateInfo(templateType){
  switch (templateType) {
    case 'basic': 
      templateName = 'tmpl_20AD45E7';
      descriptor = 'CpwSCgdwLnByb3RvEhJvaXBQcm90by50ZW1wbGF0ZXMi9BEKAVASDAoEbmFtZRgBIAEoCRITCgtkZXNjcmlwdGlvbhgCIAEoCRIMCgRkYXRlGAMgASgEEhoKCGxhbmd1YWdlGAQgASgOMghMYW5ndWFnZRIUCgZhdmF0YXIYBSABKAsyBFR4aWQSDwoHdGFnTGlzdBgGIAMoCRIQCghub3RlTGlzdBgHIAMoCRIVCgd1cmxMaXN0GAggAygLMgRUeGlkGhMKBFR4aWQSCwoDcmF3GAEgASgMIrwQCghMYW5ndWFnZRIWChJMYW5ndWFnZV9VTkRFRklORUQQABIPCgtMYW5ndWFnZV9BRhABEg8KC0xhbmd1YWdlX0FNEAISDwoLTGFuZ3VhZ2VfQVIQAxIQCgxMYW5ndWFnZV9BUk4QBBIPCgtMYW5ndWFnZV9BUxAFEg8KC0xhbmd1YWdlX0FaEAYSDwoLTGFuZ3VhZ2VfQkEQBxIPCgtMYW5ndWFnZV9CRRAIEg8KC0xhbmd1YWdlX0JHEAkSDwoLTGFuZ3VhZ2VfQk4QChIPCgtMYW5ndWFnZV9CTxALEg8KC0xhbmd1YWdlX0JSEAwSDwoLTGFuZ3VhZ2VfQlMQDRIPCgtMYW5ndWFnZV9DQRAOEg8KC0xhbmd1YWdlX0NPEA8SDwoLTGFuZ3VhZ2VfQ1MQEBIPCgtMYW5ndWFnZV9DWRAREg8KC0xhbmd1YWdlX0RBEBISDwoLTGFuZ3VhZ2VfREUQExIQCgxMYW5ndWFnZV9EU0IQFBIPCgtMYW5ndWFnZV9EVhAVEg8KC0xhbmd1YWdlX0VMEBYSDwoLTGFuZ3VhZ2VfRU4QFxIPCgtMYW5ndWFnZV9FUxAYEg8KC0xhbmd1YWdlX0VUEBkSDwoLTGFuZ3VhZ2VfRVUQGhIPCgtMYW5ndWFnZV9GQRAbEg8KC0xhbmd1YWdlX0ZJEBwSEAoMTGFuZ3VhZ2VfRklMEB0SDwoLTGFuZ3VhZ2VfRk8QHhIPCgtMYW5ndWFnZV9GUhAfEg8KC0xhbmd1YWdlX0ZZECASDwoLTGFuZ3VhZ2VfR0EQIRIPCgtMYW5ndWFnZV9HRBAiEg8KC0xhbmd1YWdlX0dMECMSEAoMTGFuZ3VhZ2VfR1NXECQSDwoLTGFuZ3VhZ2VfR1UQJRIPCgtMYW5ndWFnZV9IQRAmEg8KC0xhbmd1YWdlX0hFECcSDwoLTGFuZ3VhZ2VfSEkQKBIPCgtMYW5ndWFnZV9IUhApEhAKDExhbmd1YWdlX0hTQhAqEg8KC0xhbmd1YWdlX0hVECsSDwoLTGFuZ3VhZ2VfSFkQLBIPCgtMYW5ndWFnZV9JRBAtEg8KC0xhbmd1YWdlX0lHEC4SDwoLTGFuZ3VhZ2VfSUkQLxIPCgtMYW5ndWFnZV9JUxAwEg8KC0xhbmd1YWdlX0lUEDESDwoLTGFuZ3VhZ2VfSVUQMhIPCgtMYW5ndWFnZV9KQRAzEg8KC0xhbmd1YWdlX0tBEDQSDwoLTGFuZ3VhZ2VfS0sQNRIPCgtMYW5ndWFnZV9LTBA2Eg8KC0xhbmd1YWdlX0tNEDcSDwoLTGFuZ3VhZ2VfS04QOBIQCgxMYW5ndWFnZV9LT0sQORIPCgtMYW5ndWFnZV9LTxA6Eg8KC0xhbmd1YWdlX0tZEDsSDwoLTGFuZ3VhZ2VfTEIQPBIPCgtMYW5ndWFnZV9MTxA9Eg8KC0xhbmd1YWdlX0xUED4SDwoLTGFuZ3VhZ2VfTFYQPxIPCgtMYW5ndWFnZV9NSRBAEg8KC0xhbmd1YWdlX01LEEESDwoLTGFuZ3VhZ2VfTUwQQhIPCgtMYW5ndWFnZV9NThBDEhAKDExhbmd1YWdlX01PSBBEEg8KC0xhbmd1YWdlX01SEEUSDwoLTGFuZ3VhZ2VfTVMQRhIPCgtMYW5ndWFnZV9NVBBHEg8KC0xhbmd1YWdlX05CEEgSDwoLTGFuZ3VhZ2VfTkUQSRIPCgtMYW5ndWFnZV9OTBBKEg8KC0xhbmd1YWdlX05OEEsSEAoMTGFuZ3VhZ2VfTlNPEEwSDwoLTGFuZ3VhZ2VfT0MQTRIPCgtMYW5ndWFnZV9PUhBOEg8KC0xhbmd1YWdlX1BBEE8SDwoLTGFuZ3VhZ2VfUEwQUBIQCgxMYW5ndWFnZV9QUlMQURIPCgtMYW5ndWFnZV9QVBBSEhAKDExhbmd1YWdlX1FVVBBTEhAKDExhbmd1YWdlX1FVWhBUEg8KC0xhbmd1YWdlX1JNEFUSDwoLTGFuZ3VhZ2VfUk8QVhIPCgtMYW5ndWFnZV9SVRBXEg8KC0xhbmd1YWdlX1JXEFgSEAoMTGFuZ3VhZ2VfU0FIEFkSDwoLTGFuZ3VhZ2VfU0EQWhIPCgtMYW5ndWFnZV9TRRBbEg8KC0xhbmd1YWdlX1NJEFwSDwoLTGFuZ3VhZ2VfU0sQXRIPCgtMYW5ndWFnZV9TTBBeEhAKDExhbmd1YWdlX1NNQRBfEhAKDExhbmd1YWdlX1NNShBgEhAKDExhbmd1YWdlX1NNThBhEg8KC0xhbmd1YWdlX1NREGISDwoLTGFuZ3VhZ2VfU1IQYxIPCgtMYW5ndWFnZV9TVhBkEg8KC0xhbmd1YWdlX1NXEGUSEAoMTGFuZ3VhZ2VfU1lSEGYSDwoLTGFuZ3VhZ2VfVEEQZxIPCgtMYW5ndWFnZV9URRBoEg8KC0xhbmd1YWdlX1RHEGkSDwoLTGFuZ3VhZ2VfVEgQahIPCgtMYW5ndWFnZV9USxBrEg8KC0xhbmd1YWdlX1ROEGwSDwoLTGFuZ3VhZ2VfVFIQbRIPCgtMYW5ndWFnZV9UVBBuEhAKDExhbmd1YWdlX1RaTRBvEg8KC0xhbmd1YWdlX1VHEHASDwoLTGFuZ3VhZ2VfVUsQcRIPCgtMYW5ndWFnZV9VUhByEg8KC0xhbmd1YWdlX1VaEHMSDwoLTGFuZ3VhZ2VfVkkQdBIPCgtMYW5ndWFnZV9XTxB1Eg8KC0xhbmd1YWdlX1hIEHYSDwoLTGFuZ3VhZ2VfWU8QdxIPCgtMYW5ndWFnZV9aSBB4Eg8KC0xhbmd1YWdlX1pVEHliBnByb3RvMw=='
      break;
    case 'video':
      templateName = 'tmpl_9705FC0B';
      descriptor = 'CuABCgdwLnByb3RvEhJvaXBQcm90by50ZW1wbGF0ZXMiuAEKAVASEwoLcHVibGlzaERhdGUYASABKAQSGAoQYWRkcmVzc0RpcmVjdG9yeRgDIAEoCRIQCghmaWxlbmFtZRgEIAEoCRITCgtkaXNwbGF5TmFtZRgFIAEoCRIZChF0aHVtYm5haWxGaWxlbmFtZRgGIAEoCSJCCgdOZXR3b3JrEg0KCVVOREVGSU5FRBAAEhAKDE5ldHdvcmtfSVBGUxABEhYKEk5ldHdvcmtfQklUVE9SUkVOVBACYgZwcm90bzM='
      break;
    case 'text':
      templateName = 'tmpl_769D8FBC';
      descriptor = 'CoYDCgdwLnByb3RvEhJvaXBQcm90by50ZW1wbGF0ZXMi3gIKAVASGAoHbmV0d29yaxgBIAEoDjIHTmV0d29yaxITCgt0ZXh0QWRkcmVzcxgCIAEoCRIiCgx0ZXh0RmlsZXR5cGUYAyABKA4yDFRleHRGaWxldHlwZRIRCglpc1ByZXZpZXcYBCABKAgibgoHTmV0d29yaxIVChFOZXR3b3JrX1VOREVGSU5FRBAAEhAKDE5ldHdvcmtfSVBGUxABEhYKEk5ldHdvcmtfQklUVE9SUkVOVBACEg8KC05ldHdvcmtfU0lBEAMSEQoNTmV0d29ya19TVE9SShAEIoIBCgxUZXh0RmlsZXR5cGUSGgoWVGV4dEZpbGV0eXBlX1VOREVGSU5FRBAAEhMKD1RleHRGaWxldHlwZV9NRBABEhQKEFRleHRGaWxldHlwZV9SVEYQAhIUChBUZXh0RmlsZXR5cGVfVFhUEAMSFQoRVGV4dEZpbGV0eXBlX0hUTUwQBGIGcHJvdG8z';
      break;
    case 'image':
      templateName = 'tmpl_1AC73C98';
      descriptor = 'CrwCCgdwLnByb3RvEhJvaXBQcm90by50ZW1wbGF0ZXMilAIKAVASGAoHbmV0d29yaxgBIAEoDjIHTmV0d29yaxIQCghmaWxlbmFtZRgCIAEoCRIUCgxpbWFnZUFkZHJlc3MYAyABKAkSGAoQdGh1bWJuYWlsQWRkcmVzcxgEIAEoCRIZCgt0YWtlbkJ5TGlzdBgFIAMoCzIEVHhpZBIbCg10YWtlbldpdGhMaXN0GAYgAygLMgRUeGlkEhoKDHByb3RvY29sTGlzdBgHIAMoCzIEVHhpZBoTCgRUeGlkEgsKA3JhdxgBIAEoDCJKCgdOZXR3b3JrEhUKEU5ldHdvcmtfVU5ERUZJTkVEEAASEAoMTmV0d29ya19JUEZTEAESFgoSTmV0d29ya19CSVRUT1JSRU5UEAJiBnByb3RvMw=='
      break;
    case 'article':
      templateName = 'tmpl_D019F2E1';
      descriptor = 'CpgCCgdwLnByb3RvEhJvaXBQcm90by50ZW1wbGF0ZXMi8AEKAVASGgoMYnlsaW5lV3JpdGVyGAEgASgLMgRUeGlkEhoKEmJ5bGluZVdyaXRlcnNUaXRsZRgCIAEoCRIdChVieWxpbmVXcml0ZXJzTG9jYXRpb24YAyABKAkSGQoLYXJ0aWNsZVRleHQYBCABKAsyBFR4aWQSFwoJaW1hZ2VMaXN0GAUgAygLMgRUeGlkEhgKEGltYWdlQ2FwdGlvbkxpc3QYBiADKAkSFwoJdmlkZW9MaXN0GAcgAygLMgRUeGlkEhgKEHZpZGVvQ2FwdGlvbkxpc3QYCCADKAkaEwoEVHhpZBILCgNyYXcYASABKAxiBnByb3RvMw=='
      break;
    case 'youtube':
      templateName = 'tmpl_834772F4';
      descriptor = 'CkoKB3AucHJvdG8SEm9pcFByb3RvLnRlbXBsYXRlcyIjCgFQEgsKA3VybBgBIAEoCRIRCgl5b3VUdWJlSWQYAiABKAliBnByb3RvMw=='
      break;
    case 'person':
      templateName = 'tmpl_B6E9AF9B';
      descriptor = 'ClEKB3AucHJvdG8SEm9pcFByb3RvLnRlbXBsYXRlcyIqCgFQEg8KB3N1cm5hbWUYASABKAkSFAoMcGxhY2VPZkJpcnRoGAIgASgJYgZwcm90bzM='
      break;
    case 'url':
      templateName = 'tmpl_74C584FC';
      descriptor = 'CkUKB3AucHJvdG8SEm9pcFByb3RvLnRlbXBsYXRlcyIeCgFQEgwKBG5hbWUYASABKAkSCwoDdXJsGAIgASgJYgZwcm90bzM=';
      break;
    default:
      break;
  }
  const templateInfo = {
    descriptor,
    name: templateName
  }
  return templateInfo
}

// format record data for publishing
async function formatRecord(recordData){
  const record = recordData.record;

  const article = {
    'basic': {
      'name': '',
      'description': '',
      'language': '',
      'date': '',
      'avatar': '',
      'tagList': '',
    },
    'article': {
      'bylineWriter': '',
      'bylineWritersTitle': '',
      'bylineWritersLocation': '',
      'articleText': '',
      'imageList': '', 
      'imageCaptionList': '', 
      'videoList': '', 
      'videoCaptionList': ''
    },
    'url':{
      'name': '',
      'url': '',
    }
  }

  const textRecord = {
    'basic': {
      'name': '',
      'language': '',
      'date': '',
    },
    'text': {
      'textAddress': '',
      'isPreview': '',
      'textFiletype': '',
      'network': ''
    },
    'url': {
      'name': '',
      'url': '',
    }
  }

  const textData = [textRecord]
  textData[0].text.textAddress = record.textAddress || ''
  textData[0].text.isPreview = 'false';
  textData[0].text.textFiletype = (record.textFiletype === "TextFiletype_MD") ? 1 : null;
  textData[0].text.network = (record.network === "Network_IPFS") ? 1 : null;
  textData[0].basic.name = record.title || '';
  textData[0].basic.language = (record.language === "Language_EN") ? 23 : null;
  textData[0].basic.date = record.date || '';
  textData[0].url.name = record.title || '';
  textData[0].url.url = record.textURL || '';
  bylineWriterRecord = {
    'basic': {
      'name': '',
      'description': '',
      'language': '',
      'date': '',
      'avatar': '',
      'tagList': ''
    },
    'person': {
      'surname': '',
      'placeOfBirth': ''
    }
  }

  const bylineWriterData = [bylineWriterRecord]
  if (record.bylineWriter) {
    const bylineWriterArray = record.bylineWriter.split(' ');
      bylineWriterData[0].basic.name = bylineWriterArray[0];
      bylineWriterData[0].person.surname = bylineWriterArray[1];
      bylineWriterData[0].basic.language = (record.language === "Language_EN" ) ? 23 : null;
  }


  const embeddedImages = [];
  const embeddedImageAddresses = [];
  const embeddedImageCaptions = [];
  const embeddedImageQty = (Array.isArray(record.embeddedImages)) ? record.embeddedImages.length : 0;
  for (let i = 0; i < embeddedImageQty; i++) {
    image = {
      'basic': {
        'name': '',
        'description': '',
        'language': '',
        'date': '',
        'avatar': '',
        'tagList': ''
      },
      'image': {
        'filename': '',
        'imageAddress': '',
        'thumbnailAddress': '',
        'network': ''
      },
      'url': {
        'url': ''
      }
    }

    image.basic.name = record.embeddedImages[i].name || '';
    image.basic.description = record.embeddedImages[i].description || '';
    image.basic.language = (record.embeddedImages[i].language === "Language_EN") ? 23 : null;
    image.basic.avatar = record.embeddedImages[i].avatar || null;
    image.basic.tagList = record.embeddedImages[i].tagList || '';
    image.image.filename = record.embeddedImages[i].filename || '';
    image.image.imageAddress = record.embeddedImages[i].imageAddress || '';
    image.image.thumbnailAddress = record.embeddedImages[i].thumbnailAddress || '';
    image.image.network = (record.embeddedImages[i].network === "Network_IPFS") ? 1 : null;
    image.url.url = record.embeddedImages[i].url || '';

    embeddedImages.push(image);
    embeddedImageAddresses.push(record.embeddedImages[i].imageAddress);
    embeddedImageCaptions.push(record.embeddedImages[i].caption);
  }

  let embeddedVideos = [];
  let embeddedVideocaptions = [];
  const embeddedVideoQty = Array.isArray(record.embeddedVideos) ? record.embeddedVideos.length : 0;
  for (let i = 0; i < embeddedVideoQty; i++) {
    video = {
      'basic': {
        'name': '',
        'description': '',
        'language': '',
        'date': '',
        'avatar': '',
        'tagList': '',
      },
      'video': {
        'filename': '',
        // 'p2PNetwork': '',
        'addressDirectory': '',
        'thumbnailFilename': '',
        'displayName': '',
        'publishDate': '',
      },
      'youtube': {
        'url': '',
        'youTubeId': '',
      }
    }
    
    video.basic.name = record.embeddedVideos[i].name || '';
    video.basic.description = record.embeddedVideos[i].description || '';
    video.basic.language = (record.embeddedVideos[i].language === "Language_EN") ? 23 : null;
    video.basic.date = record.embeddedVideos[i].date || '';
    video.basic.avatar = record.embeddedVideos[i].avatar || null;
    video.basic.tagList = record.embeddedVideos[i].tagList || '';
    video.video.filename = record.embeddedVideos[i].filename || '';
    video.video.addressDirectory = record.embeddedVideos[i].addressDirectory || '';
    video.video.thumbnailFilename = record.embeddedVideos[i].thumbnailFilename || '';
    video.video.displayName = record.embeddedVideos[i].displayName || '';
    video.video.publishDate = record.embeddedVideos[i].publishDate || '';
    video.youtube.url = record.embeddedVideos[i].youTubeURL || '';
    video.youtube.youTubeId = (video.youtube.url.startsWith("https://www.youtube.com")) ? video.youtube.url.split('?v=').pop() : video.youtube.url.split('https://youtu.be/').pop() || '';
    embeddedVideos.push(video)
    embeddedVideocaptions.push(record.embeddedVideos[i].caption);
  }

  const articleData = [article];
  articleData[0].basic.name = record.title || '';
  articleData[0].basic.description = record.description || '';
  articleData[0].basic.language = (record.language === "Language_EN") ? 23 : null;
  articleData[0].basic.date = record.date || '';
  articleData[0].basic.avatar = record.avatar || null;
  articleData[0].basic.tagList = record.tagList || '';
  // articleData[0].url.name = record.title || '';
  articleData[0].url.url = record.articleURL || '';
  articleData[0].article.bylineWriter = record.bylineWriter || '';
  articleData[0].article.bylineWritersTitle = record.bylineWritersTitle || '';
  articleData[0].article.bylineWritersLocation = record.bylineWritersLocation || '';
  articleData[0].article.imageList = embeddedImageAddresses || '';
  articleData[0].article.imageCaptionList = embeddedImageCaptions || '';
  articleData[0].article.videoCaptionList = embeddedVideocaptions || '';

  const response = {
    'articleData': articleData,
    'bylineWriterData': bylineWriterData,
    'textData': textData,
    'embeddedVideos': embeddedVideos,
    'embeddedImages': embeddedImages
  }
  return response
}

async function searchForBylineWriter(BylineWriter) {
  let BylineWriterName = BylineWriter.split(' ')[0];
  let BylineWriterSurname = BylineWriter.split(' ')[1];
  let FirstOnlyOrBoth = (BylineWriterName && BylineWriterSurname) ? 'both' : 'first';
  let record
  
  try {
    switch(FirstOnlyOrBoth) {
      case 'first':
        record = await axios.get(`https://api.oip.io/oip/o5/record/search?q=_exists_:record.details.tmpl_B6E9AF9B%20AND%20record.details.tmpl_20AD45E7.name:${BylineWriterName}`);
        break;
      case 'both':
        record = await axios.get(`https://api.oip.io/oip/o5/record/search?q=record.details.tmpl_20AD45E7.name:${BylineWriterName}%20AND%20record.details.tmpl_B6E9AF9B.surname:${BylineWriterSurname}`);
        break;
      default:
    }
    // console.log('record', record);
    // if record is undefined, bylineWriter is not found
    if (record === undefined) {
      // console.log('no results')
      // return null
      return record.data
    } else {
    // record = await axios.get(`https://api.oip.io/oip/o5/record/search?q=record.details.tmpl_20AD45E7.name:${BylineWriterName}%20AND%20record.details.tmpl_B6E9AF9B.surname:${BylineWriterSurname}`);
    // console.log('record', record.data)
    return record.data
  }} catch (error) {
    console.log('error', error)
  }
}

async function searchForVideoRecords(formattedEmbeddedVideos, i) {
  let name = encodeURIComponent(formattedEmbeddedVideos[i].basic.name) || "*";
  let description = encodeURIComponent(formattedEmbeddedVideos[i].basic.description) || "*";

  let language = (formattedEmbeddedVideos[i].basic.language === "Language_EN") ? (23) : ("*");
  let addressDirectory = formattedEmbeddedVideos[i].video.addressDirectory || "*";
  let filename = formattedEmbeddedVideos[i].video.filename || "*";
  let thumbnailFilename = formattedEmbeddedVideos[i].video.thumbnailFilename || "*";
  let displayName = formattedEmbeddedVideos[i].video.displayName || "*";
  let publishDate = formattedEmbeddedVideos[i].video.publishDate || "*";
  let youTubeId = formattedEmbeddedVideos[i].youtube.youTubeId || "*";

  let record
  let endpoint = "/o5/record/search?q="
  let parameterString = oipRecordsApiAddress + endpoint
    if (name !== "*") {
      parameterString += `record.details.tmpl_20AD45E7.name:"${name}"%20AND%20`
    }
    if (description !== "*") {
      parameterString += `record.details.tmpl_20AD45E7.description:"${description}"%20AND%20`
    }
    if (language !== "*") {
      parameterString += `record.details.tmpl_20AD45E7.language:"${language}"%20AND%20`
    }
    if (addressDirectory !== "*") {
      parameterString += `record.details.tmpl_9705FC0B.addressDirectory:"${addressDirectory}"%20AND%20`
    }
    if (filename !== "*") {
      parameterString += `record.details.tmpl_9705FC0B.filename:"${filename}"%20AND%20`
    }
    if (thumbnailFilename !== "*") {
      parameterString += `record.details.tmpl_9705FC0B.thumbnailFilename:"${thumbnailFilename}"%20AND%20`
    }
    if (displayName !== "*") {
      parameterString += `record.details.tmpl_9705FC0B.displayName:"${displayName}"%20AND%20`
    }
    if (publishDate !== "*") {
      parameterString += `record.details.tmpl_9705FC0B.publishDate:"${publishDate}"%20AND%20`
    }
    if (youTubeId !== "*") {
      parameterString += `record.details.tmpl_834772F4.youTubeId:"${youTubeId}"%20AND%20`
    }
    parameterString = parameterString.slice(0, -9)
    // console.log('parameterString', parameterString)
  try {
    record = await axios.get(parameterString);
    if (record.data.count === 0 || record === undefined) {
      // return null
      return record.data
    } else {
    return record.data
    }
  } catch (error) {
    console.log('error', error)
  }
}

async function searchForImageRecords(formattedEmbeddedImages, i) {
  let filename = formattedEmbeddedImages[i].image.filename || "*";
  let thumbnailAddress = formattedEmbeddedImages[i].image.thumbnailAddress || "*";
  let imageAddress = formattedEmbeddedImages[i].image.imageAddress || "*";
  let network = (formattedEmbeddedImages[i].image.network === "Network_IPFS") ? (1) : ("*");
  let url = encodeURIComponent(formattedEmbeddedImages[i].image.url) || "*";
  let record
  
  let parameterString = "https://api.oip.io/oip/o5/record/search?q="
    if (filename !== "*") {
      parameterString += `record.details.tmpl_1AC73C98.filename:${filename}%20AND%20`
    }
    if (thumbnailAddress !== "*") {
      parameterString += `record.details.tmpl_1AC73C98.thumbnailAddress:${thumbnailAddress}%20AND%20`
    }
    if (imageAddress !== "*") {
      parameterString += `record.details.tmpl_1AC73C98.imageAddress:${imageAddress}%20AND%20`
    }
    if (network !== "*") {
      parameterString += `record.details.tmpl_1AC73C98.network:${network}%20AND%20`
    }
    if (url !== "*") {
      parameterString += `record.details.tmpl_74C584FC.url:${url}%20AND%20`
    }
    parameterString = parameterString.slice(0, -9)
    // console.log('parameterString for image record search',i, parameterString)
  try {
    record = await axios.get(parameterString);
    if (record.data.results === 0) {
      // return null
      return record.data
    } else {
    return record.data
    }
  } catch (error) {
    console.log('error', error)
  }
}

async function searchForTextRecord(formattedTextData) {
  let name = encodeURIComponent(formattedTextData[0].basic.name) || "*";
  let date = formattedTextData[0].basic.date || "*";
  let language = (formattedTextData[0].basic.language === "Language_EN") ? (23) : ("*");
  let textAddress = formattedTextData[0].text.textAddress || "*";
  let textFiletype = (formattedTextData[0].text.textFiletype === "TextFiletype_MD") ? (1) : ("*");
  let network = (formattedTextData[0].text.network === "Network_IPFS") ? (1) : ("*");
  let url = encodeURIComponent(formattedTextData[0].url.url) || "*";

  let record
  let endpoint = "/o5/record/search?q="
  let parameterString = oipRecordsApiAddress + endpoint
    if (name !== "*") {
      parameterString += `record.details.tmpl_20AD45E7.name:"${name}"%20AND%20`
    }  
    if (date !== "*") {
      parameterString += `record.details.tmpl_20AD45E7.date:"${date}"%20AND%20`
    }
    if (language !== "*") {
      parameterString += `record.details.tmpl_20AD45E7.language:"${language}"%20AND%20`
    }
    if (textAddress !== "*") {
      parameterString += `record.details.tmpl_769D8FBC.textAddress:"${textAddress}"%20AND%20`
    }
    if (textFiletype !== "*") {
      parameterString += `record.details.tmpl_769D8FBC.textFiletype:"${textFiletype}"%20AND%20`
    }
    if (network !== "*") {
      parameterString += `record.details.tmpl_769D8FBC.network:"${network}"%20AND%20`
    }
    if (url !== "*") {
      parameterString += `record.details.tmpl_74C584FC.url:"${url}"%20AND%20`
    }
    parameterString = parameterString.slice(0, -9)
    // console.log('parameterString for text record search', parameterString)
  try {
    record = await axios.get(parameterString);
    if (record.data.results === 0) {
      // return null
      return record.data
    } else {
    return record.data
    }
  } catch (error) {
    console.log('error', error)
  }
}

async function searchForArticleRecord(formattedArticleData, oipRefs, formattedEmbeddedImages, formattedEmbeddedVideos, formattedTextData) {
  let name = encodeURIComponent(formattedArticleData[0].basic.name) || "*";
  let description = encodeURIComponent(formattedArticleData[0].basic.description) || "*";
  let bylineWritersTitle = encodeURIComponent(formattedArticleData[0].article.bylineWritersTitle) || "*";
  let bylineWritersLocation = encodeURIComponent(formattedArticleData[0].article.bylineWritersLocation) || "*";
  let url = encodeURIComponent(formattedArticleData[0].url.url) || "*";
  let language = (formattedArticleData[0].basic.language === "Language_EN") ? (23) : ("*");
  let date = formattedArticleData[0].basic.date || "*";
  let bylineWriter = oipRefs[0].bylineWriterTXID.toString();
  let tagList = formattedArticleData[0].basic.tagList || "*";
  let imageList = formattedArticleData[0].article.imageList || "*";
  let videoList = formattedArticleData[0].article.videoList || "*";
  let imageCaptionList = formattedArticleData[0].article.imageCaptionList || "*";
  let videoCaptionList = formattedArticleData[0].article.videoCaptionList || "*";
  
  let tagListParameterString = ""
  for (let i = 0; i < formattedArticleData[0].basic.tagList.length; i++) {
    let tag = encodeURIComponent(formattedArticleData[0].basic.tagList[i]) || "*";
    tagListParameterString += `record.details.tmpl_20AD45E7.tagList:"${tag}"%20AND%20`
  }
  
  let imageCaptionListParameterString = ""
  for (let i = 0; i < formattedArticleData[0].article.imageCaptionList.length; i++) {
    let imageCaption = encodeURIComponent(formattedArticleData[0].article.imageCaptionList[i]) || "*";
    imageCaptionListParameterString += `record.details.tmpl_D019F2E1.imageCaptionList:"${imageCaption}"%20AND%20`
  }

  let videoCaptionListParameterString = ""
  for (let i = 0; i < formattedArticleData[0].article.videoCaptionList.length; i++) {
    let videoCaption = encodeURIComponent(formattedArticleData[0].article.videoCaptionList[i]) || "*";
    videoCaptionListParameterString += `record.details.tmpl_D019F2E1.videoCaptionList:"${videoCaption}"%20AND%20`
  }

  let imageListParameterString = ""
  for (let i = 0; i < formattedArticleData[0].article.imageList.length; i++) {
    let image = encodeURIComponent(oipRefs[0].embeddedImageTXIDs[i]) || "*";
    imageListParameterString += `record.details.tmpl_D019F2E1.imageList:"${image}"%20AND%20`
  }
  
  let videoListParameterString = ""
  for (let i = 0; i < formattedArticleData[0].article.videoList.length; i++) {
    let video = encodeURIComponent(oipRefs[0].embeddedVideoTXIDs[i]) || "*";
    videoListParameterString += `record.details.tmpl_D019F2E1.videoList:"${video}"%20AND%20`
  }
  let record
  let endpoint = "/o5/record/search?q="
  let parameterString = oipRecordsApiAddress + endpoint
    if (name !== "*") {
      parameterString += `record.details.tmpl_20AD45E7.name:"${name}"%20AND%20`
    }
    if (description !== "*") {
      parameterString += `record.details.tmpl_20AD45E7.description:"${description}"%20AND%20`
    }
    if (date !== "*") {
      parameterString += `record.details.tmpl_20AD45E7.date:"${date}"%20AND%20`
    }
    if (tagList !== "*") {
      parameterString += tagListParameterString
    }
    if (language !== "*") {
      parameterString += `record.details.tmpl_20AD45E7.language:"${language}"%20AND%20`
    }
    if (bylineWriter !== "*") {
      parameterString += `record.details.tmpl_D019F2E1.bylineWriter:"${bylineWriter}"%20AND%20`
    }
    if (bylineWritersTitle !== "*") {
      parameterString += `record.details.tmpl_D019F2E1.bylineWritersTitle:"${bylineWritersTitle}"%20AND%20`
    }
    if (bylineWritersLocation !== "*") {
      parameterString += `record.details.tmpl_D019F2E1.bylineWritersLocation:"${bylineWritersLocation}"%20AND%20`
    }
    if (imageList !== "*") {
      parameterString += imageListParameterString
    }
    if (imageCaptionList !== "*") {
      parameterString += imageCaptionListParameterString
    }
    if (videoList !== "*") {
      parameterString += videoListParameterString
    }
    if (videoCaptionList !== "*") {
      parameterString += videoCaptionListParameterString
    }
    if (url !== "*") {
      parameterString += `record.details.tmpl_74C584FC.url:"${url}"%20AND%20`
    }

    parameterString = parameterString.slice(0, -9)
    // console.log('parameterString for article record search', parameterString)
  try {
    record = await axios.get(parameterString);
    if (record.data.results === 0) {
      // return null
      return record.data
    } else {
    return record.data
    }
  } catch (error) {
    console.log('parameterString', parameterString, 'error', error)
  }
}

// get a record from the blockchain
async function getRecord(recordID) {
  let endpoint = `/o5/record/get/${recordID}`
  let url = oipRecordsApiAddress + endpoint
  console.log('url', url)
  let record
  try {
    record = await axios.get(url);
  } catch (e) {
    console.log('error', e);
  }
  if (record.count === 0) {
    return null;
  }else {
  return record.data
  }
  
}

async function sendTxToPublishingSponsor(signedP64floData){
  const endpoint = '/api/v1/sendTxToPublishingSponsor';
  const url = publishingSponsorAddress + endpoint;
  const data = [{},{
    "signedP64floData": signedP64floData
  }]

  const options = {
    method: 'POST',
    url: url,
    body: data,
    json: true
  }

  result = await axios({
    method: 'POST',
    url: url,
    data: data
  }).catch(err => {
    console.log("error");
  }
  );
  return result.data.txo;
};

function makeRecord(data) {
  return {
    details: data,
    myMainAddress: wif,
    pubKey: myPubKey
  }
}

async function makeFloDataJSON(payload, templates){
  let data = [];
  for (let i = 0; i < templates.length; i++) {
    let templateType = templates[i];
    let templateInfo = await getTemplateInfo(templateType);
    let templateDescriptor = templateInfo.descriptor;
    let templateName = templateInfo.name;
    let templatePayload = payload[i]
    let template = {
      descriptor: templateDescriptor,
      name: templateName,
      payload: templatePayload
    }
    data.push(template);
  }
  floDataJSON = makeRecord(data);
  return floDataJSON;
}

// make a raw TX and send it to the blockchain
async function makeAndSendRawTransaction(signedP64floData, wif, selfPublish, prevTxO) {
  if (selfPublish === true) {
    network = 'mainnet';
  let walletRPC = new RPCWallet({
    publicAddress: myPubKey,
    wif,
    network,
    rpc: {
      port: walletClientPort,
      host: '127.0.0.1',
      username: 'x',
      password: apiKey   
    }
  })
  const result = await walletRPC.prepSignedTXforChain(signedP64floData, prevTxO);
  
  txid = await client.execute('sendrawtransaction', [result.signedTxHex]);

  let txo = {
    txid: txid,
    amount: result.transactionOutput.amount,
    address: result.transactionOutput.address,
    vout: 0
  };
    return txo;
  }
  else {
    const result = await sendTxToPublishingSponsor(signedP64floData, prevTxO)
    return result;
}
}

// publish signed P64floData to the blockchain, possibly as multipart
async function publishSignedOIPRecord(signedP64floData, wif, selfPublish, recordTxO){
  
  if (signedP64floData.length > 1040) {
    // mpx
    // console.log('signed64 is too long, splitting into a multi-part message');
    let mpx = new Modules.MultipartX(signedP64floData).multiparts;
    if (!Array.isArray(mpx)) {
      return console.log('uh oh', mpx);
    }
            
    mpx[0].setAddress(myPubKey);
    let signatureData = mpx[0].getSignatureData();
    mp1_sig = await signMessage(wif, myPubKey, signatureData);
    
    mpx[0].setSignature(mp1_sig);
    const signedp64_mp1_forPublishing = `${mpx[0].prefix}(${mpx[0].part},${mpx[0].max},${mpx[0].address},,${mpx[0].signature}):${mpx[0].data}`;
    prevTxO = (recordTxO.length == 0) ? undefined : recordTxO[recordTxO.length-1];
    firstTX = await makeAndSendRawTransaction(signedp64_mp1_forPublishing, wif, selfPublish, prevTxO);
    let mpTxIDArray = [];
    let mpTxOArray = [];
    mpTxIDArray.push(firstTX.txid);
    mpTxOArray.push(firstTX);

    // if first transaction has successfully been sent, start the loop
    if (firstTX) {
      // let mp=1;
      // console.log(`MP ${mp} of ${mpx.length}`,mpTxIDArray)
      const delay = ms => new Promise(res => setTimeout(res, ms));
      await delay(2000);
      for (let i = 1; i < mpx.length; i++) {
        mpx[i].setReference(firstTX.txid);
        mpx[i].setAddress(myPubKey);
        let sig = await signMessage(wif, myPubKey, mpx[i].getSignatureData());    
        mpx[i].setSignature(sig);
        let result = await makeAndSendRawTransaction(`${mpx[i].prefix}(${mpx[i].part},${mpx[i].max},${mpx[i].address},${mpx[i].reference},${mpx[i].signature}):${mpx[i].data}`, wif, selfPublish, mpTxOArray[i-1]);
        txo = result;
        mpTxIDArray.push(result.txid);
        mpTxOArray.push(result);
        
        const recordTxidArray = await Promise.all([sig, result]).then((values) => {
          return (mpTxIDArray, mpTxOArray, txo)
        });
      }
    }

    return ({txo, mpTxIDArray});
  } else {
    // single
    // console.log('signedP64floData is not too long, sending as a single message');
    prevTxO = (recordTxO.length == 0) ? undefined : recordTxO[recordTxO.length-1];

    let mpTxIDArray = []
    let txo = await makeAndSendRawTransaction(signedP64floData, wif, selfPublish, prevTxO)
    return ({txo, mpTxIDArray})
  }
}

// --------------------------------------------------------------------------------
// endpoints

// use this endpoint to check the chain sync status and other info
app.get('/api/v1/getInfo', (req, res) => {
  getinfo().then(result => {
    // console.log('result', result)
    let chainSync = (Math.floor(result.chain.progress * 1e6)/1e4) + ' %';
    let chainIsSynced = (result.chain.progress == 1) ? true : false;
    res.send({
    "currentTime": new Date().toISOString(),
    "chain sync progress": chainSync,
    "chain synched": chainIsSynced,
    "info": result
    });
  });
  console.log("handling RPC call: getinfo");
});

// use this endpoint to get info about connected blockchain peers
app.get('/api/v1/getPeerInfo', (req, res) => {
  getPeerInfo().then(result => {
    res.send({
      "currentTime": new Date().toISOString(),
      "message": "All Systems Operational",
      "info": result
    });
  });
  console.log("handling RPC call: getpeerinfo");
});

// use this endpoint to get wallet's WIF (private key)
app.post('/api/v1/getWIF', (req, res) => {
  let result = "";
  let body = req.body;
  let emailaddress = body.emailaddress;
  let pubKey = body.pubKey;
  let passphrase = body.options.passphrase || '';
  let id = SHA1(emailaddress).toString();
  if (!passphrase || passphrase.length === 0 ) {
    res.send({
      "currentTime": new Date().toISOString(),
      "message": "Error: Passphrase is required"
    });
  } else {
  getwif(id, pubKey, passphrase).then(result => {
    res.send({
      "currentTime": new Date().toISOString(),
      "walletID": id,
      "message": "Private Key Found",
      "wif": result
    });
  }).catch(err => {
    res.send({
      "currentTime": new Date().toISOString(),
      "message": "Error: " + err
      });
  });
  console.log("handling RPC call: getWIF");
}
});

// use this endpoint to create a new wallet
app.post('/api/v1/createWallet', (req, res) => {
  console.log("handling RPC call: createWallet");
  const emailaddress = req.body.emailaddress || '';
  const options = req.body.options;
  const passphrase = options.passphrase;
  options.passphrase = "";
  const account = 'default';
  const id = req.body.id || SHA1(emailaddress).toString();
  if (!passphrase || passphrase.length === 0 ) {
    res.send({
      "currentTime": new Date().toISOString(),
      "message": "Error: Passphrase is required"
    });
  } else {
    createWallet(id, options).then(wallet => {//console.log('create wallet response:', wallet);
    if (wallet.toString().startsWith("Error")) {
        res.send({
          "currentTime": new Date().toISOString(),
          "message": wallet.toString()
        });
      } else {
        getAccountInfo(id, account).then(account => {
          getMasterHDKey(id).then(masterHDKey => {
            getwif(id, account.receiveAddress).then(wif => {
              selectwallet(id, account.receiveAddress, wif).then(null1 => {
                encryptwallet(passphrase).then(null2 => {
                  getwalletinfo(id).then(walletinfo => {
                    res.send({
                      "currentTime": new Date().toISOString(),
                      "result": "Wallet Created Successfully",
                      "message": "emailAddress is the address associated with your walletID. pubKey is the address to send tokens to before you can publish. Please store your mnemonic, it will not be stored in our database and there is no way to ask for it again!",
                      "emailAddress": emailaddress,
                      "walletID": id,
                      "pubKey": account.receiveAddress,
                      "privKey": wif,
                      "encrypted": walletinfo.master.encrypted,
                      "mnemonic": masterHDKey.mnemonic.phrase,
                      "xprivkey": masterHDKey.key.xprivkey,
                      "walletinfo": walletinfo
                    });
                  });
                });
              });
            });
          });
        });
      }
    });
  }
});

// use this endpoint to get wallet info including balance
app.get('/api/v1/getWalletInfo', (req, res) => {
  const emailaddress = req.body.emailaddress || '';
  const id = req.body.id || SHA1(emailaddress).toString();
  const wallet = walletClient.wallet(id);
  wallet.getInfo(id).then(result => {
    res.send({
      "currentTime": new Date().toISOString(),
      "wallet id": id,
      "wallet balance": (result.balance.confirmed/100000000).toFixed(8),
      "info": wallet
    });
  });
  console.log("handling RPC call: getWalletInfo");
});

// use this endpoint to get wallet balance
app.get('/api/v1/getWalletBalance', (req, res) => {
  const emailaddress = req.body.emailaddress || '';
  const id = req.body.id || SHA1(emailaddress).toString();
  const wallet = walletClient.wallet(id);
  wallet.getInfo(id).then(result => {
    getAccountInfo(id, 'default').then(accountresponse => {
      res.send({
        "currentTime": new Date().toISOString(),
        "wallet id": id,
        "public address": accountresponse.receiveAddress,
        "wallet balance": (result.balance.confirmed/100000000).toFixed(8)
      });
    });
  });
  console.log("handling RPC call: getWalletInfo");
});

// use this endpoint to get wallets history
app.get('/api/v1/getWalletTxHistory', (req, res) => {
  const id = req.body.id;
  console.log("id:",id);
  const wallet = walletClient.wallet(id);
  wallet.getAccounts(id).then(result => {
    console.log(result)
    wallet.getHistory(result).then(result => {
      res.send({
        "currentTime": new Date().toISOString(),
        "message": "All Systems Operational",
        "info": result
      });
    });
  })
  console.log("handling RPC call: getWalletInfo");
});

app.post('/api/v1/sendTxToPublishingSponsor', async (req, res) => {
  if (allowSponsoredPublishing) {
    console.log("handling RPC call: sendTxToPublishingSponsor");
    const publisherData = req.body[1];
    const account = 'default';
    let signedP64floData = publisherData.signedP64floData;
    try{
      const wif = myPrivKey || await getwif(publishing_wallet_id, myPubKey, publishing_wallet_passphrase);
        selectwallet(publishing_wallet_id, myPubKey, wif).then(wallet => { //console.log('wallet:', wallet)
          walletpassphrase(publishing_wallet_passphrase).then(resX => {//console.log('resX:', resX)
            getwalletinfo().then(walletinfo => { //console.log('walletinfo:', walletinfo)
              makeAndSendRawTransaction(signedP64floData, wif, allowSponsoredPublishing).then(result => { console.log("sendTxToPublishingSponsor results:", result);
                res.send({
                  "currentTime": new Date().toISOString(),
                  "message": "Record Sent Successfully",
                  "txid": result.txid,
                  "txo": result, 
                });
              });
            });
          });
        });
    }catch(e){
      console.log(e);
      res.send({
        "currentTime": new Date().toISOString(),
        "message": "Publisher Registration Failed",
        "cause": 'Incorrect Passphrase'
      })
    }
  }
  else
  {
    res.send({
      "currentTime": new Date().toISOString(),
      "message": "Sponsored Publishing is not allowed by this node"
    })
  }
  
});

// use this endpoint to publish a record (including publisher registration)
app.post('/api/v1/publishOIPRecord', async (req, res) => {
  const account = 'default';
  const pubKey = myPubKey;
  const recordData = req.body[1];
  const selfPublish = req.body[0].selfPublish;
  const recordType = recordData.recordType;
    
  if (selfPublish){
    console.log("publishing record using this node's own wallet");
  }
  else{
    console.log("using publishing sponsor address:", publishingSponsorAddress);
  }

  try{
    wif = await getwif(publishing_wallet_id, myPubKey, publishing_wallet_passphrase);
  } catch(err) {
    console.log('Error getting wif', err);
    res.status(500).send({
      "currentTime": new Date().toISOString(),
      "message": "Publish Record Failed",
      "cause": 'Incorrect Passphrase'
    });
    return;
  }

  fpub = await getFpub(publishing_wallet_id, account);
  wallet = await selectwallet(publishing_wallet_id, pubKey, wif);
  unlock = await walletpassphrase(publishing_wallet_passphrase);
  walletinfo = await getwalletinfo();

  if(recordType == "publisher-registration"){
    const publisherName = recordData.name;
    try{
      getFpub(publishing_wallet_id, account).then(fpub => { //console.log("fpub:", fpub)
        prepRegistration(pubKey, publisherName, fpub, wif).then(data => { //console.log('making floData for publisher registration:', data.details[0], 'pubKey:',data.pubKey);
          getSignedP64FloData(data, wif).then(signedP64floData => { //console.log('signed protobuf & hex64 encoded record:', {signedP64floData});
            publishSignedOIPRecord(signedP64floData, wif, selfPublish).then(record => { //console.log("publisher registration record published:", record[0].recordTxID);
              res.send({
                "currentTime": new Date().toISOString(),
                "message": "Publisher Registration Sent Successfully",
                "RegistrationTxID": record[0].recordTxID,
                "PublisherAddress": data.pubKey,
                "PublisherName": publisherName
              });
            });
          })
        })
      })  
    }catch(e){
      console.log(e);
      res.send({
        "currentTime": new Date().toISOString(),
        "message": "Publisher Registration Failed",
        "cause": e
      })
    }
  } else if(recordType == "article"){
    formattedRecordData = await formatRecord(recordData)
    formattedBylineWriterData = formattedRecordData.bylineWriterData;
    formattedTextData = formattedRecordData.textData;
    formattedArticleData = formattedRecordData.articleData;
    formattedEmbeddedImages = formattedRecordData.embeddedImages || [];
    formattedEmbeddedVideos = formattedRecordData.embeddedVideos || [];
    embeddedVideoQty = formattedRecordData.embeddedVideos.length || 0;
    embeddedImageQty = formattedEmbeddedImages.length || 0;

    let referencedRecords = [];
    let recordTxO = [];
    let bylineWriterTXID = [];

    let bylineWriter = recordData.record.bylineWriter;
    // first we check if the bylinewriter is already registered in the index
    searchForBylineWriter(bylineWriter).then(bylineWriterRecord => {    
      if(bylineWriterRecord == null || bylineWriterRecord == undefined || bylineWriterRecord.total == 0) {
        let referenceRecordStatus = `bylineAuthor not found in index, publishing a new record for: ${bylineWriter}`;
        referencedRecords.push(referenceRecordStatus);
        const basic = formattedBylineWriterData[0].basic
        const person = formattedBylineWriterData[0].person
        const payload = [basic, person];
        let templates = ['basic','person'];
        makeFloDataJSON(payload, templates).then(floDataJSON => {
          getSignedP64FloData(floDataJSON, wif).then(signedP64floData => {
            publishSignedOIPRecord(signedP64floData, wif, selfPublish, recordTxO).then(result => { //console.log('bylineWriter record:', result);
              txid = (result.mpTxIDArray.length == 0) ? (result.txo.txid) : (result.mpTxIDArray[0]);
              bylineWriterTXID.push(txid)
              recordTxO.push(result.txo);
            });
          })
        })
      }else{
        let referenceRecordStatus = `OIPRef:${bylineWriterRecord.results[0].meta.txid} already exists for bylineWriter: "${bylineWriter}"`;
        referencedRecords.push(referenceRecordStatus)
        bylineWriterOIPRef = bylineWriterRecord.results[0].meta.txid;
        bylineWriterTXID.push(bylineWriterOIPRef);
      }
    }).catch(err => {
      console.log('Error searching for bylineWriter', err);
    })

    const delay = ms => new Promise(res => setTimeout(res, ms));
    await delay(2000);

    // then we check if there are any embedded videos and if so we loop thru them and create a new record for each one
    let embeddedVideoTXIDs = [];
    if (embeddedVideoQty > 0) {
      for (let i = 0; i < embeddedVideoQty; i++) {
        searchForVideoRecords(formattedEmbeddedVideos, i).then(prevPublishedVideoRecords => {
          if(prevPublishedVideoRecords.count === 0){
            let referenceRecordStatus = `embedded video not found in index, publishing a new record for: ${formattedEmbeddedVideos[i].basic.name}`;
            referencedRecords.push(referenceRecordStatus);
            const basic = formattedEmbeddedVideos[i].basic
            const video = formattedEmbeddedVideos[i].video
            const youtube = formattedEmbeddedVideos[i].youtube
            const payload = [basic, video, youtube];
            let templates = ['basic','video','youtube'];
            makeFloDataJSON(payload, templates).then(floDataJSON => {
              delay(2000 * (i)).then(waiting => { console.log(`delay for video ${i}:`, (2000 * (i)))
                getSignedP64FloData(floDataJSON, wif).then(signedP64floData => { //console.log('status of recordTxO before trying to make video tx number', i, recordTxO)
                  publishSignedOIPRecord(signedP64floData, wif, selfPublish, recordTxO).then(result => { //console.log('video record result number', i, result);
                    txid = (result.mpTxIDArray.length == 0) ? (result.txo.txid) : (result.mpTxIDArray[0]);
                    embeddedVideoTXIDs.push(txid)
                    recordTxO.push(result.txo);
                  });
                });
              });
            });
          } else {
            let referenceRecordStatus = `OIPRef:${prevPublishedVideoRecords.results[0].meta.txid} already exists for video: "${formattedEmbeddedVideos[i].basic.name}"`;
            referencedRecords.push(referenceRecordStatus)
            embeddedVideoOIPRef = prevPublishedVideoRecords.results[0].meta.txid;
            embeddedVideoTXIDs.push(embeddedVideoOIPRef);
          }
        }).catch(err => {
          console.log('Error searching for video', err);
        })
      }
    } else {
      console.log('there are no embedded videos to publish');
    }

    await delay(2000);

    // then we check if there are any embedded images and if so we loop thru them and create a new record for each one
    let embeddedImageTXIDs = [];
    if (embeddedImageQty > 0) {
      for (let i = 0; i < embeddedImageQty; i++) {
        searchForImageRecords(formattedEmbeddedImages, i).then(prevPublishedImageRecords => {
        if(prevPublishedImageRecords.count === 0){
          // console.log('formattedArticleData', formattedArticleData);
          let referenceRecordStatus = `embedded image not found in index, publishing a new record for: ${formattedArticleData[0].article.imageCaptionList[i]}`;
          referencedRecords.push(referenceRecordStatus);
          const basic = formattedEmbeddedImages[i].basic
          const image = formattedEmbeddedImages[i].image
          const url = formattedEmbeddedImages[i].url
          const payload = [basic, image, url];
          let templates = ['basic','image', 'url'];
          makeFloDataJSON(payload, templates).then(floDataJSON => {
            delay(2000 * (i)).then(waiting => { console.log(`delay for image ${i}:`, (2000 * (i)))
              getSignedP64FloData(floDataJSON, wif).then(signedP64floData => {
                publishSignedOIPRecord(signedP64floData, wif, selfPublish, recordTxO).then(result => { //console.log('image record result:', result);
                  txid = (result.mpTxIDArray.length == 0) ? (result.txo.txid) : (result.mpTxIDArray[0]);
                  embeddedImageTXIDs.push(txid)
                  recordTxO.push(result.txo);
              });
            })
          })
          })  
        } else {
          let referenceRecordStatus = `OIPRef:${prevPublishedImageRecords.results[0].meta.txid} already exists for image: "${formattedArticleData[0].article.imageCaptionList[i]}"`;
          referencedRecords.push(referenceRecordStatus)
          embeddedImageOIPRef = prevPublishedImageRecords.results[0].meta.txid;
          embeddedImageTXIDs.push(embeddedImageOIPRef);
        }
      })
      }
    } else {
      console.log('there are no embedded images to publish');
    }
    await delay(2000);
    // next we publish the text data record
    let embeddedTextTXID = [];
    searchForTextRecord(formattedTextData).then(prevPublishedTextDataRecords => {
      if(prevPublishedTextDataRecords.count === 0){
        let referenceRecordStatus = `text not found in index, publishing a new record for: ${formattedTextData[0].basic.name}`;
        referencedRecords.push(referenceRecordStatus);
        const basic = formattedTextData[0].basic
        const text = formattedTextData[0].text
        const url = formattedTextData[0].url
        const payload = [basic, text, url];
        let templates = ['basic','text', 'url'];
        makeFloDataJSON(payload, templates).then(floDataJSON => {
          getSignedP64FloData(floDataJSON, wif).then(signedP64floData => {
            publishSignedOIPRecord(signedP64floData, wif, selfPublish, recordTxO).then(result => { // console.log('text data record result:', result);
              txid = (result.mpTxIDArray.length == 0) ? (result.txo.txid) : (result.mpTxIDArray[0]);
              embeddedTextTXID = txid;
              recordTxO.push(result.txo);
            });
          })
        })
      } else {
        let referenceRecordStatus = `OIPRef:${prevPublishedTextDataRecords.results[0].meta.txid} already exists for text: "${formattedTextData[0].basic.name}"`;
        referencedRecords.push(referenceRecordStatus)
        textDataOIPRef = prevPublishedTextDataRecords.results[0].meta.txid;
        embeddedTextTXID = textDataOIPRef;
      }

    })
    await delay(2000);
    // next we publish the article data record
    let article = formattedArticleData[0].article;
    let articleTXID = [];
    const oipRefs = [{bylineWriterTXID: bylineWriterTXID,embeddedVideoTXIDs:embeddedVideoTXIDs, embeddedImageTXIDs:embeddedImageTXIDs, embeddedTextTXID:embeddedTextTXID}];
    console.log('oipRefs:', oipRefs);
    searchForArticleRecord(formattedArticleData, oipRefs, formattedEmbeddedImages, formattedEmbeddedVideos, formattedTextData).then(prevPublishedArticleRecords => {
      if(prevPublishedArticleRecords.count === 0){
        let referenceRecordStatus = `article not found in index, publishing a new record for: ${formattedArticleData[0].basic.name}`;
        referencedRecords.push(referenceRecordStatus)
        const basic = formattedArticleData[0].basic
        const url = formattedArticleData[0].url
        article.bylineWriter = bylineWriterTXID[0];
        article.videoList = embeddedVideoTXIDs
        article.imageList = embeddedImageTXIDs
        article.articleText = embeddedTextTXID
        const payload = [basic, article, url];
        let templates = ['basic','article','url'];
        makeFloDataJSON(payload, templates).then(floDataJSON => {
          getSignedP64FloData(floDataJSON, wif).then(signedP64floData => {
            publishSignedOIPRecord(signedP64floData, wif, selfPublish, recordTxO).then(result => { //console.log('article data record result:', result);
              txid = (result.mpTxIDArray.length == 0) ? (result.txo.txid) : (result.mpTxIDArray[0]);
              recordTxO.push(result.txo);
              articleTxID = txid;
              console.log(referencedRecords);
              console.log(`Record published successfully for "${formattedArticleData[0].basic.name}," TXID: ${articleTxID}`);
              res.send({
                "current time": new Date().toISOString(),
                "message": "Published Successfully",
                "article TxID": articleTxID,
                "oipRefs": oipRefs
              });
            });
          })
        })
      }
      else {
        let referenceRecordStatus = `OIPRef:${prevPublishedArticleRecords.results[0].meta.txid} already exists for article: "${formattedArticleData[0].basic.name}," not publishing anything...`
        referencedRecords.push(referenceRecordStatus)
        console.log(referenceRecordStatus)
        articleTXID = prevPublishedArticleRecords.results[0].meta.txid;
        res.send({
          "current time": new Date().toISOString(),
          "message": "Matching Article Record Already Exists",
          "Article txid": articleTXID,
          "oipRefs": oipRefs
        });
      }
    }).catch(err => {
      console.log('Error searching for article record', err);
    })
  } else {
    res.send({
      "current time": new Date().toISOString(),
      "message": "record type not supported currently"
    });
  }
});

// use this endpoint to get a record
app.get('/api/v1/getRecord/:recordID', async (req, res) => {
  const recordID = req.params.recordID;
  try{
    const record = await getRecord(recordID);
    const testIfRecord = record.results[0].record.details
      res.send({
        "currentTime": new Date().toISOString(),
        "message": "Record Found",
        "recordID": recordID,
        "record": record.results
      });
  } catch (e) {
    if (e) {
      res.send({
        "currentTime": new Date().toISOString(),
        "message": "Record Not Found",
        "recordID": recordID
      });
    }
  }
})

// use this endpoint to get a record and expand all OIPRefs in it to their full records
app.get('/api/v1/getExpandedRecord/:recordID', async (req, res) => {
  const recordID = req.params.recordID;
  try{
    const mainRecord = await getRecord(recordID);
    const bylineWriter = mainRecord.results[0].record.details.tmpl_D019F2E1.bylineWriter;
    const embeddedImages = mainRecord.results[0].record.details.tmpl_D019F2E1.imageList;
    const embeddedVideos = mainRecord.results[0].record.details.tmpl_D019F2E1.videoList;
    const articleText = mainRecord.results[0].record.details.tmpl_D019F2E1.articleText;
    bylineWriterIsRef = (Buffer.from(bylineWriter).length === 64) ? true : false;
    articleTextIsRef = (Buffer.from(articleText).length === 64) ? true : false;
    embeddedImagesIsRef = (Array.isArray(embeddedImages)) ? (Buffer.from(embeddedImages[0]).length === 64) : false;
    embeddedVideosIsRef = (Array.isArray(embeddedVideos)) ? (Buffer.from(embeddedVideos[0]).length === 64) : false;
    const txids = {
      bylineWriter: (bylineWriterIsRef) ? bylineWriter : '',
      articleText: (articleTextIsRef) ? articleText : '',
      embeddedImages: (embeddedImagesIsRef) ? embeddedImages : [],
      embeddedVideos: (embeddedVideosIsRef) ? embeddedVideos : []
    };
    const bylineWriterRecord = await getRecord(txids.bylineWriter);
    const bylineWriterResults = bylineWriterRecord.results
    const articleTextRecord = await getRecord(txids.articleText)
    const articleTextResults = articleTextRecord.results
    let videoRecords = [];
    for(let i = 0; i < txids.embeddedVideos.length; i++) {
      const video = txids.embeddedVideos[i];
      const videoRecord = await getRecord(video);
      const videoRecordResults = videoRecord.results;
      videoRecords.push(videoRecordResults);
    }
    let imageRecords = [];
    for(let i = 0; i < txids.embeddedImages.length; i++) {
      const image = txids.embeddedImages[i];
      const imageRecord = await getRecord(image);
      const imageRecordResults = imageRecord.results;
      imageRecords.push(imageRecordResults);
    }
    Object.defineProperties(mainRecord.results[0].record.details.tmpl_D019F2E1, {
      bylineWriter: {
        value: bylineWriterResults
      },
      videoList: {
        value: videoRecords
      },
      imageList: {
        value: imageRecords
      },
      articleText: {
        value: articleTextResults
      }
    });
    res.send({
        "currentTime": new Date().toISOString(),
        "message": "Record Found",
        "recordID": recordID,
        "record": mainRecord.results
    });
  } catch (e) {
    if (e) {
      res.send({
        "currentTime": new Date().toISOString(),
        "message": "Record Not Found",
        "recordID": recordID
      });
    }
  }
})