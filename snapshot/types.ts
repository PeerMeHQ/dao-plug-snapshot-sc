import BigNumber from 'bignumber.js'

export type SnapshotCandidate = {
  address: string
  balance: string
}

export type SnapshotMember = {
  address: string
  weight: BigNumber.Value
}
