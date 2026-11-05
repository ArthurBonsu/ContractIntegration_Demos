// Deployment settings read from the environment file (NEXT_PUBLIC_ variables only).
// Copy the license app's env.local into the demo folder (or the pack's root folder) and
// these values are picked up. Nothing is written in the source code.

export interface Addresses {
  registry: string;
  revocation: string;
  license: string;
}

// Each variable is written out in full so Next.js can substitute it at build time.
export const ENV = {
  chainId: process.env.NEXT_PUBLIC_DEPLOYED_CHAIN_ID,
  registry: process.env.NEXT_PUBLIC_VEHICLE_REGISTRY_ADDRESS,
  revocation: process.env.NEXT_PUBLIC_REVOCATION_MANAGER_ADDRESS,
  license: process.env.NEXT_PUBLIC_LICENSE_REGISTRY_ADDRESS,
};

const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
export const isAddress = (v?: string): v is string => !!v && ADDRESS.test(v.trim());

// The addresses in the environment file apply only to the chain they were deployed on.
export function envAddresses(chainId: string): Partial<Addresses> {
  if (!ENV.chainId || ENV.chainId.trim() !== chainId) {
    return {};
  }

  const out: Partial<Addresses> = {};

  if (isAddress(ENV.registry)) {
    out.registry = ENV.registry.trim();
  }

  if (isAddress(ENV.revocation)) {
    out.revocation = ENV.revocation.trim();
  }

  if (isAddress(ENV.license)) {
    out.license = ENV.license.trim();
  }

  return out;
}
