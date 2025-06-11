import { useMemo } from "react";
import { repeat } from "./utils";

export const useOptions = () => {
  const b = useMemo(() => ["e/5"], []);
  const p = useMemo(() => ["f/4"], []);
  const rest = useMemo(() => ["g/4"], []);
  const triplet = useMemo(() => "triplet", []);
  const options = useMemo(
    () => [
      // base
      [
        [b, 4],
        [p, 8],
        [b, 8],
        [p, 4],
      ],
      [
        [b, 4],
        [p, 4],
        [p, 4],
      ],
      // dos corcheas al ppio
      [
        [b, 8],
        [b, 8],
        [p, 8],
        [b, 8],
        [p, 4],
      ],
      [
        [b, 8],
        [p, 8],
        [p, 8],
        [b, 8],
        [p, 4],
      ],
      // dos corchear al final
      [
        [b, 4],
        [p, 8],
        [b, 8],
        [p, 8],
        [p, 8],
      ],
      [
        [b, 4],
        [p, 8],
        [b, 8],
        [p, 8],
        [b, 8],
      ],
      // silencio al ppio
      [
        [rest, 8],
        [b, 8],
        [p, 8],
        [b, 8],
        [p, 4],
      ],
      [
        [rest, 8],
        [p, 8],
        [p, 8],
        [b, 8],
        [p, 4],
      ],
      // repiqueteo
      [[b, 8], [p, 8], [p, 8], triplet, [p, 8], [b, 8], [p, 4]],
      [[b, 8], [b, 8], [p, 8], triplet, [p, 8], [b, 8], [p, 4]],
      // [
      //   [g, 8],
      //   [g, 8],
      //   [e, 8],
      //   triplet,
      //   [e, 8],
      //   [g, 8],
      //   [rest, 8],
      //   [e, 8],
      //   [e, 4],
      //   [e, 8],
      //   [g, 8],
      //   [e, 4],
      // ],

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
        [b, 4],
        [p, 4],
        [p, 8],
        [b, 8],
      ],
      [
        [rest, 8],
        [b, 8],
        [p, 4],
        [p, 4],
      ],

      // repiqueteo
      // [
      //   [g, "16"],
      //   [e, "16"],
      //   [e, 8],
      //   [e, 8],
      //   [g, 4],
      //   [rest, 8],
      // ],
    ],
    [p, b, rest, triplet]
  );

  const chacareraOptions = useMemo(
    () => ({
      // base
      simple: [
        [b, 4],
        [p, 8],
        [b, 8],
        [p, 4],
      ],
      basico_simple: [
        [b, 4],
        [p, 4],
        [p, 4],
      ],
      // dos corcheas al ppio
      dos_corcheas_ppio_b_b: [
        [b, 8],
        [b, 8],
        [p, 8],
        [b, 8],
        [p, 4],
      ],
      dos_corcheas_ppio_b_p: [
        [b, 8],
        [p, 8],
        [p, 8],
        [b, 8],
        [p, 4],
      ],
      // dos corchear al final
      dos_corcheas_final_p_p: [
        [b, 4],
        [p, 8],
        [b, 8],
        [p, 8],
        [p, 8],
      ],
      dos_corcheas_final_p_b: [
        [b, 4],
        [p, 8],
        [b, 8],
        [p, 8],
        [b, 8],
      ],
      // silencio al ppio
      silencio_ppio_b: [
        [rest, 8],
        [b, 8],
        [p, 8],
        [b, 8],
        [p, 4],
      ],
      silencio_ppio_p: [
        [rest, 8],
        [p, 8],
        [p, 8],
        [b, 8],
        [p, 4],
      ],
      // repiqueteo
      repiqueteo_b_p: [[b, 8], [p, 8], [p, 8], triplet, [p, 8], [b, 8], [p, 4]],
      repiqueteo_b_b: [[b, 8], [b, 8], [p, 8], triplet, [p, 8], [b, 8], [p, 4]],

      // variaciones
      var_1: [
        [b, 4],
        [p, 4],
        [p, 8],
        [b, 8],
      ],
      dos_corcheas_ppio_s_b_negra_b_negra_b: [
        [rest, 8],
        [b, 8],
        [p, 4],
        [p, 4],
      ],
      dos_corcheas_ppio_s_b_dos_corcheas_final_b_b: [
        [rest, 8],
        [b, 8],
        [p, 8],
        [b, 8],
        [p, 8],
        [b, 8],
      ],
    }),
    [p, b, rest, triplet]
  );

  const endingOptions = useMemo(
    () => [
      [
        [
          [b, 8],
          [b, 8],
          [p, 8],
          [b, 8],
          [p, 8],
          [p, 8],
        ],
        [
          [p, 4],
          [p, 8],
          [b, 8],
          [p, 4],
        ],
      ],
      [
        [[b, 8], [p, 8], [p, 8], triplet, [p, 8], [b, 8], [rest, 8], [p, 8]],
        [
          [p, 4],
          [p, 8],
          [b, 8],
          [p, 4],
        ],
      ],
      [
        [[b, 8], [b, 8], [p, 8], triplet, [p, 8], [b, 8], [rest, 8], [p, 8]],
        [
          [p, 4],
          [p, 8],
          [b, 8],
          [p, 4],
        ],
      ],
    ],
    [p, b, rest, triplet]
  );

  const introOptions = useMemo(
    () => ({
      simple: [
        [b, 8],
        [rest, 8],
        [b, 8],
        [b, 8],
        [rest, 8],
        [b, 8],
      ],
      chosa: [
        [rest, 8],
        [b, 8],
        [rest, 8],
        [b, 8],
        [rest, 8],
        [b, 8],
      ],
    }),
    [b, rest]
  );

  const chacareras = useMemo(
    () => ({
      la_sixto_violin: {
        Intro: [
          [
            [p, 4],
            [b, 8],
            [b, 8],
            [rest, 8],
            [b, 8],
          ],

          introOptions.chosa,
          introOptions.simple,

          [
            [rest, 8],
            [b, 8],
            [rest, 8],
            [b, 8],
            [p, 8],
            [p, 8],
          ],
        ],
        Interludio: [
          ...repeat(
            [
              [rest, 4],
              [p, 4],
              [p, 4],
            ],
            3
          ),
        ],
        Estribillo: [
          chacareraOptions.simple,
          chacareraOptions.dos_corcheas_final_p_b,
          chacareraOptions.dos_corcheas_ppio_s_b_dos_corcheas_final_b_b,
          chacareraOptions.dos_corcheas_ppio_s_b_negra_b_negra_b,

          chacareraOptions.simple,
          chacareraOptions.basico_simple,
          chacareraOptions.dos_corcheas_ppio_b_b,
          chacareraOptions.basico_simple,
        ],
      },
    }),
    [
      b,
      chacareraOptions.basico_simple,
      chacareraOptions.dos_corcheas_final_p_b,
      chacareraOptions.dos_corcheas_ppio_b_b,
      chacareraOptions.dos_corcheas_ppio_s_b_dos_corcheas_final_b_b,
      chacareraOptions.dos_corcheas_ppio_s_b_negra_b_negra_b,
      chacareraOptions.simple,
      introOptions.chosa,
      introOptions.simple,
      p,
      rest,
    ]
  );

  return {
    options,
    endingOptions,
    p,
    b,
    rest,
    triplet,
    chacareraOptions,
    chacareras,
  };
};
