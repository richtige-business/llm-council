// ============================================
// artifact-export.ts - Council-Ergebnisse als PDF/DOCX exportieren
//
// Zweck: Baut aus einem CouncilRunData + den Sitzbesetzungen ein
//        neutrales ArtifactDocument (Erklaerung, Themen-Zusammenfassung,
//        Mitgliederprofile, Erstmeinungen, finale Synthese) und rendert
//        es als PDF oder DOCX.
// Verwendet von: CouncilChatBar.tsx, ArtifactsPage.tsx
// ============================================

import type { CouncilRunData, CouncilSeatMemberData } from '../types';

const COUNCIL_FINAL_RESPONSE_PREFIX = 'The council has decided:';

const LLM_COUNCIL_EXPLAINER =
  'Der LLM Council ist ein Beratungsformat, in dem mehrere KI-Modelle gemeinsam ueber eine ' +
  'Fragestellung beraten. Jedes Mitglied gibt zunaechst unabhaengig eine erste Einschaetzung ab, ' +
  'prueft anschliessend anonym die Antworten der anderen Mitglieder und das aelteste Mitglied ' +
  '(der "Chair") fasst alle Perspektiven zu einer gemeinsamen, finalen Antwort zusammen.';

export interface ArtifactParticipant {
  name: string;
  model: string;
  role: string;
  rolePrompt: string;
  color: string;
  isChair: boolean;
}

export interface ArtifactOpinion {
  seatName: string;
  model: string;
  color: string;
  content: string;
}

export interface ArtifactDocument {
  councilName: string;
  createdAt: number;
  question: string;
  topicSummary: string;
  participants: ArtifactParticipant[];
  opinions: ArtifactOpinion[];
  synthesis: string;
}

function stripFinalResponsePrefix(text: string): string {
  const trimmed = text.trim();
  return trimmed.startsWith(COUNCIL_FINAL_RESPONSE_PREFIX)
    ? trimmed.slice(COUNCIL_FINAL_RESPONSE_PREFIX.length).trim()
    : trimmed;
}

function truncateAtSentence(text: string, maxLength: number): string {
  const normalized = text.trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  const cut = normalized.slice(0, maxLength);
  const lastBreak = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('.\n'), cut.lastIndexOf('!'), cut.lastIndexOf('?'));
  if (lastBreak > maxLength * 0.4) {
    return `${cut.slice(0, lastBreak + 1)}`;
  }
  return `${cut.trim()}…`;
}

function buildTopicSummary(run: CouncilRunData, participantCount: number): string {
  const synthesis = stripFinalResponsePrefix(run.finalResponse || '');
  const preview = truncateAtSentence(synthesis, 420);
  const intro = `Diese Council-Sitzung befasste sich mit der Frage: „${run.prompt.trim()}". ${participantCount} Mitglieder gaben unabhaengige Erstmeinungen ab, pruefen sich gegenseitig und einigten sich auf eine gemeinsame Antwort.`;
  return preview ? `${intro}\n\n${preview}` : intro;
}

export function buildArtifactDocument(
  run: CouncilRunData,
  seatMembers: CouncilSeatMemberData[],
): ArtifactDocument {
  const seatById = new Map(seatMembers.map((seat) => [seat.seatId, seat]));

  const opinions: ArtifactOpinion[] = Object.entries(run.firstOpinions)
    .filter(([, content]) => content && content.trim().length > 0)
    .map(([seatId, content]) => {
      const seat = seatById.get(seatId);
      return {
        seatName: seat?.name || seatId,
        model: seat?.model || 'unknown',
        color: seat?.color || '#94a3b8',
        content: content.trim(),
      };
    });

  return {
    councilName: run.councilName || 'Council',
    createdAt: run.updatedAt || run.createdAt,
    question: run.prompt,
    topicSummary: buildTopicSummary(run, seatMembers.length),
    participants: seatMembers.map((seat) => ({
      name: seat.name,
      model: seat.model,
      role: seat.role,
      rolePrompt: seat.rolePrompt || '',
      color: seat.color || '#94a3b8',
      isChair: seat.seatId === 'chair-center',
    })),
    opinions,
    synthesis: stripFinalResponsePrefix(run.finalResponse || ''),
  };
}

