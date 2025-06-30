use aiken/collection/dict
use aiken/collection/list
use aiken/crypto.{ScriptHash, VerificationKeyHash}
use aiken/primitive/bytearray
use cardano/address.{Address, Script, VerificationKey}
use cardano/assets.{PolicyId, Value, quantity_of}
use cardano/transaction.{
  InlineDatum, Input, Output, OutputReference, Transaction, ValidityRange,
  find_input,
}
use cocktail/vodka_validity_range.{valid_after}
use ratify/constants.{backer_nft, creator_nft, creator_utxo_nft}
use ratify/types.{
  BackerDatum, BackerMint, CampaignDatum, CancelCampaign, CreatorDatum,
  CreatorMint, FundsEnd, RatifyMint, RatifySpend, TimeEnd, UpdateCurrentFunds,
  WithdrawCampaignFunds,
}
use ratify/utils.{is_signed}

validator ratify(
  admin: VerificationKeyHash,
  creator_address: Address,
  campaign_id: ByteArray,
  // utxo_ref is used to maintain a unique address for each campaign
  utxo_ref: OutputReference,
) {
  mint(redeemer: RatifyMint, policy_id: PolicyId, tx: Transaction) {
    let Transaction { mint, inputs, outputs, extra_signatories, .. } = tx

    when redeemer is {
      CreatorMint ->
        // campaign creation
        validate_creator_mint(
          policy_id,
          mint,
          extra_signatories,
          creator_address,
          campaign_id,
          utxo_ref,
          inputs,
          outputs,
        )
      BackerMint ->
        // campaign support/backing
        validate_backer_mint(
          policy_id,
          mint,
          extra_signatories,
          creator_address,
          campaign_id,
          outputs,
        )
    }
  }

  spend(
    datum: Option<CampaignDatum>,
    redeemer: RatifySpend,
    utxo: OutputReference,
    tx: Transaction,
  ) {
    let Transaction { inputs, outputs, extra_signatories, validity_range, .. } =
      tx

    expect Some(own_input) = find_input(inputs, utxo)
    expect Script(own_hash) = own_input.output.address.payment_credential

    when redeemer is {
      CancelCampaign ->
        // This is going to loop for all utxos including creator's and backer's
        validate_cancel_campaign(
          campaign_id,
          creator_address,
          own_input,
          own_hash,
          inputs,
          outputs,
          extra_signatories,
        )
      WithdrawCampaignFunds ->
        validate_withdraw_funds(
          campaign_id,
          creator_address,
          own_input,
          own_hash,
          inputs,
          outputs,
          extra_signatories,
          validity_range,
        )
      UpdateCurrentFunds ->
        validate_update_cfunds(
          admin,
          datum,
          own_input,
          extra_signatories,
          outputs,
        )
    }
  }

  else(_) {
    fail
  }
}

fn validate_creator_mint(
  policy_id: PolicyId,
  mint: Value,
  extra_signatories: List<VerificationKeyHash>,
  creator_address: Address,
  campaign_id: ByteArray,
  utxo_ref: OutputReference,
  inputs: List<Input>,
  outputs: List<Output>,
) {
  // get the mint info
  expect [Pair(nft_name, nft_quantity),
    Pair(asset_name, quantity)] =
    mint |> assets.tokens(policy_id) |> dict.to_pairs

  // transaction must mint creator NFT
  let is_mint_valid = and {
      asset_name == bytearray.concat(creator_nft, campaign_id),
      quantity == 1,
    }

  // creator NFT must go to creator's address
  expect Some(_creator_output) =
    list.find(
      outputs,
      fn(output) { quantity_of(output.value, policy_id, asset_name) == 1 },
    )

  // Only one creator UTxO should be going to the validator
  expect [creator_utxo] =
    list.filter(
      outputs,
      fn(output) { output.address.payment_credential == Script(policy_id) },
    )

  // creator utxo must contain the right datum
  expect InlineDatum(creator_datum_data) = creator_utxo.datum
  expect CreatorDatum {
    campaign_id: datum_campaign_id,
    creator_address: datum_creator_address,
    ..
  } = creator_datum_data

  // transaction must mint creator UTxO NFT and creator utxo must contain the NFT
  let is_cnft_correct = and {
      nft_name == creator_utxo_nft,
      nft_quantity == 1,
      quantity_of(creator_utxo.value, policy_id, nft_name) == 1,
    }

  // creator must provide a utxo
  expect Some(creator_input) = find_input(inputs, utxo_ref)
  expect VerificationKey(creator_vkh) =
    creator_input.output.address.payment_credential

  and {
    is_mint_valid?,
    is_cnft_correct?,
    // creator address provided as a parameter must be the same as the creator address in the creator utxo datum
    //  and must the same as the provider of the utxo_ref input
    and {
      (creator_address == datum_creator_address)?,
      (creator_address == creator_input.output.address)?,
    },
    // campaign id in creator datum must be the same as the one in the validator parameter
    (campaign_id == datum_campaign_id)?,
    // the creator must sign the transaction
    is_signed(extra_signatories, creator_vkh),
  }
}

