// Turns the raw error from a wallet or a contract into a sentence a user can act on.
// The raw message is for developers; this is for the person looking at the screen.

// Each known problem is a pattern to look for in the raw error, and the sentence to show instead.
// The first pattern that matches wins.
const KNOWN_PROBLEMS: [RegExp, string][] = [
  [/EnforcedPause|paused/i, "Registrations are paused by the administrator right now."],
  [/OwnableUnauthorizedAccount/i, "Only the administrator (the account that deployed the contracts) can do this. Pick that account."],
  [/Offender is not a registered/i, "The offender is not a registered vehicle. Register it first."],
  [/Reporter is not a registered/i, "The reporter is not a registered vehicle. Register it first."],
  [/cannot report itself/i, "A vehicle cannot report itself. Use two different pseudonyms."],
  [/Offender is already revoked|Offender already revoked/i, "That vehicle is already revoked."],
  [/Reason cannot be empty/i, "A reason is required."],
  [/Report does not exist/i, "There is no report with that number."],
  [/Report already processed/i, "That report has already been processed."],
  [/Vehicle not registered/i, "That vehicle is not registered. Register it first."],
  [/Vehicle is revoked/i, "That vehicle is revoked, so it cannot receive a license."],
  [/License ID already used/i, "That license number is already used. Choose another."],
  [/already registered/i, "That pseudonym is already registered. Choose another one."],
  [/revoked and cannot register/i, "This wallet's identity is revoked, so it cannot register a new one."],
  [/cannot be empty/i, "A pseudonym cannot be empty."],
  [/insufficient funds/i, "This wallet does not have enough ETH to pay for the transaction."],
];

// Messages that our own code wrote are already plain sentences, so they are shown as they are.
const ALREADY_PLAIN = /Cannot reach Ganache|No wallet found|not deployed on chain/i;

export function friendlyError(err: any): string {
  const raw = [err?.message, err?.cause?.message, err?.data?.message, err?.error?.message]
    .filter(Boolean)
    .join(" | ");

  const rejectedByUser = err?.code === 4001 || /user (denied|rejected)|rejected the request|ACTION_REJECTED/i.test(raw);

  if (rejectedByUser) {
    return "You rejected the transaction in your wallet. Nothing was written to the chain.";
  }

  if (ALREADY_PLAIN.test(raw)) {
    return String(err.message);
  }

  for (const [pattern, sentence] of KNOWN_PROBLEMS) {
    if (pattern.test(raw)) {
      return sentence;
    }
  }

  return raw.slice(0, 220) || "Something went wrong.";
}
