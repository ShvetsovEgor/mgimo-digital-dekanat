// Генерация PDF-документов (pdfkit + QR): справка, электронное заявление, выписка из зачётной книжки.
// Каждый документ — демонстрационный: на каждой странице крупная плашка.
import path from 'node:path';
import fs from 'node:fs';
import { PassThrough } from 'node:stream';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { verifyUrl } from './lib/doc-sign.js';
import type { FormFieldJson, OrderHistory, RequestStatus } from './lib/mappers.js';
import { REQUEST_STATUS_LABELS, parseJson } from './lib/mappers.js';
import { formatClock, parseLocal } from './lib/time.js';

/** Каталог шрифтов: bundle (dist/lib/documents.js → ../../assets) и dev (src → ../../assets). */
const FONTS_DIR = [
  path.resolve(import.meta.dirname, '../assets/fonts'),
  path.resolve(import.meta.dirname, '../../assets/fonts'),
].find((p) => fs.existsSync(path.join(p, 'DejaVuSans.ttf'))) ?? path.resolve(import.meta.dirname, '../../assets/fonts');
const FONT_REGULAR = path.join(FONTS_DIR, 'DejaVuSans.ttf');
const FONT_BOLD = path.join(FONTS_DIR, 'DejaVuSans-Bold.ttf');

export const PAGE_WIDTH = 595.28;
export const PAGE_HEIGHT = 841.89;
export const MARGIN = 50;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

export const DEMO_BANNER = 'ДЕМОНСТРАЦИОННЫЙ ДОКУМЕНТ · не является официальным документом';
export const HEADER = 'Цифровой деканат 2030 · демонстрационный документ';
const UNIVERSITY = 'Цифровой деканат 2030 (концепт)';

export interface PdfIdentity {
  fullName: string;
  faculty: string;
  program: string;
  programCode: string;
  course: number;
  group: string;
  recordBook: string;
}

export interface PdfRequest {
  number: string;
  typeTitle: string;
  statusLabel: string;
  createdAt: string;
  dueAt: string;
  readyAt: string | null;
  values: Record<string, unknown>;
  history: OrderHistory[];
}

export interface TranscriptPdf {
  semester: string;
  course: string;
  credits: number;
  rating: number;
  grade: string;
  ects: string;
}

export interface DocumentInput {
  kind: 'certificate' | 'application' | 'transcript';
  request: PdfRequest;
  identity: PdfIdentity;
  fields: FormFieldJson[];
  dean: string;
  facultyFull: string;
  baseUrl: string;
  transcript: TranscriptPdf[];
}

