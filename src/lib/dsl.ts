import * as S from "fp-ts/lib/State";
import * as hlist from "./hlist";
import * as I from "fp-ts/lib/IO";

export type ID = hlist.HList<string>;

export type TranslableString = { type: "translable_string", strings: TemplateStringsArray, values: string[] };

export type DSL =
  | { type: "text"; id: ID; text: TranslableString }
  | { type: "button"; id: ID; text: TranslableString }
  | { type: "container"; id: ID; children: DSL[] }
  | { type: "input"; id: ID; value: string; active: boolean };

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
export const button: (id: ID, text: TranslableString) => DSL = (id, text) => ({
  type: "button",
  id,
  text
});
export const input: (id: ID, value: string, active: boolean) => DSL = (
  id,
  value,
  active
) => ({ type: "input", id, value, active });
