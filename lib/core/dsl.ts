import * as hlist from "../data/hlist";
import * as EQ from "fp-ts/lib/Eq"
import * as A from "fp-ts/lib/Array"

export type TranslableString = {
  type: "translable_string";
  strings: TemplateStringsArray;
  values: string[];
};

export const tr: (
  strings: TemplateStringsArray,
  ...values: string[]
) => TranslableString = (strings, ...values) => ({
  type: "translable_string",
  strings,
  values
});

const arrayStringEq = A.getEq(EQ.eqString)
export const eqTr: EQ.Eq<TranslableString> = EQ.getStructEq({
  strings: arrayStringEq,
  values: arrayStringEq
}) as any

export type ID = hlist.HList<string>;

type LocationDSL = { row: number; column: number; flex: number };

export type DSL =
  | { type: "text"; id: ID; text: TranslableString }
  | { type: "button"; id: ID; text: TranslableString }
  | { type: "container"; id: ID; children: DSL[] }
  | { type: "list"; id: ID; children: DSL[] }
  | { type: "input"; id: ID; text: TranslableString; value: string ; enabled: boolean};

export const text: (id: ID, text: TranslableString) => DSL = (id, text) => ({
  type: "text",
  id,
  text
});
export const container: (id: ID, children: DSL[]) => DSL = (id, children) => ({
  type: "container",
  id,
  children
});
export const list: (id: ID, children: DSL[]) => DSL = (id, children) => ({
  type: "list",
  id,
  children
});
export const button: (id: ID, text: TranslableString) => DSL = (id, text) => ({
  type: "button",
  id,
  text
});
export const input: (id: ID, text: TranslableString, value: string, enabled: boolean) => DSL = (
  id,
  text,
  value,
  enabled
) => ({ type: "input", id, text, value, enabled });

export const lens = {
  type: (d: DSL) => (d as any).type,
  id: (d: DSL) => d.id,
  text: (d: DSL) => (d as any).text || tr``,
  value: (d: DSL) => (d as any).value || undefined as any
}