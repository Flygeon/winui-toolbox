import { describe, it, expect } from "vitest";
import { ipv4ToLong, longToIpv4, calcSubnet } from "@/utils/ip";

describe("ipv4ToLong / longToIpv4", () => {
  it("双向转换", () => {
    expect(longToIpv4(ipv4ToLong("192.168.1.1")!)).toBe("192.168.1.1");
    expect(ipv4ToLong("255.255.255.255")).toBe(0xffffffff);
    expect(ipv4ToLong("0.0.0.0")).toBe(0);
  });

  it("拒绝非法 IP", () => {
    expect(ipv4ToLong("256.1.1.1")).toBeNull();
    expect(ipv4ToLong("1.2.3")).toBeNull();
    expect(ipv4ToLong("abc")).toBeNull();
  });
});

describe("calcSubnet", () => {
  it("计算 /24 子网", () => {
    const s = calcSubnet("192.168.1.0", 24)!;
    expect(s.network).toBe("192.168.1.0");
    expect(s.mask).toBe("255.255.255.0");
    expect(s.broadcast).toBe("192.168.1.255");
    expect(s.firstUsable).toBe("192.168.1.1");
    expect(s.lastUsable).toBe("192.168.1.254");
    expect(s.hostCount).toBe(254);
  });

  it("IP 不在网络起点也能正确归位", () => {
    const s = calcSubnet("192.168.1.200", 24)!;
    expect(s.network).toBe("192.168.1.0");
    expect(s.broadcast).toBe("192.168.1.255");
  });

  it("/32 单主机", () => {
    const s = calcSubnet("10.0.0.1", 32)!;
    expect(s.hostCount).toBe(1);
    expect(s.firstUsable).toBe("10.0.0.1");
  });

  it("拒绝非法前缀", () => {
    expect(calcSubnet("1.1.1.1", 33)).toBeNull();
    expect(calcSubnet("1.1.1.1", -1)).toBeNull();
  });
});
