import * as React from "react";
import {
  TextInput,
  NativeSyntheticEvent,
  TextInputKeyPressEventData
} from "react-native";
import { Input, Item, Icon, Label } from "native-base";
import * as rxOp from "rxjs/operators";
import * as O from "fp-ts/lib/Option";
import * as hlist from "../data/hlist";
import * as C from "../core/context";
import {
  ComponentProps,
  useDslState,
  useObservable,
  useWidgetState,
  translate
} from "./common";

export const RenderInput = React.memo(function InputRenderer(
  props: ComponentProps
) {
  const {
    isFocused,
    isActive,
    onFocus,
    onBlur,
    onChangeText,
    onTabNext,
    inputBufferState
  } = useDslState(props);
  const state$ = useWidgetState();
  const { id } = props.dsl;
  const value = (props.dsl as any).value || "";
  const idSerialized = hlist.toString(id);

  const ref = React.useRef<TextInput>();

  const rawValue$ = React.useMemo(
    () =>
      state$.pipe(
        rxOp.map(state =>
          C.isActive(id, state)
            ? O.getOrElse(() => value)(state.inputBuffer)
            : value
        )
      ),
    [state$, idSerialized, value]
  );

  const rawValue = useObservable(rawValue$, value);

  React.useEffect(() => {
    if (ref.current && isFocused && !ref.current.isFocused()) {
      ref.current.focus();
    } else if (ref.current && !isFocused && ref.current.isFocused()) {
      ref.current.blur();
    }
  });

  const onKeyPress = React.useMemo(
    () => (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
      if (e.nativeEvent.key === "Tab") {
        onTabNext();
        e.preventDefault();
      }
    },
    [idSerialized]
  );

  if (props.dsl.type !== "input") return null;

  return (
    <Item
      underline
      error={inputBufferState === "invalid"}
      onPress={!isFocused ? onFocus : undefined}
    >
      <Label>{translate(props.dsl.text)}</Label>
      <Input
        ref={c => {
          ref.current = c ? (c as any)._root /* NativeBase uses this */ : null;
        }}
        editable={isActive && isFocused}
        value={rawValue}
        onChangeText={onChangeText}
        onBlur={onBlur}
        autoCapitalize="none"
        selectTextOnFocus={true}
        onSubmitEditing={onTabNext}
        blurOnSubmit={false}
        pointerEvents={!isFocused ? "none" : "auto"}
        onKeyPress={onKeyPress}
      />
      {isActive ? <Icon name="create" onPress={onFocus} /> : null}
      {isFocused ? <Icon name="arrow-dropleft" /> : null}
    </Item>
  );
});

RenderInput.displayName = "DSL(Input)";
