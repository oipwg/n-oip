# N-OIP

`N-OIP`, short for Node-Open Index Protocol, is a js/node application which runs an express server hosting multiple API endpoints which accept JSON data, transforms it into OIP formatted, serialized protobuf data and publishes it to the Flo blockchain.

## Installation Instructions

Many of the dependencies involved require a verion of node past v15, but v17 is not yet fully supported, so at this time, using version 16.14.2 is recommended.

Install the application with the command:

``` $ npm install ```

## Setup package.json

`fcoin` is a Flo blockchain wallet, with the ability to run either a full node or a lite node (SPV). A full node means that it syncs and stores the entirety of the Flo blockchain; while this *does* mean that a fair amount of disk space will be needed, it also means that it does not depend on any outside server for publishing functions. Since all transactions and addresses will be fully indexed, this data currently takes just under 12 GB of disk space. Alternatively, fcoin can be run as a lite node, which uses SPV, or Simple Payment Verification, in which case only the headers of the blockchain will be downloaded. At this time, this data currently takes just over 2 GB of disk space.

Your `package.json` file will contain one script for each of these modes, titled `liteNode` and `fullNode`. This is where the location of the blockchain data for each mode is set, marked with the key `--prefix`, the default is usually inside the home folder.

## Setup wallet.conf

The application will look at the location of the blockchain data, as set within the `package.json`, for a file called `wallet.conf`. This file can be used to set a variety of preferences for the blockchain node - most will only be relevant to advanced users, but all users will need to set three parameters, the `prefix`, `http-port` and `api-key`. `prefix` should be the same disk location set in the `package.json`.

A sample wallet.conf is provided as part of this GitHub repo, titled `sample_wallet.conf`

## Setup API key for fcoin

You'll need to generate your own API key to provide a secure connection between the `n-oip` application and `fcoin`. You can generate this key however you'd like, but it is advised that it is unique and long enough that it is hard to guess. Once you have generated a key, store it in the `wallet.conf` file, and an `.env` file.

## Setup .env file

You'll have a sample file as part of the GitHub repo called `env`. Please fill in your apiKey and then rename it to `.env`

