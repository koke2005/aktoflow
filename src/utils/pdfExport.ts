import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

type ClientExportRow = {
  name: string
  pib: string | null
  businessType: string
  services: string
  status: string
}

type ClientReportDocumentRow = {
  name: string
  status: 'Primljeno' | 'Nedostaje'
  uploadedAt: string
}

type ClientReportDeadlineRow = {
  title: string
  type: string
  date: string
  status: 'pending' | 'overdue'
}

type DeadlinesExportRow = {
  clientName: string
  title: string
  type: string
  date: string
  status: 'pending' | 'overdue' | 'completed'
}

function currentDateLabel(): string {
  const now = new Date()
  return now.toLocaleDateString('sr-Latn-RS')
}

function currentDateKey(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = `${now.getMonth() + 1}`.padStart(2, '0')
  const d = `${now.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${d}`
}

function safeFilePart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

function drawFooter(doc: jsPDF, label: string): void {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  doc.setFontSize(9)
  doc.setTextColor(110, 120, 130)
  doc.text(label, pageWidth / 2, pageHeight - 8, { align: 'center' })
}

export function exportClientsList(
  clients: ClientExportRow[],
  firmName: string,
): void {
  const doc = new jsPDF()
  doc.setFontSize(16)
  doc.text(`Lista klijenata — ${firmName}`, 14, 18)
  doc.setFontSize(10)
  doc.setTextColor(80, 90, 100)
  doc.text(`Datum generisanja: ${currentDateLabel()}`, 14, 26)

  autoTable(doc, {
    startY: 32,
    head: [['Naziv', 'PIB', 'Tip', 'Usluge', 'Status']],
    body: clients.map((c) => [
      c.name,
      c.pib ?? '—',
      c.businessType,
      c.services || '—',
      c.status,
    ]),
    headStyles: {
      fillColor: [30, 58, 95],
      textColor: [255, 255, 255],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    styles: {
      fontSize: 9,
    },
  })

  drawFooter(doc, 'AktoFlow — aktoflow.vercel.app')
  doc.save(`aktoflow-klijenti-${currentDateKey()}.pdf`)
}

export function exportClientReport(
  client: {
    name: string
    pib: string | null
    address: string | null
    contactEmail: string | null
    contactPhone: string | null
    businessType: string
    services: string
    status: string
  },
  documents: ClientReportDocumentRow[],
  deadlines: ClientReportDeadlineRow[],
): void {
  const doc = new jsPDF()
  doc.setFontSize(16)
  doc.text(`Izvještaj klijenta — ${client.name}`, 14, 18)
  doc.setFontSize(10)
  doc.setTextColor(80, 90, 100)
  doc.text(`Datum generisanja: ${currentDateLabel()}`, 14, 26)

  let y = 34
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(12)
  doc.text('SEKCIJA 1 — Osnovni podaci', 14, y)
  y += 6
  doc.setFontSize(10)
  const lines = [
    `Naziv: ${client.name}`,
    `PIB: ${client.pib ?? '—'}`,
    `Adresa: ${client.address ?? '—'}`,
    `Kontakt email: ${client.contactEmail ?? '—'}`,
    `Telefon: ${client.contactPhone ?? '—'}`,
    `Tip biznisa: ${client.businessType}`,
    `Usluge: ${client.services || '—'}`,
    `Status: ${client.status}`,
  ]
  for (const line of lines) {
    doc.text(line, 14, y)
    y += 5
  }

  y += 4
  doc.setFontSize(12)
  doc.text('SEKCIJA 2 — Status dokumenata', 14, y)
  autoTable(doc, {
    startY: y + 3,
    head: [['Naziv dokumenta', 'Status', 'Datum uploada']],
    body: documents.map((d) => [d.name, d.status, d.uploadedAt || '—']),
    headStyles: { fillColor: [30, 58, 95], textColor: [255, 255, 255] },
    styles: { fontSize: 9 },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 1) {
        if (data.cell.raw === 'Primljeno') {
          data.cell.styles.fillColor = [220, 252, 231]
        } else {
          data.cell.styles.fillColor = [254, 226, 226]
        }
      }
    },
  })

  const nextY = (doc as jsPDF & { lastAutoTable?: { finalY: number } })
    .lastAutoTable?.finalY
  const startY = (nextY ?? y) + 10
  doc.setFontSize(12)
  doc.text('SEKCIJA 3 — Rokovi', 14, startY)
  autoTable(doc, {
    startY: startY + 3,
    head: [['Naziv', 'Tip', 'Datum', 'Status']],
    body: deadlines.map((d) => [
      d.title,
      d.type,
      d.date,
      d.status === 'pending' ? 'Pending' : 'Overdue',
    ]),
    headStyles: { fillColor: [30, 58, 95], textColor: [255, 255, 255] },
    styles: { fontSize: 9 },
  })

  drawFooter(doc, 'AktoFlow — aktoflow.vercel.app')
  doc.save(`aktoflow-${safeFilePart(client.name)}-${currentDateKey()}.pdf`)
}

export function exportDeadlinesList(
  deadlines: DeadlinesExportRow[],
  firmName: string,
): void {
  const doc = new jsPDF()
  doc.setFontSize(16)
  doc.text(`Rokovi — ${firmName}`, 14, 18)
  doc.setFontSize(10)
  doc.setTextColor(80, 90, 100)
  doc.text(`Datum generisanja: ${currentDateLabel()}`, 14, 26)

  const rows = [...deadlines].sort((a, b) => a.date.localeCompare(b.date))
  autoTable(doc, {
    startY: 32,
    head: [['Klijent', 'Naziv', 'Tip', 'Datum', 'Status']],
    body: rows.map((d) => [d.clientName, d.title, d.type, d.date, d.status]),
    headStyles: {
      fillColor: [30, 58, 95],
      textColor: [255, 255, 255],
    },
    styles: {
      fontSize: 9,
    },
    didParseCell: (data) => {
      if (data.section !== 'body') {
        return
      }
      const row = data.row.raw as string[]
      const status = row[4]
      if (status === 'overdue') {
        data.cell.styles.fillColor = [254, 226, 226]
      } else if (status === 'pending') {
        data.cell.styles.fillColor = [254, 249, 195]
      } else if (status === 'completed') {
        data.cell.styles.fillColor = [220, 252, 231]
      }
    },
  })

  drawFooter(doc, 'AktoFlow')
  doc.save(`aktoflow-rokovi-${currentDateKey()}.pdf`)
}
