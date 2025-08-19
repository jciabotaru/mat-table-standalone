import { Component } from '@angular/core';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCardModule } from '@angular/material/card';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { CommonModule } from '@angular/common';

interface Row { [k: string]: any; }

const SAMPLE_ROWS: Row[] = Array.from({ length: 50 }, (_, i) => ({
  id: i + 1,
  name: `User ${i + 1}`,
  email: `user${i + 1}@example.com`,
  role: i % 2 === 0 ? 'Admin' : 'Member',
  dept: 'Engineering',
  mgr: `Mgr ${(i % 5) + 1}`,
  loc: 'Remote',
  start: new Date(2020, i % 12, (i % 27) + 1).toLocaleDateString(),
  status: i % 3 === 0 ? 'Active' : 'Pending',
  phone: `+1-555-01${(100 + i).toString().slice(-3)}`,
  notes: i % 4 === 0 ? 'Notes that wrap a bit for testing' : '-',
  extra: 'Extra',
}));

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatTableModule,
    MatCardModule
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  displayedColumns = ['id','name','email','role','dept','mgr','loc','start','status','phone','notes','extra'];
  columnLabels: { [k: string]: string } = {
    id: 'ID', name: 'Name', email: 'Email', role: 'Role',
    dept: 'Dept', mgr: 'Manager', loc: 'Location', start: 'Start Date',
    status: 'Status', phone: 'Phone', notes: 'Notes', extra: 'Extra'
  };

  dataSource = new MatTableDataSource<Row>(SAMPLE_ROWS);

  // page geometry + layout
  private PAGE = { w: 595.28, h: 841.89 };
  private MARGIN = 28;
  private HEADER_H = 54;
  private FOOTER_H = 36;
  private TABLE_HEADER_H = 18;
  private FONT_SIZE = 9;
  private LINE_HEIGHT = this.FONT_SIZE * 1.2;
  private forceLandscape = true;

  public generating = false;
  public lastPdfUrl: string | null = null;

  async generatePdf() {
    this.generating = true;
    this.lastPdfUrl = null;
  
    try {
      const rows = this.dataSource.data || [];
      const cols = this.displayedColumns;
  
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
      // try local logo, then remote
      let logoImage: any = null;
      try {
        const url = new URL('assets/logo.png', import.meta.url).href;
        const resp = await fetch(url);
        if (resp.ok) {
          const bytes = new Uint8Array(await resp.arrayBuffer());
          try { logoImage = await pdfDoc.embedPng(bytes); }
          catch { logoImage = await pdfDoc.embedJpg(bytes); }
        }
      } catch {}
      if (!logoImage) {
        try {
          const r2 = await fetch('https://angular.io/assets/images/logos/angular/angular.png');
          if (r2.ok) {
            const bytes2 = new Uint8Array(await r2.arrayBuffer());
            try { logoImage = await pdfDoc.embedPng(bytes2); }
            catch { logoImage = await pdfDoc.embedJpg(bytes2); }
          }
        } catch {}
      }
  
      // page geometry
      const pageW = this.forceLandscape ? this.PAGE.h : this.PAGE.w;
      const pageH = this.forceLandscape ? this.PAGE.w : this.PAGE.h;
  
      // table geometry
      const usableWidth = pageW - this.MARGIN * 2;
      const colWidth = usableWidth / cols.length;
      const colX: number[] = [];
      for (let i = 0; i < cols.length; i++) colX.push(this.MARGIN + i * colWidth);
      const tableWidth = usableWidth;
  
      // text metrics
      const LINE_H = this.LINE_HEIGHT;
      const FONT = this.FONT_SIZE;
      const BASELINE_FUDGE = FONT * 0.08;
  
      // wrap helper: max 2 lines + ellipsis
      const wrap2 = (text: any, maxWidth: number) => {
        const t = (text ?? '').toString();
        if (!t) return [''];
        const words = t.split(/\s+/);
        const lines: string[] = [];
        let cur = '';
  
        for (const w of words) {
          const test = cur ? cur + ' ' + w : w;
          if (font.widthOfTextAtSize(test, FONT) <= maxWidth) cur = test;
          else { lines.push(cur); cur = w; }
          if (lines.length === 2) break;
        }
        if (cur && lines.length < 2) lines.push(cur);
  
        // ellipsis if 2nd line still too wide
        if (lines.length === 2 && font.widthOfTextAtSize(lines[1], FONT) > maxWidth) {
          let s = lines[1];
          while (s.length && font.widthOfTextAtSize(s + '…', FONT) > maxWidth) s = s.slice(0, -1);
          lines[1] = (s || '').replace(/\s+$/, '') + '…';
        }
        return lines;
      };
  
      // pagination
      const rowHeight = LINE_H * 2 + 6;
      const tableTopY = pageH - this.MARGIN - this.HEADER_H;
      const usableBottom = this.MARGIN + this.FOOTER_H;
      const rowsSpace = tableTopY - usableBottom - this.TABLE_HEADER_H;
      const rowsPerPage = Math.max(1, Math.floor(rowsSpace / rowHeight));
      const pageCount = Math.max(1, Math.ceil(rows.length / rowsPerPage));
  
      for (let p = 0; p < pageCount; p++) {
        const page = pdfDoc.addPage([pageW, pageH]);
  
        // header
        const headerY = pageH - this.MARGIN - 12;
        if (logoImage) {
          const dims = logoImage.scale(1);
          const logoH = 26;
          const logoW = (dims.width / dims.height) * logoH;
          page.drawImage(logoImage, { x: this.MARGIN, y: pageH - this.MARGIN - logoH, width: logoW, height: logoH });
        }
        page.drawText('User Report', { x: pageW / 2 - 50, y: headerY, size: FONT + 2, font });
        page.drawText(new Date().toLocaleDateString(), {
          x: pageW - this.MARGIN - 110,
          y: headerY,
          size: FONT - 1,
          font,
          color: rgb(0.3,0.3,0.3)
        });
  
        // footer
        const footerY = this.MARGIN - 6;

        const footerText =
          'Confidential, this is part of your health records and are protected health information, please be careful with sensitive information like this.';

        page.drawText(footerText, {
          x: this.MARGIN,
          y: footerY,
          size: FONT - 1,
          font,
          color: rgb(0.3, 0.3, 0.3),
          maxWidth: pageW - 2 * this.MARGIN - 80, // leave space for page number
        });

        const pg = `Page ${p + 1} of ${pageCount}`;
        const pgW = font.widthOfTextAtSize(pg, FONT - 1);

        // right-align page number
        page.drawText(pg, {
          x: pageW - this.MARGIN - pgW,
          y: footerY,
          size: FONT - 1,
          font,
          color: rgb(0.3, 0.3, 0.3),
        });

        // table header row
        let cursorY = tableTopY;
        for (let c = 0; c < cols.length; c++) {
          page.drawRectangle({
            x: colX[c],
            y: cursorY - this.TABLE_HEADER_H,
            width: colWidth,
            height: this.TABLE_HEADER_H,
            color: rgb(0.9, 0.9, 0.9),
            borderWidth: 0.8,
            borderColor: rgb(0, 0, 0),
          });

          let label = this.columnLabels[cols[c]] || cols[c];
          while (label.length && fontBold.widthOfTextAtSize(label + '…', FONT) > colWidth - 6) {
            label = label.slice(0, -1);
          }
          if (fontBold.widthOfTextAtSize(label, FONT) > colWidth - 6) {
            label = label.replace(/\s+$/, '') + '…';
          }

          const textW = fontBold.widthOfTextAtSize(label, FONT);
          const textX = colX[c] + (colWidth - textW) / 2;

          //center vertically in header cell
          const textY =
            cursorY - this.TABLE_HEADER_H / 2 - FONT / 2 + BASELINE_FUDGE;

          page.drawText(label, {
            x: textX,
            y: textY,
            size: FONT,
            font: fontBold,
          });
        }
        cursorY -= this.TABLE_HEADER_H;

        // rows
        const start = p * rowsPerPage;
        const end = Math.min(rows.length, (p + 1) * rowsPerPage);
        for (let r = start; r < end; r++) {
          const row = rows[r];
          const rowIndexOnPage = r - start;
  
          // zebra stripe
          if (rowIndexOnPage % 2 === 1) {
            page.drawRectangle({
              x: this.MARGIN,
              y: cursorY - rowHeight,
              width: tableWidth,
              height: rowHeight,
              color: rgb(0.965, 0.965, 0.965),
            });
          }
  
          for (let c = 0; c < cols.length; c++) {
            page.drawRectangle({
              x: colX[c],
              y: cursorY - rowHeight,
              width: colWidth,
              height: rowHeight,
              borderWidth: 0.4,
              borderColor: rgb(0.6, 0.6, 0.6),
            });
  
            let cellText = String(row[cols[c]] ?? '');
            let lines: string[];
  
            if (cols[c] === 'email') {
              // single line with ellipsis if too long
              let s = cellText;
              while (s.length && font.widthOfTextAtSize(s + '…', FONT) > colWidth - 6) {
                s = s.slice(0, -1);
              }
              if (s !== cellText) s = s.replace(/\s+$/, '') + '…';
              lines = [s];
            } else {
              // normal wrap
              lines = wrap2(cellText, colWidth - 6);
            }
  
            const blockH = lines.length * LINE_H;
            const startY = cursorY - (rowHeight - blockH) / 2 - FONT;
  
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];
              const w = font.widthOfTextAtSize(line, FONT);
              const x = colX[c] + (colWidth - w) / 2;
              const y = startY - i * LINE_H;
  
              page.drawText(line, { x, y, size: FONT, font });
            }
          }
          cursorY -= rowHeight;
        }
      }
  
      const bytes = await pdfDoc.save();
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      this.lastPdfUrl = url;
      window.open(url, '_blank');
    } catch (err) {
      console.error('generatePdf failed:', err);
      alert('PDF generation failed — see console for details.');
    } finally {
      this.generating = false;
    }
  }  
}
