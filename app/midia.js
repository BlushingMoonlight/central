// Central — áudio (segurar para gravar e soltar manda), foto reduzida num canvas e os avisos (push).
import { chamar, modoDemo } from './api.js';

export function blobParaBase64(blob) {
  return new Promise((ok, falha) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result).split(',')[1] || '');
    r.onerror = () => falha(r.error);
    r.readAsDataURL(blob);
  });
}

// Segurar o botão grava; soltar manda (1 toque). aoTerminar(blob, segundos, mime); aoFalhar() sem microfone.
export function segurarParaGravar(botao, aoTerminar, aoFalhar) {
  const texto = botao.textContent;
  let gravador = null, fluxo = null, partes = [], soltou = true, comecou = 0;
  const parar = () => {
    soltou = true;
    if (gravador && gravador.state === 'recording') gravador.stop();
  };
  botao.addEventListener('pointerdown', async (ev) => {
    ev.preventDefault();
    if (!soltou) return;
    soltou = false;
    partes = [];
    try {
      if (!navigator.mediaDevices || !window.MediaRecorder) throw new Error('sem gravador');
      fluxo = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) { soltou = true; aoFalhar(); return; }
    const tipo = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find((t) => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) || '';
    gravador = new MediaRecorder(fluxo, tipo ? { mimeType: tipo } : undefined);
    gravador.ondataavailable = (e) => { if (e.data && e.data.size) partes.push(e.data); };
    gravador.onstop = () => {
      fluxo.getTracks().forEach((t) => t.stop());
      botao.textContent = texto;
      botao.removeAttribute('aria-pressed');
      const mime = (gravador.mimeType || tipo || 'audio/webm').split(';')[0];
      aoTerminar(new Blob(partes, { type: mime }), Math.max(1, Math.round((Date.now() - comecou) / 1000)), mime);
    };
    gravador.start();
    comecou = Date.now();
    botao.textContent = 'Gravando';
    botao.setAttribute('aria-pressed', 'true');
    if (soltou) parar();
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((n) => botao.addEventListener(n, () => { if (!soltou) parar(); }));
  botao.addEventListener('contextmenu', (e) => e.preventDefault());
  botao.addEventListener('click', (e) => e.preventDefault());
}

// Reduz a foto (o lado maior até 2000 px, o bastante para o QR de uma NFC-e) e devolve o JPEG em base64.
// A foto vem do input de arquivo; o app nunca a grava na galeria.
export async function reduzirFoto(arquivo, maior = 2000) {
  const url = URL.createObjectURL(arquivo);
  try {
    const img = await new Promise((ok, falha) => { const i = new Image(); i.onload = () => ok(i); i.onerror = falha; i.src = url; });
    const escala = Math.min(1, maior / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * escala);
    c.height = Math.round(img.naturalHeight * escala);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.82).split(',')[1];
  } finally { URL.revokeObjectURL(url); }
}

// ---------- avisos (push) ----------
export const suportaAvisos = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

export async function avisosLigados() {
  if (modoDemo || !suportaAvisos()) return false;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    return !!(reg && (await reg.pushManager.getSubscription()));
  } catch (e) { return false; }
}

function chaveParaBytes(b64url) {
  const b64 = (b64url + '='.repeat((4 - (b64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

// Pede a permissão, busca a chave pública no servidor, inscreve o aparelho e manda a inscrição.
export async function ligarAvisos() {
  if (modoDemo) return true;
  if (!suportaAvisos()) return false;
  if ((await Notification.requestPermission()) !== 'granted') return false;
  const reg = await navigator.serviceWorker.ready;
  const { chave_publica } = await chamar('aparelho', { acao: 'chave_push' });
  const assinatura = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveParaBytes(chave_publica) });
  await chamar('aparelho', { acao: 'push', assinatura: assinatura.toJSON() });
  return true;
}
