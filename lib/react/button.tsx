
import { ComponentProps, translate, useDslValue, useDslState } from "./common";
import * as React from "react";
import { Button, Text } from "native-base";
import * as D from "../core/dsl";

export const RenderButton = React.memo(function ButtonRenderer(
    props: ComponentProps
  ) {
    const text = useDslValue(D.lens.text, D.tr`Button`, D.eqTr);
    const { onPress } = useDslState(props);
    return (
      <Button onPress={onPress}>
        <Text>{translate(text)}</Text>
      </Button>
    );
  });
  RenderButton.displayName = "DSL(Button)";