use cardano/address.{Address}

pub type RatifyMint {
  // CreatorMint: creates a campaign
  CreatorMint
  // BackerMint: backs campaign
  BackerMint
}

pub type FundingGoal {
  TimeEnd { time_end: Int }
  FundsEnd { funds_end: Int }
}

pub type CampaignDatum {
  CreatorDatum {
    campaign_id: ByteArray,
    creator_address: Address,
    current_funds: Int,
    funding_goal: FundingGoal,
  }
  BackerDatum {
    campaign_id: ByteArray,
    backer_address: Address,
    creator_address: Address,
  }
}

pub type RatifySpend {
  CancelCampaign
  WithdrawCampaignFunds
  UpdateCurrentFunds
}