function dateRu(iso: string): string {
  const d = parseLocal(iso);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

function dateLongRu(iso: string): string {
  const months = [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
  ];
  const d = parseLocal(iso);
  return `«${String(d.getDate()).padStart(2, '0')}» ${months[d.getMonth()]} ${d.getFullYear()} г.`;
}

function fieldValue(input: DocumentInput, name: string): string | null {
  const raw = input.request.values[name];
  if (raw === undefined || raw === null || raw === '' || raw === false) return null;
  if (typeof raw === 'boolean') return 'да';
  const field = input.fields.find((f) => f.name === name);
  if (field?.options) {
    const opt = field.options.find((o) => o.value === String(raw));
    if (opt) return opt.label;
  }
  return String(raw);
}

function fieldLabel(input: DocumentInput, name: string): string {
  return input.fields.find((f) => f.name === name)?.label ?? name;
}

// ---------------------------------------------------------------------------
// Отрисовка
// ---------------------------------------------------------------------------
function drawBanner(doc: PDFKit.PDFDocument): void {
  const h = 26;
  const y = 26;
  doc.save();
  doc.rect(0, y, PAGE_WIDTH, h).fill('#FBE9E7');
  doc.fillColor('#8A1C1C').font('bold').fontSize(10);
  doc.text(DEMO_BANNER, 0, y + 8, { align: 'center', width: PAGE_WIDTH });
  doc.restore();
  // Шапка
  doc.fillColor('#1F2937').font('bold').fontSize(9);
  doc.text(HEADER, MARGIN, y + h + 10, { width: CONTENT_WIDTH, align: 'right' });
}

/**
 * Колонтитул в абсолютных координатах. height + lineBreak:false: иначе при достижении нижнего
 * поля pdfkit автоматически добавит пустую страницу.
 */
function drawFooter(doc: PDFKit.PDFDocument, pageNo: number): void {
  doc.save();
  doc.font('regular').fontSize(7.5).fillColor('#6B7280');
  doc.text(
    `${UNIVERSITY} · Все данные вымышлены. Документ сформирован автоматически в демонстрационном прототипе.`,
    MARGIN,
    PAGE_HEIGHT - 40,
    { width: CONTENT_WIDTH - 90, align: 'left', lineBreak: false, height: 9 },
  );
  doc.text(`Стр. ${pageNo}`, PAGE_WIDTH - MARGIN - 90, PAGE_HEIGHT - 40, {
    width: 90,
    align: 'right',
    lineBreak: false,
    height: 9,
  });
  doc.restore();
}

function drawRequisites(doc: PDFKit.PDFDocument): void {
  doc.fillColor('#111827').font('bold').fontSize(11);
  doc.text('Цифровой деканат 2030 (концепт личного кабинета студента)', { align: 'center' });
  doc.font('regular').fontSize(8.5).fillColor('#374151');
  doc.text('Демонстрационный прототип · вымышленное учебное заведение', { align: 'center' });
  doc.text('пр. Вернадского, 76, Москва · deadline.demo · +7 (495) 000-00-01', { align: 'center' });
  doc.moveDown(0.6);
  doc.moveTo(MARGIN, doc.y).lineTo(PAGE_WIDTH - MARGIN, doc.y).strokeColor('#D1D5DB').stroke();
  doc.moveDown(1);
}

function drawTitle(doc: PDFKit.PDFDocument, title: string): void {
  doc.fillColor('#111827').font('bold').fontSize(16).text(title, { align: 'center' });
  doc.moveDown(1);
}

function drawRow(doc: PDFKit.PDFDocument, label: string, value: string): void {
  const y = doc.y;
  doc.font('regular').fontSize(10).fillColor('#6B7280').text(label, MARGIN, y, { width: 170 });
  doc.font('bold').fontSize(10).fillColor('#111827').text(value, MARGIN + 175, y, { width: CONTENT_WIDTH - 175 });
  doc.moveDown(0.35);
}

function drawQr(
  doc: PDFKit.PDFDocument,
  baseUrl: string,
  number: string,
  x: number,
  y: number,
): void {
  const url = verifyUrl(baseUrl, number);
  // QR рендерим синхронно: qrcode.create возвращает битовую матрицу.
  const qr = QRCode.create(url, { errorCorrectionLevel: 'M' });
  const size = qr.modules.size;
  const cell = 2.2;
  const px = size * cell;
  doc.save();
  doc.fillColor('#FFFFFF').rect(x - 6, y - 6, px + 12, px + 12).fill();
  doc.fillColor('#000000');
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      if (qr.modules.get(row, col)) doc.rect(x + col * cell, y + row * cell, cell, cell).fill();
    }
  }
  doc.restore();
  doc.font('regular').fontSize(7.5).fillColor('#374151');
  doc.text('Проверить подлинность', x - 10, y + px + 10, { width: px + 20, align: 'center' });
  doc.fontSize(6.5).fillColor('#6B7280');
  doc.text('отсканируйте QR', x - 10, y + px + 21, { width: px + 20, align: 'center' });
}

function line(doc: PDFKit.PDFDocument, text: string, size = 10, opts: PDFKit.Mixins.TextOptions = {}): void {
  doc.font('regular').fontSize(size).fillColor('#111827').text(text, { ...opts });
}

