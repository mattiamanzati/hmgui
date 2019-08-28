import * as N from "./data/next";
import * as S from "fp-ts/lib/State"
import { URIS } from "fp-ts/lib/HKT";

export interface Widget<U extends URIS, S, A> {
  (currentState: S): N.Next<U, S, A>;
}

export interface WidgetBuilder<U extends URIS, C, S, A> extends S.State<C, Widget<U, S, A>> {}
