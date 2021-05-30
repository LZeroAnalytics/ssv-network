// THIS IS AN AUTOGENERATED FILE. DO NOT EDIT THIS FILE DIRECTLY.

import {
  TypedMap,
  Entity,
  Value,
  ValueKind,
  store,
  Address,
  Bytes,
  BigInt,
  BigDecimal
} from '@graphprotocol/graph-ts';

export class Operator extends Entity {
  constructor(id: string) {
    super();
    this.set('id', Value.fromString(id));
  }

  save(): void {
    let id = this.get('id');
    assert(id !== null, 'Cannot save Operator entity without an ID');
    assert(
      id.kind == ValueKind.STRING,
      'Cannot save Operator entity with non-string ID. ' + "Considering using .toHex() to convert the 'id' to a string."
    );
    store.set('Operator', id.toString(), this);
  }

  static load(id: string): Operator | null {
    return store.get('Operator', id) as Operator | null;
  }

  get pubkey(): Bytes {
    let value = this.get('pubKey');
    return value.toBytes();
  }

  set pubkey(value: Bytes) {
    this.set('pubkey', Value.fromBytes(value));
  }

  get ownerAddress(): Bytes {
    let value = this.get('ownerAddress');
    return value.toBytes();
  }

  set ownerAddress(value: Bytes) {
    this.set('ownerAddress', Value.fromBytes(value));
  }

  get name(): string {
    let value = this.get('name');
    return value.toString();
  }

  set name(value: string) {
    this.set('name', Value.fromString(value));
  }
}
