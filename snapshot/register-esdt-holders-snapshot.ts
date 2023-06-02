import path from 'path'
import { getArg } from './helpers'
import BigNumber from 'bignumber.js'
import fs, { readFileSync } from 'fs'
import { UserSigner } from '@multiversx/sdk-wallet'
import { SnapshotCandidate, SnapshotMember } from './types'
import { ApiNetworkProvider, ProxyNetworkProvider, DefinitionOfFungibleTokenOnNetwork } from '@multiversx/sdk-network-providers'
import {
  Account,
  Address,
  Transaction,
  AddressValue,
  BigUIntValue,
  ContractFunction,
  ContractCallPayloadBuilder,
} from '@multiversx/sdk-core'

const AdminPem = 'admin.pem'

const main = async () => {
  const env = getArg(0)
  const mxpyConfig = await loadMxpyConfig()
  const apiUrl = mxpyConfig[env]['api']
  const proxyUrl = mxpyConfig[env]['proxy']
  const tokenId = mxpyConfig[env]['esdt-id']
  const scAddress = mxpyConfig[env]['contract-address']

  if (!env || !tokenId || !scAddress || !apiUrl || !proxyUrl) {
    console.log(`invalid '${env}' config`)
    return
  }

  const apiProvider = new ApiNetworkProvider(apiUrl, { timeout: 30000 })
  const proxyProvider = new ProxyNetworkProvider(proxyUrl, { timeout: 30000 })
  const tokenDefinition = await apiProvider.getDefinitionOfFungibleToken(tokenId)
  const candidates = await getTokenAccounts(apiProvider, tokenId)

  console.log(`found ${candidates.length} candidates ...`)

  const members: SnapshotMember[] = candidates.map((candidate) => ({
    address: candidate.address,
    weight: candidate.balance,
  }))

  const registerTx = await registerSnapshotInContract(proxyProvider, scAddress, tokenDefinition, members)

  console.log(`done! snapshot of ${members.length} members registered with tx '${registerTx.getHash()}'`)
}

export const loadMxpyConfig = async () => {
  const storagePath = path.join(__dirname, '..', 'mxpy.data-storage.json')
  const storageContents = readFileSync(storagePath, { encoding: 'utf8' })

  return JSON.parse(storageContents)
}

const getTokenAccounts = async (provider: ApiNetworkProvider, tokenId: string): Promise<SnapshotCandidate[]> =>
  await provider.doGetGeneric(`tokens/${tokenId}/accounts?size=10000`)

export const getAdminSigner = async () => {
  const pemWalletPath = path.join(__dirname, '..', 'wallets', AdminPem)
  const pemWalletContents = await fs.promises.readFile(pemWalletPath, {
    encoding: 'utf8',
  })
  return UserSigner.fromPem(pemWalletContents)
}

export const registerSnapshotInContract = async (
  provider: ProxyNetworkProvider,
  scAddress: string,
  tokenDefinition: DefinitionOfFungibleTokenOnNetwork,
  entries: SnapshotMember[]
) => {
  const signer = await getAdminSigner()
  const account = new Account(signer.getAddress())
  const accountOnNetwork = await provider.getAccount(account.address)
  const networkConfig = await provider.getNetworkConfig()
  account.update(accountOnNetwork)

  const payload = entries
    .reduce((carry, entry) => {
      const displayableTokenAmount = new BigNumber(entry.weight).shiftedBy(-tokenDefinition.decimals).toString()
      console.log(`ADDRESS: ${entry.address} | AMOUNT: ${displayableTokenAmount}`)
      return carry.addArg(new AddressValue(Address.fromBech32(entry.address))).addArg(new BigUIntValue(entry.weight))
    }, new ContractCallPayloadBuilder().setFunction(new ContractFunction('registerMembersSnapshot')))
    .build()

  const computedGasLimit = 50_000_000 + (networkConfig.GasPerDataByte + 10_000) * payload.length()

  const tx = new Transaction({
    data: payload,
    gasLimit: computedGasLimit,
    receiver: new Address(scAddress),
    value: 0,
    sender: account.address,
    chainID: networkConfig.ChainID,
  })

  tx.setNonce(account.nonce)

  const signature = await signer.sign(tx.serializeForSigning())
  tx.applySignature(signature)

  account.incrementNonce()

  console.log(`registering ${entries.length} snapshot entries in 10s in smart contract ...`)
  await new Promise((r) => setTimeout(r, 10000))

  await provider.sendTransaction(tx)

  return tx
}

main()