function formatArtifactDate(ts: number): string {
  return new Date(ts).toLocaleString('de-DE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function slugifyFilename(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'council-result'
  );
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace('#', '');
  const full =
    normalized.length === 3
      ? normalized.split('').map((c) => c + c).join('')
      : normalized.padEnd(6, '0').slice(0, 6);
  const value = parseInt(full, 16);
  if (Number.isNaN(value)) {
    return [148, 163, 184];
  }
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

// --------------------------------------------
// PDF-Export (jsPDF)
// --------------------------------------------

export async function downloadArtifactAsPdf(doc: ArtifactDocument): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });

  const marginX = 48;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const maxWidth = pageWidth - marginX * 2;
  let y = 56;

  const ensureSpace = (lineHeight: number) => {
    if (y + lineHeight > pageHeight - 48) {
      pdf.addPage();
      y = 56;
    }
  };

  const writeParagraph = (text: string, fontSize: number, style: 'normal' | 'bold' = 'normal', gapAfter = 14) => {
    pdf.setFont('helvetica', style);
    pdf.setFontSize(fontSize);
    const lines: string[] = pdf.splitTextToSize(text, maxWidth);
    for (const line of lines) {
      ensureSpace(fontSize + 4);
      pdf.text(line, marginX, y);
      y += fontSize + 4;
    }
    y += gapAfter;
  };

  const drawMemberCard = (member: ArtifactParticipant) => {
    const cardHeight = 54;
    ensureSpace(cardHeight + 10);

    const [r, g, b] = hexToRgb(member.color);
    const avatarSize = 30;
    const avatarX = marginX + 12;
    const avatarY = y + cardHeight / 2;

    // Card-Hintergrund
    pdf.setFillColor(248, 249, 251);
    pdf.setDrawColor(228, 230, 235);
    pdf.roundedRect(marginX, y, maxWidth, cardHeight, 6, 6, 'FD');

    // Farbiger Avatar-Kreis mit Initiale
    pdf.setFillColor(r, g, b);
    pdf.circle(avatarX + avatarSize / 2, avatarY, avatarSize / 2, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.setTextColor(255, 255, 255);
    const initial = (member.name.trim().charAt(0) || '?').toUpperCase();
    pdf.text(initial, avatarX + avatarSize / 2, avatarY + 4.5, { align: 'center' });

    // Name, Modell, Rolle
    const textX = avatarX + avatarSize + 14;
    pdf.setTextColor(20, 24, 33);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.text(member.name, textX, y + 20);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9.5);
    pdf.setTextColor(100, 106, 120);
    const roleLine = member.role ? `${member.model}  ·  ${member.role}` : member.model;
    pdf.text(pdf.splitTextToSize(roleLine, maxWidth - avatarSize - 40)[0] || roleLine, textX, y + 36);

    pdf.setTextColor(20, 24, 33);
    y += cardHeight + 8;
  };

  writeParagraph(doc.councilName, 20, 'bold', 4);
  writeParagraph(formatArtifactDate(doc.createdAt), 10, 'normal', 18);

  writeParagraph('Was ist der LLM Council?', 13, 'bold', 6);
  writeParagraph(LLM_COUNCIL_EXPLAINER, 10.5, 'normal', 18);

  if (doc.participants.length > 0) {
    writeParagraph('Die Mitglieder', 13, 'bold', 8);
    for (const member of doc.participants) {
      drawMemberCard(member);
    }
    y += 8;
  }

  writeParagraph('Zusammenfassung', 13, 'bold', 6);
  writeParagraph(doc.topicSummary, 11, 'normal', 20);

  writeParagraph('Finale Synthese', 13, 'bold', 6);
  writeParagraph(doc.synthesis || '(keine finale Antwort vorhanden)', 11, 'normal', 8);

  pdf.save(`${slugifyFilename(doc.councilName)}.pdf`);
}

// --------------------------------------------
// DOCX-Export (docx-Paket)
// --------------------------------------------

