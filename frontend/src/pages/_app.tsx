import "@/styles/globals.css";
import Navigation from '@/components/Navigation';
import "@meshsdk/react/styles.css";
import type { AppProps } from "next/app";
import { MeshProvider } from "@meshsdk/react";
import { WalletConnectionProvider } from '@/components/WalletConnection'; // Import your provider

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <MeshProvider>
      <WalletConnectionProvider>
        <Navigation />
        <Component {...pageProps} />
      </WalletConnectionProvider>
    </MeshProvider>
  );
}
