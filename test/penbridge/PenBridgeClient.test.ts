import { describe, expect, it } from "vitest";
import {
  PenBridgeClient,
  type BridgeSocket,
  type PenBridgeStatus,
} from "../../src/penbridge/PenBridgeClient";
import type { PenButtonSignal } from "../../src/penbridge/PenBridgeClient";

const secret = Uint8Array.from({ length: 32 }, (_, index) => index);
const nonce = "AAAAAAAAAAAAAAAAAAAAAA";
const clientNonce = "AQEBAQEBAQEBAQEBAQEBAQ";
const serverProof = "d1mX914nyIaHxRXrKF0yk1AnUp7-zeU3FRBWUqnil-U";

class Clock {
  now = 0;
  private id = 0;
  private timers = new Map<number, { at: number; callback: () => void }>();
  setTimeout(callback: () => void, delayMs: number): number {
    const id = ++this.id;
    this.timers.set(id, { at: this.now + delayMs, callback });
    return id;
  }
  clearTimeout(handle: unknown): void {
    this.timers.delete(handle as number);
  }
  advance(ms: number): void {
    this.now += ms;
    for (;;) {
      const ready = [...this.timers]
        .filter(([, timer]) => timer.at <= this.now)
        .sort((left, right) => left[1].at - right[1].at)[0];
      if (!ready) break;
      this.timers.delete(ready[0]);
      ready[1].callback();
    }
  }
}

class FakeSocket implements BridgeSocket {
  readyState = 0;
  sent: string[] = [];
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  constructor(readonly url: string) {}
  send(data: string): void {
    this.sent.push(data);
  }
  close(code = 1000, reason = ""): void {
    if (this.readyState === 3) return;
    this.readyState = 3;
    this.onclose?.({ code, reason, wasClean: true } as CloseEvent);
  }
  open(): void {
    this.readyState = 1;
    this.onopen?.({} as Event);
  }
  message(data: string): void {
    this.onmessage?.({ data });
  }
  serverClose(code: number, reason = ""): void {
    this.readyState = 3;
    this.onclose?.({ code, reason, wasClean: false } as CloseEvent);
  }
}

const hello = JSON.stringify({
  type: "hello",
  proto: 1,
  app: "excalidraw-spen-bridge",
  appVersion: "0.2.0-diag",
  nonce,
  caps: ["button", "command"],
});

function ready(proof = serverProof, down = false): string {
  return JSON.stringify({
    type: "ready",
    session: "AAAAAAAAAAA",
    serverProof: proof,
    heartbeatMs: 1000,
    source: { state: "ok", node: "/dev/input/event5", name: "sec_e-pen" },
    button: { button: "primary", down, seq: 0, t: 1_000 },
  });
}

