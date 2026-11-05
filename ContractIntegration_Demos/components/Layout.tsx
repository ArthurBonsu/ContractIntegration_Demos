import Link from "next/link";
import { useRouter } from "next/router";
import { ReactNode } from "react";
import ConnectionBar from "./ConnectionBar";

const LINKS = [
  { href: "/", label: "Start" },
  { href: "/register", label: "1 Register" },
  { href: "/revoke", label: "2 Revoke" },
  { href: "/license", label: "3 License" },
  { href: "/vehicles", label: "4 Vehicles" },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useRouter();
  return (
    <div>
      <div className="nav">
        <div className="container">
          <span className="brand">Contract integration</span>
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={pathname === l.href ? "active" : ""}>{l.label}</Link>
          ))}
        </div>
      </div>
      <ConnectionBar />
      <div className="container stack">{children}</div>
    </div>
  );
}
