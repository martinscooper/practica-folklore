import { useMemo } from "react";

export const useOptions = () => {
  const g = useMemo(() => ["e/5"], []);
  const e = useMemo(() => ["e/4"], []);
  const rest = useMemo(() => ["g/4"], []);

  const options = useMemo(
    () => [
      // base
      [
        [g, "q"],
        [e, "8"],
        [g, "8"],
        [e, "q"],
      ],
      [
        [g, "q"],
        [e, "q"],
        [e, "q"],
      ],
      // dos corcheas al ppio
      [
        [g, "8"],
        [g, "8"],
        [e, "8"],
        [g, "8"],
        [e, "q"],
      ],
      [
        [g, "8"],
        [e, "8"],
        [e, "8"],
        [g, "8"],
        [e, "q"],
      ],
      // dos corchear al final
      [
        [g, "q"],
        [e, "8"],
        [g, "8"],
        [e, "8"],
        [e, "8"],
      ],
      [
        [g, "q"],
        [e, "8"],
        [g, "8"],
        [e, "8"],
        [g, "8"],
      ],
      // silencio al ppio
      [
        [rest, "8"],
        [g, "8"],
        [e, "8"],
        [g, "8"],
        [e, "q"],
      ],
      [
        [rest, "8"],
        [e, "8"],
        [e, "8"],
        [g, "8"],
        [e, "q"],
      ],
      // repiqueteo
      // [
      //   [g, '16'],
      //   [e, '16'],
      //   [e, '16'],
      //   [e, '16'],
      //   [e, '8'],
      //   [e, '8'],
      //   [g, '8'],
      //   [e, 'q'],
      // ]

      // silencio al final
      // [
      //   [g, 'q'],
      //   [e, '8'],
      //   [g, '8'],
      //   [e, '8'],
      //   [rest, '8'],
      // ],

      // variaciones
      [
        [g, "4"],
        [e, "4"],
        [e, "8"],
        [g, "8"],
      ],
      [
        [rest, "8"],
        [g, "8"],
        [e, "4"],
        [e, "4"],
      ],

      // repiqueteo
      // [
      //   [g, "16"],
      //   [e, "16"],
      //   [e, "8"],
      //   [e, "8"],
      //   [g, "4"],
      //   [rest, "8"],
      // ],
    ],
    [e, g, rest]
  );

  return { options, e, g, rest };
};
