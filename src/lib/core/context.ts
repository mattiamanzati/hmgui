import * as hlist from "../data/hlist";
import * as O from "fp-ts/lib/Option";
import { pipe } from "fp-ts/lib/pipeable";

export type ID = hlist.HList<string>;

export interface WidgetBuilderState {
  currentId: ID;
  label: O.Option<string>
  enabled: boolean
}
export const initialWidgetBuilderState: WidgetBuilderState = {
  currentId: hlist.nil,
  label: O.none,
  enabled: true
};

export interface WidgetState {
  pressedId: O.Option<ID>; // ID of the widget being pressed
  focusedId: O.Option<ID>; // ID of the widget which has currently focus, may be different from the active one.
  autoFocus: boolean      // first focusable widget will acquire focus

  activeId: O.Option<ID>; // ID of the widget which is currently active, meaning that edit can occur
  activeIdIsAlive: O.Option<ID> // tracks if the active ID is actually interactive, if not, application will forcefully blur away.
  activeIdWasPressedBefore: boolean;
  inputBuffer: O.Option<string>;
}
export const initialWidgetState: WidgetState = {
  activeId: O.none,
  activeIdIsAlive: O.none,
  activeIdWasPressedBefore: false,

  pressedId: O.none,
  focusedId: O.none,
  inputBuffer: O.none,
  autoFocus: true
};

export const pushId: (
  id: string
) => (ctx: WidgetBuilderState) => WidgetBuilderState = id => ctx => ({
  ...ctx,
  currentId: hlist.cons(id, ctx.currentId)
});
export const popId: () => (
  ctx: WidgetBuilderState
) => WidgetBuilderState = () => ctx => ({
  ...ctx,
  currentId: hlist.pop(ctx.currentId)
});
export const getEnabled: (
  ctx: WidgetBuilderState
) => boolean = ctx => ctx.enabled
export const setEnabled: (enabled: boolean) => (
  ctx: WidgetBuilderState
) => WidgetBuilderState = (enabled) => ctx => ({
  ...ctx,
  enabled
});

export function newFrame(state: WidgetState): WidgetState {
  return pipe(
    state,
    setActiveIdIsAlive(O.none)
  )
}

export function isActiveIdStale(state: WidgetState): boolean {
  return O.isSome(state.activeId) && O.isSome(state.activeIdIsAlive) && !optionHList.equals(state.activeId, state.activeIdIsAlive)
}

export function setActiveId(
  activeId: O.Option<ID>
): (state: WidgetState) => WidgetState {
  return state => ({
    ...state,
    activeId,
    activeIdIsAlive: activeId,
    activeIdWasPressedBefore: optionHList.equals(activeId, state.activeId)
      ? state.activeIdWasPressedBefore
      : false,
    inputBuffer: optionHList.equals(activeId, state.activeId)
      ? state.inputBuffer
      : O.none
  });
}

export function setActiveIdIsAlive(
  activeIdIsAlive: O.Option<ID>
): (state: WidgetState) => WidgetState {
  return state => ({ ...state, activeIdIsAlive })
}

export function setActiveIdWasPressedBefore(activeIdWasPressedBefore: boolean): (state: WidgetState) => WidgetState{
  return state => ({ ...state, activeIdWasPressedBefore })
}
export function setPressedId(
  pressedId: O.Option<ID>
): (state: WidgetState) => WidgetState {
  return state => ({ ...state, pressedId });
}

export function setFocusedId(
  focusedId: O.Option<ID>
): (state: WidgetState) => WidgetState {
  return state => ({ ...state, focusedId });
}
export function setAutoFocus(autoFocus: boolean): (state: WidgetState) => WidgetState{
  return state => ({ ...state, autoFocus })
}
export function setInputBuffer(
  inputBuffer: O.Option<string>
): (state: WidgetState) => WidgetState {
  return state => ({ ...state, inputBuffer });
}

const optionHList = O.getEq(hlist);

export function isActive(id: ID, state: WidgetState) {
  return optionHList.equals(O.some(id), state.activeId);
}
export function isFocused(id: ID, state: WidgetState) {
  return optionHList.equals(O.some(id), state.focusedId);
}

export function isCurrentlyActive(
  ctx: WidgetBuilderState,
  state: WidgetState
): boolean {
  return isActive(ctx.currentId, state);
}

export function isCurrentlyPressed(
  ctx: WidgetBuilderState,
  state: WidgetState
): boolean {
  return optionHList.equals(O.some(ctx.currentId), state.pressedId);
}

export function isCurrentlyFocused(
  ctx: WidgetBuilderState,
  state: WidgetState
): boolean {
  return optionHList.equals(O.some(ctx.currentId), state.focusedId);
}

export function canActivate(
  ctx: WidgetBuilderState,
  state: WidgetState
): boolean {
  return O.isNone(state.activeId) && !isCurrentlyActive(ctx, state);
}
export function canDeactivate(
  ctx: WidgetBuilderState,
  state: WidgetState
): boolean {
  return isCurrentlyActive(ctx, state);
}
