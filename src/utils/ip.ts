/** IPv4 / 子网计算（纯逻辑，无 DOM 依赖，可单测） */

export function ipv4ToLong(ip: string): number | null {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) return null;
  return (((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0);
}

export function longToIpv4(n: number): string {
  return [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join(".");
}

export interface SubnetResult {
  network: string;
  mask: string;
  broadcast: string;
  firstUsable: string;
  lastUsable: string;
  hostCount: number;
}

/** 计算 CIDR 子网信息；无效输入返回 null */
export function calcSubnet(ip: string, prefix: number): SubnetResult | null {
  const ipn = ipv4ToLong(ip);
  if (ipn === null || !Number.isInteger(prefix) || prefix < 0 || prefix > 32) return null;
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  const network = ipn & mask;
  const broadcast = network | (~mask >>> 0);
  const hostCount = prefix >= 31 ? (prefix === 32 ? 1 : 2) : Math.max(0, broadcast - network - 1);
  const firstUsable = prefix >= 31 ? network : network + 1;
  const lastUsable = prefix >= 31 ? network : broadcast - 1;
  return {
    network: longToIpv4(network),
    mask: longToIpv4(mask),
    broadcast: longToIpv4(broadcast),
    firstUsable: longToIpv4(firstUsable),
    lastUsable: longToIpv4(lastUsable),
    hostCount,
  };
}
