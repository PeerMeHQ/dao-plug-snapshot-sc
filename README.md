# DAO Plug Snapshot Template

Plug Snapshot Template to use with PeerMe DAO smart contracts.

Contains a snapshot script for ESDT holders and a pluggable smart contract to feed PeerMe DAOs with members' voting power information.

Set the current network name in `interaction/snippets.sh`:

````bash
NETWORK_NAME="devnet" # devnet, testnet, mainnet
```

Generate admin keys:

> Don't forget to fill the admin account with some EGLD to cover transaction & deployment fees.

```bash
. ./interaction/snippets.sh && generateAdminKeys
````

Deploy the plug smart contract:

```bash
. ./interaction/snippets.sh && deploy
```

Set a token ID for snapshot:

```base
. ./interaction/snippets.sh && setEsdtIdentifier YOURTOKEN-123456
```

Register ESDT holder snapshot:

```bash
npm install
ts-node ./snapshot/register-esdt-holders-snapshot.ts devnet
```

For more details and how to integrate, please refer to our [Documentation](https://know.peerme.io/daos/plugging.html#integration).
