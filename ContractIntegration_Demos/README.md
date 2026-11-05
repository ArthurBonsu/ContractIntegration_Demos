# Smart-contract integration: four demos

A small Next.js project that calls the **real** vehicle, revocation and license contracts and draws the
**receipt** that comes back. Four demos, one page each:

| Page | Demo | Contract call | What the receipt shows |
|---|---|---|---|
| `/register` | **1 Register a vehicle** | `VehicleRegistry.registerVehicle(pseudonym)` | pseudonym, owner, block, gas used, time, transaction hash |
| `/revoke` | **2 Revoke a vehicle** | `RevocationManager.submitRevocationReport(...)`, then `processRevocation(reportId)` | a *Report Submitted* receipt (report number, offender, reporter, reason), then a *Vehicle Revoked* receipt |
| `/license` | **3 Issue a license** | `LicenseRegistry.issueLicense(id, vehicle, type, days)` | license number, vehicle, type, expiry date, block, gas, hash |
| `/vehicles` | **4 The vehicle registry page** | `VehicleRegistry.registerVehicle`, `getVehicle` and the `VehicleRegistered` event | the same receipt as Demo 1, now from a component |

Demos 1 to 3 are one page each, with everything visible in a single file. **Demo 4 is the same registration built the way a real front end is
built**: a page that is made of components. Every demo follows the same three beats, which is the whole lesson:

1. **Write.** The page builds a contract call and an account signs and sends it (`utils/tx.ts`).
2. **Receipt.** The page builds the receipt from the transaction and from the event the contract emitted.
3. **Read back.** The page asks the chain again (a free read) to prove the chain agrees.

Same stack as the class app: Next.js 14 (pages router), React 18, TypeScript, web3.js v4. The configuration is taken
from the main project (ClassTryout): its `tsconfig.json`, dependency versions, `truffle-config.js`, contracts,
migrations and contract interfaces.

## Run it

You need Node 18 or newer. Open **three terminals** in this folder:

```bash
npm install            # once
npm run chain          # terminal 1: a local blockchain (Ganache, port 7545). Leave it running.
npm run deploy:local   # terminal 2: puts the three contracts on it. Run once per chain start.
npm run dev            # terminal 3: the web app, at http://localhost:3000
```

Open http://localhost:3000. The bar under the menu shows the chain, the account and whether the contracts were found
(green *contracts found*). That is all: **no wallet extension is needed.** On "Local Ganache" the page uses Ganache's
own unlocked accounts, picked from the drop-down in the bar. Account **#0 deployed the contracts, so it is the
administrator** (it is the one allowed to turn a report into a revocation).

Stopping the chain erases it. Next time, run `npm run chain` and `npm run deploy:local` again.

### With MetaMask instead

Choose the **MetaMask** tab, then Connect Wallet. Add the local network in MetaMask first (RPC
`http://127.0.0.1:7545`, chain id 1337) and import a Ganache account (the private keys are printed by
`npm run chain`). The page then asks MetaMask to sign each transaction.

### On Sepolia (a public test network)

`utils/deployments.json` already lists the main project's Sepolia deployment. Put MetaMask on Sepolia and connect:
reads work at once and writes need a little Sepolia test ETH. Revoking needs the account that deployed those
contracts, so on Sepolia that step only works for their owner.

## How to teach it (about 45 minutes)

Use it with the Week 9 slides *Integrating a Smart Contract With the Front End*, *Step 1: Connect the Wallet and Load
the Contracts*, *Steps 2 and 3: Read From and Write to the Chain*, *Step 4: Show Progress, Success and Failure* and
*When the Integration Does Not Work*.

| Time | Do | Slide idea it proves |
|---|---|---|
| 0:00 | Start page: read the *Setup check* aloud. Switch the account in the bar. | Step 1: connect, and know which chain and account you are using |
| 0:10 | **Demo 1.** Register a vehicle. Point at each line of the receipt, then the *Read back* box. Press Register again: the contract refuses and the page explains. | Write, receipt, read back; failure is a normal screen |
| 0:25 | **Demo 2.** Press *Register both*, *Submit report* (nothing is revoked yet), then *Revoke*. Now pick account #1 and try to revoke: refused. | Two contracts cooperating; permissions are enforced by the contract, not the page |
| 0:35 | **Demo 3.** Issue a license for the vehicle you registered. Then try the revoked offender, then a name that does not exist. | One contract reading another's data; every rule that fails gets a human message |

**Demo 4 (about 15 minutes).** Open `pages/vehicles.tsx` first: it is short, and each part of the screen is one component.

