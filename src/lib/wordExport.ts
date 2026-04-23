import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, BorderStyle, WidthType, AlignmentType, VerticalAlign } from 'docx'
import { saveAs } from 'file-saver'

interface SurveyData {
  projectName: string
  areaName: string
  surveyDate: string
  areaSize: string
  surveyNotes: string
  recommendedSystem: string
  notes: string
  images: string[]
  scans: string[]
}

export async function generateSurveyWord(surveyData: SurveyData) {
  const sections = []

  // Title Page
  sections.push({
    children: [
      new Paragraph({
        text: 'Richco Site Survey Report',
        style: 'Heading1',
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      }),
      new Paragraph({
        text: surveyData.projectName,
        style: 'Heading2',
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      }),
      new Paragraph({
        text: surveyData.areaName,
        style: 'Heading2',
        alignment: AlignmentType.CENTER,
        spacing: { after: 600 },
      }),
      new Paragraph({ text: '' }),
    ],
  })

  // Page 2: Survey Details
  sections.push({
    children: [
      new Paragraph({
        text: 'Survey Details',
        style: 'Heading2',
        spacing: { after: 400 },
      }),
      createDetailTable([
        ['Area Name', surveyData.areaName],
        ['Survey Date', new Date(surveyData.surveyDate).toLocaleDateString()],
        ['Area Size (Square Ft)', surveyData.areaSize],
        ['Survey Notes', surveyData.surveyNotes],
        ['Recommended System', surveyData.recommendedSystem],
        ['Notes', surveyData.notes],
      ]),
      new Paragraph({ text: '', spacing: { after: 200 } }),
    ],
  })

  // Page 3: Images
  if (surveyData.images.length > 0) {
    sections.push({
      children: [
        new Paragraph({
          text: 'Site Images',
          style: 'Heading2',
          spacing: { after: 400 },
        }),
        new Paragraph({
          text: `${surveyData.images.length} image(s) attached to this report`,
          spacing: { after: 200 },
        }),
      ],
    })
  }

  // Page 4: Scans
  if (surveyData.scans.length > 0) {
    sections.push({
      children: [
        new Paragraph({
          text: '3D Scans',
          style: 'Heading2',
          spacing: { after: 400 },
        }),
        new Paragraph({
          text: `${surveyData.scans.length} scan(s) attached to this report`,
          spacing: { after: 200 },
        }),
      ],
    })
  }

  // Customer Review Page
  sections.push({
    children: [
      new Paragraph({
        text: 'Customer Review',
        style: 'Heading2',
        spacing: { after: 400 },
      }),
      createReviewTable(),
    ],
  })

  const doc = new Document({
    sections: sections.map((section) => ({
      ...section,
      properties: {},
    })),
  })

  // Generate and download
  const blob = await Packer.toBlob(doc)
  saveAs(blob, `${surveyData.projectName}_${surveyData.areaName}_Report.docx`)
}

function createDetailTable(rows: Array<[string, string]>) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(
      ([label, value]) =>
        new TableRow({
          children: [
            new TableCell({
              width: { size: 30, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: [new TextRun({ text: label, bold: true })] })],
              borders: {
                top: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
                bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
                left: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
                right: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
              },
              verticalAlign: VerticalAlign.CENTER,
            }),
            new TableCell({
              width: { size: 70, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ text: value })],
              borders: {
                top: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
                bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
                left: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
                right: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
              },
            }),
          ],
        }),
    ),
  })
}

function createReviewTable() {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [new TextRun({ text: 'Name', bold: true })] })],
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
              left: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
              right: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
            },
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [new TextRun({ text: 'Date', bold: true })] })],
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
              left: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
              right: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
            },
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ text: '' })],
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
              left: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
              right: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
            },
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ text: '' })],
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
              left: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
              right: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
            },
          }),
        ],
      }),
    ],
  })
}
