import * as C from "./core/context";
import * as D from "./core/dsl";
import { pipe } from "fp-ts/lib/pipeable";
import * as R from "fp-ts/lib/Reader";
import * as A from "fp-ts/lib/Array";
import * as E from "fp-ts/lib/Either";
import * as I from "fp-ts/lib/IO";
import * as O from "fp-ts/lib/Option";
import * as N from "./data/next";
import * as H from "./data/hlist";
import * as W from "./core/widget";
import { identity } from "fp-ts/lib/function";

export const tr = D.tr;

export const text: (text: D.TranslableString) => W.WidgetBuilder = text =>
  R.asks<C.WidgetBuilderState, W.Widget>(ctx => ({
    ui: D.text(ctx.currentId, text),
    tick: W.noEventHandler
  }));

export const button: (
  text: D.TranslableString,
  onPress: () => I.IO<void>
) => W.WidgetBuilder = (text, onPress) =>
  R.asks<C.WidgetBuilderState, W.Widget>(ctx => ({
    ui: D.button(ctx.currentId, text),
    tick: dsl =>
      W.makeInteractive(
        ctx.currentId,
        // wants to activate
        state =>
          C.isCurrentlyFocused(ctx, state) && C.isCurrentlyPressed(ctx, state),
        // wants to deactivate
        state =>
          !C.isCurrentlyPressed(ctx, state) ||
          !C.isCurrentlyFocused(ctx, state),
        // onActivate
        state => N.cont(C.setActiveId(O.some(ctx.currentId))(state)),
        // when active
        state => {
          // run "onPress" only once
          const wasPressedBefore = state.activeIdWasPressedBefore;
          if (!wasPressedBefore) {
            return N.suspendAndResume(
              pipe(
                onPress(),
                I.map(() =>
                  pipe(
                    state,
                    C.setActiveIdWasPressedBefore(true)
                  )
                )
              )
            );
          }
          return N.halt();
        },
        function onDeactivate(state) {
          return N.cont(C.setActiveId(O.none)(state));
        },
        // when not active
        state => {
          if (C.isCurrentlyPressed(ctx, state)) {
            return N.cont(
              pipe(
                state,
                C.setFocusedId(O.some(ctx.currentId))
              )
            );
          }
          return N.halt();
        }
      )(ctx)
  }));

const handleContainerEvents: (
  widgets: W.Widget[]
) => (
  dsl: D.DSL
) => (
  state: C.WidgetState
) => N.Next<"IO", C.WidgetState> = widgets => {
  // optimization: if each child is not interactive, do not bother check if interactive!
  if(widgets.every(w => w.tick === W.noEventHandler)){
    return W.noEventHandler
  }
  const handlers = widgets.map(w => w.tick(w.ui))
  // TODO: use a traverse style instead of this
  return dsl => initialState => N.reduce(handlers)(initialState);
}

export const container: (
  builders: W.WidgetBuilder[]
) => W.WidgetBuilder = builders =>
  pipe(
    A.array.sequence(R.reader)(builders),
    //R.map(A.sort(W.widget)),
    R.chain(widgets =>
      R.asks<C.WidgetBuilderState, W.Widget>(ctx => ({
        ui: D.container(ctx.currentId, widgets.map(w => w.ui)),
        tick: handleContainerEvents(widgets)
      }))
    )
  );


  export const list: (
    builders: W.WidgetBuilder[]
  ) => W.WidgetBuilder = builders =>
    pipe(
      A.array.sequence(R.reader)(builders),
      //R.map(A.sort(W.widget)),
      R.chain(widgets =>
        R.asks<C.WidgetBuilderState, W.Widget>(ctx => ({
          ui: D.list(ctx.currentId, widgets.map(w => w.ui)),
          tick: handleContainerEvents(widgets)
        }))
      )
    );

const inputBehaviour = (
  value: string,
  isFormatValid: (value: string) => E.Either<string, string>,
  onChange: (newValue: string) => I.IO<void>
) => (ctx: C.WidgetBuilderState) =>
  W.makeInteractive(
    ctx.currentId,
    state => C.isCurrentlyFocused(ctx, state),
    state => !C.isCurrentlyFocused(ctx, state),
    state => N.cont(C.setActiveId(O.some(ctx.currentId))(state)),
    _ => N.halt(),
    function onDeactivate(state) {
      // if no buffer value, I can release myself
      if (O.isNone(state.inputBuffer)) {
        return N.cont(
          pipe(
            state,
            C.setActiveId(O.none)
          )
        );
      }

      // if is valid, perform onChange
      const rawValue = pipe(
        state.inputBuffer,
        O.getOrElse(() => value)
      );
      const validatedBuffer = isFormatValid(rawValue);


      // if state inputBufferState differs from current
      const currentInputBufferState: "valid" | "invalid" = pipe(
        validatedBuffer,
        E.fold(() => "invalid", () => "valid")
      )
      if(state.inputBufferState !== currentInputBufferState){
        return N.cont({...state, inputBufferState: currentInputBufferState})
      }


      if (O.isSome(state.inputBuffer) && E.isRight(validatedBuffer)) {
        return N.suspendAndResume(
          pipe(
            onChange(
              pipe(
                validatedBuffer,
                E.fold(() => value, identity)
              )
            ),
            I.map(() => C.setInputBuffer(O.none)(state))
          )
        );
      }

      // nothing to do
      return N.halt();
    },
    _ => N.halt()
  )(ctx);

export const input: (
  value: string,
  onChange: (newValue: string) => I.IO<void>,
  isFormatValid: (bufferValue: string) => E.Either<string, string>
) => W.WidgetBuilder = (value, onChange, isFormatValid) =>
  R.asks<C.WidgetBuilderState, W.Widget>(ctx => ({
    ui: D.input(ctx.currentId, value, C.getEnabled(ctx)),
    tick: dsl => inputBehaviour(value, isFormatValid, onChange)(ctx)
  }));

const validateInteger = (value: string) => /^\d+$/.test(value) ? E.right(value) : E.left(value)

export const integer: (
  value: number,
  onChange: (newValue: number) => I.IO<void>,
  valid: boolean
) => W.WidgetBuilder = (value, onChange, valid) =>
  input(
    value.toFixed(0),
    newValue => onChange(parseInt(newValue, 10)),
    validateInteger
  );

const alwaysTrue = (value: string) => E.right(value);

export const string: (
  value: string,
  onChange: (newValue: string) => I.IO<void>,
  valid: boolean
) => W.WidgetBuilder = (value, onChange, valid) =>
  input(value, onChange, alwaysTrue);
