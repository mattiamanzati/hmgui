import * as C from "./core/context";
import * as D from "./core/dsl";
import { pipe } from "fp-ts/lib/pipeable";
import * as S from "fp-ts/lib/State";
import * as A from "fp-ts/lib/Array";
import * as I from "fp-ts/lib/IO";
import * as O from "fp-ts/lib/Option";
import * as N from "./data/next";
import * as W from "./core/widget";

const immutableWidget = (_: D.DSL) => (s: C.WidgetState) =>
  N.halt<"IO", C.WidgetState>();

export const tr = D.tr;

export const text: (text: D.TranslableString) => W.WidgetBuilder = text =>
  S.gets<C.WidgetBuilderState, W.Widget>(ctx => ({
    ui: D.text(ctx.currentId, text),
    tick: immutableWidget
  }));

export const button: (
  text: D.TranslableString,
  onPress: () => I.IO<void>
) => W.WidgetBuilder = (text, onPress) =>
  S.gets<C.WidgetBuilderState, W.Widget>(ctx => ({
    ui: D.button(ctx.currentId, text),
    tick: _ => state => {
      const canActivate = C.canActivate(ctx, state);
      const isCurrentlyPressed = C.isCurrentlyPressed(ctx, state);
      const isCurrentlyFocused = C.isCurrentlyFocused(ctx, state);
      const wasPressedBefore = state.activeIdWasPressedBefore;
      const isCurrentlyActive = C.isCurrentlyActive(ctx, state);

      if (isCurrentlyPressed && !isCurrentlyFocused) {
        console.log("button: focusing");
        return N.cont(
          pipe(
            state,
            C.setFocusedId(O.some(ctx.currentId))
          )
        );
      }

      if (canActivate && isCurrentlyFocused && isCurrentlyPressed) {
        console.log("button: activating");
        return N.cont(
          pipe(
            state,
            C.setActiveId(O.some(ctx.currentId))
          )
        );
      }

      if (isCurrentlyActive && !wasPressedBefore) {
        console.log("button: onPress");
        return N.suspendAndResume(
          pipe(
            onPress(),
            I.map(_ =>
              pipe(
                state,
                C.setActiveIdWasPressedBefore(true)
              )
            )
          )
        );
      }

      if (isCurrentlyActive && !isCurrentlyPressed) {
        console.log("button: deactivating");
        return N.cont(
          pipe(
            state,
            C.setActiveId(O.none)
          )
        );
      }

      return N.halt();
    }
  }));

const handleContainerEvents: (widgets: W.Widget[]) => (ctx: C.WidgetBuilderState) =>  (dsl: D.DSL) => (state: C.WidgetState) => N.Next<"IO", C.WidgetState> =
  (widgets => ctx => dsl => initialState =>
    N.reduce(widgets.map(w => w.tick(w.ui)))(initialState))

export const container: (builders: W.WidgetBuilder[]) => W.WidgetBuilder = ((
  builders
) =>
  pipe(
    A.array.sequence(S.state)(builders),
    S.map(A.sort(W.widget)),
    S.chain(widgets =>
      S.gets<C.WidgetBuilderState, W.Widget>(ctx => ({
        ui: D.container(ctx.currentId, widgets.map(w => w.ui)),
        tick: handleContainerEvents(widgets)(ctx)
      }))
    )
  ));

const handleInputEvents: (value: string,
  onChange: (newValue: string) => I.IO<void>,
  valid: boolean,
  isFormatValid: (bufferValue: string) => boolean) => (ctx: C.WidgetBuilderState) => (dsl: D.DSL) => (state: C.WidgetState) => N.Next<"IO", C.WidgetState> = (
  ((value, onChange, valid, isFormatValid) => ctx => _ => state => {
    const canActivate = C.canActivate(ctx, state);
    const isCurrentlyActive = C.isCurrentlyActive(ctx, state);
    const isCurrentlyFocused = C.isCurrentlyFocused(ctx, state);
    const canDeactivate = C.canDeactivate(ctx, state);
    const enabled = C.getEnabled(ctx);

    // if disabled, forcefully deactivate
    if (isCurrentlyActive && O.isNone(state.activeIdIsAlive)) {
      return N.cont(C.setActiveIdIsAlive(O.some(ctx.currentId))(state));
    }

    // if disabled, forcefully deactivate
    if (isCurrentlyActive && !enabled) {
      return N.cont(
        pipe(
          state,
          C.setActiveId(O.some(ctx.currentId))
        )
      );
    }

    // if enabled, allows logic
    if (enabled) {
      if (!isCurrentlyActive && isCurrentlyFocused && canActivate) {
        // activate the control
        return N.cont(
          pipe(
            state,
            C.setActiveId(O.some(ctx.currentId))
          )
        );
      } else if (isCurrentlyActive && !isCurrentlyFocused && canDeactivate) {
        // if there is no pending buffer, release the control
        if (O.isNone(state.inputBuffer) && valid) {
          return N.cont(
            pipe(
              state,
              C.setActiveId(O.none)
            )
          );
        }

        // check if the format of the buffer is ok
        const bufferValue = O.getOrElse(() => value)(state.inputBuffer);
        if (isFormatValid(bufferValue)) {
          console.log("input: run onChange");
          return N.suspendAndResume(
            pipe(
              onChange(bufferValue),
              I.map(() => C.setInputBuffer(O.none)(state))
            )
          );
        }
      }
    }

    return N.halt();
  }
))

export const input: (
  value: string,
  onChange: (newValue: string) => I.IO<void>,
  valid: boolean,
  isFormatValid: (bufferValue: string) => boolean
) => W.WidgetBuilder = (value, onChange, valid, isFormatValid) =>
  S.gets<C.WidgetBuilderState, W.Widget>(ctx => ({
    ui: D.input(ctx.currentId, value, C.getEnabled(ctx)),
    tick: handleInputEvents(value, onChange, valid, isFormatValid)(ctx)
  }));

export const number: (
  value: number,
  onChange: (newValue: number) => I.IO<void>,
  valid: boolean
) => W.WidgetBuilder = (value, onChange, valid) =>
  input(
    value.toFixed(0),
    newValue => onChange(parseInt(newValue)),
    valid,
    value => !isNaN(parseInt(value))
  );

const alwaysTrue = (value: string) => true;

export const string: (
  value: string,
  onChange: (newValue: string) => I.IO<void>,
  valid: boolean
) => W.WidgetBuilder = (value, onChange, valid) =>
  input(value, onChange, valid, alwaysTrue);
