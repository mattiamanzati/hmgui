import * as React from "react";
import {
  TextInput,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
  Alert,
  TouchableWithoutFeedback
} from "react-native";
import { Input, Item, Icon, Label, Button } from "native-base";
import * as rxOp from "rxjs/operators";
import * as O from "fp-ts/lib/Option";
import * as hlist from "../data/hlist";
import * as C from "../core/context";
import * as D from "../core/dsl";
import {
  ComponentProps,
  useDslState,
  useObservable,
  useWidgetState,
  translate,
  useDslValue
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
  const id = useDslValue<D.ID>(D.lens.id, hlist.nil, hlist)
  const text = useDslValue(D.lens.text, D.tr`Label`, D.eqTr)
  const value = useDslValue(D.lens.value, '')
  const state$ = useWidgetState();
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

  return (
    <Item
      underline
      error={inputBufferState === "invalid"}
      onPress={!isFocused && !isActive ? onFocus : undefined}
    >
      <Label>{translate(text)}</Label>
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
      <Button small transparent={true} onPress={() => console.log("LOL")}><Icon name="search" /></Button>
    </Item>
  );
});

RenderInput.displayName = "DSL(Input)";
