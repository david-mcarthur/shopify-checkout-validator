import assert from "node:assert/strict";
import test from "node:test";

import {
  getBillingAddressIssue,
  hasUnsupportedCharacters,
} from "../src/validation.ts";

test("allows an incomplete billing address", () => {
  assert.equal(getBillingAddressIssue(undefined), null);
  assert.equal(getBillingAddressIssue({ countryCode: "", address1: "" }), null);
});

test("allows an Australian address with English punctuation", () => {
  assert.equal(
    getBillingAddressIssue({
      countryCode: "AU",
      name: "Anne-Marie O'Connor",
      company: "Smith & Sons Pty Ltd.",
      address1: "Unit 2/15 King's Rd #4",
      city: "St Kilda",
      provinceCode: "VIC",
      zip: "3182",
      phone: "+61 (0)3 1234 5678",
    }),
    null,
  );
});

test("allows every printable ASCII character", () => {
  const printableAscii = Array.from({ length: 95 }, (_, index) =>
    String.fromCharCode(index + 0x20),
  ).join("");

  assert.equal(hasUnsupportedCharacters([printableAscii]), false);
});

test("blocks non-Australian countries", () => {
  assert.equal(getBillingAddressIssue({ countryCode: "NZ" }), "country");
  assert.equal(getBillingAddressIssue({ countryCode: "US" }), "country");
});

test("keeps the country rule first when both rules fail", () => {
  assert.equal(
    getBillingAddressIssue({ countryCode: "NZ", name: "José" }),
    "country",
  );
});

test("blocks non-ASCII characters in every checked billing field", () => {
  const fields = [
    "name",
    "firstName",
    "lastName",
    "company",
    "address1",
    "address2",
    "city",
    "zip",
    "provinceCode",
    "phone",
  ];

  for (const field of fields) {
    assert.equal(
      getBillingAddressIssue({ countryCode: "AU", [field]: "北京市" }),
      "characters",
      field,
    );
  }
});

test("blocks accents, smart punctuation, emoji, and controls", () => {
  for (const value of ["José", "O’Connor", "Sydney 😀", "line\nbreak"]) {
    assert.equal(
      getBillingAddressIssue({ countryCode: "AU", address1: value }),
      "characters",
    );
  }
});

test("allows progression after invalid details are corrected", () => {
  assert.equal(
    getBillingAddressIssue({ countryCode: "AU", name: "Jose O'Connor" }),
    null,
  );
});