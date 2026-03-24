import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import PDFDocument = require('pdfkit');

@Injectable()
export class PdfExportService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async generateReport(documentId: string, userId: string): Promise<Buffer> {
    const document = await this.prisma.document.findFirst({
      where: { id: documentId, userId, deletedAt: null },
      include: {
        extractedData: true,
        user: { select: { email: true } },
      },
    });

    if (!document) throw new NotFoundException('Document not found');
    if (document.status !== 'VALIDATED') {
      throw new BadRequestException('Only validated documents can be exported');
    }

    const pdf = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    return new Promise((resolve, reject) => {
      pdf.on('data', (chunk: Buffer) => chunks.push(chunk));
      pdf.on('end', () => resolve(Buffer.concat(chunks)));
      pdf.on('error', reject);

      // --- Header ---
      pdf
        .fontSize(20)
        .font('Helvetica-Bold')
        .text('AgriDoc AI', { align: 'center' })
        .fontSize(12)
        .font('Helvetica')
        .fillColor('#666666')
        .text('Extraction Report', { align: 'center' })
        .moveDown(0.5);

      // Divider
      pdf
        .strokeColor('#e5e7eb')
        .lineWidth(1)
        .moveTo(50, pdf.y)
        .lineTo(pdf.page.width - 50, pdf.y)
        .stroke()
        .moveDown(1);

      // --- Document Info ---
      pdf.fillColor('#000000').fontSize(14).font('Helvetica-Bold').text('Document Information');
      pdf.moveDown(0.5);

      const info: [string, string][] = [
        ['Document Name', document.originalName],
        ['Document Type', document.type],
        ['Upload Date', new Date(document.createdAt).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })],
        ['Validation Date', new Date(document.updatedAt).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })],
        ['Validator', document.user.email],
        ['Status', document.status],
      ];

      for (const [label, value] of info) {
        pdf.fontSize(10).font('Helvetica-Bold').fillColor('#374151').text(`${label}: `, { continued: true });
        pdf.font('Helvetica').fillColor('#000000').text(value);
      }

      pdf.moveDown(1);

      // --- Confidence ---
      const confidence = document.extractedData?.confidence ?? 0;
      pdf.fontSize(14).font('Helvetica-Bold').fillColor('#000000').text('AI Confidence');
      pdf.moveDown(0.3);

      // Confidence bar background
      const barX = 50;
      const barY = pdf.y;
      const barWidth = 200;
      const barHeight = 14;
      pdf.roundedRect(barX, barY, barWidth, barHeight, 3).fill('#e5e7eb');

      // Confidence bar fill
      const fillColor = confidence >= 80 ? '#22c55e' : confidence >= 50 ? '#eab308' : '#ef4444';
      const fillWidth = (confidence / 100) * barWidth;
      if (fillWidth > 0) {
        pdf.roundedRect(barX, barY, fillWidth, barHeight, 3).fill(fillColor);
      }

      // Confidence text
      pdf
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor('#000000')
        .text(`${confidence}%`, barX + barWidth + 10, barY + 2);

      pdf.y = barY + barHeight + 20;

      // --- Extracted Data ---
      const payload = (document.extractedData?.payload ?? {}) as Record<string, unknown>;
      if (Object.keys(payload).length > 0) {
        pdf.fontSize(14).font('Helvetica-Bold').fillColor('#000000').text('Extracted Data');
        pdf.moveDown(0.5);

        for (const [key, value] of Object.entries(payload)) {
          if (pdf.y > pdf.page.height - 100) {
            pdf.addPage();
          }

          const label = key
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, (s) => s.toUpperCase())
            .trim();

          if (Array.isArray(value)) {
            pdf.fontSize(10).font('Helvetica-Bold').fillColor('#374151').text(`${label}:`);
            for (const item of value) {
              pdf.fontSize(9).font('Helvetica').fillColor('#000000');
              if (typeof item === 'object' && item !== null) {
                const parts = Object.entries(item as Record<string, unknown>)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join('  |  ');
                pdf.text(`  - ${parts}`);
              } else {
                pdf.text(`  - ${item}`);
              }
            }
          } else {
            pdf.fontSize(10).font('Helvetica-Bold').fillColor('#374151').text(`${label}: `, { continued: true });
            pdf.font('Helvetica').fillColor('#000000').text(String(value ?? ''));
          }
        }
      }

      // --- Footer ---
      const pageCount = pdf.bufferedPageRange();
      for (let i = 0; i < pageCount.count; i++) {
        pdf.switchToPage(i);

        // Footer divider
        const footerY = pdf.page.height - 50;
        pdf
          .strokeColor('#e5e7eb')
          .lineWidth(0.5)
          .moveTo(50, footerY)
          .lineTo(pdf.page.width - 50, footerY)
          .stroke();

        pdf
          .fontSize(8)
          .font('Helvetica')
          .fillColor('#9ca3af')
          .text(
            `Generated on ${new Date().toLocaleString('en-GB')} by AgriDoc AI`,
            50,
            footerY + 10,
            { width: pdf.page.width - 150, align: 'left' },
          )
          .text(
            `Page ${i + 1} of ${pageCount.count}`,
            50,
            footerY + 10,
            { width: pdf.page.width - 100, align: 'right' },
          );
      }

      pdf.end();

      // Log export action (fire-and-forget — don't block PDF delivery)
      this.audit.logAction({
        userId,
        documentId,
        action: 'EXPORT',
        description: `User exported PDF report for: ${document.originalName}`,
      }).catch(() => {});
    });
  }
}
