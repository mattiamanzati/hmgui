import * as C from "./core/context";
import * as D from "./core/dsl";
import { pipe } from "fp-ts/lib/pipeable";
import * as S from "fp-ts/lib/State";
import * as A from "fp-ts/lib/Array";
import * as I from "fp-ts/lib/IO";
import * as O from "fp-ts/lib/Option";
import * as N from "./data/next";
import { identity } from "rxjs";
import * as W from "./core/widget";

export const tr = D.tr;

export const id: (
  id: string
) => (widget: W.WidgetBuilder) => W.WidgetBuilder = id => widget =>
  pipe(
    S.modify(C.pushId(id)),
    S.chain(() => widget),
    S.chainFirst(() => S.modify(C.popId()))
  );

export const text: (text: D.TranslableString) => W.WidgetBuilder = text =>
  S.gets<C.WidgetBuilderState, W.Widget>(ctx => ({
    ui: D.text(ctx.currentId, text),
    tick: _ => s => N.halt()
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
      const wasPressedBefore = state.activeIdWasPressedBefore
      const isCurrentlyActive = C.isCurrentlyActive(ctx, state)

      if (isCurrentlyPressed && !isCurrentlyFocused) {
        console.log("button: focusing")
        return N.cont(
          pipe(
            state,
            C.setFocusedId(O.some(ctx.currentId))
          )
        );
      }

      if (canActivate && isCurrentlyFocused && isCurrentlyPressed){
        console.log("button: activating")
        return N.cont(pipe(
          state,
          C.setActiveId(O.some(ctx.currentId))
        ))
      } 
      
      if(isCurrentlyActive && !state.activeIdWasPressedBefore) {
        console.log("button: onPress")
        return N.suspendAndResume(
          pipe(
            onPress(),
            I.map(_ => pipe(
              state,
              C.setActiveIdWasPressedBefore(true)
            ))
          )
        );
      }

      if(isCurrentlyActive && !isCurrentlyPressed){
        console.log("button: deactivating")
        return N.cont(pipe(
          state,
          C.setActiveId(O.none)
        ))
      }

      return N.halt();
    }
  }));

export const container: (...builders: W.WidgetBuilder[]) => W.WidgetBuilder = (
  ...builders
) =>
  pipe(
    A.array.sequence(S.state)(builders),
    S.map(A.sort(W.widget)),
    S.chain(widgets =>
      S.gets<C.WidgetBuilderState, W.Widget>(ctx => ({
        ui: D.container(ctx.currentId, widgets.map(w => w.ui)),
        tick: dsl => initialState =>
          N.reduce(widgets.map(w => w.tick(w.ui)))(initialState)
      }))
    )
  );

export const input: (
  value: string,
  onChange: (newValue: string) => I.IO<void>,
  enabled: boolean,
  valid: boolean,
  isFormatValid: (bufferValue: string) => boolean
) => W.WidgetBuilder = (value, onChange, enabled, valid, isFormatValid) =>
  S.gets<C.WidgetBuilderState, W.Widget>(ctx => ({
    ui: D.input(ctx.currentId, value, enabled),
    tick: _ => state => {
      const canActivate = C.canActivate(ctx, state);
      const isCurrentlyActive = C.isCurrentlyActive(ctx, state);
      const isCurrentlyFocused = C.isCurrentlyFocused(ctx, state);
      const canDeactivate = C.canDeactivate(ctx, state);

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
  }));

export const number: (
  value: number,
  onChange: (newValue: number) => I.IO<void>,
  enabled: boolean,
  valid: boolean
) => W.WidgetBuilder = (value, onChange, enabled, valid) =>
  input(
    value.toFixed(0),
    newValue => onChange(parseInt(newValue)),
    enabled,
    valid,
    value => !isNaN(parseInt(value))
  );

export const string: (
  value: string,
  onChange: (newValue: string) => I.IO<void>,
  enabled: boolean,
  valid: boolean
) => W.WidgetBuilder = (value, onChange, enabled, valid) =>
  input(value, onChange, enabled, valid, value => true);