// ---------------------------------------------------------------------------
// Шаблоны
// ---------------------------------------------------------------------------
function certificateTitle(input: DocumentInput): string {
  const recipient = fieldValue(input, 'recipient');
  const period = fieldValue(input, 'period');
  if (input.request.values.country) return 'СПРАВКА-ВЫЗОВ';
  if (input.request.typeTitle.toLowerCase().includes('стипенди')) return 'СПРАВКА О СТИПЕНДИИ';
  if (period) return 'СПРАВКА О СТИПЕНДИИ';
  if (recipient) return 'СПРАВКА ОБ ОБУЧЕНИИ';
  return 'СПРАВКА';
}

function drawCertificate(doc: PDFKit.PDFDocument, input: DocumentInput): void {
  const id = input.identity;
  drawTitle(doc, certificateTitle(input));
  doc.font('regular').fontSize(10).fillColor('#374151').text(`№ ${input.request.number} от ${dateLongRu(input.request.createdAt)}`, {
    align: 'center',
  });
  doc.moveDown(1.4);

  line(doc, 'Выдана студенту (студентке) демонстрационного учебного заведения', 10);
  doc.moveDown(0.5);
  doc.font('bold').fontSize(13).fillColor('#111827').text(id.fullName, { align: 'center' });
  doc.moveDown(0.8);

  const purpose = fieldValue(input, 'recipient');
  line(
    doc,
    `Настоящая справка подтверждает, что ${id.fullName} обучается по очной форме на факультете «${id.faculty}», ` +
      `направление ${id.programCode} «${id.program}», ${id.course} курс, группа ${id.group}.`,
    10,
    { align: 'left', lineGap: 2 },
  );
  doc.moveDown(0.8);

  const extra = fieldValue(input, 'period');
  if (extra) {
    line(doc, `Период: ${fieldLabel(input, 'period').toLowerCase()} — ${extra}.`, 10);
    doc.moveDown(0.5);
  }
  if (purpose) {
    line(doc, `Справка выдана для предоставления: ${purpose}.`, 10);
    doc.moveDown(0.5);
  }
  const note = fieldValue(input, 'note');
  if (note) {
    line(doc, `Примечание: ${note}`, 10);
    doc.moveDown(0.5);
  }
  line(doc, 'Срок обучения: с 1 сентября ' + String(new Date().getFullYear() - (id.course - 1)) + ' года по настоящее время.', 10);
  doc.moveDown(1.6);

  // Подпись и QR
  const signY = Math.max(doc.y + 10, PAGE_HEIGHT - 250);
  doc.font('bold').fontSize(10).fillColor('#111827').text(`Декан ${input.dean}`, MARGIN, signY, { width: 220 });
  doc.font('regular').fontSize(8.5).fillColor('#6B7280').text('подпись заверена электронно (демо)', MARGIN, signY + 14, {
    width: 220,
  });
  doc.font('regular').fontSize(9).fillColor('#111827').text(`Место выдачи: ${input.facultyFull}`, MARGIN, signY + 40, {
    width: 300,
  });
  doc.text(`Дата выдачи: ${dateLongRu(input.request.readyAt ?? input.request.createdAt)}`, MARGIN, signY + 54, {
    width: 300,
  });
  drawQr(doc, input.baseUrl, input.request.number, PAGE_WIDTH - MARGIN - 110, signY - 4);
}

