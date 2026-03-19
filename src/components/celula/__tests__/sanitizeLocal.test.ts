import { describe, it, expect } from "vitest";
import { sanitizeLocal } from "../ShareReciboModal";

describe("sanitizeLocal — privacy hardening", () => {
  const VR = "Volta Redonda";
  const BH = "Belo Horizonte";

  it("strips street name and number, keeps bairro + cidade", () => {
    expect(sanitizeLocal("Rua 14, Vila Santa Cecília, Volta Redonda", VR))
      .toBe("Vila Santa Cecília, Volta Redonda");
  });

  it("strips landmark-level street but keeps bairro", () => {
    expect(sanitizeLocal("Praça Brasil, Aterrado, Volta Redonda", VR))
      .toBe("Praça Brasil, Aterrado, Volta Redonda");
  });

  it("strips institution with number + street", () => {
    const result = sanitizeLocal("UBS 249, Rua X, Vila Y, Volta Redonda", VR);
    expect(result).not.toMatch(/UBS/i);
    expect(result).not.toMatch(/Rua/i);
    expect(result).toContain("Vila Y");
    expect(result).toContain("Volta Redonda");
  });

  it("keeps plain bairro", () => {
    expect(sanitizeLocal("Centro", BH)).toBe("Centro, Belo Horizonte");
  });

  it("keeps bairro + cidade unchanged", () => {
    expect(sanitizeLocal("Vila Santa Cecília, Volta Redonda", VR))
      .toBe("Vila Santa Cecília, Volta Redonda");
  });

  it("strips CEP and falls back to cidade", () => {
    expect(sanitizeLocal("CEP 27213-080", VR)).toBe("Volta Redonda");
  });

  it("strips avenue", () => {
    const r = sanitizeLocal("Av. Brasil, 1200, Centro, Volta Redonda", VR);
    expect(r).not.toMatch(/Av/i);
    expect(r).not.toMatch(/1200/);
    expect(r).toContain("Centro");
  });

  it("returns cidade when local is null", () => {
    expect(sanitizeLocal(null, VR)).toBe(VR);
  });

  it("returns null when both are null", () => {
    expect(sanitizeLocal(null, null)).toBeNull();
  });

  it("returns cidade when local is empty string", () => {
    expect(sanitizeLocal("", VR)).toBe(VR);
  });

  it("strips Rua pattern with street name", () => {
    const r = sanitizeLocal("Rua Barão de Mauá, 55, Aterrado, Volta Redonda", VR);
    expect(r).not.toMatch(/Rua/i);
    expect(r).not.toMatch(/55/);
    expect(r).toContain("Aterrado");
  });
});
