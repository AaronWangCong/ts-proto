import { TestMessage } from "./empty-repeated";

describe("empty-repeated", () => {
  it("encodes empty repeated fields to tag 20000", () => {
    const message: TestMessage = {
      numbers: [],
      metadata: {},
      enums: [],
    };
    const writer = TestMessage.encode(message);
    const buffer = writer.finish();

    // Tag 20000 | WireType 2 (Length-delimited)
    // 20000 << 3 | 2 = 160002
    // Varint for 160002: 0x82 0xA2 0x09

    // The data inside tag 20000 should be the varints of field numbers 1, 2, 3
    // [1, 2, 3] -> 0x01 0x02 0x03

    // Total expected sequence: 0x82 0xA2 0x09 (tag) 0x03 (length) 0x01 0x02 0x03 (data)
    const expected = new Uint8Array([0x82, 0xA2, 0x09, 0x03, 0x01, 0x02, 0x03]);

    // Find the sequence in the buffer
    let found = false;
    for (let i = 0; i <= buffer.length - expected.length; i++) {
        let match = true;
        for (let j = 0; j < expected.length; j++) {
            if (buffer[i + j] !== expected[j]) {
                match = false;
                break;
            }
        }
        if (match) {
            found = true;
            break;
        }
    }

    expect(found).toBe(true);
  });

  it("does not encode non-empty repeated fields to tag 20000", () => {
    const message: TestMessage = {
      numbers: [1],
      metadata: { "a": "b" },
      enums: [1],
    };
    const writer = TestMessage.encode(message);
    const buffer = writer.finish();

    // Tag 20000 sequence should NOT be present
    const tagSequence = new Uint8Array([0x82, 0xA2, 0x09]);
    let found = false;
    for (let i = 0; i <= buffer.length - tagSequence.length; i++) {
        let match = true;
        for (let j = 0; j < tagSequence.length; j++) {
            if (buffer[i + j] !== tagSequence[j]) {
                match = false;
                break;
            }
        }
        if (match) {
            found = true;
            break;
        }
    }
    expect(found).toBe(false);
  });
});
