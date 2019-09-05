import * as S from "fp-ts/lib/State";
import * as C from "./context";
import * as D from "./dsl";
import * as O from "fp-ts/lib/Ord";
import * as H from "../data/hlist";
import * as N from "../data/next";


export interface Widget {
  ui: D.DSL;
  tick: (dsl: D.DSL) => (state: C.WidgetState) => N.Next<"IO", C.WidgetState>;
}

export interface WidgetBuilder extends S.State<C.WidgetBuilderState, Widget> {}

export const widget: O.Ord<Widget> = {
  equals: (a, b) => H.equals(a.ui.id, b.ui.id),
  compare: (a, b) => 0
};