export async function downloadArtifactAsDocx(doc: ArtifactDocument): Promise<void> {
  const {
    Document,
    Packer,
    Paragraph,
    HeadingLevel,
    TextRun,
    Table,
    TableRow,
    TableCell,
    WidthType,
    VerticalAlign,
    ShadingType,
    BorderStyle,
    AlignmentType,
  } = await import('docx');

  const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };

  const children: (InstanceType<typeof Paragraph> | InstanceType<typeof Table>)[] = [
    new Paragraph({ text: doc.councilName, heading: HeadingLevel.TITLE }),
    new Paragraph({
      children: [new TextRun({ text: formatArtifactDate(doc.createdAt), italics: true })],
    }),
    new Paragraph({ text: 'Was ist der LLM Council?', heading: HeadingLevel.HEADING_2 }),
    new Paragraph({ text: LLM_COUNCIL_EXPLAINER }),
  ];

  if (doc.participants.length > 0) {
    children.push(new Paragraph({ text: 'Die Mitglieder', heading: HeadingLevel.HEADING_2 }));

    const memberTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideHorizontal: noBorder, insideVertical: noBorder },
      rows: doc.participants.map((member) => {
        const colorHex = member.color.replace('#', '').padEnd(6, '0').slice(0, 6);
        const initial = (member.name.trim().charAt(0) || '?').toUpperCase();
        return new TableRow({
          children: [
            new TableCell({
              width: { size: 10, type: WidthType.PERCENTAGE },
              verticalAlign: VerticalAlign.CENTER,
              shading: { type: ShadingType.CLEAR, color: 'auto', fill: colorHex },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: initial, bold: true, color: 'FFFFFF' })],
                }),
              ],
            }),
            new TableCell({
              width: { size: 90, type: WidthType.PERCENTAGE },
              verticalAlign: VerticalAlign.CENTER,
              margins: { left: 160 },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: member.name, bold: true })],
                }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: member.role ? `${member.model}  ·  ${member.role}` : member.model,
                      italics: true,
                      color: '666666',
                      size: 18,
                    }),
                  ],
                }),
              ],
            }),
          ],
        });
      }),
    });

    children.push(memberTable);
    children.push(new Paragraph({ text: '' }));
  }

  children.push(new Paragraph({ text: 'Zusammenfassung', heading: HeadingLevel.HEADING_2 }));
  for (const paragraph of doc.topicSummary.split(/\n{2,}/)) {
    children.push(new Paragraph({ text: paragraph }));
  }

  children.push(new Paragraph({ text: 'Finale Synthese', heading: HeadingLevel.HEADING_2 }));
  for (const paragraph of (doc.synthesis || '(keine finale Antwort vorhanden)').split(/\n{2,}/)) {
    children.push(new Paragraph({ text: paragraph }));
  }

  const docxDocument = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(docxDocument);
  triggerBlobDownload(blob, `${slugifyFilename(doc.councilName)}.docx`);
}

// --------------------------------------------
// HTML-Export (eigenstaendige, interaktive Datei)
// --------------------------------------------

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderHtmlParagraphs(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br/>')}</p>`)
    .join('\n');
}

