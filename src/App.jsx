import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { Renderer, Stave, StaveNote, Formatter, Beam, Tuplet } from "vexflow";
import IconButton from "@mui/material/IconButton";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import { useOptions } from "./useOptions";

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
  const hintContainerRef = useRef(null);
  const [score, setScore] = useState([]);
  const [intervalIds, setIntervalIds] = useState([]);
  const [playing, setPlaying] = useState(false);
  const [barCount, setBarCount] = useState(4);
  const [barsPerSystem, setbBarsPerSystem] = useState(2);
  const [preCount, setPreCount] = useState(0);
  const [tempo, setTempo] = useState(100);
  const [barIndex, setBarIndex] = useState(-1);
  const [isMuted, setIsMuted] = useState(false);
  const [firstNextBar, setFirstNextBar] = useState(null);
  const [regenerateOnFinish, setRegenerateOnFinish] = useState(false);

  const { options, rest, triplet } = useOptions();

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

  const beatsPerBar = useMemo(() => 3, []);

  const secondsPerBeat = useMemo(() => 60 / tempo, [tempo]);

  const millisecondsPerBeat = useMemo(
    () => secondsPerBeat * 1000,
    [secondsPerBeat]
  );

  const millisecondsPerBar = useMemo(
    () => millisecondsPerBeat * beatsPerBar,
    [beatsPerBar, millisecondsPerBeat]
  );

  // const totalMilliseconds = useMemo(
  //   () => millisecondsPerBar * barCount,
  //   [barCount, millisecondsPerBar]
  // );

  const processNote = useCallback(
    (note) => {
      if (note === triplet) return triplet;
      const result = {
        keys: note[0],
        duration: note[1],
      };
      if (result.keys == rest) {
        result["type"] = "r";
      }
      return result;
    },
    [rest, triplet]
  );

  const selectRandomBar = useCallback(() => {
    return options[Math.floor(Math.random() * options.length)].map((note) =>
      processNote(note)
    );
  }, [options, processNote]);

  const selectRandomBars = useCallback(() => {
    setScore(new Array(barCount).fill(null).map(selectRandomBar));
  }, [barCount, selectRandomBar]);

  useEffect(() => {
    setScore(new Array(barCount).fill(null).map(selectRandomBar));
  }, [barCount, selectRandomBar]);

  const paintBar = useCallback(
    (
      barNotes,
      context,
      startX,
      startY,
      barWidth,
      systemHeight,
      i,
      drawTempo
    ) => {
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
          if (drawTempo) {
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
        }
      } else {
        stave = new Stave(x, y, barWidth);
      }
      stave.setContext(context).draw();

      let notes = barNotes.map((n) =>
        n === triplet ? triplet : new StaveNote(n)
      );
      let triplets = [];
      if (notes.includes(triplet)) {
        notes.forEach((n, i) => {
          if (n === triplet) {
            console.log(notes.slice(i - 3, i));
            triplets.push(notes.slice(i - 3, i));
          }
        });
        notes = notes.filter((n) => n !== triplet);
        triplets = triplets.map((t) => new Tuplet(t));
      }
      notes = notes.map((n) =>
        n.setStyle({ fillStyle: noteColor, strokeStyle: noteColor })
      );
      const beams = Beam.generateBeams(notes);
      Formatter.FormatAndDraw(context, stave, notes);
      beams.forEach((b) => {
        b.setStyle({ fillStyle: noteColor, strokeStyle: noteColor });
        b.setContext(context).drawWithStyle();
      });

      triplets.forEach((t) => t.setContext(context).draw());
    },
    [barIndex, barsPerSystem, playing, tempo, triplet]
  );

  const paint = useCallback(() => {
    if (!containerRef.current || score.length === 0) return;

    containerRef.current.innerHTML = ""; // Clear previous rendering

    const renderer = new Renderer(containerRef.current, Renderer.Backends.SVG);
    const context = renderer.getContext();

    // Calculate the desired system width as 80% of the viewport width
    const systemWidth = containerRef.current.offsetWidth;
    const barWidth = systemWidth / barsPerSystem;
    const systemHeight = 140;
    const startX = 10;
    const startY = 40;

    const totalSystems = Math.ceil(score.length / barsPerSystem);
    const svgHeight = startY + totalSystems * systemHeight;
    renderer.resize(systemWidth + startX * 2, svgHeight);
    score.forEach((barNotes, i) => {
      paintBar(
        barNotes,
        context,
        startX,
        startY,
        barWidth,
        systemHeight,
        i,
        true
      );
    });
  }, [barsPerSystem, paintBar, score]);

  const paintHint = useCallback(() => {
    if (!hintContainerRef.current || firstNextBar === null) return;

    hintContainerRef.current.innerHTML = ""; // Clear previous rendering

    const renderer = new Renderer(
      hintContainerRef.current,
      Renderer.Backends.SVG
    );
    const context = renderer.getContext();

    // Calculate the desired system width as 80% of the viewport width
    const systemWidth = hintContainerRef.current.offsetWidth;
    const barWidth = systemWidth / barsPerSystem;
    const systemHeight = 120;
    const startX = 10;
    const startY = 40;

    const totalSystems = 1;
    const svgHeight = startY + totalSystems * systemHeight;
    renderer.resize(systemWidth + startX * 2, svgHeight);

    paintBar(
      firstNextBar,
      context,
      startX,
      startY,
      barWidth,
      systemHeight,
      0,
      false
    );

    // let stave;
    // stave = new Stave(x, y, barWidth);
    // stave.setContext(context).draw();

    // let notes = firstNextBar.map((n) => new StaveNote(n));
    // notes = notes.map((n) =>
    //   n.setStyle({ fillStyle: noteColor, strokeStyle: noteColor })
    // );
    // const beams = Beam.generateBeams(notes);
    // Formatter.FormatAndDraw(context, stave, notes);
    // beams.forEach((b) => {
    //   b.setStyle({ fillStyle: noteColor, strokeStyle: noteColor });
    //   b.setContext(context).drawWithStyle();
    // });
  }, [barsPerSystem, firstNextBar, paintBar]);

  const update = useCallback(() => {
    setBarIndex((prevBarIndex) => {
      const newBarIndex = (prevBarIndex + 1) % barCount;
      return newBarIndex;
    });
  }, [barCount]);

  useEffect(() => {
    setFirstNextBar((prevFirstNextBar) => {
      const leftBars = barCount - barIndex;

      let newFirstNextBar = prevFirstNextBar;

      if (regenerateOnFinish && leftBars === 1 && !prevFirstNextBar) {
        newFirstNextBar = selectRandomBar();
      } else if (barIndex === 1) {
        newFirstNextBar = null;
      }
      return newFirstNextBar;
    });
  }, [barCount, barIndex, regenerateOnFinish, selectRandomBar]);

  useEffect(() => {
    if (regenerateOnFinish && barIndex === 0) {
      const newScore = new Array(barCount).fill(null).map(selectRandomBar);
      if (firstNextBar !== null) {
        newScore[0] = firstNextBar;
      }
      setScore(newScore);
    }
  }, [barCount, barIndex, firstNextBar, regenerateOnFinish, selectRandomBar]);

  useEffect(paint, [paint, score]);
  useEffect(() => {
    paintHint();
  }, [paintHint, firstNextBar]);

  const playMethronomeBar = useCallback(() => {
    playClick(true);
    setTimeout(() => playClick(false), millisecondsPerBeat);
    setTimeout(() => playClick(false), millisecondsPerBeat * 2);
  }, [millisecondsPerBeat]);

  const onStart = useCallback(() => {
    let regenerateId;
    regenerateId = setInterval(() => update(), millisecondsPerBar);
    setIntervalIds((prev) => [...prev, regenerateId]);

    setPreCount(1);
    playMethronomeBar();
    const methronomeId = setInterval(playMethronomeBar, millisecondsPerBar);
    setIntervalIds((prev) => [...prev, methronomeId]);
    setPlaying(true);
  }, [millisecondsPerBar, playMethronomeBar, update]);

  const onStop = useCallback(() => {
    intervalIds.forEach((x) => clearInterval(x));
    setBarIndex(-1);
    setPlaying(false);
    setIntervalIds([]);
    setIsMuted(false);
    setFirstNextBar(null);
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
  }, [beatsPerBar, millisecondsPerBeat, preCount, tempo]);

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

      <div
        ref={containerRef}
        className="mt-2 w-full max-w-7xl mx-auto px-4"
      ></div>
      {firstNextBar && barCount - barIndex === 1 && (
        <section className="mt-6 w-full max-w-7xl px-4 mx-auto">
          <h2 className="text-lg font-semibold text-gray-700">Siguiente:</h2>
          <div ref={hintContainerRef}></div>
        </section>
      )}
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
              <div>
                <label
                  htmlFor="bars"
                  className="block text-sm font-medium text-gray-700"
                >
                  Compases por sistema
                </label>
                <input
                  type="number"
                  id="bars-per-system"
                  min="1"
                  max="8"
                  value={barsPerSystem}
                  onChange={(e) => setbBarsPerSystem(Number(e.target.value))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex items-center">
                <input
                  id="regenerate-on-finish"
                  type="checkbox"
                  checked={regenerateOnFinish}
                  onChange={(e) => setRegenerateOnFinish(e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label
                  htmlFor="regenerate-on-finish"
                  className="ml-2 block text-sm text-gray-700"
                >
                  Regenerar al finalizar
                </label>
              </div>
            </div>
          </Accordion>
        </div>
      )}
    </div>
  );
}

export default App;
