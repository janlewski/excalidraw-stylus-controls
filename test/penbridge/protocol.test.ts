import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  decodePairingCode,
  fingerprint,
  parseServerFrame,
  proof,
} from "../../src/penbridge/protocol";

const secret = Uint8Array.from({ length: 32 }, (_, index) => index);
const nonce = "AAAAAAAAAAAAAAAAAAAAAA";
const clientNonce = "AQEBAQEBAQEBAQEBAQEBAQ";

describe("spen-bridge/1 shared vectors", () => {
  it("decodes the pairing code for bytes 0 through 31", () => {
    expect(decodePairingCode("AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8")).toEqual(secret);
    expect(decodePairingCode("not a code")).toBeNull();
    expect(decodePairingCode("AA")).toBeNull();
  });

  it("reproduces the client proof, server proof, and fingerprint", async () => {
    expect(await proof(secret, nonce, clientNonce, "client")).toBe(
      "mL30Scw9qhI2CwHAUh6P1JmgTJEUSN5xtvhBEB20-oE"
    );
    expect(await proof(secret, nonce, clientNonce, "server")).toBe(
      "d1mX914nyIaHxRXrKF0yk1AnUp7-zeU3FRBWUqnil-U"
    );
    expect(await fingerprint(secret)).toBe("MMG4-2KLG");
  });

  it("reproduces the RFC 6455 accept key", () => {
    const accept = createHash("sha1")
      .update("dGhlIHNhbXBsZSBub25jZQ==258EAFA5-E914-47DA-95CA-C5AB0DC85B11")
      .digest("base64");
    expect(accept).toBe("s3pPLMBiTxaQ9kYGzzhZRbK+xOo=");
  });
});

describe("parseServerFrame", () => {
  it("rejects malformed JSON and missing required fields", () => {
    expect(parseServerFrame("{")).toBeNull();
    expect(parseServerFrame('{"type":"button","down":true}')).toBeNull();
    expect(parseServerFrame('{"type":"hello","proto":"1"}')).toBeNull();
    expect(parseServerFrame('{"type":"ping","seq":1,"down":"yes","sent":1}')).toBeNull();
  });

  it("ignores unknown types and parses a button level", () => {
    expect(parseServerFrame('{"type":"future","value":1}')).toEqual({
      type: "unknown",
      rawType: "future",
    });
    expect(
      parseServerFrame(
        '{"type":"button","button":"primary","down":true,"seq":2,"t":10.5,"sent":11}'
      )
    ).toEqual({
      type: "button",
      button: "primary",
      down: true,
      seq: 2,
      t: 10.5,
      sent: 11,
    });
  });
});
