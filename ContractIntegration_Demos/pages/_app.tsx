import type { AppProps } from "next/app";
import Layout from "../components/Layout";
import { WalletProvider } from "../context/WalletContext";
import "../styles/demo.css";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <WalletProvider>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </WalletProvider>
  );
}
