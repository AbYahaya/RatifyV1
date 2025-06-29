use aiken/collection/list
use aiken/crypto.{VerificationKeyHash}

// transaction must be signed by the vkh
pub fn is_signed(
  signatories: List<VerificationKeyHash>,
  vkh: VerificationKeyHash,
) {
  signatories |> list.has(vkh)
}
