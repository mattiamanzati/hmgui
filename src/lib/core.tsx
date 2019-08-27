import * as S from "fp-ts/lib/State";
import * as A from "fp-ts/lib/Array";
import * as I from "fp-ts/lib/IO";
import * as O from "fp-ts/lib/Option";
import * as hlist from "./hlist";
import * as D from "./dsl";
import * as N from "./next";
import { pipe } from "fp-ts/lib/pipeable";
import { identity } from "fp-ts/lib/function";

export type ID = hlist.HList<string>;

export interface WidgetState {
  hoveredId: O.Option<ID>;
  pointerDown: boolean;
  activeId: O.Option<ID>;
  activeIdHasBeenPressedBefore: boolean
  nextActiveId: O.Option<ID>;
}
export const initialWidgetState: WidgetState = {
  hoveredId: O.none,
  pointerDown: false,
  activeId: O.none,
  activeIdHasBeenPressedBefore: false,
  nextActiveId: O.none
}

export interface Widget {
  (currentState: WidgetState): N.Next<WidgetState, D.DSL>;
}

export interface WidgetBuilderState {
  currentId: ID;
}
export const initialWidgetBuilderState: WidgetBuilderState = {
  currentId: hlist.nil
}

interface WidgetBuilder extends S.State<WidgetBuilderState, Widget> {}

// === WIDGET BUILDER STATE HELPERS ===
const pushId = (id: string) =>
  S.modify<WidgetBuilderState>(ctx => ({
    ...ctx,
    currentId: hlist.cons(id, ctx.currentId)
  }));
const popId = S.chainFirst<WidgetBuilderState, Widget, void>(() =>
  S.modify<WidgetBuilderState>(ctx => ({
    ...ctx,
    currentId: hlist.pop(ctx.currentId)
  }))
);

const optionIdEq = O.getEq(hlist).equals;
const isActive: (ctx: WidgetBuilderState, state: WidgetState) => boolean = (
  ctx,
  state
) => optionIdEq(state.activeId, O.some(ctx.currentId));
const isNextActive: (ctx: WidgetBuilderState, state: WidgetState) => boolean = (
  ctx,
  state
) => optionIdEq(state.nextActiveId, O.some(ctx.currentId));

const isHovered: (ctx: WidgetBuilderState, state: WidgetState) => boolean = (
  ctx,
  state
) => optionIdEq(state.hoveredId, O.some(ctx.currentId));

const setActiveId: (activeId: O.Option<ID>) => (state: WidgetState) => WidgetState = 
  activeId => state => ({
  ...state,
  activeId,
  activeIdHasBeenPressedBefore: optionIdEq(activeId, state.activeId) ? state.activeIdHasBeenPressedBefore : false,
  nextActiveId: optionIdEq(activeId, state.nextActiveId) ? O.none : state.nextActiveId
})

// === WIDGETS ===

export const tr: (strings: TemplateStringsArray, ...values: string[]) => D.TranslableString = (strings, ...values) => ({ type: "translable_string", strings, values})

export const text: (
  id: string
) => (text: D.TranslableString) => WidgetBuilder = id => text =>
  pipe(
    pushId(id),
    S.chain(() => S.gets(ctx => _ => N.render(D.text(ctx.currentId, text)))),
    popId
  );

export const container: (
  id: string
) => (...builders: WidgetBuilder[]) => WidgetBuilder = id => (...builders) =>
  pipe(
    pushId(id),
    S.chain(() => A.array.sequence(S.state)(builders)),
    S.chain(widgets =>
      S.gets(ctx => state =>
        N.reduce(state, widgets, dsls => D.container(ctx.currentId, dsls))
      )
    ),
    popId
  );

export const button: (
  id: string
) => (
  text: D.TranslableString,
  onPress: () => I.IO<void>
) => WidgetBuilder = id => (text, onPress) =>
  pipe(
    pushId(id),
    S.chain(() =>
      S.gets(ctx => state => {
        const isCurrentlyActive = isActive(ctx, state);
        const activationRequestedByMouse =
          state.pointerDown && isHovered(ctx, state) && !isCurrentlyActive;
        const activationRequestedProgrammatically = isNextActive(ctx, state);
        const activationRequested =
          activationRequestedByMouse || activationRequestedProgrammatically;
        const canActivate = O.isNone(state.activeId) && !isCurrentlyActive;

        if (!isCurrentlyActive && activationRequested) {
          if (canActivate) {
            console.log("button activation requested")
            return N.cont(setActiveId(O.some(ctx.currentId))(state));
          }
          if (activationRequestedProgrammatically) {
            return N.cont({ ...state, nextActiveId: O.none });
          }
        } else if (isCurrentlyActive && !state.activeIdHasBeenPressedBefore) {
          console.log("button is active, triggering effect")
          return N.suspendAndResume(
            pipe(
              onPress,
              I.map(() => ({ ...state, activeIdHasBeenPressedBefore: true }))
            )
          );
        } else if(isCurrentlyActive && (!state.pointerDown || !isHovered(ctx, state))){
          return N.cont(setActiveId(O.none)(state))
        }

        return N.render(D.button(ctx.currentId, text));
      })
    ),
    popId
  );
