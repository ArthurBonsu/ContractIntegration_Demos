import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Contracts, Mode, Wallet, connectGanache, connectMetaMask, contractsFor } from "../utils/chain";
import { friendlyError } from "../utils/errors";

// React context: one place that holds the wallet, so every page can read it without passing it
// down through props. The connection bar writes to it; the demo pages only read.
interface WalletState {
  mode: Mode;
  setMode: (m: Mode) => void;
  wallet: Wallet | null;
  contracts: Contracts | null;
  problem: string;                // why the demos cannot run yet, in plain words ("" when ready)
  isAdmin: boolean | null;        // is the selected account the contracts' administrator?
  busy: boolean;
  connect: () => Promise<void>;
  selectAccount: (account: string) => void;
}

const Ctx = createContext<WalletState | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>("ganache");
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [admin, setAdmin] = useState<string | null>(null);

  const connect = useCallback(async () => {
    setBusy(true);
    setError("");

    try {
      if (mode === "ganache") {
        setWallet(await connectGanache(0));
      } else {
        setWallet(await connectMetaMask());
      }
    } catch (err) {
      setWallet(null);
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }, [mode]);

  // Connect to Ganache automatically when the page opens, and again if the user switches source.
  useEffect(() => {
    setWallet(null);

    if (mode === "ganache") {
      connect();
    }
  }, [mode, connect]);

  // MetaMask: follow the wallet when the user changes network or account.
  useEffect(() => {
    if (mode !== "metamask" || !window.ethereum?.on) {
      return;
    }

    const reload = () => window.location.reload();

    window.ethereum.on("chainChanged", reload);
    window.ethereum.on("accountsChanged", reload);

    return () => {
      window.ethereum?.removeListener?.("chainChanged", reload);
      window.ethereum?.removeListener?.("accountsChanged", reload);
    };
  }, [mode]);

  const { contracts, contractsProblem } = useMemo(() => {
    if (!wallet) {
      return { contracts: null, contractsProblem: "" };
    }

    try {
      return { contracts: contractsFor(wallet), contractsProblem: "" };
    } catch (err: any) {
      return { contracts: null, contractsProblem: err.message as string };
    }
  }, [wallet]);

  // Who is the administrator? A free read from the contract.
  useEffect(() => {
    setAdmin(null);

    if (!contracts) {
      return;
    }

    const registry = contracts.registry;

    async function findAdmin() {
      try {
        const address: string = await registry.methods.admin().call();
        setAdmin(address.toLowerCase());
      } catch {
        setAdmin(null);
      }
    }

    findAdmin();
  }, [contracts]);

  const selectAccount = useCallback((account: string) => {
    setWallet((current) => {
      if (!current) {
        return current;
      }

      return { ...current, account };
    });
  }, []);

  // Why the demos cannot run yet, in plain words. An empty string means everything is ready.
  function explainProblem(): string {
    if (error) {
      return error;
    }

    if (contractsProblem) {
      return contractsProblem;
    }

    if (wallet) {
      return "";
    }

    if (mode === "metamask") {
      return "Press Connect Wallet.";
    }

    return "Connecting to Ganache...";
  }

  // Is the selected account the administrator? We cannot tell until both the wallet and the administrator are known.
  function isSelectedAccountAdmin(): boolean | null {
    if (!wallet || !admin) {
      return null;
    }

    return wallet.account.toLowerCase() === admin;
  }

  const problem = explainProblem();
  const isAdmin = isSelectedAccountAdmin();

  const value: WalletState = { mode, setMode, wallet, contracts, problem, isAdmin, busy, connect, selectAccount };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWallet(): WalletState {
  const v = useContext(Ctx);

  if (!v) {
    throw new Error("useWallet must be used inside <WalletProvider>");
  }

  return v;
}

// The demo pages call this: it returns what they need, or null while the setup is not ready.
export function useReady(): { wallet: Wallet; contracts: Contracts; isAdmin: boolean | null } | null {
  const { wallet, contracts, isAdmin } = useWallet();
  return wallet && contracts ? { wallet, contracts, isAdmin } : null;
}
