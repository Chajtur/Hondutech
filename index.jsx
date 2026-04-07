export default function HondutechLanding() {
  const { useMemo, useState } = React;

  const companyData = {
    badge: "Hondutech · Soluciones que si hacen algo",
    title: "Creamos software, automatizaciones y herramientas que generan resultados.",
    subtitle:
      "Unimos desarrollo web, integraciones y automatizacion para que empresas operen mejor, vendan mas y pierdan menos tiempo.",
    whatsappUrl: "https://wa.me/50487955286",
    projectsCtaText: "Hola, me interesa conocer mas sobre el proyecto:",
  };

  const services = [
    {
      title: "Integraciones y automatizacion",
      desc: "Conectamos sistemas, APIs y procesos para reducir trabajo manual y errores operativos.",
    },
    {
      title: "Desarrollo web a medida",
      desc: "Landings, sistemas internos y paneles hechos para conversion, operacion y crecimiento.",
    },
    {
      title: "Bots y mensajeria",
      desc: "Flujos de SMS, recordatorios y notificaciones conectadas con tus plataformas actuales.",
    },
    {
      title: "Soporte y mejora continua",
      desc: "Mantenimiento, mejoras y nuevos modulos sobre productos que ya estan generando valor.",
    },
  ];

  const projects = [
    {
      title: "Interglobal CRM y automatizacion operativa",
      desc: "Evolucion de CRM en PHP para operacion de call center, gestion interna e integraciones empresariales.",
      tag: "PHP · CRM · Operaciones",
      impact: "Centralizo flujos de ventas, seguimiento y soporte en un solo sistema.",
    },
    {
      title: "Integracion y sincronizacion SMS con Ooma",
      desc: "Automatizacion de login, token y descarga de conversaciones para consolidar mensajes en CRM.",
      tag: "APIs · SMS · Automatizacion",
      impact: "Redujo tiempo de atencion y elimino trabajo manual de copia/pega.",
    },
    {
      title: "Ingesta de leads FMCSA y CAB Advantage",
      desc: "Flujos para descargar, transformar e importar prospectos de transporte a bases comerciales.",
      tag: "Data Pipeline · Leads",
      impact: "Acelero la disponibilidad de leads para el equipo comercial.",
    },
    {
      title: "WebMasterHR",
      desc: "Sistema web para reemplazar archivos de Excel de RRHH por una plataforma con base de datos.",
      tag: "HR Tech · Migracion",
      impact: "Estandarizo procesos internos y mejoro trazabilidad de informacion.",
    },
    {
      title: "SMS Companion Backend",
      desc: "Base para servicios de mensajeria, recordatorios y automatizaciones comerciales sobre infraestructura SMS.",
      tag: "Backend · SaaS",
      impact: "Aporto cimientos para nuevos modulos de comunicacion escalables.",
    },
    {
      title: "Corta.la",
      desc: "Proyecto orientado a enlaces cortos y utilidades digitales para marketing y seguimiento.",
      tag: "Utility · Marketing",
      impact: "Abre opciones de tracking y branding para campanas digitales.",
    },
    {
      title: "Maya FC / Futbol Kids web presence",
      desc: "Presencia web para iniciativas deportivas con enfoque de comunidad juvenil y familiar.",
      tag: "Web · Comunidad",
      impact: "Mejoro visibilidad y comunicacion del proyecto con su audiencia.",
    },
    {
      title: "Herramientas internas y landings a medida",
      desc: "Dashboards, formularios, modulos administrativos y utilidades para operacion real.",
      tag: "Custom Dev",
      impact: "Acelera ejecucion diaria con software adaptado a procesos del negocio.",
    },
  ];

  const quickBullets = [
    "Landing pages enfocadas en captacion de leads",
    "Sistemas internos y paneles administrativos",
    "Automatizacion de tareas, reportes y seguimiento",
    "Integracion de APIs y plataformas externas",
    "Herramientas de productividad para equipos",
    "Modulos utilitarios como este generador de passwords",
  ];

  const [length, setLength] = useState(16);
  const [count, setCount] = useState(5);
  const [includeLower, setIncludeLower] = useState(true);
  const [includeUpper, setIncludeUpper] = useState(true);
  const [includeNumbers, setIncludeNumbers] = useState(true);
  const [includeSymbols, setIncludeSymbols] = useState(true);
  const [generated, setGenerated] = useState([]);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [errorText, setErrorText] = useState("");

  const activeSets = useMemo(() => {
    const sets = [];
    if (includeLower) sets.push("abcdefghijklmnopqrstuvwxyz");
    if (includeUpper) sets.push("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
    if (includeNumbers) sets.push("0123456789");
    if (includeSymbols) sets.push("!@#$%^&*()-_=+[]{};:,.?/");
    return sets;
  }, [includeLower, includeUpper, includeNumbers, includeSymbols]);

  const charset = useMemo(() => activeSets.join(""), [activeSets]);

  const strength = useMemo(() => {
    const safeLength = Math.min(Math.max(Number(length) || 1, 4), 64);
    const variety = activeSets.length;
    const rawScore = safeLength * variety;

    if (variety === 0) {
      return { label: "Invalida", widthClass: "w-0", colorClass: "bg-rose-500" };
    }
    if (rawScore < 25) {
      return { label: "Debil", widthClass: "w-1/4", colorClass: "bg-rose-500" };
    }
    if (rawScore < 45) {
      return { label: "Media", widthClass: "w-2/4", colorClass: "bg-amber-400" };
    }
    if (rawScore < 70) {
      return { label: "Fuerte", widthClass: "w-3/4", colorClass: "bg-cyan-400" };
    }
    return { label: "Muy fuerte", widthClass: "w-full", colorClass: "bg-emerald-400" };
  }, [activeSets.length, length]);

  const applyPreset = (presetName) => {
    if (presetName === "web") {
      setLength(12);
      setIncludeLower(true);
      setIncludeUpper(true);
      setIncludeNumbers(true);
      setIncludeSymbols(false);
      return;
    }
    if (presetName === "saas") {
      setLength(16);
      setIncludeLower(true);
      setIncludeUpper(true);
      setIncludeNumbers(true);
      setIncludeSymbols(true);
      return;
    }
    if (presetName === "high") {
      setLength(24);
      setIncludeLower(true);
      setIncludeUpper(true);
      setIncludeNumbers(true);
      setIncludeSymbols(true);
    }
  };

  const buildOnePassword = (safeLength) => {
    const requiredChars = activeSets.map((set) => {
      const indexRef = new Uint32Array(1);
      crypto.getRandomValues(indexRef);
      return set[indexRef[0] % set.length];
    });

    const remainingLength = Math.max(safeLength - requiredChars.length, 0);
    const randomPool = new Uint32Array(remainingLength);
    crypto.getRandomValues(randomPool);

    const result = [...requiredChars];
    for (let i = 0; i < remainingLength; i += 1) {
      result.push(charset[randomPool[i] % charset.length]);
    }

    const orderRef = new Uint32Array(result.length);
    crypto.getRandomValues(orderRef);
    for (let i = result.length - 1; i > 0; i -= 1) {
      const swapIndex = orderRef[i] % (i + 1);
      const temp = result[i];
      result[i] = result[swapIndex];
      result[swapIndex] = temp;
    }

    return result.join("");
  };

  const generatePasswords = () => {
    if (!charset) {
      setErrorText("Selecciona al menos un tipo de caracter.");
      setGenerated([]);
      setCopiedIndex(null);
      setCopiedAll(false);
      return;
    }

    const safeLength = Math.min(Math.max(Number(length) || 1, 4), 64);
    const safeCount = Math.min(Math.max(Number(count) || 1, 1), 20);

    if (safeLength < activeSets.length) {
      setErrorText("La longitud debe ser mayor o igual al numero de tipos seleccionados.");
      setGenerated([]);
      setCopiedIndex(null);
      setCopiedAll(false);
      return;
    }

    const list = Array.from({ length: safeCount }, () => buildOnePassword(safeLength));
    setGenerated(list);
    setErrorText("");
    setCopiedIndex(null);
    setCopiedAll(false);
  };

  const copyOne = async (value, index) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedIndex(index);
      setCopiedAll(false);
      setTimeout(() => setCopiedIndex(null), 1400);
    } catch {
      setErrorText("No se pudo copiar al portapapeles.");
    }
  };

  const copyAll = async () => {
    if (!generated.length) return;
    try {
      await navigator.clipboard.writeText(generated.join("\n"));
      setCopiedAll(true);
      setCopiedIndex(null);
      setTimeout(() => setCopiedAll(false), 1400);
    } catch {
      setErrorText("No se pudo copiar al portapapeles.");
    }
  };

  const stats = [
    { label: "Proyectos listados", value: String(projects.length) },
    { label: "Servicios base", value: String(services.length) },
    { label: "Passwords max", value: "20 por tanda" },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      <section className="relative overflow-hidden border-b border-blue-500/10 bg-gradient-to-br from-black via-slate-950 to-blue-950">
        <div className="absolute inset-0 opacity-25">
          <div className="absolute left-0 top-0 h-72 w-72 rounded-full bg-blue-600 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-cyan-500 blur-3xl" />
          <div className="absolute left-1/3 top-1/2 h-56 w-56 rounded-full bg-blue-900 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 py-20 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <div className="mb-4 inline-flex rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-1 text-sm text-cyan-200">
                {companyData.badge}
              </div>
              <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-6xl">{companyData.title}</h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">{companyData.subtitle}</p>

              <div className="mt-8 flex flex-wrap gap-4">
                <a
                  href="#servicios"
                  className="rounded-2xl bg-cyan-400 px-6 py-3 font-semibold text-slate-950 shadow-lg shadow-cyan-500/30 transition hover:scale-[1.02]"
                >
                  Ver servicios
                </a>
                <a
                  href="#passwords"
                  className="rounded-2xl border border-white/15 bg-white/5 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
                >
                  Probar generador
                </a>
              </div>

              <div className="mt-8 grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-3">
                {stats.map((stat) => (
                  <div key={stat.label} className="rounded-2xl border border-blue-400/10 bg-slate-950/80 p-4">
                    <p className="text-xl font-semibold text-cyan-300">{stat.value}</p>
                    <p className="text-xs text-slate-400">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-blue-400/10 bg-black/40 p-6 shadow-2xl backdrop-blur">
              <div className="grid gap-4 sm:grid-cols-2">
                {services.map((item) => (
                  <div key={item.title} className="rounded-2xl border border-blue-400/10 bg-slate-950/90 p-5">
                    <h3 className="text-lg font-semibold text-cyan-300">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="proyectos" className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="mb-10 max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-300">Proyectos</p>
          <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Trabajo real, no solo promesas</h2>
          <p className="mt-4 text-slate-300">
            Estos proyectos reflejan trabajo real en operación, integraciones, automatización y productos digitales en
            producción.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project, index) => (
            <div key={project.title} className="rounded-3xl border border-blue-400/10 bg-slate-950 p-6 shadow-lg shadow-blue-950/20">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/15 text-cyan-300">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <span className="rounded-full border border-cyan-400/15 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200">
                  {project.tag}
                </span>
              </div>
              <h3 className="text-lg font-semibold leading-7 text-white">{project.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-300">{project.desc}</p>
              <p className="mt-3 rounded-xl border border-cyan-500/10 bg-black p-3 text-xs text-cyan-200">{project.impact}</p>
              <a
                href={`${companyData.whatsappUrl}?text=${encodeURIComponent(`${companyData.projectsCtaText} ${project.title}`)}`}
                className="mt-4 inline-flex rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-400/20"
                target="_blank"
                rel="noreferrer"
              >
                Ver caso
              </a>
            </div>
          ))}
        </div>
      </section>

      <section id="servicios" className="border-y border-blue-500/10 bg-slate-950/90">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-300">Servicios</p>
              <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Desarrollo con enfoque practico</h2>
              <p className="mt-4 max-w-2xl text-slate-300">
                Desde landing pages hasta sistemas internos: tecnologia orientada a resultados medibles, no a features que
                nadie usa despues del lanzamiento.
              </p>
            </div>

            <div className="grid gap-4">
              {quickBullets.map((item) => (
                <div key={item} className="rounded-2xl border border-blue-400/10 bg-black p-4 text-slate-200">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="passwords" className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-300">Herramienta gratuita</p>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Generador de passwords</h2>
            <p className="mt-4 text-slate-300">
              Esta herramienta gratuita permite generar passwords seguras al instante. 
              Personaliza la longitud, tipos de caracteres y cantidad a generar.
            </p>

            <div className="mt-6 space-y-4 rounded-3xl border border-blue-500/10 bg-slate-950 p-6">
              <div>
                <p className="mb-2 text-sm font-medium text-slate-200">Presets rápidos</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <button
                    onClick={() => applyPreset("web")}
                    className="rounded-xl border border-blue-400/20 bg-black px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10"
                  >
                    Web básica
                  </button>
                  <button
                    onClick={() => applyPreset("saas")}
                    className="rounded-xl border border-blue-400/20 bg-black px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10"
                  >
                    SaaS/CRM
                  </button>
                  <button
                    onClick={() => applyPreset("high")}
                    className="rounded-xl border border-blue-400/20 bg-black px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10"
                  >
                    Alta seguridad
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">Longitud</label>
                <input
                  type="range"
                  min="4"
                  max="64"
                  value={length}
                  onChange={(e) => setLength(e.target.value)}
                  className="w-full"
                />
                <div className="mt-2 text-sm text-slate-400">{length} caracteres</div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">Cantidad a generar</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={count}
                  onChange={(e) => setCount(e.target.value)}
                  className="w-full rounded-2xl border border-blue-400/10 bg-black px-4 py-3 outline-none ring-0"
                />
              </div>

              <div>
                <p className="mb-3 text-sm font-medium text-slate-200">Tipos de caracteres</p>
                <div className="grid grid-cols-2 gap-3 text-sm text-slate-300">
                  <label className="flex items-center gap-2 rounded-xl border border-blue-400/10 bg-black p-3">
                    <input type="checkbox" checked={includeLower} onChange={() => setIncludeLower(!includeLower)} />
                    Minúsculas
                  </label>
                  <label className="flex items-center gap-2 rounded-xl border border-blue-400/10 bg-black p-3">
                    <input type="checkbox" checked={includeUpper} onChange={() => setIncludeUpper(!includeUpper)} />
                    Mayúsculas
                  </label>
                  <label className="flex items-center gap-2 rounded-xl border border-blue-400/10 bg-black p-3">
                    <input type="checkbox" checked={includeNumbers} onChange={() => setIncludeNumbers(!includeNumbers)} />
                    Números
                  </label>
                  <label className="flex items-center gap-2 rounded-xl border border-blue-400/10 bg-black p-3">
                    <input type="checkbox" checked={includeSymbols} onChange={() => setIncludeSymbols(!includeSymbols)} />
                    Símbolos
                  </label>
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-slate-300">Fortaleza estimada</span>
                  <span className="font-semibold text-cyan-300">{strength.label}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-800">
                  <div className={`h-2 rounded-full transition-all ${strength.widthClass} ${strength.colorClass}`} />
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={generatePasswords}
                  className="rounded-2xl bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition hover:scale-[1.02]"
                >
                  Generar passwords
                </button>
                <button
                  onClick={copyAll}
                  disabled={!generated.length}
                  className="rounded-2xl border border-blue-400/15 bg-blue-500/10 px-5 py-3 font-semibold text-white transition enabled:hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {copiedAll ? "Copiadas" : "Copiar todas"}
                </button>
              </div>

              {errorText ? <p className="text-sm text-rose-300">{errorText}</p> : null}
            </div>
          </div>

          <div className="rounded-3xl border border-blue-500/10 bg-slate-950 p-6">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold">Resultados</h3>
                <p className="text-sm text-slate-400">Genera una o varias passwords seguras al instante.</p>
              </div>
              <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-200">
                {generated.length || 0} generadas
              </div>
            </div>

            <div className="space-y-3">
              {generated.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950 p-8 text-center text-slate-400">
                  Aqui apareceran las passwords generadas.
                </div>
              ) : (
                generated.map((pwd, index) => (
                  <div
                    key={`${pwd}-${index}`}
                    className="flex flex-col gap-3 rounded-2xl border border-blue-400/10 bg-black p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <code className="overflow-x-auto text-sm text-cyan-300">{pwd}</code>
                    <button
                      onClick={() => copyOne(pwd, index)}
                      className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
                    >
                      {copiedIndex === index ? "Copiada" : "Copiar"}
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="mt-5 rounded-2xl border border-blue-500/10 bg-black p-4 text-sm text-slate-300">
              <p className="font-semibold text-cyan-300">Tip rapido de seguridad</p>
              <p className="mt-2">
                Usa passwords distintas por plataforma y guarda todo en un password manager. Este generador te ayuda a
                crear claves robustas, pero la gestion segura tambien importa.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-blue-500/10 bg-black">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-6 py-10 lg:flex-row lg:items-center lg:px-8">
          <div>
            <h3 className="text-2xl font-bold">Quieres una web util, rapida y hecha para negocio?</h3>
            <p className="mt-2 text-slate-400">
              Hondutech construye soluciones para operar, automatizar y convertir. Desde integraciones serias hasta
              herramientas pequenas que atraen clientes.
            </p>
          </div>
          <a
            href={companyData.whatsappUrl}
            className="rounded-2xl bg-cyan-400 px-6 py-3 font-semibold text-slate-950 transition hover:scale-[1.02]"
          >
            Hablemos
          </a>
        </div>
      </section>
    </div>
  );
}
