import { useCallback, useEffect, useRef, useState } from "react";
import {
  Renderer,
  Stave,
  StaveNote,
  Formatter,
  Beam,
  Voice,
  System,
} from "vexflow";

const g = ["b/4"];
const e = ["e/4"];
const rest = ["g/4"];
const tempo = 120;
const beatsPerBar = 3; // Number of beats in a bar (e.g., 4 for 4/4 time)
const secondsPerBeat = 60 / tempo;
const barDuration = secondsPerBeat * beatsPerBar * 1000; // Duration in milliseconds

const options = [
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
];

function generateRandomBar() {
  const notes = [];
  let beats = 0;
  while (beats < 4) {
    if (4 - beats >= 1 && Math.random() > 0.5) {
      notes.push({ keys: ["g/4"], duration: "q" }); // quarter note
      beats += 1;
    } else if (4 - beats >= 0.5) {
      notes.push({ keys: ["g/4"], duration: "8" }); // eighth note
      beats += 0.5;
    }
  }
  return notes;
}

function playClick(isBarFirstClick) {
  const context = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();

  oscillator.type = "sine"; // Smoother waveform
  oscillator.frequency.setValueAtTime(
    isBarFirstClick ? 1200 : 800,
    context.currentTime
  ); // Lower frequency
  gainNode.gain.setValueAtTime(1, context.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.05); // Quick fade out

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);

  oscillator.start();
  oscillator.stop(context.currentTime + 0.05); // Shorter duration
}

const playMethronomeBar = () => {
  const interval = (60 / tempo) * 1000; // Interval in milliseconds
  playClick(true);
  setTimeout(() => playClick(false), interval);
  setTimeout(() => playClick(false), interval * 2);
};

const processNote = (note) => {
  const result = {
    keys: note[0],
    duration: note[1],
  };
  if (result.keys == rest) {
    result["type"] = "r";
  }
  return result;
};

const selectRandomBar = () => {
  return options[Math.floor(Math.random() * options.length)].map((note) =>
    processNote(note)
  );
};

function App() {
  const containerRef = useRef(null);
  const [score, setScore] = useState([]);
  const [intervalIds, setIntervalIds] = useState([]);
  const [playing, setPlaying] = useState(false);
  const [barCount, setBarCount] = useState(8);
  const [preCount, setPreCount] = useState(0);

  const selectRandomBars = useCallback(() => {
    setScore(new Array(barCount).fill(null).map(selectRandomBar));
  }, [barCount]);

  useEffect(() => {
    selectRandomBars();
  }, [selectRandomBars]);

  useEffect(() => {
    if (!containerRef.current || score.length === 0) return;

    containerRef.current.innerHTML = ""; // Clear previous rendering

    const renderer = new Renderer(containerRef.current, Renderer.Backends.SVG);
    const context = renderer.getContext();

    const barsPerSystem = 4;
    const barWidth = 220;
    const systemWidth = barWidth * barsPerSystem;
    const systemHeight = 120; // Height between systems
    const startX = 10;
    const startY = 40;

    const totalSystems = Math.ceil(score.length / barsPerSystem);
    const svgHeight = startY + totalSystems * systemHeight;
    renderer.resize(systemWidth + startX * 2, svgHeight);

    score.forEach((barNotes, i) => {
      const systemIndex = Math.floor(i / barsPerSystem);
      const barIndexInSystem = i % barsPerSystem;

      const x = startX + barIndexInSystem * barWidth;
      const y = startY + systemIndex * systemHeight;

      let stave;
      if (barIndexInSystem === 0) {
        stave = new Stave(x, y, barWidth);
        if (i === 0) {
          stave.setTempo(
            {
              duration: "q",
              dots: 0,
              bpm: tempo,
            },
            -20
          );
          stave.addClef("treble").addTimeSignature("3/4");
        }
      } else {
        stave = new Stave(x, y, barWidth);
      }
      stave.setContext(context).draw();

      const notes = barNotes.map((n) => new StaveNote(n));
      const beams = Beam.generateBeams(notes);
      Formatter.FormatAndDraw(context, stave, notes);
      beams.forEach((b) => {
        b.setContext(context).draw();
      });
    });
  }, [score]);

  const onStart = useCallback(() => {
    let regenerateId;
    setTimeout(() => {
      regenerateId = setInterval(selectRandomBars, barDuration * barCount);
      setIntervalIds((prev) => [...prev, regenerateId]);
    }, barDuration);

    const interval = (60 / tempo) * 1000; // Interval in milliseconds
    setPreCount(1);
    playMethronomeBar();
    const methronomeId = setInterval(playMethronomeBar, interval * beatsPerBar);
    setIntervalIds((prev) => [...prev, methronomeId]);
    setPlaying(true);
  }, [barCount, selectRandomBars]);

  const onStop = useCallback(() => {
    intervalIds.forEach((x) => clearInterval(x));
    setPlaying(false);
    setIntervalIds([]);
  }, [intervalIds]);

  useEffect(() => {
    const interval = (60 / tempo) * 1000; // Interval in milliseconds
    if (preCount) {
      if (preCount > beatsPerBar) {
        setPreCount("");
      } else {
        setTimeout(() => {
          setPreCount((prev) => prev + 1);
        }, interval);
      }
    }
  }, [preCount]);

  return (
    <div className="flex flex-col items-center mt-10 space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">
        Ejercicio Rítmico Folklore
      </h1>

      <div className="flex flex-wrap justify-center gap-4">
        {!playing && (
          <button
            onClick={onStart}
            className="px-5 py-2 bg-green-500 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition duration-200"
          >
            Iniciar
          </button>
        )}
        {playing && (
          <button
            onClick={onStop}
            className="px-5 py-2 bg-white text-red-500 outline outline-2 outline-red-500 font-semibold rounded-lg shadow-md hover:bg-red-600 transition duration-200"
          >
            Detener
          </button>
        )}
        {!playing && (
          <button
            onClick={selectRandomBars}
            className="px-5 py-2 bg-white text-blue-500 font-semibold rounded-lg shadow-md outline outline-2 outline-blue-500 hover:bg-blue-50 transition duration-200"
          >
            Generar Nuevo
          </button>
        )}
      </div>

      {playing && preCount > 0 && (
        <div className="flex items-center justify-center mt-4">
          <span className="text-lg font-medium text-gray-700 mr-2">
            ¡Preparate!
          </span>
          <span className="inline-flex items-center justify-center w-10 h-10 bg-yellow-400 text-white font-bold rounded-full animate-pulse">
            {preCount}
          </span>
        </div>
      )}

      <div ref={containerRef} className="mt-6 w-full max-w-4xl"></div>
    </div>
  );
}

export default App;