fn validate_backer_mint(
  policy_id: PolicyId,
  mint: Value,
  extra_signatories: List<VerificationKeyHash>,
  creator_address: Address,
  campaign_id: ByteArray,
  outputs: List<Output>,
) {
  // get the mint info
  expect [Pair(asset_name, quantity)] =
    mint |> assets.tokens(policy_id) |> dict.to_pairs

  // transaction must mint backer NFT
  let is_mint_valid = and {
      asset_name == bytearray.concat(backer_nft, campaign_id),
      quantity == 1,
    }

  // backer NFT must go to backer's address
  expect Some(backer_output) =
    list.find(
      outputs,
      fn(output) { quantity_of(output.value, policy_id, asset_name) == 1 },
    )
  expect VerificationKey(backer_vkh) = backer_output.address.payment_credential

  // Only one backer UTxO should be going to the validator
  expect Some(backer_utxo) =
    list.find(
      outputs,
      fn(output) { output.address.payment_credential == Script(policy_id) },
    )

  // backer utxo must contain the right datum
  expect InlineDatum(backer_datum_data) = backer_utxo.datum
  expect BackerDatum {
    campaign_id: datum_campaign_id,
    creator_address: datum_creator_address,
    backer_address: datum_backer_address,
  } = backer_datum_data

  and {
    is_mint_valid?,
    // creator address parameterized must be equal to creator address in Backer datum
    (creator_address == datum_creator_address)?,
    // backer address in datum must be the one the receipt is going to
    (backer_output.address == datum_backer_address)?,
    // campaign id in backer datum must be the same as the one in the validator parameter
    (campaign_id == datum_campaign_id)?,
    // the backer must sign the transaction
    is_signed(extra_signatories, backer_vkh),
  }
}

fn validate_cancel_campaign(
  campaign_id: ByteArray,
  creator_address: Address,
  own_input: Input,
  own_hash: ScriptHash,
  inputs: List<Input>,
  outputs: List<Output>,
  extra_signatories: List<VerificationKeyHash>,
) {
  // find the creator utxo
  expect Some(creator_utxo_in) =
    list.find(
      inputs,
      fn(input) {
        and {
          input.output.address.payment_credential == Script(own_hash),
          when input.output.datum is {
            InlineDatum(datum_data) ->
              if datum_data is CreatorDatum { .. }: CampaignDatum {
                True
              } else {
                False
              }
            _ -> False
          },
        }
      },
    )

  expect InlineDatum(creator_datum_data) = creator_utxo_in.output.datum
  expect CreatorDatum {
    campaign_id: datum_campaign_id,
    creator_address: datum_creator_address,
    ..
  } = creator_datum_data
  expect VerificationKey(creator_vkh) = creator_address.payment_credential

  // Checks if the current input the spend contract is handling is a backer utxo in
  // then validate the refund to the backer if it's a backer utxo
  expect InlineDatum(own_input_datum) = own_input.output.datum
  let is_backer_refunded =
    if own_input_datum
    is BackerDatum {
      campaign_id: b_datum_campaign_id,
      creator_address: b_datum_creator_address,
      backer_address,
    }: CampaignDatum {
      validate_backer_refund(
        own_input,
        backer_address,
        campaign_id,
        creator_address,
        b_datum_campaign_id,
        b_datum_creator_address,
        outputs,
      )
    } else {
      True
    }

  and {
    is_backer_refunded?,
    // creator address must be the same with creator utxo in creator address
    (creator_address == datum_creator_address)?,
    // campaign id in creator utxo in datum must be the same as the one in the validator parameter
    (campaign_id == datum_campaign_id)?,
    // creator must sign the transaction
    is_signed(extra_signatories, creator_vkh)?,
  }
}

