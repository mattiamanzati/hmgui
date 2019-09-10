import * as C from "./context";
import { pipe } from "fp-ts/lib/pipeable";
import * as R from "fp-ts/lib/Reader";
import * as W from "./widget";

export const id: (
  id: string
) => (widget: W.WidgetBuilder) => W.WidgetBuilder = id => widget =>
  pipe(
    widget,
    R.local(C.pushId(id)),
  );

export const enabled: (
  isEnabled: boolean
) => (widget: W.WidgetBuilder) => W.WidgetBuilder = isEnabled => widget =>
  pipe(
    widget,
    R.local(C.setEnabled(isEnabled))
  );
