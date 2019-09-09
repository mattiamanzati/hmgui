import * as C from "./core/context";
import { pipe } from "fp-ts/lib/pipeable";
import * as S from "fp-ts/lib/State";
import * as W from "./core/widget";

export const id: (
  id: string
) => (widget: W.WidgetBuilder) => W.WidgetBuilder = id => widget =>
  pipe(
    S.modify(C.pushId(id)),
    S.chain(() => widget),
    S.chainFirst(() => S.modify(C.popId()))
  );

export const enabled: (
  isEnabled: boolean
) => (widget: W.WidgetBuilder) => W.WidgetBuilder = isEnabled => widget =>
  pipe(
    S.gets(C.getEnabled),
    S.chain<C.WidgetBuilderState, boolean, W.Widget>(prevEnabled =>
      pipe(
        S.modify(C.setEnabled(isEnabled)),
        S.chain(() => widget),
        S.chainFirst(() => S.modify(C.setEnabled(prevEnabled)))
      )
    )
  );