function drawApplication(doc: PDFKit.PDFDocument, input: DocumentInput): void {
  const id = input.identity;
  // Шапка как в заявлениях: кому и от кого
  doc.font('regular').fontSize(9.5).fillColor('#111827');
  const rightWidth = 240;
  const rightX = PAGE_WIDTH - MARGIN - rightWidth;
  const top = doc.y;
  doc.text(`Директору-декану\n${input.facultyFull},\n${input.dean}`, rightX, top, { width: rightWidth });
  doc.text(
    `от студента ${id.course} курса\n${id.faculty}\nпрограмма «${id.program}»\n${id.fullName}\nгруппа ${id.group}, зачётная книжка ${id.recordBook}`,
    rightX,
    top + 52,
    { width: rightWidth },
  );
  doc.y = top + 130;
  doc.moveDown(0.8);
  doc.font('bold').fontSize(15).text('ЗАЯВЛЕНИЕ', { align: 'center' });
  doc.moveDown(0.3);
  doc.font('regular').fontSize(9).fillColor('#6B7280').text(`Электронный документ · ${input.request.number}`, {
    align: 'center',
  });
  doc.moveDown(1.2);

  line(doc, `Прошу оформить: ${input.request.typeTitle}.`, 10.5);
  doc.moveDown(0.8);
  for (const field of input.fields) {
    const value = fieldValue(input, field.name);
    if (!value) continue;
    line(doc, `${field.label}: ${value}`, 10, { lineGap: 2 });
    doc.moveDown(0.35);
  }
  doc.moveDown(1);
  line(doc, `Дата подачи: ${dateLongRu(input.request.createdAt)}`, 10);
  doc.moveDown(2);
  doc.font('regular').fontSize(10).fillColor('#111827').text('Подпись студента ______________________', { align: 'left' });
  doc.moveDown(1.6);

  // Отметка о регистрации
  const regY = Math.max(doc.y, PAGE_HEIGHT - 260);
  doc.save();
  doc.roundedRect(MARGIN, regY, CONTENT_WIDTH - 130, 74, 6).strokeColor('#1D4ED8').lineWidth(1).stroke();
  doc.restore();
  doc.font('bold').fontSize(10).fillColor('#1D4ED8').text('Отметка о регистрации', MARGIN + 12, regY + 10);
  doc
    .font('regular')
    .fontSize(8.5)
    .fillColor('#1F2937')
    .text(
      `Зарегистрировано в деканате: № ${input.request.number}\n` +
        `Статус: ${input.request.statusLabel} · Срок исполнения: ${dateRu(input.request.dueAt)}\n` +
        `Регистратор: Цифровой деканат 2030 (автоматически)`,
      MARGIN + 12,
      regY + 26,
      { width: CONTENT_WIDTH - 160, lineGap: 2, height: 42 },
    );
  drawQr(doc, input.baseUrl, input.request.number, PAGE_WIDTH - MARGIN - 110, regY - 2);
}

function drawTranscript(doc: PDFKit.PDFDocument, input: DocumentInput): void {
  const id = input.identity;
  drawTitle(doc, 'ВЫПИСКА ИЗ ЗАЧЁТНОЙ КНИЖКИ');
  doc.font('regular').fontSize(10).fillColor('#374151').text(`№ ${input.request.number} от ${dateLongRu(input.request.createdAt)}`, {
    align: 'center',
  });
  doc.moveDown(1);
  drawRow(doc, 'Студент', id.fullName);
  drawRow(doc, 'Факультет', id.faculty);
  drawRow(doc, 'Программа', `${id.programCode} «${id.program}»`);
  drawRow(doc, 'Курс, группа', `${id.course} курс, ${id.group}`);
  drawRow(doc, 'Номер зачётной книжки', id.recordBook);
  doc.moveDown(0.8);

  const cols = [
    { title: 'Дисциплина', width: 200, align: 'left' as const },
    { title: 'Семестр', width: 70, align: 'left' as const },
    { title: 'Кредиты', width: 55, align: 'right' as const },
    { title: 'Рейтинг', width: 55, align: 'right' as const },
    { title: 'Оценка', width: 90, align: 'left' as const },
    { title: 'ECTS', width: 35, align: 'center' as const },
  ];
  let y = doc.y;
  const rowH = 18;
  const drawHead = (): void => {
    doc.save();
    doc.rect(MARGIN, y, CONTENT_WIDTH, rowH).fill('#F3F4F6');
    doc.restore();
    let x = MARGIN + 4;
    doc.font('bold').fontSize(8.5).fillColor('#111827');
    for (const c of cols) {
      doc.text(c.title, x, y + 5, { width: c.width - 6, align: c.align });
      x += c.width;
    }
    y += rowH;
  };
  drawHead();
  doc.font('regular').fontSize(8.5);
  for (const r of input.transcript) {
    if (y + rowH > PAGE_HEIGHT - 120) {
      doc.addPage();
      doc.y = 90;
      y = doc.y;
      drawHead();
    }
    const values = [r.course, r.semester, String(r.credits), `${r.rating}%`, r.grade, r.ects];
    let x = MARGIN + 4;
    doc.fillColor('#111827');
    cols.forEach((c, i) => {
      doc.text(values[i], x, y + 5, { width: c.width - 6, align: c.align, lineBreak: false, height: 12 });
      x += c.width;
    });
    doc.moveTo(MARGIN, y + rowH).lineTo(PAGE_WIDTH - MARGIN, y + rowH).strokeColor('#E5E7EB').stroke();
    y += rowH;
  }
  const total = input.transcript.reduce((a, r) => a + r.credits, 0);
  doc.font('bold').fontSize(9).fillColor('#111827').text(`Всего дисциплин: ${input.transcript.length} · кредитов: ${total}`, MARGIN, y + 10);
  doc.y = y + 40;
  doc.font('bold').fontSize(10).text(`Декан ${input.dean}`, MARGIN);
  doc.font('regular').fontSize(9).fillColor('#6B7280').text(`Выписка сформирована автоматически ${formatClock(parseLocal(input.request.readyAt ?? input.request.createdAt).getHours() * 60 + parseLocal(input.request.readyAt ?? input.request.createdAt).getMinutes())} МСК`, MARGIN);
  drawQr(doc, input.baseUrl, input.request.number, PAGE_WIDTH - MARGIN - 110, PAGE_HEIGHT - 200);
}

