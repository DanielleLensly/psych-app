import * as xlsx from 'xlsx';
import * as mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore - Vite resolves this ?url import to the correct local file path at build time
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Use Vite's ?url import so it resolves the local worker file correctly (avoids CDN failures)
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

export const importService = {
  /**
   * Import an Excel file and return an array of objects
   */
  importExcel: (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = xlsx.read(data, { type: 'binary' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const json = xlsx.utils.sheet_to_json(worksheet);
          resolve(json);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = (error) => reject(error);
      reader.readAsBinaryString(file);
    });
  },

  /**
   * Import a Word document and return HTML string representation
   */
  importWord: (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const result = await mammoth.convertToHtml({ arrayBuffer });
          // result.value contains the HTML
          resolve(result.value);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    });
  },

  /**
   * Import a PDF document and return a basic text or HTML representation.
   * Note: Extracting formatting from PDFs is complex, so we return basic structured text as HTML.
   */
  importPDF: async (file: File): Promise<string> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();

        let lastY = -1;
        textContent.items.forEach((item: any) => {
          if (lastY !== item.transform[5] && lastY !== -1) {
            fullText += '\n'; // Add line break when Y coordinate changes
          }
          fullText += item.str;
          lastY = item.transform[5];
        });

        fullText += '\n\n'; // Add spacing between pages
      }

      // Convert basic text to simple HTML paragraphs for the editor
      return fullText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(line => `<p>${line}</p>`)
        .join('');

    } catch (error) {
      console.error('Error importing PDF:', error);
      throw error;
    }
  }
};