In addition to being where you can change your apiPort and designate the addresses for your OIP records API and a publishing sponsor, this file is also where your publishing wallet email (or wallet ID) and passphrase will be kept once you have [created a wallet](#createWallet).

## Start the API server

Start the `n-oip` application with the commands `npm run liteNode` or `npm runfullNode`, which will start both `fcoin`, and the api server itself.

<!-- ## Note about wallet IDs

By default, wallet IDs will be derived by finding the SHA1 hash of an email address. However, if you wish to use some other value for wallet IDs, simply provide `id` instead of `emailaddress`. If you provide values for *both*, a check will run to confirm that the `id` is derived from the `emailaddress` and if it isn't, you'll receive an error. If, however, you only provide an `id`, it will be used. -->

## API Endpoints

 * [getInfo](#getinfo)
 * [getPeerInfo](#getpeerinfo)
 * [createWallet](#createwallet)
 * [getWalletInfo](#getwalletinfo)
 * [getWIF](#getwif)	
 * [registerPublisher](#registerpublisher)
 * [publishRecord](#publishrecord)
 * [getRecord](#getrecord)
 * [getExpandedRecord](#getexpandedrecord)
 
### getInfo

**HTTP Request**

`GET /api/v1/getInfo`

Retrieve information about the current state of the server.

**Query Parameters**

None.

**Response**

A JSON array containing an object with the following properties:

- `currentTime`: A string representation of the current time in ISO 8601 format.
- `progress`: An object describing the progress of the server's chain synchronization.
- `synced`: A boolean indicating whether the server's chain is fully synced.
- `info`: An object containing miscellaneous information about the server.
- `error`: If an error occurred while retrieving the info, this will contain a string description of the error. If no error occurred, this property will be absent.

**Example**

*JSON result*

```json highlight=json
[  
  {
    "currentTime": "2022-12-08T22:35:45.842Z",
    "api": {
      "mode": "liteNode",
      "allowSponsoredPublishing": true,
      "publishingSponsorAddress": "http://127.0.0.1:7500"
    },
    "blockchain": {
      "synced": true,
      "progress": "100%"
    },
    "publisher": {
      "userid": "user@email.com",
      "walletid": "2985f7a35e87e4ab65e12e2089a4d5a0ca7a95b1",
      "pubkey": "FS4d297zLn2uKcmX92iPN2QGUfDZM26vMg",
      "name": "frank34",
      "balance": 1.7995758
    },
    "walletclient": {
      "version": "1.1.6",
      "network": "main",
      "chain": {
        "height": 5829994,
        "tip": "cb396ead73fc212a27d83efc337e6d4132fedbe0c0303c045b0ded0644e37e85",
        "progress": 1
      },
      "indexes": {
        "addr": {
          "enabled": false,
          "height": 0
        },
        "tx": {
          "enabled": false,
          "height": 0
        }
      },
      "pool": {
        "host": "2001:0db8:85a3:0000:0000:8a2e:0370:7334",
        "port": 7312,
        "agent": "/fcoin:1.1.6/",
        "services": "1000",
        "outbound": 8,
        "inbound": 0
      },
      "mempool": {
        "tx": 0,
        "size": 0
      },
      "time": {
        "uptime": 688,
        "system": 1670538945,
        "adjusted": 1670538945,
        "offset": 0
      },
      "memory": {
        "total": 126,
        "jsHeap": 14,
        "jsHeapTotal": 15,
        "nativeHeap": 110,
        "external": 9
      }
    }
  }
]
```

<!-- ```json highlight=json
GET /api/v1/getInfo

HTTP 200 OK
Content-Type: application/json

[
  {
    "currentTime": "2022-01-01T12:34:56.789Z",
    "progress": {
      "current": 100,
      "highest": 100
    },
    "synched": true,
    "info": {
      "version": "1.0.0",
      "uptime": 3600
    }
  }
]
``` -->


<!-- **Errors**

- `500 Internal Server Error`: An error occurred while attempting to retrieve the info. The error message will be returned in the `error` property of the response object. -->














<!-- *HTTP Request*

`GET /api/v1/getInfo`

*JSON result*

```json highlight=json
[  
  {
    "currentTime": "2022-12-08T22:35:45.842Z",
    "progress": "100 %",
    "synched": true,
    "info": {
      "version": "1.1.6",
      "network": "main",
      "chain": {
        "height": 5829994,
        "tip": "cb396ead73fc212a27d83efc337e6d4132fedbe0c0303c045b0ded0644e37e85",
        "progress": 1
      },
      "indexes": {
        "addr": {
          "enabled": false,
          "height": 0
        },
        "tx": {
          "enabled": false,
          "height": 0
        }
      },
      "pool": {
        "host": "2001:0db8:85a3:0000:0000:8a2e:0370:7334",
        "port": 7312,
        "agent": "/fcoin:1.1.6/",
        "services": "1000",
        "outbound": 8,
        "inbound": 0
      },
      "mempool": {
        "tx": 0,
        "size": 0
      },
      "time": {
        "uptime": 688,
        "system": 1670538945,
        "adjusted": 1670538945,
        "offset": 0
      },
      "memory": {
        "total": 126,
        "jsHeap": 14,
        "jsHeapTotal": 15,
        "nativeHeap": 110,
        "external": 9
      }
    }
  }
]
``` -->
<hr>

### getPeerInfo

**HTTP Request**

`GET /api/v1/getPeerInfo`

Retrieve information about the current state of the server's peer connections.

**Query Parameters**

None.

**Response**

A JSON array containing an object with the following properties:

- `currentTime`: A string representation of the current time in ISO 8601 format.
- `peers`: An integer representing the number of connected peers.
- `peerInfo`: An array of objects, each representing a connected peer and containing information about that peer.
- `error`: If an error occurred while retrieving the peer information, this will contain a string description of the error. If no error occurred, this property will be absent.

**Example**

*JSON result*

```json highlight=json
[
  {
    "currentTime": "2022-12-08T22:51:56.494Z",
    "peers": 8,
    "peerInfo": [
      {
        "id": 1,
        "addr": "83.221.211.116:7312",
        "addrlocal": "71.84.25.141:58288",
        "name": "116.211.221.83.donpac.ru",
        "services": "0000000d",
        "relaytxes": true,
        "lastsend": 1670539907,
        "lastrecv": 1670539907,
        "bytessent": 65934,
        "bytesrecv": 24372,
        "conntime": 1659,
        "timeoffset": 0,
        "pingtime": 0.236,
        "minping": 0.213,
        "version": 70015,
        "subver": "/FLOCore:0.15.2.1/",
        "inbound": false,
        "startingheight": 5829978,
        "besthash": "74e0a97655e03b353369ff447f3e554ab8e20f8351d1df15276916beca48b8c4",
        "bestheight": 5830011,
        "banscore": 0,
        "inflight": [],
        "whitelisted": false
      },
      ...
    ]
  }
]
```

<hr>

### createWallet

**HTTP Request**

`POST /api/v1/createWallet`

**Query Parameters**

None.

**Query Headers**

<table><thead>
<tr>
<th>key</th>
<th>Description</th>
<th>Example Value</th>
</tr>
</thead><tbody>
<tr>
<td>userid</td>
<td>string. The user's unique identifier. commonly an email address. SHA1 hash of this value will be used as Wallet ID</td>
<td>user@email.com</td>
</tr>
<tr>
<td>passphrase</td>
<td>string. used to encrypt wallet file. note, an unencrypted wallet will be created if this is left empty, which is strongly disadvised.</td>
<td>passphrase</td>
</tr>
<!-- <th colspan="3">optional</th> -->
</tr>
<tr>
<td>mnemonic</td>
<td>BIP39 mnemonic, 12 or 24 words</td>
<td>lava exotic column thumb river cause riot asthma summer gain vital captain</td>
</tr>
</tbody></table>

**Response**

A JSON array containing an object with the following properties:

- `currentTime`: A string representation of the current time in ISO 8601 format
- `result`: The outcome of the API call
- `userID`: The user's unique identifier. commonly an email address
- `walletID`: A unique identifier for the wallet, derived as a SHA1 hash of userID
- `pubKey`: The wallet's public key
- `privKey`: The wallet's private key
- `encrypted`: A boolean indicating whether the wallet is encrypted
- `mnemonic`: A mnemonic phrase associated with the wallet for recovery purposes
- `walletinfo`: An object containing detailed information about the wallet
- `error`: If an error occurred while retrieving the peer information, this will contain a string description of the error. If no error occurred, this property will be absent.

**Example**

*JSON results*

```json highlight=json
[
  {
    "currentTime": "2022-12-08T23:02:17.856Z",
    "result": "Wallet Created Successfully",
    "userID": "user@email.com",
    "walletID": "36687c352204c27d9e228a9b34d00c8a1d36a000",
    "pubKey": "FTfErzZSVU6wLN3xZWJRKjgyLKVe7BJz8R",
    "privKey": "RG1nWtzYKwxGtkQdVwbtLCQH7y1AtbPXmE9ouaen9yx9nMWmzwTf",
    "encrypted": true,
    "mnemonic": "lava exotic column thumb river cause riot asthma summer gain vital captain",
    "walletinfo": {
      "network": "main",
      "wid": 163,
      "id": "36687c352204c27d9e228a9b34d00c8a1d36a000",
      "watchOnly": false,
      "accountDepth": 1,
      "token": "c40120f37d30f709bd9325e98d6a545c294ebbf9e416dd440108c08a88e3acf6",
      "tokenDepth": 0,
      "master": {
        "encrypted": true,
        "until": 1670540597,
        "iv": "8940f305e4927cc0128d8b6354faa497",
        "algorithm": "pbkdf2",
        "n": 50000,
        "r": 0,
        "p": 0
      },
      "balance": {
        "tx": 0,
        "coin": 0,
        "unconfirmed": 0,
        "confirmed": 0
      }
    }
  }
]
```	

<hr>

### getWalletInfo

**HTTP Request**

`POST /api/v1/getWalletInfo`

**Query Parameters**

None.

**Query Headers**

<table><thead>
<tr>
<th>key</th>
<th>Description</th>
<th>Example Value</th>
</tr>
</thead><tbody>
<!-- <th colspan="3">optional</th> -->
</tr>
<tr>
<td>userid</td>
<td>string or email address used to derive the walletid</td>
<td>user@email.com</td>
</tr>
<tr>
<td>walletid</td>
<td>walletid. only used if userid is not provided</td>
<td>36687c352204c27d9e228a9b34d00c8a1d36a000</td>
</tr>
</tbody></table>

**Response**

A JSON array containing an object with the following properties:

- `currentTime`: A string representation of the current time in ISO 8601 format
- `walletID`: A unique identifier for the wallet, derived as a SHA1 hash of userID
- `pubKey`: The wallet's public key
- `balance`: A decimal number representing the balance in the wallet
- `encrypted`: A boolean indicating whether the wallet is encrypted
- `info`: An object containing detailed information about the wallet
- `error`: If an error occurred while retrieving the peer information, this will contain a string description of the error. If no error occurred, this property will be absent.

*JSON results*

```json highlight=json
[
  {
    "currentTime": "2023-01-20T00:55:55.608Z",
    "walletID": "2985f7a35e87e4ab65e12e2089a4d5a0ca7a95b1",
    "pubKey": "FEu4YVqb1f7bfeZPaHjboddubsAwTCh2FV",
    "balance": "2.59866680",
    "info": {
      "network": "main",
      "wid": 163,
      "id": "2985f7a35e87e4ab65e12e2089a4d5a0ca7a95b1",
      "watchOnly": false,
      "accountDepth": 1,
      "token": "c40120f37d30f709bd9325e98d6a545c294ebbf9e416dd440108c08a88e3acf6",
      "tokenDepth": 0,
      "master": {
        "encrypted": true,
        "until": 0,
        "iv": "8940f305e4927cc0128d8b6354faa497",
        "algorithm": "pbkdf2",
        "n": 50000,
        "r": 0,
        "p": 0
      },
      "balance": {
        "tx": 24,
        "coin": 2,
        "unconfirmed": 259866680,
        "confirmed": 259866680
      }
    }
  }
]
```

<hr>

### getWIF

**HTTP Request**

`POST /api/v1/getWIF`

**Query Parameters**

None.

**Query Headers**

<table><thead>
<tr>
<th>key</th>
<th>Description</th>
<th>Example Value</th>
</tr>
</thead><tbody>
<tr>
<td>userid</td>
<td>string or email address used to derive the walletid</td>
<td>user@email.com</td>
</tr>
<tr>
<td>passphrase</td>
<td>passphrase for this wallet</td>
<td>passphrase</td>
</tr>
<th colspan="3">optional</th>
</tr>
<tr>
<td>walletid</td>
<td>walletid. only used if userid is not provided</td>
<td>36687c352204c27d9e228a9b34d00c8a1d36a000</td>
</tr>
<tr>
<td>pubkey</td>
<td>public key paired with private key you're looking for. if unspecified, the first address in the wallet will be used</td>
<td>FTfErzZSVU6wLN3xZWJRKjgyLKVe7BJz8R</td>
</tr>
</tbody></table>

**Response**

A JSON array containing an object with the following properties:

- `currentTime`: A string representation of the current time in ISO 8601 format
- `walletID`: A unique identifier for the wallet, derived as a SHA1 hash of userID
- `pubKey`: The wallet's public key
- `privKey`: The wallet's private key

*JSON results*

```json highlight=json
[
  {
    "currentTime": "2022-12-08T23:41:55.015Z",
    "walletID": "f7a36129f691baa1201d963b8537eb69caa28863",
    "pubKey": "FTfErzZSVU6wLN3xZWJRKjgyLKVe7BJz8R",
    "wif": "RG1nWtzYKwxGtkQdVwbtLCQH7y1AtbPXmE9ouaen9yx9nMWmzwTf"
  }
]
```
<hr>

### registerPublisher

**HTTP Request**

`POST /api/v1/publishOIPRecord`

**Query Parameters**

None.

**Query Headers**

<table><thead>
<tr>
<th>key</th>
<th>Description</th>
<th>Example Value</th>
</tr>
</thead><tbody>
<tr>
<td>userid</td>
<td>string or email address used to derive the walletid. commonly an email address. SHA1 hash of this value will be used as Wallet ID</td>
<td>user@email.com</td>
</tr>
<tr>
<td>passphrase</td>
<td>passphrase for this wallet</td>
<td>passphrase</td>
</tr>
<tr>
<td>recordtype</td>
<td>string specifying what kind of record is to be published. to register a new publisher, the value "publisher-registration" should be used</td>
<td>publisher-registration</td>
</tr>
<th colspan="3">optional</th>
</tr>
<tr>
<td>pubkey</td>
<td>public key from the user's wallet that should be used to publish the record. if no value is specified (here or in the .env file), the first address in the wallet will be used</td>
<td>FS4d297zLn2uKcmX92iPN2QGUfDZM26vMg</td>
</tr>

<tr>
<td>selfpublish</td>
<td>boolean value specifying whether registration message should be published by this node, or relayed to designated publishingsponsor. assumed to be true if a value is not provided</td>
<td>true</td>
</tr>
</tbody></table>

JSON body

```[{"emailaddress":"user@host.tld", "passphrase": "passphrase"},{"pubKey":"publickeyaddress","name": "publishername"}]```

### getRecord

HTTP Request

`GET /api/v1/getRecord/:recordId`

<table><thead>
<tr>
<th>Parameter</th>
<th>Description</th>
</tr>
</thead><tbody>
<tr>
<td>recordId</td>
<td>TXID of the Record</td>
</tr>
</tbody></table>

### getExpandedRecord

HTTP Request

`GET /api/v1/getExpandedRecord/:recordId`

<table><thead>
<tr>
<th>Parameter</th>
<th>Description</th>
</tr>
</thead><tbody>
<tr>
<td>recordId</td>
<td>TXID of the Record</td>
</tr>
</tbody></table>