| Time | Do | Idea it proves |
|---|---|---|
| 0:45 | Show the page file, then the three components it uses. Register a vehicle: the receipt appears inside the form, the look-up box fills itself in, and the list gains a line. | A page composes components; props go down, events go up |
| 0:52 | Open `utils/vehicleActions.ts`: the write, the read and the events are three plain functions. Components never touch the contract directly. | Keep chain calls out of the components |
| 0:57 | Ask: *the event stores the name only as a hash (the contract says `indexed`). How does the list still show the name?* Answer: the name is in the transaction's input, which `nameOfRegistration` reads. | What an event does and does not carry |

Questions to ask: *Why is the receipt built from the transaction and not saved in a database? Why does the page
estimate gas before sending? Why do we read back after a write? What would a user see if the page did not handle errors?*

## Where the code is

```
pages/register.tsx  revoke.tsx  license.tsx    demos 1 to 3, one page each (read the comments: they number the steps)
pages/vehicles.tsx                              demo 4: the registration page, made of components
pages/index.tsx                                 start page and setup check
utils/chain.ts      connect Ganache or MetaMask, find the addresses, build the contract objects
utils/tx.ts         send one transaction and report progress (confirm, sent, mined)
utils/receipts.ts   the Receipt type and how it is built
utils/errors.ts     turns contract and wallet errors into plain sentences
utils/abi.json      the contracts' interfaces, generated by the main project
utils/deployments.json   addresses by chain id (the main project's format; deploy:local adds the local chain)
context/WalletContext.tsx   holds the connection so every page can read it
hooks/useTransaction.ts     the four states of a write: idle, pending, success, error
components/         ConnectionBar, ReceiptCard, TxStatus, ReadBack, NotReady, Layout
                    RegisterVehicleForm, LookUpVehicle, RecentRegistrations   the three parts of demo 4
utils/vehicleActions.ts     demo 4's contract calls: registerVehicle (write), lookUpVehicle (read), recentRegistrations (events)
truffle-config.js  contracts/  migrations/  scripts/  shared/chains.json   the Truffle setup (from the main project)
```

Optional environment file: copy the main project's `env.local` or `.env.local` here. Only `NEXT_PUBLIC_` lines reach the
browser (for example `NEXT_PUBLIC_GANACHE_URL`, or contract addresses that override `deployments.json`); secrets such
as `MNEMONIC` and private keys are never exposed. `npm run deploy:sepolia` additionally needs `TESTNET_PRIVATE_KEY`
or `TESTNET_MNEMONIC` (a throwaway wallet).

### Demo 4 notes

- `RegisterVehicleForm` keeps its own input and transaction state and shows the receipt itself. When it succeeds it calls
  `onRegistered(name)`. The page then hands that name to `LookUpVehicle` and adds 1 to a counter that makes `RecentRegistrations` load again.
- `RecentRegistrations` reads only the last 50,000 blocks (and never earlier than the contract's own deployment block). Free
  public servers refuse to search a whole chain at once; on Ganache this is everything.
- The contract's `VehicleRegistered` event marks the pseudonym `indexed`, which stores only its hash. The list therefore reads each
  name from the registering transaction's input.

## Troubleshooting

- **"Cannot reach Ganache":** start `npm run chain` and press Retry in the bar.
- **"The contracts are not deployed on Ganache":** run `npm run deploy:local` (the chain was restarted).
- **Revoking is refused:** select account #0, the administrator, in the bar.
- **MetaMask shows the wrong network:** switch it to the chain you are using; the page reloads on a change.
- **Port 3000 or 7545 in use:** close the other program, or run `npx next dev -p 3100`.
- **`deploy:local` cannot download the compiler:** Truffle fetches solc 0.8.20 once; it needs internet access.

## What was tested

Demo 4 was driven in a real browser against the same contracts on a local Ganache chain: register with receipt, the look-up box filling itself in,
the event list (names decoded, newest first), a refused duplicate, an empty name, a look-up of an unknown name, and the other pages still rendering.

All of demos 1 to 3 were driven in a real browser against the main project's own contracts (the Ownable and Pausable
versions) deployed to a local Ganache chain: registration with receipt and read-back, a refused duplicate, two
registrations, a report, a refused non-administrator, a revocation, a license for a registered vehicle, and refusals
for a revoked and for an unregistered vehicle. The MetaMask path was tested with a small stand-in wallet that forwards
to Ganache. **Not tested:** the MetaMask extension itself, a live Sepolia read or write, Truffle's online compiler
download (the contracts were compiled locally with the same solc 0.8.20), and Windows.