export function buildArtifactHtml(doc: ArtifactDocument): string {
  const opinionBySeatName = new Map(doc.opinions.map((opinion) => [opinion.seatName, opinion]));

  const memberCards = doc.participants
    .map((member, index) => {
      const opinion = opinionBySeatName.get(member.name);
      const initial = escapeHtml((member.name.trim().charAt(0) || '?').toUpperCase());
      const panelId = `member-output-${index}`;
      const roleLine = member.role ? `${escapeHtml(member.model)} · ${escapeHtml(member.role)}` : escapeHtml(member.model);

      const detailRows = [
        `<div class="detail-row"><span class="detail-label">Modell</span><span class="detail-value">${escapeHtml(member.model)}</span></div>`,
        member.role
          ? `<div class="detail-row"><span class="detail-label">Rolle</span><span class="detail-value">${escapeHtml(member.role)}${member.isChair ? ' (Chair)' : ''}</span></div>`
          : '',
        member.rolePrompt
          ? `<div class="detail-row detail-row-block"><span class="detail-label">Systemprompt</span><div class="detail-value detail-prompt">${renderHtmlParagraphs(member.rolePrompt)}</div></div>`
          : '',
      ]
        .filter(Boolean)
        .join('\n');

      const opinionBlock = opinion
        ? `<div class="detail-row detail-row-block"><span class="detail-label">Erstmeinung</span><div class="detail-value">${renderHtmlParagraphs(opinion.content)}</div></div>`
        : member.isChair
          ? `<div class="detail-row detail-row-block"><span class="detail-label">Erstmeinung</span><div class="detail-value detail-note">Als Chair gibt dieses Mitglied keine eigene Erstmeinung ab, sondern fasst am Ende alle Perspektiven zur finalen Synthese zusammen.</div></div>`
          : '';

      return `
      <div class="member">
        <button class="member-card" data-target="${panelId}" style="--accent: ${escapeHtml(member.color)}">
          <span class="avatar">${initial}</span>
          <span class="meta">
            <span class="name">${escapeHtml(member.name)}${member.isChair ? ' <span class="chair-badge">Chair</span>' : ''}</span>
            <span class="sub">${roleLine}</span>
          </span>
          <span class="chevron">▾</span>
        </button>
        <div class="member-output" id="${panelId}" hidden>
          ${detailRows}
          ${opinionBlock}
        </div>
      </div>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(doc.councilName)}</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 48px 20px;
    background: radial-gradient(circle at top, #10233f 0%, #050b16 65%);
    color: #f5f9ff;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    line-height: 1.6;
  }
  .wrap { max-width: 760px; margin: 0 auto; }
  header { margin-bottom: 32px; }
  h1 { font-size: 28px; margin: 0 0 6px; }
  .date { color: rgba(245,249,255,0.5); font-size: 13px; margin: 0; }
  h2 {
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: rgba(245,249,255,0.55);
    margin: 40px 0 14px;
  }
  section:first-of-type h2 { margin-top: 0; }
  p { color: rgba(245,249,255,0.85); margin: 0 0 12px; }
  .member-grid { display: flex; flex-direction: column; gap: 10px; }
  .member-card {
    all: unset;
    display: flex;
    align-items: center;
    gap: 14px;
    width: 100%;
    padding: 14px 16px;
    border-radius: 14px;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.08);
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease;
  }
  .member-card:hover { background: rgba(255,255,255,0.09); }
  .member-card:disabled { cursor: default; }
  .member-card.open { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 14%, transparent); }
  .avatar {
    flex-shrink: 0;
    width: 38px;
    height: 38px;
    border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 10px color-mix(in srgb, var(--accent) 60%, transparent);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    color: #0b1220;
  }
  .meta { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
  .name { font-weight: 600; font-size: 14.5px; }
  .chair-badge {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--accent);
    border: 1px solid color-mix(in srgb, var(--accent) 50%, transparent);
    border-radius: 999px;
    padding: 1px 7px;
    margin-left: 6px;
    vertical-align: middle;
  }
  .sub { font-size: 12px; color: rgba(245,249,255,0.5); }
  .chevron { color: rgba(245,249,255,0.4); transition: transform 0.15s ease; }
  .member-card.open .chevron { transform: rotate(180deg); }
  .member-output {
    margin: 8px 4px 0 16px;
    padding: 16px 18px;
    border-left: 2px solid rgba(255,255,255,0.12);
    color: rgba(245,249,255,0.75);
    font-size: 13.5px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .member-output[hidden] { display: none; }
  .member-output p:last-child { margin-bottom: 0; }
  .detail-row { display: flex; gap: 10px; align-items: baseline; }
  .detail-row-block { flex-direction: column; align-items: flex-start; gap: 4px; }
  .detail-label {
    flex-shrink: 0;
    width: 100px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: rgba(245,249,255,0.4);
  }
  .detail-row-block .detail-label { width: auto; }
  .detail-value { color: rgba(245,249,255,0.85); }
  .detail-prompt {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 10px;
    padding: 10px 12px;
    font-size: 12.5px;
    color: rgba(245,249,255,0.65);
  }
  .detail-note { font-style: italic; color: rgba(245,249,255,0.55); }
  .synthesis {
    margin-top: 40px;
    padding: 24px;
    border-radius: 16px;
    background: linear-gradient(135deg, rgba(79,140,255,0.14), rgba(79,140,255,0.03));
    border: 1px solid rgba(79,140,255,0.25);
  }
  .synthesis h2 { color: #9cc0ff; margin-top: 0; }
  .synthesis p { color: #f5f9ff; font-size: 15px; }
  footer { margin-top: 40px; font-size: 11px; color: rgba(245,249,255,0.3); text-align: center; }
</style>
</head>
<body>
  <div class="wrap">
    <header>
      <h1>${escapeHtml(doc.councilName)}</h1>
      <p class="date">${escapeHtml(formatArtifactDate(doc.createdAt))}</p>
    </header>

    <section>
      <h2>Was ist der LLM Council?</h2>
      ${renderHtmlParagraphs(LLM_COUNCIL_EXPLAINER)}
    </section>

    <section>
      <h2>Die Mitglieder</h2>
      <p style="font-size:12px; color:rgba(245,249,255,0.45); margin-top:-6px;">Klicke auf ein Profil, um die Erstmeinung zu sehen.</p>
      <div class="member-grid">
        ${memberCards}
      </div>
    </section>

    <section>
      <h2>Zusammenfassung</h2>
      ${renderHtmlParagraphs(doc.topicSummary)}
    </section>

    <section class="synthesis">
      <h2>Finale Synthese</h2>
      ${renderHtmlParagraphs(doc.synthesis || '(keine finale Antwort vorhanden)')}
    </section>

    <footer>Erstellt mit LLM Council</footer>
  </div>

  <script>
    document.querySelectorAll('.member-card[data-target]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var panel = document.getElementById(btn.dataset.target);
        if (!panel) return;
        var willOpen = panel.hasAttribute('hidden');
        if (willOpen) {
          panel.removeAttribute('hidden');
        } else {
          panel.setAttribute('hidden', '');
        }
        btn.classList.toggle('open', willOpen);
      });
    });
  </script>
</body>
</html>`;
}

export function downloadArtifactAsHtml(doc: ArtifactDocument): void {
  const html = buildArtifactHtml(doc);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  triggerBlobDownload(blob, `${slugifyFilename(doc.councilName)}.html`);
}
