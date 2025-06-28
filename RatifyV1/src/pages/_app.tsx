import "@/styles/globals.css";
import Navigation from '@/components/Navigation';
import "@meshsdk/react/styles.css";
import type { AppProps } from "next/app";
import { MeshProvider } from "@meshsdk/react";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <MeshProvider>
      <Navigation />
      <Component {...pageProps} />
    </MeshProvider>
  );
}
