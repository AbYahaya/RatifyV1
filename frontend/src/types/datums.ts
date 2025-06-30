import { BuiltinByteString, ConStr0, ConStr1, Integer, PubKeyAddress } from "@meshsdk/core";

export type FundingGoal = ConStr0<[Integer]> | ConStr1<[Integer]>;

export type CreatorDatum = ConStr0<[
  BuiltinByteString,
  PubKeyAddress,
  Integer,
  FundingGoal,
]>;

export type BackerDatum = ConStr1<[
  BuiltinByteString,
  PubKeyAddress,
  PubKeyAddress,
]>;
