#!/usr/bin/env node
/**
 * Starts the Expo dev server bound to the real LAN address.
 *
 * Expo advertises the first non-internal IPv4 interface Node reports. On a
 * Windows machine with Hyper-V, WSL, Docker or a VPN installed, that is often a
 * virtual adapter (172.x) rather than the Wi-Fi card. The phone has no route to
 * it, so Expo Go fetches the manifest and then dies with
 * "java.io.IOException: failed to download asset bundle".
 *
 * Setting REACT_NATIVE_PACKAGER_HOSTNAME pins the advertised host. Picking it
 * at run time rather than hardcoding means it still works after switching
 * networks.
 */
const os = require('os');
const { spawn } = require('child_process');

/** Adapter names that are virtual, not a route to the phone. */
const VIRTUAL = /vethernet|wsl|hyper-v|default switch|virtualbox|vmware|docker|loopback|tailscale|zerotier|tap-|openvpn/i;

/** Private ranges, best first: home Wi-Fi is nearly always 192.168.x. */
function rank(address) {
  if (address.startsWith('192.168.')) return 0;
  if (/^10\./.test(address)) return 1;
  return 2; // 172.16-31.x — the range Hyper-V and Docker also squat on
}

function pickHost() {
  const candidates = [];

  for (const [name, addresses] of Object.entries(os.networkInterfaces())) {
    for (const entry of addresses ?? []) {
      if (entry.family !== 'IPv4' || entry.internal) continue;
      candidates.push({ name, address: entry.address, virtual: VIRTUAL.test(name) });
    }
  }

  // Real adapters first, then by how likely the range is to be a home network.
  candidates.sort(
    (a, b) => Number(a.virtual) - Number(b.virtual) || rank(a.address) - rank(b.address)
  );

  return candidates[0];
}

const host = pickHost();
const args = process.argv.slice(2);

if (host) {
  process.env.REACT_NATIVE_PACKAGER_HOSTNAME = host.address;
  console.log(`\nDev server host: ${host.address}  (${host.name})`);
  console.log('Your phone must be on this same network.\n');
} else {
  console.log('\nNo LAN address found — falling back to Expo’s default.');
  console.log('If Expo Go cannot connect, run: npm start -- --tunnel\n');
}

// shell:true is required here: on Windows npx is a .cmd, and Node refuses to
// spawn one without a shell (EINVAL). It prints a deprecation warning about
// unescaped args, which is acceptable because every argument is either a
// literal above or came from this project's own npm script.
spawn('npx', ['expo', 'start', ...args], { stdio: 'inherit', shell: true }).on('exit', (code) =>
  process.exit(code ?? 0)
);
