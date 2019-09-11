import * as W from "./widgets";
import * as A from "./core/attributes";
import * as React from "react";
import * as I from "fp-ts/lib/IO";
import * as RR from "./react/renderer";
import { pipe } from "fp-ts/lib/pipeable";

type Model = number[];

let spamTest: number[] = [];
for (let i = 0; i < 10; i++) {
  spamTest.push(i);
}

let strings: string[] = [];
for (let i = 0; i < 5; i++) {
  strings.push("Test " + i);
}

const longList = A.id("list")(
  W.list(strings.map(s => A.id(s)(W.container([W.text(W.tr`${s}`)]))))
)

function render(model: Model) {
  return (update: (newModel: Model) => I.IO<void>) =>
    W.container([
      A.id("inputs")(
        W.container(
          spamTest
            .map((_, i) =>
              pipe(
                W.container([
                  pipe(
                    W.integer(
                      model[i],
                      name =>
                        update(
                          model
                            .slice(0, i)
                            .concat([name])
                            .concat(model.slice(i + 1))
                        ),
                      true
                    ),
                    A.id("name" + i),
                    A.label(W.tr`Counter ${"" + i}`)
                  )
                ]),
                A.id("div" + i)
              )
            )
            .concat([
              pipe(
                W.button(() => () => console.log("LOG:", model)),
                A.label(W.tr`Salva`),
                A.id("test")
              )
            ])
        )
      ),
      longList
    ]);
}


function render3(model: Model) {
  return (update: (newModel: Model) => I.IO<void>) => W.list([
    pipe(W.text(W.tr`Hello`), A.id("a")),
    pipe(W.text(W.tr`World`), A.id("b"))
  ])
}

let appModel: Model = spamTest;

export function App() {
  return (
    <RR.AppRunner
      getApp={() => {
        return render(appModel)(newValue => {
          //console.log("STATE UPDATE", newValue);
          return () => {
            //console.log("STATE UPDATED", newValue);
            appModel = newValue;
          };
        });
      }}
    />
  );
}
