import * as TY from "./types";
import * as C from "./context";
import * as D from "./dsl";
import { pipe } from "fp-ts/lib/pipeable";
import * as S from "fp-ts/lib/State";
import * as A from "fp-ts/lib/Array";
import * as I from "fp-ts/lib/IO";
import * as O from "fp-ts/lib/Option";
import * as N from "./data/next";
import { identity } from "rxjs";

export type MarsWidgetBuilder = TY.WidgetBuilder<
  "IO",
  C.WidgetBuilderState,
  C.WidgetState,
  D.DSL
>;
export type MarsWidget = TY.Widget<"IO", C.WidgetState, D.DSL>;

export const tr: (
  strings: TemplateStringsArray,
  ...values: string[]
) => D.TranslableString = (strings, ...values) => ({
  type: "translable_string",
  strings,
  values
});

export const id: (
  id: string
) => (widget: MarsWidgetBuilder) => MarsWidgetBuilder = id => widget =>
  pipe(
    S.modify(C.pushId(id)),
    S.chain(() => widget),
    S.chainFirst(() => S.modify(C.popId()))
  );

export const text: (text: D.TranslableString) => MarsWidgetBuilder = text =>
  S.gets(ctx => _ => N.render(D.text(ctx.currentId, text)));

export const container: (
  ...builders: MarsWidgetBuilder[]
) => MarsWidgetBuilder = (...builders) =>
  pipe(
    A.array.sequence(S.state)(builders),
    S.chain(widgets =>
      S.gets<C.WidgetBuilderState, MarsWidget>(ctx => initialState =>
        N.reduce(initialState, widgets, dsls =>
          D.container(ctx.currentId, dsls)
        )
      )
    )
  );

export const input: (
  value: string,
  onChange: (newValue: string) => I.IO<void>
) => MarsWidgetBuilder = (value, onChange) =>
  S.gets(ctx => state => {
    const isCurrentlyActive = C.isCurrentlyActive(ctx, state);
    const canActivate = C.canActivate(ctx, state);
    const canDeactivate = C.canDeactivate(ctx, state);
    const isCurrentlyFocused = C.isCurrentlyFocused(ctx, state);
    const wantsActivation = isCurrentlyFocused;

    if (
      isCurrentlyActive &&
      !isCurrentlyFocused &&
      O.isSome(state.inputBuffer) &&
      !state.focusTrap
    ) {
      return N.suspendAndResume(
        pipe(
          onChange(O.getOrElse(() => value)(state.inputBuffer)),
          I.map(() =>
            pipe(
              state,
              C.setInputBuffer(O.none)
            )
          )
        )
      );
    }

    if (wantsActivation && canActivate) {
      return N.cont(
        pipe(
          state,
          C.setActiveId(O.some(ctx.currentId)),
          C.setInputBuffer(O.none)
        )
      );
    } else if (!wantsActivation && canDeactivate) {
      return N.cont(C.setActiveId(O.none)(state));
    }

    const currentValue = isCurrentlyActive
      ? O.getOrElse(() => value)(state.inputBuffer)
      : value;

    return N.render(
      D.input(
        ctx.currentId,
        currentValue,
        isCurrentlyActive,
        isCurrentlyFocused
      )
    );
  });

export const focusTrap: (
  fn: (ctx: C.WidgetBuilderState, state: C.WidgetState) => boolean
) => (widget: MarsWidgetBuilder) => MarsWidgetBuilder = fn => widget =>
  pipe(
    widget,
    S.chain(widget =>
      S.gets(ctx => prevState =>
        pipe(
          widget({ ...prevState, focusTrap: fn(ctx, prevState) }),
          N.fold(
            dsl => N.render(dsl),
            state => N.cont({ ...state, focusTrap: prevState.focusTrap }),
            state => N.halt({ ...state, focusTrap: prevState.focusTrap }),
            effect =>
              N.suspendAndResume(
                pipe(
                  effect,
                  I.map(state => ({ ...state, focusTrap: prevState.focusTrap }))
                )
              )
          )
        )
      )
    )
  );

const isValidInteger = (value: string) => !isNaN(parseInt(value, 10));

export const number: (
  value: number,
  onChange: (newValue: number) => I.IO<void>
) => MarsWidgetBuilder = (value, onChange) =>
  pipe(
    focusTrap(
      (ctx, state) =>
        C.isCurrentlyActive(ctx, state) &&
        !isValidInteger(O.getOrElse(() => value.toFixed(0))(state.inputBuffer))
    )(input(value.toFixed(0), newValue => onChange(parseInt(newValue, 10))))
  );
