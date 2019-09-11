import { ComponentProps, translate } from "./common";
import * as React from "react";
import { Text } from "native-base"


export const RenderText = React.memo(function TextRenderer(
    props: ComponentProps
  ) {
    if (props.dsl.type !== "text") return null;
    return <Text>{translate(props.dsl.text)}</Text>;
  });
  RenderText.displayName = "DSL(Text)";