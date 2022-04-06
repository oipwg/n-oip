# N-OIP

`N-OIP`, short for Node-Open Index Protocol, is a js/node application which runs an express server hosting multiple API endpoints which accept JSON data, transforms it into OIP formatted, serialized protobuf data and publishes it to the Flo blockchain.

## Installation Instructions

Many of the dependencies involved require a verion of node past v15, but v17 is not yet fully supported, so at this time, using version 16.14.2 is recommended.

Install the application with the command:

``` $ npm install ```

## Setup API key for fcoin

`fcoin` is a Flo blockchain full node wallet. This means that it syncs and stores the entirety of the Flo blockchain; while this *does* mean that a fair amount of disk space will be needed to run `n-oip`, it also means that it does not depend on any outside server for publishing functions. Since all transactions and addresses will be fully indexed, this data currently takes just under 12 GB of disk space. On Mac's, this data will be stored at `~/.fcoin`.

You'll need to generate your own API key to provide a secure connection between the `n-oip` application and `fcoin`. You can generate this key however you'd like, but it is advised that it is unique and long enough that it is hard to guess. Once you have generated a key, store it in the `fcoin.conf` file, in the `HTTP` section at the bottom of the file (Ensure that you remove the # before it to un-comment it).

## Start the API server

Start the `n-oip` application with the command `npm run api`, which will start both `fcoin`, and the api server itself. You can also use `npm run dev`, the only difference being the level of logging that `fcoin` provides.

## API Endpoints

 * [getInfo](#getInfo)
 * [createWallet](#createWallet)
 * [getWalletBalance](#getWalletBalance)
 * [registerPublisher](#registerPublisher)
 * [publishRecord](#publishRecord)
 * [getRecord](#getRecord)
 * [getExpandedRecord](#getExpandedRecord)
 * [getPeerInfo](#getPeerInfo)

### getInfo

HTTP Request
`GET /api/v1/getInfo`

<table><thead>
<tr>
<th>Parameter</th>
<th>Description</th>
</tr>
</thead><tbody>
<tr>
<td>none</td>
<td>n/a</td>
</tr>
</tbody></table>