fn validate_backer_refund(
  own_input: Input,
  backer_address: Address,
  campaign_id: ByteArray,
  creator_address: Address,
  b_datum_campaign_id: ByteArray,
  b_datum_creator_address: Address,
  outputs: List<Output>,
) {
  // backer utxo in must be refunded to backer's address
  expect Some(_backer_refund) =
    list.find(
      outputs,
      fn(output) {
        and {
          output.value == own_input.output.value,
          output.address == backer_address,
        }
      },
    )

  // The validation below is done to prevent spending another campaign's backer UTxO
  and {
    // creator address must be the same with backer utxo in creator address
    (creator_address == b_datum_creator_address)?,
    // campaign id in backer utxo in datum must be the same as the one in the validator parameter
    (campaign_id == b_datum_campaign_id)?,
  }
}

fn validate_withdraw_funds(
  campaign_id: ByteArray,
  creator_address: Address,
  own_input: Input,
  own_hash: ScriptHash,
  inputs: List<Input>,
  outputs: List<Output>,
  extra_signatories: List<VerificationKeyHash>,
  validity_range: ValidityRange,
) {
  // find the creator utxo
  expect Some(creator_utxo_in) =
    list.find(
      inputs,
      fn(input) {
        and {
          input.output.address.payment_credential == Script(own_hash),
          when input.output.datum is {
            InlineDatum(datum_data) ->
              if datum_data is CreatorDatum { .. }: CampaignDatum {
                True
              } else {
                False
              }
            _ -> False
          },
        }
      },
    )

  expect InlineDatum(creator_datum_data) = creator_utxo_in.output.datum
  expect CreatorDatum {
    campaign_id: datum_campaign_id,
    creator_address: datum_creator_address,
    funding_goal,
    current_funds,
  } = creator_datum_data

  expect VerificationKey(creator_vkh) = creator_address.payment_credential

  // All utxo inputs must go to the creator's address
  expect Some(_creator_output) =
    list.find(
      outputs,
      fn(output) {
        and {
          output.value == own_input.output.value,
          output.address == creator_address,
        }
      },
    )

  // time must have elapsed or funding goal must have been reached before the creator is allowed to withdraw
  let is_eligible_to_withdraw =
    when funding_goal is {
      TimeEnd { time_end } -> valid_after(validity_range, time_end)?
      FundsEnd { funds_end } -> (current_funds >= funds_end)?
    }

  and {
    is_eligible_to_withdraw?,
    // creator address must be the same with backer utxo in creator address
    (creator_address == datum_creator_address)?,
    // campaign id in backer utxo in datum must be the same as the one in the validator parameter
    (campaign_id == datum_campaign_id)?,
    // creator must sign the transaction
    is_signed(extra_signatories, creator_vkh)?,
  }
}

fn validate_update_cfunds(
  admin: VerificationKeyHash,
  datum: Option<CampaignDatum>,
  own_input: Input,
  extra_signatories: List<VerificationKeyHash>,
  outputs: List<Output>,
) {
  expect Some(CreatorDatum {
    campaign_id: old_campaign_id,
    creator_address: old_creator_address,
    current_funds: old_current_funds,
    funding_goal: old_funding_goal,
  }) = datum

  // find the updated creator utxo
  expect [updated_creator_utxo] =
    list.filter(
      outputs,
      fn(output) { output.address == own_input.output.address },
    )

  // get the updated creator utxo datum
  expect InlineDatum(creator_datum_data) = updated_creator_utxo.datum
  expect CreatorDatum {
    campaign_id,
    creator_address,
    current_funds,
    funding_goal,
  } = creator_datum_data

  and {
    // only the current funds in creator datum must change. And it has to be greater
    and {
      (old_campaign_id == campaign_id)?,
      (old_creator_address == creator_address)?,
      (current_funds > old_current_funds)?,
      (old_funding_goal == funding_goal)?,
    },
    // Value must not change in the UTxO, including the creator utxo NFT
    (own_input.output.value == updated_creator_utxo.value)?,
    // admin must sign the transaction
    is_signed(extra_signatories, admin)?,
  }
}