async function waitFor(ready: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (ready()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error("timed out waiting for the bridge client");
}

function setup() {
  const sockets: FakeSocket[] = [];
  const clock = new Clock();
  const statuses: PenBridgeStatus[] = [];
  const buttons: PenButtonSignal[] = [];
  const client = new PenBridgeClient({
    url: "ws://127.0.0.1:47631/v1/pen",
    secret: () => secret,
    clientVersion: "0.2.0-diag.1",
    wsFactory: (url) => {
      const created = new FakeSocket(url);
      sockets.push(created);
      return created;
    },
    now: () => clock.now + 1_000,
    perfNow: () => clock.now,
    scheduler: clock,
    random: () => 0.5,
    nonce: () => clientNonce,
    visibility: { state: () => "visible", subscribe: () => () => undefined },
    onStatus: (status) => statuses.push(status),
    onButton: (button) => buttons.push(button),
  });
  return { client, clock, statuses, buttons, sockets, socket: () => sockets.at(-1) };
}

describe("PenBridgeClient", () => {
  it("completes the handshake and checks the server proof", async () => {
    const { client, buttons, statuses, socket } = setup();
    client.setDemand(true);
    socket()?.open();
    socket()?.message(hello);
    await waitFor(() => (socket()?.sent.length ?? 0) > 0);
    const auth = JSON.parse(socket()?.sent[0] ?? "{}") as { proof?: string; clientNonce?: string };
    expect(auth.clientNonce).toBe(clientNonce);
    expect(auth.proof).toBe("mL30Scw9qhI2CwHAUh6P1JmgTJEUSN5xtvhBEB20-oE");
    socket()?.message(ready());
    await waitFor(() => client.isReady());
    expect(statuses.at(-1)).toMatchObject({
      state: "ready",
      source: "ok",
      fingerprint: "MMG4-2KLG",
    });
    expect(buttons.at(-1)?.down).toBe(false);
    expect(client.isReady()).toBe(true);
  });

  it("stops retrying when the server proof is wrong", async () => {
    const { client, clock, statuses, socket, sockets } = setup();
    client.setDemand(true);
    socket()?.open();
    socket()?.message(hello);
    await waitFor(() => (socket()?.sent.length ?? 0) > 0);
    socket()?.message(ready("not-the-proof"));
    await waitFor(() => client.snapshot().status.state === "failed");
    expect(statuses.at(-1)).toMatchObject({ state: "failed", code: 4401 });
    const count = sockets.length;
    clock.advance(20_000);
    expect(sockets).toHaveLength(count);
    expect(client.isDown()).toBe(false);
  });

  it("applies newer button levels, ignores old ones, and heals from ping", async () => {
    const { client, buttons, socket } = setup();
    client.setDemand(true);
    socket()?.open();
    socket()?.message(hello);
    await waitFor(() => (socket()?.sent.length ?? 0) > 0);
    socket()?.message(ready());
    await waitFor(() => client.isReady());
    socket()?.message(
      JSON.stringify({
        type: "button",
        button: "primary",
        down: true,
        seq: 1,
        t: 1_000,
        sent: 1_004,
      })
    );
    socket()?.message(
      JSON.stringify({
        type: "button",
        button: "primary",
        down: false,
        seq: 1,
        t: 1_000,
        sent: 1_004,
      })
    );
    socket()?.message(
      JSON.stringify({
        type: "button",
        button: "primary",
        down: true,
        seq: 3,
        t: 1_000,
        sent: 1_004,
      })
    );
    socket()?.message(JSON.stringify({ type: "ping", seq: 4, down: false, sent: 9 }));
    expect(buttons.map((button) => [button.seq, button.down])).toEqual([
      [0, false],
      [1, true],
      [3, true],
      [4, false],
    ]);
    expect(socket()?.sent.at(-1)).toBe(JSON.stringify({ type: "pong", sent: 9 }));
    expect(buttons[1]?.pressedAtPerf).toBe(0);
    expect(buttons[1]?.latencyMs).toBe(0);
  });

  it("forces the barrel up when the watchdog expires", async () => {
    const { client, clock, buttons, socket } = setup();
    client.setDemand(true);
    socket()?.open();
    socket()?.message(hello);
    await waitFor(() => (socket()?.sent.length ?? 0) > 0);
    socket()?.message(ready(serverProof, true));
    await waitFor(() => client.isReady());
    socket()?.message(
      JSON.stringify({
        type: "button",
        button: "primary",
        down: true,
        seq: 1,
        t: 1_000,
        sent: 1_000,
      })
    );
    expect(client.isDown()).toBe(true);
    clock.advance(3000);
    expect(buttons.at(-1)?.down).toBe(false);
    expect(client.isDown()).toBe(false);
  });

  it("backs off and resets the delay after a ready connection", async () => {
    const { client, clock, socket, sockets } = setup();
    client.setDemand(true);
    socket()?.serverClose(1006);
    clock.advance(250);
    expect(sockets).toHaveLength(2);
    socket()?.serverClose(1006);
    clock.advance(499);
    expect(sockets).toHaveLength(2);
    clock.advance(1);
    expect(sockets).toHaveLength(3);
    socket()?.open();
    socket()?.message(hello);
    await waitFor(() => (socket()?.sent.length ?? 0) > 0);
    socket()?.message(ready());
    await waitFor(() => client.isReady());
    socket()?.serverClose(1006);
    clock.advance(250);
    expect(sockets).toHaveLength(4);
  });

  it("does not retry a 4401 close or a demand of false", () => {
    const { client, clock, socket, sockets } = setup();
    client.setDemand(true);
    socket()?.serverClose(4401);
    clock.advance(20_000);
    expect(sockets).toHaveLength(1);
    expect(client.snapshot().status).toMatchObject({ state: "failed", code: 4401 });

    const second = setup();
    second.client.setDemand(true);
    second.client.setDemand(false);
    second.clock.advance(20_000);
    expect(second.sockets).toHaveLength(1);
  });
});