// ---------------------------------------------------------------------------
// Публичный API
// ---------------------------------------------------------------------------
/** PDF в память (асинхронно, промис). */
export function renderDocument(input: DocumentInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: MARGIN,
      bufferPages: true,
      info: {
        Title: `Демонстрационный документ ${input.request.number}`,
        Author: 'Дедлайн · Цифровой деканат 2030',
        Subject: 'DEMO — not an official document',
      },
    });
    doc.registerFont('regular', FONT_REGULAR);
    doc.registerFont('bold', FONT_BOLD);
    doc.font('regular');

    const sink = new PassThrough();
    const chunks: Buffer[] = [];
    sink.on('data', (chunk: Buffer) => chunks.push(chunk));
    sink.on('end', () => resolve(Buffer.concat(chunks)));
    sink.on('error', reject);
    doc.pipe(sink);
    drawBanner(doc);
    drawRequisites(doc);
    if (input.kind === 'certificate') drawCertificate(doc, input);
    else if (input.kind === 'application') drawApplication(doc, input);
    else drawTranscript(doc, input);

    // Нумерация и плашка на каждой странице
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i += 1) {
      doc.switchToPage(i);
      if (i > 0) {
        // плашка и подпись на каждой странице
        doc.save();
        doc.rect(0, 26, PAGE_WIDTH, 26).fill('#FBE9E7');
        doc.fillColor('#8A1C1C').font('bold').fontSize(10);
        doc.text(DEMO_BANNER, 0, 34, { align: 'center', width: PAGE_WIDTH, height: 14, lineBreak: false });
        doc.restore();
      }
      drawFooter(doc, i + 1);
    }
    doc.end();
  });
}

/** Имя файла в Content-Disposition (UTF-8). */
export function documentFileName(doc: DocumentInput): string {
  const kind =
    doc.kind === 'certificate' ? 'spravka' : doc.kind === 'application' ? 'zayavlenie' : 'vypiska';
  return `${kind}-${doc.request.number}.pdf`;
}

/** Разбор payload заявки для документов. */
export function requestParams(row: {
  number: string;
  type_title: string;
  status: RequestStatus;
  created_at: string;
  due_at: string;
  ready_at: string | null;
  payload_json: string;
  history_json: string;
}): PdfRequest {
  return {
    number: row.number,
    typeTitle: row.type_title,
    statusLabel: REQUEST_STATUS_LABELS[row.status],
    createdAt: row.created_at,
    dueAt: row.due_at,
    readyAt: row.ready_at,
    values: parseJson<Record<string, unknown>>(row.payload_json, {}),
    history: parseJson<OrderHistory[]>(row.history_json, []),
  };
}

