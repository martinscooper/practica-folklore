import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { Renderer, Stave, StaveNote, Formatter, Beam, Tuplet } from "vexflow";
import IconButton from "@mui/material/IconButton";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import { useOptions } from "./useOptions";
import { useLocalStorage } from "@uidotdev/usehooks";
import { formatChacareraOption } from "./utils";
import useMedia from "use-media";

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
  const [preCount, setPreCount] = useState(0);
  const [barIndex, setBarIndex] = useState(-1);
  const [firstNextBar, setFirstNextBar] = useState(null);
  const [isFirstBar, setIsFirstBar] = useState(false);
  const [preselectedEnding, setPreselectedEnding] = useState(null);

  const isSm = useMedia({ minWidth: 640 });
  const isMd = useMedia({ minWidth: 768 });
  const isLg = useMedia({ minWidth: 1024 });
  const isXl = useMedia({ minWidth: 1280 });
  const is2Xl = useMedia({ minWidth: 1536 });

  const barsPerSystem = useMemo(
    () => (is2Xl ? 4 : isXl ? 4 : isLg ? 4 : isMd ? 2 : isSm ? 2 : 2),
    [is2Xl, isLg, isMd, isSm, isXl]
  );

  const scoreMarginPercentage = useMemo(
    () =>
      is2Xl ? 0.25 : isXl ? 0.2 : isLg ? 0.15 : isMd ? 0.1 : isSm ? 0.1 : 0.05,
    [is2Xl, isLg, isMd, isSm, isXl]
  );

  const defaultConfig = useMemo(
    () => ({
      barCount: 4,
      tempo: 100,
      isMuted: false,
      regenerateOnFinish: false,
      useEndings: true,
    }),
    []
  );

  const [config, setConfig, _] = useLocalStorage(
    "practica_karaoke_config",
    defaultConfig
  );

  const resetConfig = useCallback(() => {
    setConfig(defaultConfig);
  }, [defaultConfig, setConfig]);

  const isConfigValid = useMemo(
    () => Object.values(config).every((v) => v !== null),
    [config]
  );

  const { barCount, tempo, isMuted, regenerateOnFinish, useEndings } = config;

  const { options, endingOptions, rest, triplet, b, chacareras } = useOptions();

  const toggleMute = () => {
    setConfig((prev) => {
      const newMutedState = !prev.isMuted;
      masterGain.gain.setValueAtTime(
        newMutedState ? 0 : 1,
        context.currentTime
      );
      return { ...prev, isMuted: newMutedState };
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
      if (result.keys === b) {
        result["type"] = "x";
      }
      return result;
    },
    [b, rest, triplet]
  );

  const selectSong = useCallback(
    (song) =>
      setScore(
        Object.fromEntries(
          Object.entries(song).map(([sectionName, sectionBars]) => [
            sectionName,
            sectionBars.map((bar) => bar.map((n) => processNote(n))),
          ])
        )
      ),
    [processNote]
  );

  const selectRandomBar = useCallback(() => {
    return options[Math.floor(Math.random() * options.length)].map((note) =>
      processNote(note)
    );
  }, [options, processNote]);

  const selectRandomEnding = useCallback(() => {
    return endingOptions[Math.floor(Math.random() * endingOptions.length)].map(
      (bar) => bar.map((note) => processNote(note))
    );
  }, [endingOptions, processNote]);

  const getRandomBars = useCallback(() => {
    let newScore = new Array(barCount).fill(null).map(selectRandomBar);

    if (useEndings) {
      const ending = selectRandomEnding();
      setPreselectedEnding(ending);
      if (barIndex >= 0 || !regenerateOnFinish) {
        newScore[0] = ending[1];
      }
      newScore[newScore.length - 1] = ending[0];
    }
    return newScore;
  }, [
    barCount,
    barIndex,
    regenerateOnFinish,
    selectRandomBar,
    selectRandomEnding,
    useEndings,
  ]);

  const selectRandomBars = useCallback(() => {
    setScore(getRandomBars());
  }, [getRandomBars]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(selectRandomBars, []);

  const paintBar = useCallback(
    (
      barNotes,
      context,
      startX,
      startY,
      barWidth,
      systemHeight,
      i,
      drawTempo,
      sectionName,
      systemIndex
    ) => {
      const barIndexInSystem = i % barsPerSystem;

      const x = startX + barIndexInSystem * barWidth;
      const y = startY + systemIndex * systemHeight;
      const isCurrent = i === barIndex;
      const noteColor = isCurrent || !playing ? "#000000" : "#696262";
      let stave = new Stave(x, y, barWidth);
      if (barIndexInSystem === 0) {
        if (i === 0) {
          if (drawTempo) {
            stave.setTempo(
              {
                duration: "q",
                dots: 0,
                bpm: tempo,
              },
              -35
            );
            stave.addTimeSignature("3/4");
          }
          if (sectionName) {
            stave.setSection(sectionName, 0, 0, 15, false);
          }
        }
      }
      stave.setContext(context).draw();
      let notes = barNotes.map((n) =>
        n === triplet ? triplet : new StaveNote(n)
      );

      let triplets = [];
      if (notes.includes(triplet)) {
        notes.forEach((n, i) => {
          if (n === triplet) {
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

  const totalSystems = useMemo(() => {
    if (Array.isArray(score)) {
      return Math.ceil(score.length / barsPerSystem);
    } else {
      return Object.values(score)
        .map((s) => Math.ceil(s.length / barsPerSystem))
        .reduce((c, i) => c + i, 0);
    }
  }, [barsPerSystem, score]);

  const paint = useCallback(() => {
    if (!containerRef.current || score.length === 0 || !isConfigValid) return;

    containerRef.current.innerHTML = ""; // Clear previous rendering
    const renderer = new Renderer(containerRef.current, Renderer.Backends.SVG);
    const context = renderer.getContext();

    const availableWidth = containerRef.current.offsetWidth;
    const contentWidth = availableWidth * (1 - scoreMarginPercentage);
    const parsedScore = Array.isArray(score) ? { "": score } : score;
    // barWidth can potentially be have to be calculated by a value
    // minor than barsPerSystem, in the case there are no sections with
    // with number of bars equal or greater than barsPerSystem
    const barWidth =
      contentWidth /
      Math.min(
        barsPerSystem,
        Math.max(...Object.values(parsedScore).map((bars) => bars.length))
      );

    const systemHeight = 120;
    const startX = availableWidth * (scoreMarginPercentage / 2);
    const startY = 40;
    const svgWidth = contentWidth + startX;
    const svgHeight = startY * 2 + totalSystems * systemHeight;
    renderer.resize(svgWidth, svgHeight);

    Object.entries(parsedScore).forEach(
      ([sectionName, sectionBars], sectionIndex) =>
        sectionBars.forEach((barNotes, barIndex) =>
          paintBar(
            barNotes,
            context,
            startX,
            startY,
            barWidth,
            systemHeight,
            barIndex,
            sectionIndex === 0,
            sectionName,
            Object.values(score)
              .slice(0, sectionIndex)
              .map((bars) => Math.floor(bars.length / barsPerSystem))
              .reduce((sum, acc) => sum + acc, 0) +
              Math.floor(barIndex / barsPerSystem)
          )
        )
    );
  }, [
    barsPerSystem,
    isConfigValid,
    paintBar,
    score,
    scoreMarginPercentage,
    totalSystems,
  ]);

  const paintHint = useCallback(() => {
    if (!hintContainerRef.current || firstNextBar === null) return;
    hintContainerRef.current.innerHTML = ""; // Clear previous rendering

    const renderer = new Renderer(
      hintContainerRef.current,
      Renderer.Backends.SVG
    );
    const context = renderer.getContext();

    // Calculate the desired system width as 80% of the viewport width
    const availableWidth = containerRef.current.offsetWidth;
    const contentWidth = availableWidth * (1 - scoreMarginPercentage);
    const barWidth = contentWidth / barsPerSystem;
    const systemHeight = 120;
    const startX = 0; //availableWidth * (scoreMarginPercentage / 2);
    const startY = 20;
    const totalSystems = 1;
    const svgWidth = contentWidth + startX;
    const svgHeight = startY * 2 + totalSystems * systemHeight;
    renderer.resize(svgWidth, svgHeight);

    paintBar(
      firstNextBar,
      context,
      startX,
      startY,
      barWidth,
      systemHeight,
      0,
      false,
      "",
      0
    );
  }, [barsPerSystem, firstNextBar, paintBar, scoreMarginPercentage]);

  const update = useCallback(() => {
    setBarIndex((prevBarIndex) => {
      setIsFirstBar(prevBarIndex === -1);
      const newBarIndex = (prevBarIndex + 1) % barCount;
      return newBarIndex;
    });
  }, [barCount]);

  useEffect(() => {
    setFirstNextBar((prevFirstNextBar) => {
      const leftBars = barCount - barIndex;

      let newFirstNextBar = prevFirstNextBar;

      if (regenerateOnFinish && leftBars === 1 && !prevFirstNextBar) {
        if (useEndings && preselectedEnding !== null) {
          newFirstNextBar = preselectedEnding[1];
        } else {
          newFirstNextBar = selectRandomBar();
        }
      } else if (barIndex === 1) {
        newFirstNextBar = null;
      }
      return newFirstNextBar;
    });
  }, [
    barCount,
    barIndex,
    preselectedEnding,
    regenerateOnFinish,
    selectRandomBar,
    selectRandomEnding,
    useEndings,
  ]);

  useEffect(() => {
    if (regenerateOnFinish && barIndex === 0 && !isFirstBar) {
      const newScore = getRandomBars();
      if (firstNextBar !== null) {
        newScore[0] = firstNextBar;
      }
      setScore(newScore);
    }
  }, [
    barCount,
    barIndex,
    firstNextBar,
    getRandomBars,
    isFirstBar,
    regenerateOnFinish,
    selectRandomBar,
  ]);

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
    setConfig((prev) => ({ ...prev, isMuted: false }));
    setFirstNextBar(null);
  }, [intervalIds, setConfig]);

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
    <div className="flex flex-col justify-center items-center mt-6 space-y-6 md:mt-10">
      <h1 className="text-2xl font-bold text-gray-800 md:text-3xl">
        Ejercicio Rítmico Folklore
      </h1>
      <div className="flex flex-wrap justify-center gap-2 md:gap-4">
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
      <div ref={containerRef} className="mt-2 w-full mx-0"></div>
      {firstNextBar && barCount - barIndex === 1 && (
        <section className="mt-6 flex flex-col justify-center items-start gap-1">
          <div className="text-lg font-semibold text-gray-700">Siguiente:</div>
          <div ref={hintContainerRef}></div>
        </section>
      )}
      {!playing && (
        <div className="mt-8 w-full max-w-4xl px-2 md:px-4">
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
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      tempo: Number(e.target.value) || null,
                    }))
                  }
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
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      barCount: Number(e.target.value) || null,
                    }))
                  }
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex items-center">
                <input
                  id="regenerate-on-finish"
                  type="checkbox"
                  checked={regenerateOnFinish}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      regenerateOnFinish: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label
                  htmlFor="regenerate-on-finish"
                  className="ml-2 block text-sm text-gray-700"
                >
                  Regenerar al finalizar
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="add-endings"
                  type="checkbox"
                  checked={useEndings}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      useEndings: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label
                  htmlFor="add-endings"
                  className="ml-2 block text-sm text-gray-700"
                >
                  Agregar finales
                </label>
              </div>
              <button
                onClick={resetConfig}
                className="px-5 py-2 bg-white text-blue-500 font-semibold rounded-lg shadow-md outline outline-2 outline-blue-500 hover:bg-blue-50 transition duration-200"
              >
                Resetear configuración
              </button>
            </div>
          </Accordion>

          <Accordion title="⚙️ Opciones chacarera">
            {Object.keys(chacareras).map((k, i) => (
              <button key={i} onClick={() => selectSong(chacareras[k])}>
                {formatChacareraOption(k)}
              </button>
            ))}
          </Accordion>
        </div>
      )}
    </div>
  );
}

export default App;
