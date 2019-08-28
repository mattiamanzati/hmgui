import * as W from "./widgets";
import * as C from "./context";
import * as dsl from "./dsl";
import * as hlist from "./data/hlist";
import * as React from "react";
import { Observable, Subject, from, BehaviorSubject } from "rxjs";
import * as rxOp from "rxjs/operators";
import * as I from "fp-ts/lib/IO";
import * as IR from "fp-ts/lib/IORef";
import * as O from "fp-ts/lib/Option";
import * as RR from "./react";
import * as N from "./data/next";
import { pipe } from "fp-ts/lib/pipeable";

type Model = {
  name: string;
  surname: string;
  age: number;
};

function render(model: Model) {
  return (update: (newModel: Model) => I.IO<void>) =>
    W.container(
      W.container(
        W.text(W.tr`Età:`),
        W.id("age")(W.number(model.age, age => update({ ...model, age })))
      ),
      W.container(
        W.text(W.tr`Nome:`),
        W.id("name")(W.input(model.name, name => update({ ...model, name })))
      ),
      W.container(
        W.text(W.tr`Cognome:`),
        W.id("surname")(
          W.input(model.surname, surname => update({ ...model, surname }))
        )
      ),
      W.text(
        W.tr`Ciao ${model.name} ${
          model.surname
        }, complimenti per i tuoi ${model.age.toFixed(0)} anni!`
      )
    );
}

let appModel: Model = {
  name: "",
  surname: "",
  age: 0
};

export function App() {
  return (
    <RR.AppRunner
      getApp={() => {
        return render(appModel)(newValue => {
          console.log("STATE UPDATE", newValue);
          return () => {
            console.log("STATE UPDATED", newValue);
            appModel = newValue;
          };
        });
      }}
    />
  );
}
