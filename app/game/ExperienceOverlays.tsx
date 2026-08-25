'use client';

import { useEffect, useRef, useState } from 'react';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

export const INTRO_SEEN_KEY = 'vale-airline-intro-seen-v1';
export const TUTORIAL_DONE_KEY = 'vale-airline-tutorial-done-v1';

export const tutorialSteps = [
  {
    screen: 'dashboard',
    eyebrow: 'BEM-VINDO À PRESIDÊNCIA',
    title: 'Eu sou Helena Vale',
    body: 'Serei sua secretária executiva nesta primeira operação. A Home agora mostra o mapa real da companhia: seu hub aparece em destaque e cada rota ativa é desenhada automaticamente.',
    action: 'Conhecer a frota',
  },
  {
    screen: 'market',
    eyebrow: 'ETAPA 1 · FROTA',
    title: 'Escolha seu primeiro avião',
    body: 'Compare alcance, capacidade, pista mínima e preço. Aeronaves usadas economizam caixa; leasing reduz o investimento inicial; novas oferecem melhor condição.',
    action: 'Preparar a equipe',
  },
  {
    screen: 'staff',
    eyebrow: 'ETAPA 2 · PESSOAS',
    title: 'Nenhum avião decola sozinho',
    body: 'Contrate pilotos, comissários, mecânicos e administrativos. O painel mostra cobertura, moral e treinamento para você equilibrar segurança e custos.',
    action: 'Planejar uma rota',
  },
  {
    screen: 'routes',
    eyebrow: 'ETAPA 3 · MALHA',
    title: 'Conecte seu hub ao mercado',
    body: 'Selecione uma aeronave livre, escolha o destino, ajuste frequência e tarifa. O sistema calcula distância, demanda e cria automaticamente os voos de ida e volta.',
    action: 'Ver a operação',
  },
  {
    screen: 'operations',
    eyebrow: 'ETAPA 4 · OPERAÇÕES',
    title: 'O scheduler trabalha por você',
    body: 'Os horários ativos continuam gerando voos enquanto o jogo estiver fechado. Combustível, equipe, manutenção e caixa influenciam cada serviço.',
    action: 'Voltar ao comando',
  },
  {
    screen: 'dashboard',
    eyebrow: 'TUTORIAL CONCLUÍDO',
    title: 'Sua companhia está em suas mãos',
    body: 'Acompanhe o mapa, o resultado projetado e as prioridades do CEO. Você pode rever esta orientação e a introdução a qualquer momento em Configurações.',
    action: 'Começar a administrar',
  },
] as const;

export function IntroSequence({ onFinish }: { onFinish: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [failed, setFailed] = useState(false);

  function finish() {
    localStorage.setItem(INTRO_SEEN_KEY, 'done');
    onFinish();
  }

  function toggleSound() {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !muted;
    setMuted(!muted);
    if (video.paused) video.play().catch(() => undefined);
  }

  return <main className="intro-sequence" aria-label="Introdução Vale Airline Manager">
    <video
      ref={videoRef}
      className="intro-video"
      src={`${basePath}/assets/video/vale-airline-intro.mp4`}
      poster={`${basePath}/assets/brand/vale-airline-cover.webp`}
      autoPlay
      muted={muted}
      playsInline
      preload="metadata"
      onEnded={finish}
      onError={() => setFailed(true)}
      onTimeUpdate={(event) => {
        const video = event.currentTarget;
        setProgress(video.duration ? video.currentTime / video.duration * 100 : 0);
      }}
    />
    <div className="intro-shade" />
    <div className="intro-brand"><span>VALE AIRLINE</span><b>MANAGER</b></div>
    <div className="intro-controls">
      {!failed && <button onClick={toggleSound}>{muted ? 'Ativar som' : 'Silenciar'}</button>}
      <button className="intro-skip" onClick={finish}>{failed ? 'Entrar no jogo' : 'Pular introdução'} <span>→</span></button>
    </div>
    <div className="intro-progress"><i style={{ width: `${progress}%` }} /></div>
  </main>;
}

export function GuidedTutorial({ step, onNext, onBack, onClose }: { step: number; onNext: () => void; onBack: () => void; onClose: () => void }) {
  const current = tutorialSteps[step];
  return <div className="tutorial-layer" role="dialog" aria-modal="true" aria-label={`Tutorial, etapa ${step + 1} de ${tutorialSteps.length}`}>
    <section className="tutorial-card">
      <button className="tutorial-close" onClick={onClose} aria-label="Fechar tutorial">×</button>
      <div className="tutorial-character">
        <img src={`${basePath}/assets/characters/helena-vale.webp`} alt="Helena Vale, secretária executiva" />
        <div><span>SECRETÁRIA EXECUTIVA</span><b>Helena Vale</b><small>Gabinete da Presidência</small></div>
      </div>
      <div className="tutorial-copy">
        <span className="eyebrow">{current.eyebrow}</span>
        <h2>{current.title}</h2>
        <p>{current.body}</p>
        <div className="tutorial-dots">{tutorialSteps.map((_, index) => <i className={index <= step ? 'active' : ''} key={index} />)}</div>
        <div className="tutorial-actions">
          <button className="text-button" onClick={onClose}>Pular tutorial</button>
          <div>{step > 0 && <button onClick={onBack}>Voltar</button>}<button className="primary" onClick={onNext}>{current.action} <span>→</span></button></div>
        </div>
      </div>
    </section>
  </div>;
}

export function InstallAppButton() {
  const [prompt, setPrompt] = useState<Event | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const capture = (event: Event) => { event.preventDefault(); setPrompt(event); };
    const complete = () => setInstalled(true);
    window.addEventListener('beforeinstallprompt', capture);
    window.addEventListener('appinstalled', complete);
    return () => {
      window.removeEventListener('beforeinstallprompt', capture);
      window.removeEventListener('appinstalled', complete);
    };
  }, []);

  async function install() {
    if (prompt && 'prompt' in prompt) {
      await (prompt as Event & { prompt: () => Promise<void> }).prompt();
      setPrompt(null);
      return;
    }
    alert('No menu do navegador, escolha “Adicionar à tela inicial” ou “Instalar aplicativo”.');
  }

  return <button className="install-app-button" onClick={install} disabled={installed}>
    <img src={`${basePath}/icons/icon-192.png`} alt="" />
    <span><b>{installed ? 'Jogo instalado' : 'Instalar no celular'}</b><small>Ícone oficial Vale Airline</small></span>
  </button>;
}

export function registerValeServiceWorker() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register(`${basePath}/sw.js`).catch(() => undefined);
}
