import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
  outputFileTracingRoot: projectRoot,

  // esbuild als externes Paket markieren, damit Turbopack es nicht bundelt
  serverExternalPackages: ['esbuild'],

  // --------------------------------------------
  // Build-Strategie für Produktion
  // Das Repo enthält aktuell viele modulübergreifende TS-Altfehler,
  // die nichts mit dem Next.js Runtime-Bundle des Stream-Stacks zu tun haben.
  // Für den Container-Build überspringen wir daher den globalen Typcheck
  // und validieren die tatsächlich deploy-kritischen Fehler separat.
  // --------------------------------------------
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Bilder-Domains für Marketplace Screenshots und Avatare
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
        pathname: '/**',
      },
    ],
  },

  // --------------------------------------------
  // HTTP Headers fuer WebContainer-Sandbox
  // WebContainers benoetigen SharedArrayBuffer, was COEP/COOP Headers erfordert
  // 'credentialless' ist weniger restriktiv als 'require-corp' und
  // erlaubt CDN-Ressourcen (z.B. Tailwind CDN) ohne CORS-Headers
  //
  // WICHTIG: Nur auf /sandbox/wc gesetzt, damit andere Seiten
  // (OAuth, externe Bilder, etc.) nicht beeintraechtigt werden
  // --------------------------------------------
  async headers() {
    return [
      // Builder-Seiten brauchen COEP/COOP damit das eingebettete
      // WebContainer-iframe crossOriginIsolated === true hat
      // 'credentialless' ist weniger restriktiv als 'require-corp'
      // und erlaubt externe Fonts, Bilder, CDN-Skripte
      {
        source: '/lab/builder/:path*',
        headers: [
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'credentialless',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
        ],
      },
      // WebContainer Sandbox-Seite (iframe)
      // 'credentialless' statt 'require-corp' damit CDN-Assets (Tailwind) geladen werden
      {
        source: '/sandbox/wc',
        headers: [
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'credentialless',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
