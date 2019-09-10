import * as hlist from "../data/hlist";

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

export type ID = hlist.HList<string>;

type LocationDSL = { row: number; column: number; flex: number };

export type DSL =
  | { type: "text"; id: ID; text: TranslableString }
  | { type: "button"; id: ID; text: TranslableString }
  | { type: "container"; id: ID; children: DSL[] }
  | { type: "list"; id: ID; children: DSL[] }
  | { type: "input"; id: ID; value: string ; enabled: boolean};

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
export const input: (id: ID, value: string, enabled: boolean) => DSL = (
  id,
  value,
  enabled
) => ({ type: "input", id, value, enabled });
