import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import {
  Renderer,
  Stave,
  StaveNote,
  Formatter,
  Beam,
} from "vexflow";
import IconButton from "@mui/material/IconButton";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";

const g = ["b/4"];
const e = ["e/4"];
const rest = ["g/4"];
const beatsPerBar = 3; // Number of beats in a bar (e.g., 4 for 4/4 time)

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
];

const context = new (window.AudioContext || window.webkitAudioContext)();
const masterGain = context.createGain();
masterGain.connect(context.destination);

function playClick(isBarFirstClick) {
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
  gainNode.connect(masterGain);

  oscillator.start();
  oscillator.stop(context.currentTime + 0.05); // Shorter duration
}

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

const Accordion = ({ title, children }) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="border rounded-md mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 text-left bg-gray-200 hover:bg-gray-300 transition duration-300 flex justify-between items-center"
      >
        <span className="font-semibold">{title}</span>
        <svg
          className={`w-5 h-5 transform transition-transform duration-300 ${
            isOpen ? "rotate-180" : "rotate-0"
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {isOpen && <div className="p-4 bg-white">{children}</div>}
    </div>
  );
};

function App() {
  const containerRef = useRef(null);
  const [score, setScore] = useState([]);
  const [intervalIds, setIntervalIds] = useState([]);
  const [playing, setPlaying] = useState(false);
  const [barCount, setBarCount] = useState(16);
  const [preCount, setPreCount] = useState(0);
  const [tempo, setTempo] = useState(100);
  const [barIndex, setBarIndex] = useState(-2);
  const [isMuted, setIsMuted] = useState(false);

  const toggleMute = () => {
    setIsMuted((prev) => {
      const newMutedState = !prev;
      masterGain.gain.setValueAtTime(
        newMutedState ? 0 : 1,
        context.currentTime
      );
      return newMutedState;
    });
  };

  const secondsPerBeat = useMemo(() => 60 / tempo, [tempo]);
  const barDuration = secondsPerBeat * beatsPerBar * 1000; // Duration in milliseconds
  const millisecondsPerBeat = useMemo(
    () => secondsPerBeat * 1000,
    [secondsPerBeat]
  );

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
    const systemHeight = 120;
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
      const isCurrent = i === barIndex;
      const noteColor = isCurrent || !playing ? "#000000" : "#696262";

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

      let notes = barNotes.map((n) => new StaveNote(n));
      notes = notes.map((n) =>
        n.setStyle({ fillStyle: noteColor, strokeStyle: noteColor })
      );
      const beams = Beam.generateBeams(notes);
      Formatter.FormatAndDraw(context, stave, notes);
      beams.forEach((b) => {
        b.setStyle({ fillStyle: noteColor, strokeStyle: noteColor });
        b.setContext(context).drawWithStyle();
      });
    });
  }, [barIndex, playing, score, tempo]);

  const playMethronomeBar = useCallback(() => {
    playClick(true);
    setBarIndex((prev) => (prev + 1) % barCount);
    setTimeout(() => playClick(false), millisecondsPerBeat);
    setTimeout(() => playClick(false), millisecondsPerBeat * 2);
  }, [barCount, millisecondsPerBeat]);

  const onStart = useCallback(() => {
    // let regenerateId;
    // setTimeout(() => {
    //   regenerateId = setInterval(selectRandomBars, barDuration * barCount);
    //   setIntervalIds((prev) => [...prev, regenerateId]);
    // }, barDuration);

    setPreCount(1);
    playMethronomeBar();
    const methronomeId = setInterval(
      playMethronomeBar,
      millisecondsPerBeat * beatsPerBar
    );
    setIntervalIds((prev) => [...prev, methronomeId]);
    setPlaying(true);
  }, [
    barCount,
    barDuration,
    millisecondsPerBeat,
    playMethronomeBar,
    selectRandomBars,
  ]);

  const onStop = useCallback(() => {
    intervalIds.forEach((x) => clearInterval(x));
    setBarIndex(-2);
    setPlaying(false);
    setIntervalIds([]);
    setIsMuted(false);
  }, [intervalIds]);

  useEffect(() => {
    if (preCount) {
      if (preCount > beatsPerBar) {
        setPreCount("");
      } else {
        setTimeout(() => {
          setPreCount((prev) => prev + 1);
        }, millisecondsPerBeat);
      }
    }
  }, [millisecondsPerBeat, preCount, tempo]);

  return (
    <div className="flex flex-col items-center mt-10 space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">
        Ejercicio Rítmico Folklore
      </h1>

      <div className="flex flex-wrap justify-center gap-4">
        {!playing && (
          <button
            onClick={onStart}
            className="px-5 py-2 bg-green-500 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition duration-200"
          >
            Iniciar
          </button>
        )}
        {playing && (
          <button
            onClick={onStop}
            className="px-5 py-2 bg-white text-red-500 outline outline-2 outline-red-500 font-semibold rounded-lg shadow-md hover:bg-red-50 transition duration-200"
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
        {playing && (
          <IconButton
            onClick={toggleMute}
            aria-label={isMuted ? "Activar sonido" : "Silenciar"}
            sx={{ color: "#000000" }} // Establece el color a negro
          >
            {isMuted ? <VolumeOffIcon /> : <VolumeUpIcon />}
          </IconButton>
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

      {!playing && (
        <div className="mt-8 w-full max-w-4xl px-4">
          <Accordion title="⚙️ Configuración">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label
                  htmlFor="tempo"
                  className="block text-sm font-medium text-gray-700"
                >
                  Tempo (BPM)
                </label>
                <input
                  type="number"
                  id="tempo"
                  min="40"
                  max="240"
                  value={tempo}
                  onChange={(e) => setTempo(Number(e.target.value))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label
                  htmlFor="bars"
                  className="block text-sm font-medium text-gray-700"
                >
                  Cantidad de compases
                </label>
                <input
                  type="number"
                  id="bars"
                  min="1"
                  max="32"
                  value={barCount}
                  onChange={(e) => setBarCount(Number(e.target.value))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </Accordion>
        </div>
      )}
    </div>
  );
}

export default App;
