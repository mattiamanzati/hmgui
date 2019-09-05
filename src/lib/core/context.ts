import * as hlist from "../data/hlist";
import * as O from "fp-ts/lib/Option";

export type ID = hlist.HList<string>;

export interface WidgetBuilderState {
  currentId: ID;
}
export const initialWidgetBuilderState: WidgetBuilderState = {
  currentId: hlist.nil
};

export interface WidgetState {
  pressedId: O.Option<ID>; // ID of the widget being pressed
  focusedId: O.Option<ID>; // ID of the widget which has currently focus, may be different from the active one.
  activeId: O.Option<ID>; // ID of the widget which is currently active, meaning that edit can occur
  activeIdWasPressedBefore: boolean;
  inputBuffer: O.Option<string>;
}
export const initialWidgetState: WidgetState = {
  activeId: O.none,
  pressedId: O.none,
  focusedId: O.none,
  inputBuffer: O.none,
  activeIdWasPressedBefore: false
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

export function setActiveId(
  activeId: O.Option<ID>
): (state: WidgetState) => WidgetState {
  return state => ({
    ...state,
    activeId,
    inputBuffer: optionHList.equals(activeId, state.activeId)
      ? state.inputBuffer
      : O.none,
    activeIdWasPressedBefore: optionHList.equals(activeId, state.activeId)
      ? state.activeIdWasPressedBefore
      : false
  });
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
export function setInputBuffer(
  inputBuffer: O.Option<string>
): (state: WidgetState) => WidgetState {
  return state => ({ ...state, inputBuffer });
}

const optionHList = O.getEq(hlist);

export function isActive(id: ID, state: WidgetState) {
  return optionHList.equals(O.some(id), state.activeId);
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
