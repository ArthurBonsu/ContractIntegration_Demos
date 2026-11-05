import { useState } from "react";
import LookUpVehicle from "../components/LookUpVehicle";
import NotReady from "../components/NotReady";
import RecentRegistrations from "../components/RecentRegistrations";
import RegisterVehicleForm from "../components/RegisterVehicleForm";
import { useReady } from "../context/WalletContext";

// DEMO 4 · The vehicle registry page.  The page owns nothing but two small pieces of state;
// each part of the screen is a component, and the components talk to the contract through utils/vehicleActions.ts.
export default function VehiclesPage() {
  const ready = useReady();
  const [justRegistered, setJustRegistered] = useState(""); // the newest pseudonym, passed DOWN to the look-up box
  const [refreshKey, setRefreshKey] = useState(0);          // a counter that tells the list to load again

  if (!ready) {
    return <NotReady />;
  }

  const { wallet, contracts } = ready;

  // Events travel UP: the form calls this when it is done.
  function handleRegistered(name: string) {
    setJustRegistered(name);
    setRefreshKey((n) => n + 1);
  }

  return (
    <>
      <div className="hero">
        <h1>Demo 4: The vehicle registry page</h1>
        <div className="muted">
          One page made of three components. Registering is a <b>write</b> that ends in a receipt; looking up is a free <b>read</b>;
          the list is the contract's <b>events</b>.
        </div>
      </div>

      <div className="grid2">
        <div className="stack">
          <RegisterVehicleForm wallet={wallet} contracts={contracts} onRegistered={handleRegistered} />
          <LookUpVehicle contracts={contracts} suggested={justRegistered} />
        </div>

        <div className="stack">
          <RecentRegistrations wallet={wallet} contracts={contracts} refreshKey={refreshKey} />

          <div className="card">
            <h2>How the page is built</h2>
            <pre className="muted" style={{ margin: 0, overflowX: "auto" }}>{`pages/vehicles.tsx
├─ RegisterVehicleForm   write → receipt
├─ LookUpVehicle         read
└─ RecentRegistrations   events

utils/vehicleActions.ts  the contract calls`}</pre>
            <p className="muted" style={{ marginBottom: 0 }}>
              <b>Try:</b> register a vehicle and watch the other two components update. The page told the look-up box which name to
              read (props down) and told the list to load again (the form's event, up).
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
